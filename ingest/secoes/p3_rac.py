"""
Ingestão P3 — RAC mensal (Reunião de Análise Crítica).

Fonte: \\cmdo\pmesp\16BPMM\16BPMM_EM\P3\Documentos P3\<ano>\RAC\<NN><MES><AA> RAC\
       RAC PRODUTIVIDADE <MÊS> <ANO>.xlsx  (aba "PRODUTIVIDADE")

Cada arquivo 2026 traz o mês atual E o mesmo mês do ano anterior (2025) lado a
lado (colunas C/D da aba) — por isso os 6 arquivos de jan-jun/2026 já dão 12
meses de série (jan-jun/25 + jan-jun/26) sem abrir nenhum arquivo de 2025.
Essa mesma janela jun/25→jun/26 é a origem dos números da vitrine pública
(+231% carros abordados, -37% veículos recuperados, -27% flagrantes).

Escopo: só os blocos 16º BPM/M (cia=0) e 1ª-4ª CIA (cia=1-4) — os blocos
FORÇA TÁTICA/RPM/OPERAÇÕES DIVERSAS que também existem nesta planilha ficam
para a ingestão de Força Tática (fonte mais rica: Matriz FT dedicada).

Uso:
    python -m ingest.secoes.p3_rac [--dry-run] [--forcar]
"""
import argparse
import glob
import os
import sys

import openpyxl

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ingest.common.unc import caminho_disponivel
from ingest.common.excel import eh_arquivo_lixo, mtime_iso, numero_ou_none
from ingest.common.carga import (
    abrir_batch,
    fechar_batch,
    upsert_fato_secao,
    registrar_arquivo,
    arquivo_ja_ingerido,
    sha256_arquivo,
)

SECAO = "p3"
FONTE = "rac_produtividade"
RAIZ_UNC = r"\\cmdo\pmesp\16BPMM\16BPMM_EM\P3\Documentos P3"

INDICADORES = {
    "INDIVÍDUOS ABORDADOS": "abordados_individuos",
    "CARROS ABORDADOS": "abordados_carros",
    "MOTOS ABORDADAS": "abordados_motos",
    "VEÍCULOS RECUPERADOS": "veiculos_recuperados",
    # jan/2026 usa layout antigo com a linha "VEÍCULOS RECUPERADOS" quebrada
    # em duas (achado real na ingestão, não hipotético) — soma as duas de
    # volta ao mesmo indicador para não perder o dado nem duplicar linha.
    "CARROS RECUPERADOS": "veiculos_recuperados",
    "MOTOS RECUPERADAS": "veiculos_recuperados",
    "CAPTURA DE PROCURADO": "capturas_procurado",
    "FLAGRANTES": "flagrantes",
    "INDIVÍDUOS PRESOS": "presos",
    "ATO INFRACIONAL": "ato_infracional",
    "SINDICADOS": "sindicados",
    "ARMAS": "armas_apreendidas",
    "MACONHA": "maconha_kg",
    "COCAÍNA": "cocaina_kg",
    "CRACK": "crack_kg",
    "OUTROS ENTORPECENTES": "outros_entorpecentes_kg",
    "TOTAL DE ENTORPECENTES": "entorpecentes_total_kg",
}

UNIDADES_ESCOPO = {
    "16º BPM/M": 0,
    "1ª CIA": 1,
    "2ª CIA": 2,
    "3ª CIA": 3,
    "4ª CIA": 4,
}


def localizar_arquivos_rac() -> list[str]:
    """Um arquivo RAC PRODUTIVIDADE por pasta de mês (glob tolerante —
    nomenclatura varia: '01JAN26 PRODUTIVIDADE.xlsx' vs
    'RAC PRODUTIVIDADE FEVEREIRO 2026.xlsx')."""
    encontrados = []
    for pasta_mes in sorted(glob.glob(os.path.join(RAIZ_UNC, "*", "RAC", "*RAC"))):
        if not os.path.isdir(pasta_mes):
            continue
        candidatos = [
            f
            for f in glob.glob(os.path.join(pasta_mes, "*.xlsx"))
            if "produtividade" in os.path.basename(f).lower() and not eh_arquivo_lixo(os.path.basename(f))
        ]
        if candidatos:
            # Se houver mais de um candidato, prioriza o que tem "RAC" no nome.
            candidatos.sort(key=lambda f: ("rac" not in os.path.basename(f).lower(), f))
            encontrados.append(candidatos[0])
    return encontrados


def extrair_blocos(ws):
    """Percorre a aba PRODUTIVIDADE (via iter_rows — worksheet read_only não
    suporta acesso aleatório .cell()) e retorna, para cada bloco em
    UNIDADES_ESCOPO: (cia, ano_anterior, ano_atual, mes,
    valores_ano_anterior, valores_ano_atual). valores_* são dicts
    indicador->float|None."""
    linhas = list(ws.iter_rows(max_col=6, values_only=True))
    blocos = []
    i = 0
    while i < len(linhas):
        col_a, col_b, col_c, col_d = linhas[i][0], linhas[i][1], linhas[i][2], linhas[i][3]
        unidade = str(col_a).strip() if col_a else None
        if unidade in UNIDADES_ESCOPO and hasattr(col_c, "year") and hasattr(col_d, "year"):
            cia = UNIDADES_ESCOPO[unidade]
            ano_anterior, ano_atual, mes = col_c.year, col_d.year, col_d.month
            # Acumula (soma) em vez de sobrescrever: cobre o layout de
            # jan/2026, onde "VEÍCULOS RECUPERADOS" vem quebrado em duas
            # linhas (CARROS/MOTOS RECUPERADOS) mapeando para a mesma chave.
            # Janela de 18 linhas (não 15) para caber essa linha extra;
            # blocos de 15 linhas simplesmente encontram `rotulo is None`
            # antes de esgotar a janela.
            soma_anterior, soma_atual = {}, {}
            visto_anterior, visto_atual = set(), set()
            for r in linhas[i + 1 : i + 18]:
                rotulo = r[1]
                if rotulo is None:
                    break
                chave = INDICADORES.get(str(rotulo).strip())
                if not chave:
                    continue
                v_ant, v_atu = numero_ou_none(r[2]), numero_ou_none(r[3])
                if v_ant is not None:
                    soma_anterior[chave] = soma_anterior.get(chave, 0) + v_ant
                    visto_anterior.add(chave)
                if v_atu is not None:
                    soma_atual[chave] = soma_atual.get(chave, 0) + v_atu
                    visto_atual.add(chave)
            valores_anterior = {k: soma_anterior[k] for k in visto_anterior}
            valores_atual = {k: soma_atual[k] for k in visto_atual}
            blocos.append((cia, ano_anterior, ano_atual, mes, valores_anterior, valores_atual))
        i += 1
    return blocos


def processar_arquivo(caminho: str, dry_run: bool) -> tuple[list[dict], int, int, list[str]]:
    """Retorna (linhas_fato_secao, linhas_lidas, linhas_descartadas, descartes)."""
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    if "PRODUTIVIDADE" not in wb.sheetnames:
        return [], 0, 0, [f"aba PRODUTIVIDADE ausente em {os.path.basename(caminho)}"]

    ws = wb["PRODUTIVIDADE"]
    blocos = extrair_blocos(ws)
    linhas: list[dict] = []
    lidas = 0
    descartadas = 0
    descartes: list[str] = []

    chaves_unicas = sorted(set(INDICADORES.values()))  # dedupe — várias
    # linhas de origem (ex.: CARROS/MOTOS RECUPERADOS) mapeiam para a mesma
    # chave; iterar INDICADORES.values() puro triplica a contagem e o upsert.
    for cia, ano_anterior, ano_atual, mes, valores_anterior, valores_atual in blocos:
        for chave in chaves_unicas:
            lidas += 1
            v_ant = valores_anterior.get(chave)
            v_atu = valores_atual.get(chave)
            if v_ant is None:
                descartadas += 1
                descartes.append(f"{chave} cia={cia} {ano_anterior}-{mes:02d}: valor não numérico")
            else:
                linhas.append(
                    {
                        "secao": SECAO,
                        "indicador": chave,
                        "ano": ano_anterior,
                        "mes": mes,
                        "eh_anual": False,
                        "cia": cia,
                        "valor": v_ant,
                    }
                )
            if v_atu is None:
                descartadas += 1
                descartes.append(f"{chave} cia={cia} {ano_atual}-{mes:02d}: valor não numérico")
            else:
                linhas.append(
                    {
                        "secao": SECAO,
                        "indicador": chave,
                        "ano": ano_atual,
                        "mes": mes,
                        "eh_anual": False,
                        "cia": cia,
                        "valor": v_atu,
                    }
                )
    wb.close()
    return linhas, lidas, descartadas, descartes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="lê e mostra o resumo, não grava no Supabase")
    ap.add_argument("--forcar", action="store_true", help="reingere mesmo se o hash do arquivo não mudou")
    args = ap.parse_args()

    if not caminho_disponivel(RAIZ_UNC):
        print(f"[p3_rac] Fonte indisponível: {RAIZ_UNC}")
        if not args.dry_run:
            batch_id = abrir_batch(SECAO, FONTE)
            fechar_batch(batch_id, "fonte_indisponivel", erro="UNC inacessível no momento da execução")
        sys.exit(0)

    arquivos = localizar_arquivos_rac()
    print(f"[p3_rac] {len(arquivos)} arquivo(s) RAC PRODUTIVIDADE encontrado(s).")
    if not arquivos:
        if not args.dry_run:
            batch_id = abrir_batch(SECAO, FONTE)
            fechar_batch(batch_id, "falha", erro="nenhum arquivo RAC PRODUTIVIDADE localizado")
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

            linhas, lidas, descartadas, descartes = processar_arquivo(caminho, args.dry_run)
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
                observacao="RAC PRODUTIVIDADE — blocos 16º BPM/M + 1ª-4ª CIA",
                batch_id=batch_id,
            )
    except Exception as e:  # noqa: BLE001 — precisa fechar o batch como 'falha' em qualquer exceção
        erro_fatal = str(e)

    if args.dry_run:
        print(f"[p3_rac] dry-run concluído: {total_lidas} lidas, {total_validas} válidas, {total_descartadas} descartadas.")
        if todos_descartes:
            print("  Amostra de descartes:", todos_descartes[:10])
        return

    if erro_fatal:
        fechar_batch(batch_id, "falha", total_lidas, total_validas, total_descartadas, todos_descartes, erro_fatal)
        print(f"[p3_rac] FALHA: {erro_fatal}")
        sys.exit(1)

    status = "ok" if total_descartadas == 0 else "parcial"
    fechar_batch(batch_id, status, total_lidas, total_validas, total_descartadas, todos_descartes)
    print(f"[p3_rac] Concluído ({status}): {total_lidas} lidas, {total_validas} válidas, {total_descartadas} descartadas.")


if __name__ == "__main__":
    main()
