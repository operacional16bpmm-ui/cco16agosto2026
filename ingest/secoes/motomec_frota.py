"""
Ingestão Motomec — frota de viaturas (cadastro/lotação mensal).

Fonte: \\cmdo\pmesp\16BPMM\16BPMM_EM\MOTOMEC\Matriz Motomec 16M\MOTOMEC <ano>\
       MAPA DESCRITIVO\<arquivo mensal>.xlsx  (aba "Descritivo")

Caso híbrido (ver comentário no migration 002 / lib/db.ts getFrota): além do
framework genérico de seções (fato_secao, indicador "disponibilidade_frota",
consumido pelo card Motomec do /overview), a frota real vive numa tabela
dedicada pré-existente `public.viaturas` (consumida pela página /logistica,
já em produção). Este script popula as DUAS.

Estrutura confirmada (Dez/2025, Jan/2026, Jun/2026 — mesmo layout): a aba
"Descritivo" tem linhas de cabeçalho de bloco ("1ª CIA".."4ª CIA", "16°BPM/M"
= Sede, "FORÇA TÁTICA", "ROCAM", "PROCESSO DE DESCARGA") intercaladas com uma
linha por viatura (Patrimônio, Gpo, Conv, Prefixo, Prefixo Ant., Ano, Placa,
Marca, Modelo, Comb, Unidade, Cia, Situação, observação, Tipo de
Policiamento). O bloco "PROCESSO DE DESCARGA" é um LOG histórico de baixas
desde 2007 (achado real: o mesmo prefixo aparece ali com um patrimônio
diferente do da linha ativa — prefixo foi reaproveitado por outra viatura
depois) — nunca representa o estado atual, por isso é sempre ignorado.

Não há, em nenhuma fonte investigada (Descritivo, "Remanejada", "viaturas
novas e Remanejamento", BAIXADA.docx, PARTE VIATURAS), um campo de situação
operacional em tempo real (disponível/empenhada/indisponível). A coluna
"Situação" do Descritivo só é preenchida em exceções administrativas ("A
DISP. DA Nª CIA", "CMT CIA", "DEJEM"...) — não é um status de despacho. Sem
essa fonte, TODA viatura do rol ativo (fora do bloco PROCESSO DE DESCARGA)
é gravada como situacao="disponivel": é a leitura mais honesta de "consta
como lotada e operando" que a fonte permite, e é o único jeito de a página
/logistica parar de mostrar "Sem dados de frota" sem inventar um número mais
fino que a fonte não dá. Quando (se) o batalhão tiver telemetria/CAD
integrado à frota, esse default deixa de ser necessário.

Uso:
    python -m ingest.secoes.motomec_frota [--dry-run] [--forcar]
"""
import argparse
import glob
import os
import re
import sys

import openpyxl

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ingest.common.unc import caminho_disponivel
from ingest.common.excel import eh_arquivo_lixo, mtime_iso
from ingest.common.carga import (
    abrir_batch,
    fechar_batch,
    upsert_fato_secao,
    upsert_generico,
    deletar_por_valores,
    registrar_arquivo,
    arquivo_ja_ingerido,
    sha256_arquivo,
)

SECAO = "motomec"
FONTE = "mapa_descritivo"
RAIZ_UNC = r"\\cmdo\pmesp\16BPMM\16BPMM_EM\MOTOMEC\Matriz Motomec 16M"

# Prefixos de seed/homologação (migration 003_seed_homologacao.sql) que não
# correspondem a nenhuma viatura real encontrada na fonte — ficam "presos" na
# tabela pra sempre se não forem removidos explicitamente (upsert por
# on_conflict=prefixo só sobrescreve quem tem o MESMO prefixo; achado real:
# só "M-16022" do seed coincide com uma viatura real, as outras 3 não).
PREFIXOS_SEED_HOMOLOGACAO = ["M-16010", "M-16022", "M-16031", "FT-1601"]

BLOCO_DESCARGA = "PROCESSO DE DESCARGA"
PREFIXOS_JUNK = {"CARRETAS", "======", "", None}  # reboques sem prefixo único — não são "viatura" no schema

MARCAS_MOTO = {"YAMAHA", "YH", "BMW", "HONDA", "HD", "HO"}

RE_CIA_NUM = re.compile(r"^(\d)ª?\s*CIA", re.IGNORECASE)

MESES_PT = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
]
RE_MES_TEXTO = re.compile("|".join(MESES_PT), re.IGNORECASE)
RE_ANO_ARQ = re.compile(r"(20\d{2})")
RE_PASTA_ANO = re.compile(r"MOTOMEC (\d{4})", re.IGNORECASE)

COL_PREFIXO = 3
COL_MARCA = 7
COL_CIA = 11
COL_TIPO_POLICIAMENTO = 14


def cia_da_pasta(caminho: str) -> int | None:
    m = RE_PASTA_ANO.search(caminho)
    return int(m.group(1)) if m else None


def ano_mes_do_arquivo(caminho: str) -> tuple[int, int] | None:
    """Ano vem do NOME do arquivo quando presente (achado real: 'DEZEMBRO
    2025.xlsx' mora dentro da pasta 'MOTOMEC 2026'); cai para o ano da pasta
    quando o arquivo não traz ano explícito (padrão mais antigo, ex.:
    'JANEIRO.xlsx' dentro de 'MOTOMEC 2022')."""
    nome = os.path.basename(caminho)
    m_mes = RE_MES_TEXTO.search(nome.upper())
    if not m_mes:
        return None
    mes = MESES_PT.index(m_mes.group(0).upper()) + 1
    m_ano = RE_ANO_ARQ.search(nome)
    ano = int(m_ano.group(1)) if m_ano else cia_da_pasta(caminho)
    if ano is None:
        return None
    return ano, mes


def localizar_arquivos_mapa_descritivo() -> list[str]:
    """1 arquivo por (ano, mês) — quando há mais de um candidato (achado
    real em 2023: '01 JANEIRO.xlsx' E 'JANEIRO.xlsx' no mesmo mês), fica com
    o modificado mais recentemente (revisão mais nova)."""
    candidatos: dict[tuple[int, int], list[str]] = {}
    for caminho in glob.glob(os.path.join(RAIZ_UNC, "MOTOMEC *", "MAPA DESCRITIVO", "*.xlsx")):
        nome = os.path.basename(caminho)
        if eh_arquivo_lixo(nome):
            continue
        am = ano_mes_do_arquivo(caminho)
        if am is None:
            continue  # arquivo fora do padrão mensal (ex.: planilha de atualização cadastral avulsa) — ignorado, não é erro
        candidatos.setdefault(am, []).append(caminho)

    encontrados = []
    for am, arquivos in sorted(candidatos.items()):
        arquivos.sort(key=lambda c: os.path.getmtime(c), reverse=True)
        encontrados.append(arquivos[0])
    return encontrados


def arquivo_mais_recente(arquivos: list[str]) -> str:
    """O snapshot ATUAL da frota (tabela viaturas) usa só o mês mais recente
    disponível — os demais entram apenas na série histórica do fato_secao."""
    return max(arquivos, key=lambda c: ano_mes_do_arquivo(c))


def cia_id_de(campo_cia: str | None) -> int | None:
    if not campo_cia:
        return None
    m = RE_CIA_NUM.match(campo_cia.strip())
    return int(m.group(1)) if m else None


def classificar_tipo(marca: str | None, tipo_policiamento: str | None, bloco: str) -> str:
    marca_u = (marca or "").strip().upper()
    pol_u = (tipo_policiamento or "").strip().upper()
    bloco_u = bloco.strip().upper()

    if bloco_u == "ROCAM" or pol_u in ("RPM", "ROCAM") or marca_u in MARCAS_MOTO:
        return "motocicleta"
    if bloco_u == "FORÇA TÁTICA" or pol_u == "FORÇA TÁTICA":
        return "forca_tatica"
    return "outros"  # substituído abaixo por radiopatrulha/apoio conforme o campo Cia — ver processar_arquivo


def processar_arquivo(caminho: str) -> tuple[list[dict], int, int, list[str]]:
    """Retorna (linhas_viaturas, lidas, descartadas, descartes). Cada linha
    de `linhas_viaturas` tem prefixo/tipo/cia_id/situacao/ativo, prontas
    para upsert em public.viaturas."""
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    if "Descritivo" not in wb.sheetnames:
        wb.close()
        return [], 0, 0, [f"aba Descritivo ausente em {os.path.basename(caminho)}"]
    ws = wb["Descritivo"]
    linhas_brutas = list(ws.iter_rows(max_col=15, values_only=True))
    wb.close()

    linhas: list[dict] = []
    lidas = 0
    descartadas = 0
    descartes: list[str] = []
    vistos: set[str] = set()
    # "" (não None) — achado real: os arquivos de 2022/2023 não têm NENHUM
    # cabeçalho de bloco (a lista de viaturas começa direto na linha 1), só
    # os de 2024+ têm "1ª CIA"/"FORÇA TÁTICA"/"ROCAM"/"PROCESSO DE DESCARGA".
    # cia_id e tipo vêm dos campos Cia/Tipo de Policiamento de cada linha,
    # não do bloco — então nenhum arquivo fica sem dado só por não ter essas
    # linhas-rótulo (só "PROCESSO DE DESCARGA" precisa do sinal de bloco).
    bloco = ""

    for row in linhas_brutas[1:]:  # linha 0 = cabeçalho de coluna
        # Cabeçalho de bloco = linha praticamente vazia com só o rótulo na
        # col A ("1ª CIA", "FORÇA TÁTICA"...). Achado real: uma linha de
        # reboque (Patrimônio=2040000959) tem Prefixo=None mas as OUTRAS
        # colunas preenchidas — checar só "prefixo is None" confundia essa
        # linha de dado com um cabeçalho e vazava o log de baixas (a partir
        # dela) para dentro do rol ativo.
        if row[0] and all(v is None for v in row[1:]):
            bloco = str(row[0]).strip()
            continue
        if bloco.upper() == BLOCO_DESCARGA:
            continue  # dentro do log histórico de baixas (prefixo reaproveitado — nunca é a frota atual)

        lidas += 1
        prefixo_bruto = row[COL_PREFIXO]
        prefixo = str(prefixo_bruto).strip() if prefixo_bruto is not None else None
        if prefixo in PREFIXOS_JUNK or (prefixo and prefixo.upper() in {"CARRETAS", "======"}):
            descartadas += 1
            descartes.append(f"{os.path.basename(caminho)} bloco={bloco}: prefixo não-único ({prefixo!r}, ex.: reboque) descartado")
            continue
        if prefixo in vistos:
            descartadas += 1
            descartes.append(f"{os.path.basename(caminho)} bloco={bloco}: prefixo duplicado {prefixo!r} descartado (mantida 1ª ocorrência)")
            continue
        vistos.add(prefixo)

        marca = row[COL_MARCA]
        campo_cia = row[COL_CIA]
        tipo_pol = row[COL_TIPO_POLICIAMENTO]
        cia_id = cia_id_de(campo_cia if isinstance(campo_cia, str) else None)

        tipo = classificar_tipo(marca, tipo_pol, bloco)
        if tipo == "outros":
            pol_u = (tipo_pol or "").strip().upper()
            if cia_id is not None and (pol_u in ("", "RP", "RE", "CMT CIA")):
                tipo = "radiopatrulha"
            else:
                tipo = "apoio"

        linhas.append(
            {
                "prefixo": prefixo,
                "tipo": tipo,
                "cia_id": cia_id,
                "situacao": "disponivel",  # ver docstring do módulo — fonte não tem status de despacho em tempo real
                "ativo": True,
            }
        )

    return linhas, lidas, descartadas, descartes


def contagem_por_cia(linhas: list[dict]) -> dict[int, int]:
    """cia=0 é o total do batalhão (todas as viaturas do rol, inclusive
    Sede/FT/ROCAM sem Cia atribuída) — mesma convenção do p1_qse/p3_rac."""
    contagem = {0: len(linhas)}
    for linha in linhas:
        cia = linha["cia_id"]
        if cia is not None:
            contagem[cia] = contagem.get(cia, 0) + 1
    return contagem


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--forcar", action="store_true")
    args = ap.parse_args()

    if not caminho_disponivel(RAIZ_UNC):
        print(f"[motomec_frota] Fonte indisponível: {RAIZ_UNC}")
        if not args.dry_run:
            batch_id = abrir_batch(SECAO, FONTE)
            fechar_batch(batch_id, "fonte_indisponivel", erro="UNC inacessível no momento da execução")
        sys.exit(0)

    arquivos = localizar_arquivos_mapa_descritivo()
    print(f"[motomec_frota] {len(arquivos)} arquivo(s) MAPA DESCRITIVO encontrado(s).")
    if not arquivos:
        if not args.dry_run:
            batch_id = abrir_batch(SECAO, FONTE)
            fechar_batch(batch_id, "falha", erro="nenhum arquivo MAPA DESCRITIVO localizado")
        sys.exit(1)

    caminho_atual = arquivo_mais_recente(arquivos)
    ano_atual, mes_atual = ano_mes_do_arquivo(caminho_atual)
    print(f"[motomec_frota] snapshot ATUAL da frota (tabela viaturas): {os.path.basename(caminho_atual)} ({ano_atual}-{mes_atual:02d})")

    batch_id = None if args.dry_run else abrir_batch(SECAO, FONTE)
    total_lidas = total_validas = total_descartadas = 0
    todos_descartes: list[str] = []
    erro_fatal = None
    viaturas_atuais: list[dict] = []

    try:
        for caminho in arquivos:
            sha = sha256_arquivo(caminho)
            if not args.forcar and not args.dry_run and arquivo_ja_ingerido(SECAO, caminho, sha):
                print(f"  - {os.path.basename(caminho)}: sem mudança (hash igual), pulando")
                continue

            linhas, lidas, descartadas, descartes = processar_arquivo(caminho)
            ano, mes = ano_mes_do_arquivo(caminho)
            total_lidas += lidas
            total_validas += len(linhas)
            total_descartadas += descartadas
            todos_descartes.extend(descartes)
            print(f"  - {os.path.basename(caminho)} ({ano}-{mes:02d}): {lidas} lidas, {len(linhas)} válidas, {descartadas} descartadas")

            if caminho == caminho_atual:
                viaturas_atuais = linhas

            if args.dry_run:
                continue

            # fato_secao — série histórica por Cia (mesmo indicador que o
            # card Motomec do /overview lê via dadosSecaoFramework).
            contagem = contagem_por_cia(linhas)
            fatos = [
                {
                    "secao": SECAO,
                    "indicador": "disponibilidade_frota",
                    "ano": ano,
                    "mes": mes,
                    "eh_anual": False,
                    "cia": cia,
                    "valor": valor,
                    "batch_id": batch_id,
                }
                for cia, valor in contagem.items()
            ]
            upsert_fato_secao(fatos)

            registrar_arquivo(
                secao=SECAO,
                caminho_unc=caminho,
                sha256=sha,
                mtime_iso=mtime_iso(caminho),
                linhas_reais=lidas,
                observacao=(
                    "MAPA DESCRITIVO — cadastro/lotação mensal por Cia (Descritivo); "
                    "sem status de despacho em tempo real, situacao='disponivel' default"
                ),
                batch_id=batch_id,
            )

        if not args.dry_run and viaturas_atuais:
            # public.viaturas: tabela dedicada pré-existente (migration 002),
            # não faz parte do framework fato_secao — upsert genérico por prefixo.
            upsert_generico(
                "viaturas",
                [
                    {
                        "prefixo": v["prefixo"],
                        "tipo": v["tipo"],
                        "cia_id": v["cia_id"],
                        "situacao": v["situacao"],
                        "ativo": v["ativo"],
                    }
                    for v in viaturas_atuais
                ],
                on_conflict="prefixo",
            )
            prefixos_carregados = {v["prefixo"] for v in viaturas_atuais}
            stale = [p for p in PREFIXOS_SEED_HOMOLOGACAO if p not in prefixos_carregados]
            if stale:
                deletar_por_valores("viaturas", "prefixo", stale)
                print(f"[motomec_frota] removidos {len(stale)} prefixo(s) de seed/homologação sem correspondente real: {stale}")

    except Exception as e:  # noqa: BLE001
        erro_fatal = str(e)

    if args.dry_run:
        if erro_fatal:
            print(f"[motomec_frota] ERRO durante dry-run: {erro_fatal}")
            sys.exit(1)
        print(f"[motomec_frota] dry-run concluído: {total_lidas} lidas, {total_validas} válidas, {total_descartadas} descartadas.")
        print(f"  Viaturas no snapshot atual ({ano_atual}-{mes_atual:02d}): {len(viaturas_atuais)}")
        if todos_descartes:
            print("  Amostra de descartes:", todos_descartes[:10])
        return

    if erro_fatal:
        fechar_batch(batch_id, "falha", total_lidas, total_validas, total_descartadas, todos_descartes, erro_fatal)
        print(f"[motomec_frota] FALHA: {erro_fatal}")
        sys.exit(1)

    status = "ok" if total_descartadas == 0 else "parcial"
    fechar_batch(batch_id, status, total_lidas, total_validas, total_descartadas, todos_descartes)
    print(f"[motomec_frota] Concluído ({status}): {total_lidas} lidas, {total_validas} válidas, {total_descartadas} descartadas.")
    print(f"[motomec_frota] {len(viaturas_atuais)} viaturas carregadas em public.viaturas (snapshot {ano_atual}-{mes_atual:02d}).")


if __name__ == "__main__":
    main()
