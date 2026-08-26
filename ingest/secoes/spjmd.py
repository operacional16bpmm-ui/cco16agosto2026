"""
Ingestão SPJMD — processos, IPM e acervo documental (Seção de Justiça e
Disciplina Militar do 16º BPM/M).

Tabelas dedicadas (migration 012_spjmd_correcional.sql, RLS já aplicada):
spjmd_processos, spjmd_ipm, spjmd_acervo_contagem, spjmd_arquivos_fonte.
Nenhuma delas participa do framework genérico fato_secao/agregado_dimensional
— usa upsert_generico (insert simples nas duas sem constraint extra, upsert
de verdade nas duas que têm unique key).

Fontes reais:

1) spjmd_processos — LOCAL (fora da rede, export do Sistema Correcional/SPJMD
   feito pelo usuário): C:\\Users\\13934852785\\Downloads\\Documents\\
   para_aceitar_atraso.csv — 246 processos com prazo em aberto/vencido,
   carregados na íntegra (colunas Numerador/Origem/Encaminhado Para/
   Natureza/Prioridade/Data Tramitação/Dias Parado/Data do Fato/Data
   Prazo/Dias Prazo Vencido/Status).

2) spjmd_ipm — três fontes reais do espelho MATRIX (Z:\\16BPMM_EM\\SPJMD\\
   MATRIX), a busca no manifest de staging por "IPM"/"MDIP"/"PRAZO"/
   "SITUAÇÃO" NÃO achou os arquivos "PLANILHA CONTROLE DE IPM" citados no
   prompt original (só existem no Y:\\matrix original, intermitente) — as
   três fontes abaixo são o que sobrou de mais rico depois de descartar
   dezenas de planilhas de outros batalhões (CPAM5/4/23/49 BPM/M) e blocos
   sem dado real:
   a) Z:\\16BPMM_EM\\SPJMD\\MATRIX\\NUMERADOR 2025\\CONTROLE GERAL 2025.xlsx
      aba "IPM 2025" — numerador oficial 2025, 10 IPMs com dado real (as
      demais linhas são só numeração reservada, sem instauração ainda).
   b) Z:\\16BPMM_EM\\SPJMD\\MATRIX\\IPM 2025\\
      Controle Prazo de IPM 14.03.25.xlsx aba "Plan1" — 11 IPMs com prazo
      processual detalhado (ciência/manifestação), snapshot de 14/03/2025.
   c) Z:\\16BPMM_EM\\SPJMD\\MATRIX\\PLANILHAS\\Planilha de Prazo - CPA-M5\\
      9- Setembro\\PLANILHAS DE PRAZO - CPAM5 IPM - SET2024 16ºBPMM.xlsx
      aba "16 BPMM" — controle histórico cumulativo de IPM do 16º BPM/M
      (2018→set/2024), única aba do escopo 16º BPM/M nessa série (as abas
      irmãs CPAM5/4 BPMM/23 BPMM/49 BPMM são de outras unidades, fora do
      escopo). É uma lista que só CRESCE mês a mês (jan/24 tinha 764
      linhas cruas, set/24 tem 856 — a mais recente localizada, não há
      arquivo de out/nov/dez-2024 nem 2025 nesta série no espelho) —
      carregamos só o snapshot mais recente para não duplicar histórico
      through múltiplos meses. Cada IPM ocupa 1 linha "cabeça" (nº, data,
      natureza, 1º averiguado, conclusão) + linhas de continuação (mais
      averiguados) — agrupado aqui por IPM (~330 grupos a partir de ~850
      linhas cruas).

3) spjmd_acervo_contagem — contagem recursiva de arquivos por subpasta de
   1º nível de Z:\\16BPMM_EM\\SPJMD\\MATRIX (23 subpastas reais no momento
   da ingestão: CARTÓRIO 2025, IPM 2025, IP 2025, Sind 2025, PD, PESSOAL,
   APURAÇÃO PRELIMINAR, EVIDÊNCIA DIGITAIS, NUMERADOR 2025, PLANILHAS,
   Planilha CPAM5, EFETIVO, BIBLIOTECA, MANUAIS, MINUTAS, JURISPRUDENCIAS,
   PARTES, ENTRADA E SAÍDA, Arma Rest, BACKHUP EMAIL 02MAR23, Backup Cmt
   PJMD 15SET23 — nomes reais, não a lista idealizada do prompt; não existe
   pasta "REGISTRO DE FATO" nem "EVIDÊNCIAS DIGITAIS" (singular) no 1º
   nível hoje). Ano extraído do nome da subpasta quando presente (ex.: "IP
   2025" → ano=2025); ausente → ano=NULL.

LGPD: as tabelas guardam nome/RE/graduação de PM averiguados em IPM (campo
`extra` jsonb) porque a página /spjmd foi desenhada (migration 012) para
mostrar detalhe completo a qualquer usuário autenticado do portal, com RLS
restrita a is_operational_member() — não a "anon". Este script não imprime
nomes no console; só contagens.

Uso:
    python -m ingest.secoes.spjmd [--dry-run]
"""
import argparse
import csv
import os
import re
import sys
import unicodedata
from datetime import date, datetime

import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ingest.common.unc import caminho_disponivel
from ingest.common.carga import (
    abrir_batch,
    fechar_batch,
    upsert_generico,
    SUPABASE_URL,
    SERVICE_KEY,
    _HEADERS,
)

SECAO = "spjmd"
FONTE = "matrix_processos_ipm_acervo"

CAMINHO_PROCESSOS_LOCAL = r"C:\Users\13934852785\Downloads\Documents\para_aceitar_atraso.csv"

CSV_IPM_NUMERADOR_2025 = (
    r"C:\Users\13934852785\AppData\Local\Temp\claude\C--Users-13934852785"
    r"\2253b4c5-a93d-4781-8566-f9a8a2526978\scratchpad\staging\csv\SPJMD"
    r"\MATRIX_NUMERADOR 2025__CONTROLE GERAL 2025__IPM 2025.csv"
)
UNC_IPM_NUMERADOR_2025 = r"Z:\16BPMM_EM\SPJMD\MATRIX\NUMERADOR 2025\CONTROLE GERAL 2025.xlsx"

CSV_IPM_CONTROLE_PRAZO = (
    r"C:\Users\13934852785\AppData\Local\Temp\claude\C--Users-13934852785"
    r"\2253b4c5-a93d-4781-8566-f9a8a2526978\scratchpad\staging\csv\SPJMD"
    r"\MATRIX_IPM 2025__Controle Prazo de IPM 14.03.25__Plan1.csv"
)
UNC_IPM_CONTROLE_PRAZO = r"Z:\16BPMM_EM\SPJMD\MATRIX\IPM 2025\Controle Prazo de IPM 14.03.25.xlsx"

CSV_IPM_CPAM5_SET2024 = (
    r"C:\Users\13934852785\AppData\Local\Temp\claude\C--Users-13934852785"
    r"\2253b4c5-a93d-4781-8566-f9a8a2526978\scratchpad\staging\csv\SPJMD"
    r"\MATRIX_PLANILHAS_Planilha de Prazo - CPA-M5_9- Setembro"
    r"__PLANILHAS DE PRAZO - CPAM5 IPM - SET2024 16_BPMM__16 BPMM.csv"
)
UNC_IPM_CPAM5_SET2024 = (
    r"Z:\16BPMM_EM\SPJMD\MATRIX\PLANILHAS\Planilha de Prazo - CPA-M5"
    r"\9- Setembro\PLANILHAS DE PRAZO - CPAM5 IPM - SET2024 16ºBPMM.xlsx"
)

RAIZ_MATRIX = r"Z:\16BPMM_EM\SPJMD\MATRIX"

MAPA_SUBAREA = {
    "SIND": "SINDICANCIAS",
    "EVIDENCIA_DIGITAIS": "EVIDENCIA_DIGITAL",
}


# ----------------------------------------------------------------------------
# Helpers genéricos
# ----------------------------------------------------------------------------
def _vazio_para_none(v):
    if v is None:
        return None
    v = v.strip()
    return v if v else None


def _data_iso_ou_none(v):
    """'2026-02-26' ou '2026-02-26 00:00:00' -> date; qualquer outra coisa
    (vazio, texto tipo 'Cota Ministerial') -> None."""
    v = _vazio_para_none(v)
    if v is None:
        return None
    v = v.split(" ")[0]
    try:
        return datetime.strptime(v, "%Y-%m-%d").date()
    except ValueError:
        return None


def _int_ou_none(v):
    v = _vazio_para_none(v)
    if v is None:
        return None
    try:
        return int(float(v))
    except ValueError:
        return None


def _contar_linhas_tabela(tabela: str) -> int:
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{tabela}",
        headers={**_HEADERS, "Prefer": "count=exact"},
        params={"select": "id", "limit": "1"},
        timeout=30,
    )
    resp.raise_for_status()
    content_range = resp.headers.get("content-range", "")
    if "/" in content_range:
        total = content_range.split("/")[-1]
        if total.isdigit():
            return int(total)
    return 0


def _slug(nome: str) -> str:
    nome = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode("ascii")
    nome = re.sub(r"[^A-Za-z0-9]+", "_", nome).strip("_").upper()
    return nome


# ----------------------------------------------------------------------------
# 1) spjmd_processos
# ----------------------------------------------------------------------------
def carregar_processos() -> tuple[list[dict], int, list[str]]:
    """Retorna (linhas, lidas, descartes)."""
    if not os.path.exists(CAMINHO_PROCESSOS_LOCAL):
        return [], 0, [f"arquivo local ausente: {CAMINHO_PROCESSOS_LOCAL}"]

    linhas = []
    descartes = []
    lidas = 0
    with open(CAMINHO_PROCESSOS_LOCAL, encoding="utf-8-sig", newline="") as f:
        leitor = csv.DictReader(f, delimiter=";")
        for row in leitor:
            lidas += 1
            numerador = _vazio_para_none(row.get("Numerador", ""))
            if numerador is None:
                descartes.append(f"linha {lidas}: sem Numerador, descartada")
                continue
            linhas.append(
                {
                    "numerador": numerador,
                    "origem": _vazio_para_none(row.get("Origem", "")),
                    "encaminhado_para": _vazio_para_none(row.get("Encaminhado Para", "")),
                    "natureza": _vazio_para_none(row.get("Natureza", "")),
                    "prioridade": _vazio_para_none(row.get("Prioridade", "")),
                    "data_tramitacao": _data_iso_ou_none(row.get("Data Tramitação", "")).isoformat()
                    if _data_iso_ou_none(row.get("Data Tramitação", ""))
                    else None,
                    "dias_parado": _int_ou_none(row.get("Dias Parado", "")),
                    "data_fato": _data_iso_ou_none(row.get("Data do Fato", "")).isoformat()
                    if _data_iso_ou_none(row.get("Data do Fato", ""))
                    else None,
                    "data_prazo": _data_iso_ou_none(row.get("Data Prazo", "")).isoformat()
                    if _data_iso_ou_none(row.get("Data Prazo", ""))
                    else None,
                    "dias_prazo_vencido": _int_ou_none(row.get("Dias Prazo Vencido", "")),
                    "status": _vazio_para_none(row.get("Status", "")),
                    "origem_arquivo": CAMINHO_PROCESSOS_LOCAL,
                    "aba": None,
                }
            )
    return linhas, lidas, descartes


# ----------------------------------------------------------------------------
# 2a) spjmd_ipm — NUMERADOR 2025 / CONTROLE GERAL 2025.xlsx aba "IPM 2025"
# ----------------------------------------------------------------------------
def _ano_de_numero_ipm(numero: str):
    m = re.search(r"(\d{2,4})\s*$", numero)
    if not m:
        return None
    ano = int(m.group(1))
    if ano < 100:
        ano += 2000
    if ano < 2000 or ano > 2100:
        return None
    return ano


def carregar_ipm_numerador_2025() -> tuple[list[dict], int, list[str]]:
    if not os.path.exists(CSV_IPM_NUMERADOR_2025):
        return [], 0, [f"CSV staged ausente: {CSV_IPM_NUMERADOR_2025}"]

    linhas = []
    descartes = []
    lidas = 0
    with open(CSV_IPM_NUMERADOR_2025, encoding="utf-8-sig", newline="") as f:
        leitor = csv.DictReader(f)
        for row in leitor:
            lidas += 1
            numero_ipm = _vazio_para_none(row.get("IPM", ""))
            if numero_ipm is None:
                continue  # numeração reservada sem instauração ainda — não é descarte, é vazio esperado
            linhas.append(
                {
                    "numero_ipm": numero_ipm,
                    "ano": _ano_de_numero_ipm(numero_ipm) or 2025,
                    "tipo": "IPM",
                    "encarregado": _vazio_para_none(row.get("ESCRIVÃO", "")),
                    "situacao": _vazio_para_none(row.get("PROVIDÊNCIAS / LOCALIZAÇÃO / SITUAÇÃO", "")),
                    "prazo": _data_iso_ou_none(row.get("PRAZO 40 dias", "")).isoformat()
                    if _data_iso_ou_none(row.get("PRAZO 40 dias", ""))
                    else None,
                    "dias_atraso": None,
                    "objeto": _vazio_para_none(row.get("FATOS/TIPIFICAÇÃO", "")),
                    "origem_arquivo": UNC_IPM_NUMERADOR_2025,
                    "aba": "IPM 2025",
                    "extra": {
                        "pm_envolvidos_civil": _vazio_para_none(row.get("PM ENVOLVIDOS E CIVIL", "")),
                        "data_do_fato": row.get("DATA DO FATO") or None,
                        "data_de_inst": row.get("DATA DE INST.") or None,
                        "prazo_20_dias": row.get("PRAZO 20 dias") or None,
                        "data_saida_tjm": row.get("DATA DE SAÍDA TJM") or None,
                        "sijd": _vazio_para_none(row.get("SIJD", "")),
                        "residuo_adm": _vazio_para_none(row.get("Resíduo ADM", "")),
                        "armas_apreendidas": _vazio_para_none(row.get("ARMAS apreendidas", "")),
                    },
                }
            )
    return linhas, lidas, descartes


# ----------------------------------------------------------------------------
# 2b) spjmd_ipm — IPM 2025 / Controle Prazo de IPM 14.03.25.xlsx aba "Plan1"
# ----------------------------------------------------------------------------
def carregar_ipm_controle_prazo() -> tuple[list[dict], int, list[str]]:
    if not os.path.exists(CSV_IPM_CONTROLE_PRAZO):
        return [], 0, [f"CSV staged ausente: {CSV_IPM_CONTROLE_PRAZO}"]

    linhas = []
    descartes = []
    lidas = 0
    with open(CSV_IPM_CONTROLE_PRAZO, encoding="utf-8-sig", newline="") as f:
        leitor = csv.DictReader(f)
        for row in leitor:
            lidas += 1
            numero_ipm = _vazio_para_none((row.get("IPM ") or row.get("IPM") or "").replace("\n", " "))
            if numero_ipm is None:
                descartes.append(f"linha {lidas}: sem número de IPM, descartada")
                continue
            numero_ipm = re.sub(r"\s+", " ", numero_ipm).strip()
            prazo_manif = _data_iso_ou_none(row.get("Data limite prevista para manifestação", ""))
            prazo_ciencia = _data_iso_ou_none(row.get("Data limite prevista para ciência", ""))
            prazo = prazo_manif or prazo_ciencia
            situacao = _vazio_para_none(row.get("providência", "")) or _vazio_para_none(row.get("Observação", ""))
            linhas.append(
                {
                    "numero_ipm": numero_ipm,
                    "ano": _ano_de_numero_ipm(numero_ipm) or 2024,
                    "tipo": "IPM",
                    "encarregado": _vazio_para_none(row.get("Escrivão", "")),
                    "situacao": situacao,
                    "prazo": prazo.isoformat() if prazo else None,
                    "dias_atraso": None,
                    "objeto": _vazio_para_none(row.get("natureza", "")),
                    "origem_arquivo": UNC_IPM_CONTROLE_PRAZO,
                    "aba": "Plan1",
                    "extra": {
                        "processo": _vazio_para_none(row.get("Processo", "")),
                        "prazo_texto": _vazio_para_none(row.get("prazo", "")),
                        "data_da_ciencia": row.get("Data da Ciência") or None,
                        "observacao": _vazio_para_none(row.get("Observação", "")),
                    },
                }
            )
    return linhas, lidas, descartes


# ----------------------------------------------------------------------------
# 2c) spjmd_ipm — PLANILHAS/.../PLANILHAS DE PRAZO - CPAM5 IPM - SET2024
#     16ºBPMM.xlsx aba "16 BPMM" — controle histórico cumulativo 2018→2024
# ----------------------------------------------------------------------------
def carregar_ipm_cpam5_set2024() -> tuple[list[dict], int, list[str]]:
    if not os.path.exists(CSV_IPM_CPAM5_SET2024):
        return [], 0, [f"CSV staged ausente: {CSV_IPM_CPAM5_SET2024}"]

    with open(CSV_IPM_CPAM5_SET2024, encoding="utf-8-sig", newline="") as f:
        linhas_csv = list(csv.reader(f))

    corpo = linhas_csv[5:]  # pula as 5 linhas de cabeçalho (título x3 + 2 linhas de header)
    lidas = len(corpo)

    grupos = []
    atual = None
    for r in corpo:
        r = (r + [""] * 9)[:9]
        ipm, data_inst, natureza, graduacao, re_, nome, sim, nao, data_concl = r
        ipm = ipm.strip()
        if ipm:
            if atual:
                grupos.append(atual)
            atual = {
                "numero_ipm": ipm,
                "data_instauracao": data_inst.strip() or None,
                "naturezas": [natureza.strip()] if natureza.strip() else [],
                "data_conclusao_raw": data_concl.strip() or None,
                "averiguados": [],
            }
        if atual is None:
            continue
        if natureza.strip() and (not ipm) and natureza.strip() not in atual["naturezas"]:
            atual["naturezas"].append(natureza.strip())
        if graduacao.strip() or re_.strip() or nome.strip():
            atual["averiguados"].append(
                {
                    "graduacao": graduacao.strip() or None,
                    "re": re_.strip() or None,
                    "nome": nome.strip() or None,
                    "indiciado": sim.strip().lower() in ("x", "sim"),
                }
            )
        if (not ipm) and data_concl.strip() and not atual["data_conclusao_raw"]:
            atual["data_conclusao_raw"] = data_concl.strip()
    if atual:
        grupos.append(atual)

    linhas = []
    for g in grupos:
        data_concl_raw = g["data_conclusao_raw"]
        data_concl_data = _data_iso_ou_none(data_concl_raw) if data_concl_raw else None
        if data_concl_data:
            situacao = "concluído"
            prazo = data_concl_data.isoformat()
        elif data_concl_raw:
            situacao = data_concl_raw
            prazo = None
        else:
            situacao = "em andamento"
            prazo = None
        data_inst = _data_iso_ou_none(g["data_instauracao"]) if g["data_instauracao"] else None
        linhas.append(
            {
                "numero_ipm": g["numero_ipm"],
                "ano": _ano_de_numero_ipm(g["numero_ipm"]) or (data_inst.year if data_inst else None),
                "tipo": "IPM",
                "encarregado": None,
                "situacao": situacao,
                "prazo": prazo,
                "dias_atraso": None,
                "objeto": " ".join(g["naturezas"]) or None,
                "origem_arquivo": UNC_IPM_CPAM5_SET2024,
                "aba": "16 BPMM",
                "extra": {
                    "data_instauracao": g["data_instauracao"],
                    "data_conclusao_raw": data_concl_raw,
                    "qtd_averiguados": len(g["averiguados"]),
                    "averiguados": g["averiguados"],
                },
            }
        )
    return linhas, lidas, []


# ----------------------------------------------------------------------------
# 3) spjmd_acervo_contagem
# ----------------------------------------------------------------------------
def contar_acervo() -> tuple[list[dict], list[str]]:
    if not caminho_disponivel(RAIZ_MATRIX):
        return [], [f"raiz indisponível no momento da execução: {RAIZ_MATRIX}"]

    linhas = []
    descartes = []
    try:
        entradas = sorted(os.listdir(RAIZ_MATRIX))
    except OSError as e:
        return [], [f"falha ao listar {RAIZ_MATRIX}: {e}"]

    for nome in entradas:
        caminho = os.path.join(RAIZ_MATRIX, nome)
        if not os.path.isdir(caminho):
            continue
        qtd = 0
        for _raiz, _dirs, arquivos in os.walk(caminho):
            qtd += len(arquivos)

        m = re.search(r"(20\d{2})\s*$", nome.strip())
        if m:
            ano = int(m.group(1))
            nome_sem_ano = nome[: m.start()].strip()
        else:
            ano = None
            nome_sem_ano = nome

        subarea = _slug(nome_sem_ano) or _slug(nome)
        subarea = MAPA_SUBAREA.get(subarea, subarea)

        linhas.append(
            {
                "subarea": subarea,
                "ano": ano,
                "quantidade_arquivos": qtd,
                "fonte": RAIZ_MATRIX,
            }
        )
    return linhas, descartes


# ----------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    batch_id = None if args.dry_run else abrir_batch(SECAO, FONTE)
    todos_descartes: list[str] = []
    erro_fatal = None
    resumo = {}

    try:
        # 1) processos
        linhas_proc, lidas_proc, desc_proc = carregar_processos()
        todos_descartes.extend(desc_proc)
        print(f"[spjmd] processos: {lidas_proc} lidas, {len(linhas_proc)} válidas")
        resumo["processos_lidas"] = lidas_proc
        resumo["processos_validas"] = len(linhas_proc)

        # 2) ipm (3 fontes)
        linhas_ipm_a, lidas_a, desc_a = carregar_ipm_numerador_2025()
        linhas_ipm_b, lidas_b, desc_b = carregar_ipm_controle_prazo()
        linhas_ipm_c, lidas_c, desc_c = carregar_ipm_cpam5_set2024()
        todos_descartes.extend(desc_a + desc_b + desc_c)
        linhas_ipm = linhas_ipm_a + linhas_ipm_b + linhas_ipm_c
        print(
            f"[spjmd] ipm: numerador_2025={len(linhas_ipm_a)} controle_prazo={len(linhas_ipm_b)} "
            f"cpam5_set2024={len(linhas_ipm_c)} total={len(linhas_ipm)}"
        )
        resumo["ipm_validas"] = len(linhas_ipm)

        # 3) acervo
        linhas_acervo, desc_acervo = contar_acervo()
        todos_descartes.extend(desc_acervo)
        print(f"[spjmd] acervo: {len(linhas_acervo)} subpasta(s) de 1º nível contada(s)")
        resumo["acervo_subpastas"] = len(linhas_acervo)

        # arquivos_fonte (registro de proveniência)
        linhas_fonte = [
            {
                "dataset": "processos",
                "nome_arquivo": os.path.basename(CAMINHO_PROCESSOS_LOCAL),
                "caminho_unc": CAMINHO_PROCESSOS_LOCAL,
                "aba": None,
                "linhas_reais": lidas_proc,
                "observacao": "Fonte local (fora da rede) — export de processos com prazo, SPJMD",
            },
            {
                "dataset": "ipm",
                "nome_arquivo": "CONTROLE GERAL 2025.xlsx",
                "caminho_unc": UNC_IPM_NUMERADOR_2025,
                "aba": "IPM 2025",
                "linhas_reais": lidas_a,
                "observacao": "Numerador oficial 2025 (10 IPMs com dado real de 108 linhas de numeração)",
            },
            {
                "dataset": "ipm",
                "nome_arquivo": "Controle Prazo de IPM 14.03.25.xlsx",
                "caminho_unc": UNC_IPM_CONTROLE_PRAZO,
                "aba": "Plan1",
                "linhas_reais": lidas_b,
                "observacao": "Snapshot de prazo processual em 14/03/2025",
            },
            {
                "dataset": "ipm",
                "nome_arquivo": "PLANILHAS DE PRAZO - CPAM5 IPM - SET2024 16ºBPMM.xlsx",
                "caminho_unc": UNC_IPM_CPAM5_SET2024,
                "aba": "16 BPMM",
                "linhas_reais": lidas_c,
                "observacao": (
                    f"Controle histórico cumulativo 2018→set/2024, agrupado em {len(linhas_ipm_c)} IPMs "
                    "a partir de linhas cruas (com continuação de averiguados); snapshot mais recente "
                    "localizado nesta série no espelho MATRIX"
                ),
            },
            {
                "dataset": "acervo",
                "nome_arquivo": "MATRIX (subpastas de 1º nível)",
                "caminho_unc": RAIZ_MATRIX,
                "aba": None,
                "linhas_reais": len(linhas_acervo),
                "observacao": "Contagem recursiva de arquivos por subpasta de 1º nível (Get-ChildItem -Recurse -File equivalente)",
            },
        ]

        if args.dry_run:
            print(f"[spjmd] dry-run — nenhuma gravação. Descartes: {len(todos_descartes)}")
            if todos_descartes:
                print("  Amostra:", todos_descartes[:10])
            return

        # --- spjmd_processos: insert simples só se tabela vazia ---
        if linhas_proc:
            if _contar_linhas_tabela("spjmd_processos") == 0:
                upsert_generico("spjmd_processos", linhas_proc, on_conflict=None)
                print(f"[spjmd] spjmd_processos: {len(linhas_proc)} linha(s) inserida(s)")
            else:
                todos_descartes.append("spjmd_processos já tinha linhas — carga pulada para não duplicar")
                print("[spjmd] spjmd_processos já tinha linhas — pulado")

        # --- spjmd_ipm: insert simples só se tabela vazia ---
        if linhas_ipm:
            if _contar_linhas_tabela("spjmd_ipm") == 0:
                upsert_generico("spjmd_ipm", linhas_ipm, on_conflict=None)
                print(f"[spjmd] spjmd_ipm: {len(linhas_ipm)} linha(s) inserida(s)")
            else:
                todos_descartes.append("spjmd_ipm já tinha linhas — carga pulada para não duplicar")
                print("[spjmd] spjmd_ipm já tinha linhas — pulado")

        # --- spjmd_acervo_contagem: upsert de verdade (unique subarea,ano) ---
        if linhas_acervo:
            upsert_generico("spjmd_acervo_contagem", linhas_acervo, on_conflict="subarea,ano")
            print(f"[spjmd] spjmd_acervo_contagem: {len(linhas_acervo)} linha(s) upsert")

        # --- spjmd_arquivos_fonte: upsert de verdade (unique dataset,caminho_unc,aba) ---
        upsert_generico("spjmd_arquivos_fonte", linhas_fonte, on_conflict="dataset,caminho_unc,aba")
        print(f"[spjmd] spjmd_arquivos_fonte: {len(linhas_fonte)} registro(s) upsert")

    except Exception as e:  # noqa: BLE001
        erro_fatal = str(e)

    if args.dry_run:
        return

    if erro_fatal:
        fechar_batch(batch_id, "falha", descartes=todos_descartes, erro=erro_fatal)
        print(f"[spjmd] FALHA: {erro_fatal}")
        sys.exit(1)

    status = "ok" if not todos_descartes else "parcial"
    fechar_batch(batch_id, status, descartes=todos_descartes)
    print(f"[spjmd] Concluído ({status}). Descartes: {len(todos_descartes)}")


if __name__ == "__main__":
    main()
