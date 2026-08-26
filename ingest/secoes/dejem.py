"""
Ingestão DEJEM — Detached Escala Jornada Extra Metropolitana, 16º BPM/M.

Fonte: extração local a partir dos PDFs do SIRH > Escala
(sistemasadmin.intranet.policiamilitar.sp.gov.br, versão 28/07/2026), feita em
30JUL2026. Janela de escala e de confirmação: 01/01/2026 a 30/06/2026.
Os CSVs ficam por padrão em PASTA_PADRAO (Desktop do usuário) — não é UNC,
porque a extração é manual pelo navegador autenticado, e o SIRH não expõe
compartilhamento de rede.

Mapa arquivo → tabela:
  dejem_analitico_jan-jun_2026.csv         → dejem_jornadas        (2.598)
  dejem_gerencial_jan-jun_2026.csv         → dejem_escalas         (4.712)
  dejem_log_presenca_jan-jun_2026.csv      → dejem_log_presenca    (1.550)
  dejem_qtde_pm_escalados_jan-jun_2026.csv → dejem_escalados_opm  (27.924)
  dejem_gerencial_mai_2026_ESTADUAL.csv    → dejem_benchmark_gc  (agregado ~43)
  dejem_faltas_nominais_16bpmm.csv         → NÃO carregado

Três decisões que valem registro, porque cada uma corrige um erro real que o
dado induz:

1. O arquivo de faltas nominais NÃO é carregado. Ele é subconjunto exato do
   log (linhas com hora_para = 00:00). Carregá-lo em tabela própria criaria
   duas versões da mesma verdade. Em --dry-run o script CONFERE que toda linha
   de faltas existe no log e aborta se divergir: divergência significa que as
   duas extrações saíram de rodadas diferentes.

2. O CSV estadual NÃO entra cru. Ele tem 40.463 linhas e CONTÉM as linhas do
   CPA/M-5 (mesmo PDF de origem, gerencial_2026_05.pdf, do arquivo jan-jun).
   Carregá-lo em dejem_escalas duplicaria maio do 16º BPM/M. Ele serve a um
   único quadro — a posição do CPA/M-5 entre os Grandes Comandos — então é
   agregado em memória por Grande Comando e gravado com ~43 linhas.

3. A Companhia é derivada do NOME da OPM, nunca de faixa de código presumida.
   E o recorte do 16º BPM/M é por prefixo 5051 do código, nunca por "16" no
   nome: 6051xxxxx é o 16.BPM/I (Interior), unidade diferente, que
   contaminaria todos os números se filtrada por nome.

Nada de nome ou RE vai para stdout — só contagens.

Uso:
    python -m ingest.secoes.dejem --dry-run
    python -m ingest.secoes.dejem
    python -m ingest.secoes.dejem --dir "D:\\outra\\pasta" --force
"""
import argparse
import csv
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from ingest.common.carga import (
    abrir_batch,
    arquivo_ja_ingerido,
    fechar_batch,
    registrar_arquivo,
    sha256_arquivo,
    upsert_generico,
)

SECAO = "dejem"
ANO_REFERENCIA = 2026  # o CSV de escalados traz só o mês; a janela é 2026.
PASTA_PADRAO = Path.home() / "Desktop" / "Relatórios DEjem"

ARQ_JORNADAS = "dejem_analitico_jan-jun_2026.csv"
ARQ_ESCALAS = "dejem_gerencial_jan-jun_2026.csv"
ARQ_LOG = "dejem_log_presenca_jan-jun_2026.csv"
ARQ_ESCALADOS = "dejem_qtde_pm_escalados_jan-jun_2026.csv"
ARQ_BENCHMARK = "dejem_gerencial_mai_2026_ESTADUAL.csv"
ARQ_FALTAS = "dejem_faltas_nominais_16bpmm.csv"


# --------------------------------------------------------------------------
# Normalizadores. Cada um documenta o caso sujo real que o motivou.
# --------------------------------------------------------------------------
def _sem_acento(texto: str) -> str:
    """Remove diacríticos. Necessário porque a origem mistura º (U+00BA,
    ordinal) e ° (U+00B0, grau) na mesma coluna AISP."""
    return "".join(
        c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c)
    )


def norm_cia(opm: str) -> str | None:
    """OPM textual → '1'..'4' | 'ft' | 'em' | None.

    Casos reais tratados:
      "16.BPM/M 4.CIA PM"   -> '4'
      "16.BPM/M 1.CIA  PM"  -> '1'   (espaço DUPLO, 70 linhas no analítico)
      "16.BPM/M CIA F TAT"  -> 'ft'
      "16.BPM/M EM"         -> 'em'
      "16.BPM/M"            -> None  (44 linhas sem Companhia atribuída)
    """
    t = re.sub(r"\s+", " ", _sem_acento(opm or "").upper()).strip()
    if re.search(r"\bCIA\s*F\s*TAT\b", t) or re.search(r"\bF\s*TAT\b", t):
        return "ft"
    if re.search(r"\bEM\b", t):
        return "em"
    m = re.search(r"\b([1-4])\s*\.?\s*CIA\b", t)
    if m:
        return m.group(1)
    return None


def norm_aisp(aisp: str) -> str:
    """AISP crua → slug estável.

    O 16º muda de nome NA ORIGEM no meio do semestre:
      "16° BPM/M BATALHÃO"        (jan a abr, 233 linhas)
      "16º BPM/M - Estado Maior"  (mai e jun, 182 linhas)
    São a mesma unidade e precisam colapsar em '16bpmm', senão a série
    temporal do batalhão se parte em dois no meio do estudo.

    Pegadinha do Unicode que já quebrou esta função uma vez: a origem usa DOIS
    caracteres diferentes que parecem o mesmo símbolo — U+00B0 GRAU no
    "16°" e U+00BA ORDINAL MASCULINO no "16º". A normalização NFKD decompõe
    o ORDINAL em "o" e deixa o GRAU intacto. Por isso o padrão aceita os três:
    "16°", "16o" e "16" seco.
    """
    t = re.sub(r"\s+", " ", _sem_acento(aisp or "").upper()).strip()
    if re.match(r"^16\s*[°ºO]?\s*\.?\s*[-–]?\s*BPM\s*/\s*M\b", t):
        return "16bpmm"
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-") or "sem-aisp"


def hhmm_para_horas(valor: str) -> float | None:
    """'08:00' -> 8.0; '' -> None. Aceita horas >= 24 (não ocorre, mas o
    parser não deve inventar limite que a origem não tem)."""
    v = (valor or "").strip()
    if not v:
        return None
    m = re.match(r"^(\d{1,3}):(\d{2})$", v)
    if not m:
        return None
    return round(int(m.group(1)) + int(m.group(2)) / 60, 2)


def parse_data(valor: str) -> str | None:
    """'06/01/2026' -> '2026-01-06' (ISO, para o PostgREST)."""
    v = (valor or "").strip()
    try:
        return datetime.strptime(v, "%d/%m/%Y").date().isoformat()
    except ValueError:
        return None


def parse_datahora(valor: str) -> tuple[str, str] | None:
    """'06/01/2026 14:05' -> ('2026-01-06', '14:05').

    Data e hora voltam SEPARADAS de propósito: a tabela guarda date + time em
    colunas distintas, para que ano/mes/dow possam ser colunas geradas
    (extract sobre timestamptz não é IMMUTABLE) e para que a jornada que
    começa 18:15 não escorregue de mês por fuso.
    """
    v = re.sub(r"\s+", " ", (valor or "").strip())
    try:
        dt = datetime.strptime(v, "%d/%m/%Y %H:%M")
    except ValueError:
        return None
    return dt.date().isoformat(), dt.strftime("%H:%M")


def parse_timestamp(valor: str) -> str | None:
    """'04/02/2026 08:52:14' -> ISO com fuso. O SIRH grava horário local
    (America/Sao_Paulo, UTC-3); o campo é timestamptz."""
    v = re.sub(r"\s+", " ", (valor or "").strip())
    for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M"):
        try:
            return datetime.strptime(v, fmt).isoformat() + "-03:00"
        except ValueError:
            continue
    return None


def parse_periodo(valor: str) -> tuple[str | None, str | None]:
    """'04:45às12:45' -> ('04:45', '12:45'). Tolera 'as', 'às', 'à' e
    espaços — a origem oscila entre as três grafias."""
    v = _sem_acento((valor or "")).lower().replace(" ", "")
    m = re.match(r"^(\d{2}:\d{2})a?s?(\d{2}:\d{2})$", v)
    if not m:
        return None, None
    return m.group(1), m.group(2)


POSTOS = {
    "CAP PM": "CAP", "CAPITAO PM": "CAP",
    "1. TEN PM": "1TEN", "1. TENENTE PM": "1TEN",
    "2. TEN PM": "2TEN", "2. TENENTE PM": "2TEN",
    "1. SGT PM": "1SGT", "1. SARGENTO PM": "1SGT",
    "2. SGT PM": "2SGT", "2. SARGENTO PM": "2SGT",
    "3. SGT PM": "3SGT", "3. SARGENTO PM": "3SGT",
    "SUB TEN PM": "SUBTEN", "SUB TENENTE PM": "SUBTEN",
    "CB PM": "CB", "CABO PM": "CB",
    "SD PM": "SD", "SOLDADO PM": "SD",
}


def norm_posto(posto: str) -> str | None:
    t = re.sub(r"\s+", " ", _sem_acento(posto or "").upper()).strip()
    return POSTOS.get(t)


def parse_tipo(valor: str) -> tuple[int | None, str]:
    """'15 - DEJEM METRÔ' -> (15, '15 - DEJEM METRÔ')."""
    v = (valor or "").strip()
    m = re.match(r"^(\d+)\s*-", v)
    return (int(m.group(1)) if m else None), v


def parse_alterado_por(valor: str) -> tuple[str | None, str | None]:
    """'3. SARGENTO PM 964628 MIRIAM MENDES DOS REIS' -> ('964628', 'MIRIAM ...').

    É o eixo da trilha de auditoria: quem lança a confirmação de presença.
    """
    v = re.sub(r"\s+", " ", (valor or "").strip())
    m = re.match(r"^(.*?PM)\s+(\d{5,7})\s+(.*)$", v)
    if not m:
        return None, None
    return m.group(2), m.group(3).strip()


# --------------------------------------------------------------------------
# Leitores. Cada um devolve (linhas_para_gravar, relatorio_dict).
# --------------------------------------------------------------------------
def _abrir(caminho: Path):
    """Todos os CSVs têm BOM (utf-8-sig) e delimitador ';' — conferido no head."""
    return csv.DictReader(open(caminho, encoding="utf-8-sig"), delimiter=";")


def ler_jornadas(caminho: Path) -> tuple[list[dict], dict]:
    linhas, descartes = [], []
    por_cia: Counter = Counter()
    for i, r in enumerate(_abrir(caminho), start=1):
        dh = parse_datahora(r.get("data_hora", ""))
        horas = hhmm_para_horas(r.get("horas", ""))
        tipo_cod, tipo_rotulo = parse_tipo(r.get("tipo", ""))
        if not dh or horas is None or tipo_cod is None or not (r.get("re") or "").strip():
            descartes.append({"linha": i, "motivo": "campo obrigatório inválido"})
            continue
        data_jornada, hora_inicio = dh
        cia = norm_cia(r.get("opm", ""))
        por_cia[cia or "sem"] += 1
        linhas.append({
            "re": r["re"].strip(),
            "nome": (r.get("nome") or "").strip(),
            "posto": (r.get("posto") or "").strip() or None,
            "posto_norm": norm_posto(r.get("posto", "")),
            "opm_bruto": (r.get("opm") or "").strip(),
            "cia": cia,
            "data_jornada": data_jornada,
            "hora_inicio": hora_inicio,
            "horas": horas,
            "tipo_cod": tipo_cod,
            "tipo_rotulo": tipo_rotulo,
            "origem_arquivo": caminho.name,
            "linha_num": i,
        })
    return linhas, {"por_cia": dict(por_cia), "descartes": descartes}


def _ler_gerencial_bruto(caminho: Path):
    """Gerador comum ao gerencial do CPA/M-5 e ao estadual."""
    for i, r in enumerate(_abrir(caminho), start=1):
        data = parse_data(r.get("data", ""))
        if not data:
            continue
        ini, fim = parse_periodo(r.get("periodo", ""))
        n = lambda c: int((r.get(c) or "0").strip() or 0)  # noqa: E731
        yield i, r, data, ini, fim, n


def ler_escalas(caminho: Path) -> tuple[list[dict], dict]:
    linhas, por_aisp = [], Counter()
    for i, r, data, ini, fim, n in _ler_gerencial_bruto(caminho):
        aisp = (r.get("aisp") or "").strip()
        aisp_norm = norm_aisp(aisp)
        por_aisp[aisp_norm] += 1
        conv = (r.get("conv") or "").strip()
        linhas.append({
            "cpa": (r.get("cpa") or "").strip(),
            "conv": int(conv) if conv.isdigit() else None,
            "aisp": aisp,
            "aisp_norm": aisp_norm,
            "dia_semana": (r.get("dia_semana") or "").strip() or None,
            "data": data,
            "periodo": (r.get("periodo") or "").strip(),
            "hora_inicio": ini,
            "hora_fim": fim,
            "escalas_of": n("escalas_of"), "escalas_pc": n("escalas_pc"),
            "inscritos_of": n("inscritos_of"), "inscritos_pc": n("inscritos_pc"),
            "escalados_of": n("escalados_of"), "escalados_pc": n("escalados_pc"),
            "outro_local_of": n("outro_local_of"), "outro_local_pc": n("outro_local_pc"),
            "presentes_of": n("presentes_of"), "presentes_pc": n("presentes_pc"),
            "origem_arquivo": caminho.name,
            "linha_num": i,
        })
    return linhas, {"por_aisp": dict(por_aisp)}


def ler_benchmark(caminho: Path) -> tuple[list[dict], dict]:
    """Agrega o estadual por (ano, mês, Grande Comando) EM MEMÓRIA.
    O cru nunca entra no banco — ver decisão 2 no docstring do módulo."""
    acc: dict[tuple, dict] = defaultdict(
        lambda: {"vagas": 0, "inscritos": 0, "escalados": 0, "presentes": 0}
    )
    lidas = 0
    for _i, r, data, _ini, _fim, n in _ler_gerencial_bruto(caminho):
        lidas += 1
        ano, mes = int(data[:4]), int(data[5:7])
        gc = (r.get("cpa") or "").strip() or "(sem Grande Comando)"
        a = acc[(ano, mes, gc)]
        a["vagas"] += n("escalas_of") + n("escalas_pc")
        a["inscritos"] += n("inscritos_of") + n("inscritos_pc")
        a["escalados"] += n("escalados_of") + n("escalados_pc")
        a["presentes"] += n("presentes_of") + n("presentes_pc")
    linhas = [
        {"ano": ano, "mes": mes, "grande_comando": gc, **v, "origem_arquivo": caminho.name}
        for (ano, mes, gc), v in sorted(acc.items())
    ]
    return linhas, {"linhas_cruas": lidas, "grandes_comandos": len(linhas)}


def ler_log(caminho: Path) -> tuple[list[dict], dict]:
    linhas, zerados = [], Counter()
    descartados_cabecalho = 0
    for i, r in enumerate(_abrir(caminho), start=1):
        data_inicio = parse_data(r.get("data_inicio", ""))
        atualizado = parse_timestamp(r.get("atualizado_em", ""))
        if not data_inicio or not atualizado or not (r.get("re") or "").strip():
            continue
        # 99 linhas do CSV são o BLOCO DE FILTRO impresso no topo de cada
        # página do relatório ("CPA Responsável: CPA/M-5 · Convênio: TODOS"),
        # que o extrator de PDF capturou como se fossem dados. O sinal limpo é
        # `escala` vazia: evento real de presença sempre tem nº de escala.
        if not (r.get("escala") or "").strip():
            descartados_cabecalho += 1
            continue
        aisp = (r.get("aisp") or "").strip()
        aisp_norm = norm_aisp(aisp)
        alt_re, alt_nome = parse_alterado_por(r.get("alterado_por", ""))
        horas_para = hhmm_para_horas(r.get("hora_para", ""))
        if horas_para == 0:
            zerados[aisp_norm] += 1
        linhas.append({
            "escala": (r.get("escala") or "").strip(),
            "aisp": aisp,
            "aisp_norm": aisp_norm,
            "data_inicio": data_inicio,
            "data_termino_bruto": (r.get("data_termino") or "").strip() or None,
            "convenio": (r.get("convenio") or "").strip() or None,
            "posto": (r.get("posto") or "").strip() or None,
            "re": r["re"].strip(),
            "nome": (r.get("nome") or "").strip(),
            "atualizado_em": atualizado,
            "horas_de": hhmm_para_horas(r.get("hora_de", "")),
            "horas_para": horas_para,
            "alterado_por": (r.get("alterado_por") or "").strip(),
            "alterado_por_re": alt_re,
            "alterado_por_nome": alt_nome,
            "origem_arquivo": caminho.name,
            "linha_num": i,
        })
    return linhas, {
        "zerados_por_aisp": dict(zerados),
        "descartados_cabecalho": descartados_cabecalho,
    }


def ler_escalados(caminho: Path) -> tuple[list[dict], dict]:
    linhas, opms_16 = [], {}
    for r in _abrir(caminho):
        mes = (r.get("mes") or "").strip()
        cod = (r.get("opm_cod") or "").strip()
        qtde = (r.get("qtde") or "").strip()
        if not mes.isdigit() or not cod or not qtde.lstrip("-").isdigit():
            continue
        nome = (r.get("opm_nome") or "").strip()
        # Recorte do 16º BPM/M por PREFIXO DE CÓDIGO. Nunca por nome: 6051*
        # é o 16.BPM/I (Interior), unidade diferente.
        eh_16 = cod.startswith("5051")
        cia = norm_cia(nome) if eh_16 else None
        if eh_16:
            opms_16[cod] = nome
        linhas.append({
            "ano": ANO_REFERENCIA,
            "mes": int(mes),
            "opm_cod": cod,
            "opm_nome": nome,
            "qtde": int(qtde),
            "cia": cia,
            "origem_arquivo": caminho.name,
        })
    return linhas, {"opms_16bpmm": opms_16}


def conferir_faltas(caminho_faltas: Path, log: list[dict]) -> dict:
    """Assert de sanidade: toda linha do arquivo de faltas tem de existir no
    log. Se não existir, as duas extrações saíram de rodadas diferentes e o
    estudo estaria misturando bases — melhor abortar do que publicar."""
    if not caminho_faltas.exists():
        return {"conferido": False, "motivo": "arquivo ausente"}
    chaves = {(l["escala"], l["re"], l["atualizado_em"][:19]) for l in log}
    faltas, ausentes = 0, 0
    for r in _abrir(caminho_faltas):
        faltas += 1
        ts = parse_timestamp(r.get("atualizado_em", ""))
        chave = ((r.get("escala") or "").strip(), (r.get("re") or "").strip(), (ts or "")[:19])
        if chave not in chaves:
            ausentes += 1
    return {"conferido": True, "faltas_no_arquivo": faltas, "ausentes_no_log": ausentes}


# --------------------------------------------------------------------------
# Orquestração
# --------------------------------------------------------------------------
DATASETS = [
    ("jornadas", ARQ_JORNADAS, ler_jornadas, "dejem_jornadas", "re,data_jornada,hora_inicio,tipo_cod"),
    ("escalas", ARQ_ESCALAS, ler_escalas, "dejem_escalas", "origem_arquivo,linha_num"),
    ("log", ARQ_LOG, ler_log, "dejem_log_presenca", "origem_arquivo,linha_num"),
    ("escalados", ARQ_ESCALADOS, ler_escalados, "dejem_escalados_opm", "ano,mes,opm_cod"),
    ("benchmark", ARQ_BENCHMARK, ler_benchmark, "dejem_benchmark_gc", "ano,mes,grande_comando"),
]


def main() -> int:
    ap = argparse.ArgumentParser(description="Ingestão DEJEM — 16º BPM/M.")
    ap.add_argument("--dir", default=str(PASTA_PADRAO), help="pasta dos CSVs")
    ap.add_argument("--dry-run", action="store_true", help="lê, confere e NÃO grava")
    ap.add_argument("--force", action="store_true", help="reingere mesmo com sha inalterado")
    args = ap.parse_args()

    pasta = Path(args.dir)
    if not pasta.exists():
        print(f"[dejem] pasta não encontrada: {pasta}", file=sys.stderr)
        return 1

    lidos: dict[str, list[dict]] = {}
    total_erros = 0

    for chave, nome_arq, leitor, tabela, on_conflict in DATASETS:
        caminho = pasta / nome_arq
        if not caminho.exists():
            print(f"[dejem] {chave}: arquivo ausente ({nome_arq}) — pulado")
            total_erros += 1
            continue

        sha = sha256_arquivo(str(caminho))
        linhas, rel = leitor(caminho)
        lidos[chave] = linhas
        print(f"[dejem] {chave}: {len(linhas)} linhas válidas de {nome_arq}")
        for k, v in rel.items():
            if k == "descartes":
                if v:
                    print(f"           descartes: {len(v)} (amostra: {v[:3]})")
            else:
                print(f"           {k}: {v}")

        if args.dry_run:
            continue

        if not args.force and arquivo_ja_ingerido(SECAO, str(caminho), sha):
            print(f"           inalterado (sha {sha[:8]}…) — pulado")
            continue

        batch = abrir_batch(SECAO, nome_arq)
        try:
            upsert_generico(tabela, linhas, on_conflict)
            registrar_arquivo(
                SECAO, str(caminho), sha,
                datetime.fromtimestamp(caminho.stat().st_mtime, timezone.utc).isoformat(),
                len(linhas),
                f"dataset={chave}; tabela={tabela}",
                batch,
            )
            fechar_batch(batch, "ok", len(linhas), len(linhas), len(rel.get("descartes", [])))
            print(f"           gravado em {tabela}")
        except Exception as e:  # noqa: BLE001
            fechar_batch(batch, "erro", erro=str(e))
            print(f"[dejem] {chave}: FALHA — {e}", file=sys.stderr)
            total_erros += 1

    # Assert de sanidade entre faltas e log (não grava nada).
    if "log" in lidos:
        conf = conferir_faltas(pasta / ARQ_FALTAS, lidos["log"])
        print(f"[dejem] conferência faltas×log: {conf}")
        if conf.get("ausentes_no_log", 0) > 0:
            print(
                "[dejem] ABORTADO: há faltas que não existem no log — as duas "
                "extrações são de rodadas diferentes.",
                file=sys.stderr,
            )
            return 2

    print(f"[dejem] concluído{' (dry-run, nada gravado)' if args.dry_run else ''}; erros: {total_erros}")
    return 1 if total_erros else 0


if __name__ == "__main__":
    raise SystemExit(main())
