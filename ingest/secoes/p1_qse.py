"""
Ingestão P1 — QSE mensal (Quadro de Suprimento de Efetivo).

Fonte: \\cmdo\pmesp\16BPMM\16BPMM_EM\P1\Matriz\Matriz <ano>\EFETIVO\QSE\
       <NN> QSE <MÊS> 16º BPMM.xls   (aba "OPM", formato .xls legado — xlrd)

Estrutura confirmada (2025 e 2026, mesmo layout): 194 colunas, cabeçalho em 3
linhas (grupo posto/grad → Fx/Ex → Mas/Fem/Restr...). O grupo final "Oficiais
e Praças" / "Efetivo Total" (colunas 179-186) dá o agregado que interessa:
Fx (fixado/claro), Ex (existente), Restr. Méd, Restr. Op, Inapto, Apto — já
somado por posto/graduação, sem precisar decompor os ~170 grupos anteriores.

Linhas: cada função/posto do batalhão é uma linha; a coluna J
("OPM - Descrição") tem, ao final de cada bloco de Cia, uma linha de
SUBTOTAL com o texto exato "16º BPM/M - Nª Cia PM" (cia=1..4) e, na última
linha da planilha, o total do batalhão "Total - 16º BPM/M" (cia=0). Só essas
5 linhas por arquivo interessam — as ~60 linhas de função individual (Cmt,
P/1, P/2...) não são somadas aqui (não fazem parte do escopo desta ingestão:
efetivo por Cia/Btl, não por função).

Uso:
    python -m ingest.secoes.p1_qse [--dry-run] [--forcar]
"""
import argparse
import glob
import os
import re
import sys

import xlrd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ingest.common.unc import caminho_disponivel
from ingest.common.excel import mtime_iso, numero_ou_none
from ingest.common.carga import (
    abrir_batch,
    fechar_batch,
    upsert_fato_secao,
    registrar_arquivo,
    arquivo_ja_ingerido,
    sha256_arquivo,
)

SECAO = "p1"
FONTE = "qse_mensal"
RAIZ_UNC = r"\\cmdo\pmesp\16BPMM\16BPMM_EM\P1\Matriz"

# (coluna, indicador)
COLUNAS_INDICADORES = [
    (179, "efetivo_fixado"),
    (180, "efetivo_existente"),
    (183, "efetivo_restricao_medica"),
    (184, "efetivo_restricao_operacional"),
    (185, "efetivo_inapto"),
    (186, "efetivo_apto"),
]
COL_DESCRICAO = 9  # "OPM - Descrição"

RE_CIA = re.compile(r"^16º BPM/M - (\d)ª Cia PM$")
TOTAL_BTL = "Total - 16º BPM/M"

RE_PASTA_ANO = re.compile(r"Matriz (\d{4})", re.IGNORECASE)

# O prefixo numérico do nome do arquivo não é confiável (achado real: "03 QSE
# FEVEREIRO 16º BPMM NOVA.xls" tem prefixo 03 mas é uma revisão de
# FEVEREIRO, não de março) — o mês vem do NOME do mês por extenso.
MESES_PT = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
]
RE_MES_TEXTO = re.compile("|".join(MESES_PT), re.IGNORECASE)


def ano_do_caminho(caminho: str) -> int | None:
    m = RE_PASTA_ANO.search(caminho)
    return int(m.group(1)) if m else None


def mes_do_nome(nome_arquivo: str) -> int | None:
    m = RE_MES_TEXTO.search(nome_arquivo.upper())
    if not m:
        return None
    return MESES_PT.index(m.group(0).upper()) + 1


def prioridade_revisao(nome_arquivo: str) -> int:
    """Menor = preferido. 'Atualizada'/'nova' são revisões explícitas do
    original; 'cópia de' só é usada quando é a ÚNICA fonte do mês (achado
    real: outubro/2024 só existe como 'Cópia de 10 QSE OUTUBRO...xls')."""
    nome = nome_arquivo.lower()
    if "atualizada" in nome:
        return 0
    if "nova" in nome:
        return 1
    if "cópia" not in nome and "copia" not in nome:
        return 2
    return 3


def localizar_arquivos_qse() -> list[str]:
    """1 arquivo por (ano, mês) — o de maior prioridade quando há mais de
    um candidato (revisão > original > cópia)."""
    candidatos: dict[tuple[int, int], list[str]] = {}
    for caminho in glob.glob(os.path.join(RAIZ_UNC, "Matriz *", "EFETIVO", "QSE", "*.xls")):
        nome = os.path.basename(caminho)
        nome_lower = nome.lower()
        # ~$ (lock do Excel), MODELO, EM BRANCO — nunca úteis. "Cópia de"
        # fica de fora dessa exclusão (tratada via prioridade_revisao, pode
        # ser a única fonte de um mês).
        if nome_lower.startswith("~$") or "modelo" in nome_lower or "em branco" in nome_lower:
            continue
        ano = ano_do_caminho(caminho)
        mes = mes_do_nome(nome)
        if ano is None or mes is None:
            continue
        candidatos.setdefault((ano, mes), []).append(caminho)

    encontrados = []
    for (ano, mes), arquivos in sorted(candidatos.items()):
        arquivos.sort(key=lambda c: (prioridade_revisao(os.path.basename(c)), c))
        encontrados.append(arquivos[0])
    return encontrados


def ano_mes_do_caminho(caminho: str) -> tuple[int, int] | None:
    ano = ano_do_caminho(caminho)
    mes = mes_do_nome(os.path.basename(caminho))
    if ano is None or mes is None:
        return None
    return ano, mes


def extrair_linhas_relevantes(ws) -> list[tuple[int, int]]:
    """Retorna [(linha, cia)] para as 5 linhas de interesse (Btl + 1-4 Cia)."""
    achadas = []
    for r in range(ws.nrows):
        descricao = str(ws.cell_value(r, COL_DESCRICAO)).strip()
        if descricao == TOTAL_BTL:
            achadas.append((r, 0))
            continue
        m = RE_CIA.match(descricao)
        if m:
            achadas.append((r, int(m.group(1))))
    return achadas


def processar_arquivo(caminho: str) -> tuple[list[dict], int, int, list[str]]:
    """Retorna (linhas_fato_secao, linhas_lidas, linhas_descartadas, descartes)."""
    am = ano_mes_do_caminho(caminho)
    if am is None:
        return [], 0, 0, [f"não foi possível extrair ano/mês de {caminho}"]
    ano, mes = am

    wb = xlrd.open_workbook(caminho)
    if "OPM" not in wb.sheet_names():
        return [], 0, 0, [f"aba OPM ausente em {os.path.basename(caminho)}"]
    ws = wb.sheet_by_name("OPM")

    relevantes = extrair_linhas_relevantes(ws)
    linhas: list[dict] = []
    lidas = 0
    descartadas = 0
    descartes: list[str] = []

    if len(relevantes) < 5:
        descartes.append(
            f"{os.path.basename(caminho)}: só {len(relevantes)}/5 linhas (Btl+1-4 Cia) localizadas — "
            "layout pode ter mudado, conferir manualmente"
        )

    for linha_idx, cia in relevantes:
        for coluna, indicador in COLUNAS_INDICADORES:
            lidas += 1
            valor = numero_ou_none(ws.cell_value(linha_idx, coluna))
            if valor is None:
                descartadas += 1
                descartes.append(f"{indicador} cia={cia} {ano}-{mes:02d}: valor não numérico")
                continue
            linhas.append(
                {
                    "secao": SECAO,
                    "indicador": indicador,
                    "ano": ano,
                    "mes": mes,
                    "eh_anual": False,
                    "cia": cia,
                    "valor": valor,
                }
            )
    return linhas, lidas, descartadas, descartes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--forcar", action="store_true")
    args = ap.parse_args()

    if not caminho_disponivel(RAIZ_UNC):
        print(f"[p1_qse] Fonte indisponível: {RAIZ_UNC}")
        if not args.dry_run:
            batch_id = abrir_batch(SECAO, FONTE)
            fechar_batch(batch_id, "fonte_indisponivel", erro="UNC inacessível no momento da execução")
        sys.exit(0)

    arquivos = localizar_arquivos_qse()
    print(f"[p1_qse] {len(arquivos)} arquivo(s) QSE encontrado(s).")
    if not arquivos:
        if not args.dry_run:
            batch_id = abrir_batch(SECAO, FONTE)
            fechar_batch(batch_id, "falha", erro="nenhum arquivo QSE localizado")
        sys.exit(1)

    batch_id = None if args.dry_run else abrir_batch(SECAO, FONTE)
    total_lidas = total_validas = total_descartadas = 0
    todos_descartes: list[str] = []
    erro_fatal = None

    try:
        for caminho in arquivos:
            sha = sha256_arquivo(caminho)
            if not args.forcar and not args.dry_run and arquivo_ja_ingerido(SECAO, caminho, sha):
                print(f"  - {os.path.basename(caminho)}: sem mudança (hash igual), pulando")
                continue

            linhas, lidas, descartadas, descartes = processar_arquivo(caminho)
            total_lidas += lidas
            total_validas += len(linhas)
            total_descartadas += descartadas
            todos_descartes.extend(descartes)
            print(f"  - {os.path.basename(caminho)}: {lidas} lidas, {len(linhas)} válidas, {descartadas} descartadas")

            if args.dry_run:
                continue

            for linha in linhas:
                linha["batch_id"] = batch_id
            upsert_fato_secao(linhas)
            registrar_arquivo(
                secao=SECAO,
                caminho_unc=caminho,
                sha256=sha,
                mtime_iso=mtime_iso(caminho),
                linhas_reais=lidas,
                observacao="QSE — Efetivo Fixado/Existente/Aptidão, Btl + 1ª-4ª Cia",
                batch_id=batch_id,
            )
    except Exception as e:  # noqa: BLE001
        erro_fatal = str(e)

    if args.dry_run:
        print(f"[p1_qse] dry-run concluído: {total_lidas} lidas, {total_validas} válidas, {total_descartadas} descartadas.")
        if todos_descartes:
            print("  Amostra de descartes:", todos_descartes[:10])
        return

    if erro_fatal:
        fechar_batch(batch_id, "falha", total_lidas, total_validas, total_descartadas, todos_descartes, erro_fatal)
        print(f"[p1_qse] FALHA: {erro_fatal}")
        sys.exit(1)

    status = "ok" if total_descartadas == 0 else "parcial"
    fechar_batch(batch_id, status, total_lidas, total_validas, total_descartadas, todos_descartes)
    print(f"[p1_qse] Concluído ({status}): {total_lidas} lidas, {total_validas} válidas, {total_descartadas} descartadas.")


if __name__ == "__main__":
    main()
