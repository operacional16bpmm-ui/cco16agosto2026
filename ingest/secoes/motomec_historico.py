"""
Ingestão Motomec — séries HISTÓRICAS complementares ao que já foi carregado
por motomec_operacional.py (que cobriu só o "estado atual" MOTOMEC 2026).

Pedido explícito do usuário: carga COMPLEMENTAR nas tabelas motomec_* já
existentes (nunca sobrescrever o que já está certo — só ADICIONAR linhas
novas via upsert respeitando as unique constraints já definidas) + duas
séries mensais NOVAS de composição de frota histórica.

1. Abastecimento 2025 — mesma fonte/lógica de
   `motomec_operacional.extrair_abastecimento_geral_siag` (aba "GERAL SIAG"
   dentro de cada "...CONFERIDO...xls", export bruto SIAG com cupom fiscal
   real, cobrindo 1ª-4ª CIA + Força Tática + Estado-Maior de uma vez),
   generalizada para MOTOMEC 2025\ABASTECIMENTO\<mês>\ (12 meses x 2
   quinzenas = 24 arquivos "CONFERIDO <quinzena>.xls"). Grava na MESMA
   tabela motomec_abastecimento (unique cupom_fiscal,produto,prefixo) —
   upsert idempotente. Verificado antes de carregar (SELECT no Supabase):
   as 6.186 linhas já existentes em motomec_abastecimento são TODAS de
   2026 (jan-jul) — 2025 é ano genuinamente novo, sem overlap a checar.
   MOTOMEC 2026 não é reprocessado aqui (já coberto por motomec_operacional.py).

   BUG REAL ENCONTRADO E CORRIGIDO NESTA RODADA: a constraint original
   unique(cupom_fiscal,produto,prefixo) da migration 009 assumia cupom
   fiscal globalmente único. Falso: no SIAG, transações sem cupom real
   recebem placeholder "0" ou "1" — e dezenas de abastecimentos GENUINAMENTE
   distintos da MESMA viatura/produto compartilham esse placeholder. O
   primeiro upsert desta rodada (2025 sobre a tabela já populada com 2026)
   colidiu nessas triplas e SOBRESCREVEU 104 linhas de 2026 com dado de
   2025 (mesmo id de linha). Corrigido via migration 015: constraint agora
   é unique(cupom_fiscal,produto,prefixo,data_abastecimento) — restaurado
   reexecutando motomec_operacional.py (que também teve seu on_conflict
   atualizado para a chave de 4 colunas). Efeito colateral positivo: a
   nova chave também destrava transações de 2026 que a chave antiga já
   vinha colapsando silenciosamente (bug pré-existente, anterior a esta
   rodada) — 6.082 -> 6.245 linhas de 2026 só com a correção, antes de
   somar as 11.367 linhas novas de 2025.

2. Composição mensal da frota (Mapa Descritivo) — série histórica 2021-2026
   (2020 não tem pasta MAPA DESCRITIVO própria — só um mirror parcial de
   2021 dentro de MOTOMEC 2020\MOTOMEC 2021\, mesmo conteúdo, não conta como
   ano adicional). A pasta chama "MAPA DESCRITIVO" em 2021/2022/2023/2024/
   2026 e "MAPA DESCRITIVO DE VIATURAS" em 2025 (mesmo layout de aba). Só é
   atualizada em alguns meses do ano (não é rotina mensal), cobertura real:
   2021 (4 meses), 2022 (7), 2023 (9), 2024 (6), 2025 (8), 2026 (3) = 37
   snapshots mensais.
   Duas tabelas NOVAS (migration 014), unique(ano,mes,prefixo) em ambas —
   cada linha é o snapshot daquele mês, não sobrescreve o "estado atual" de
   motomec_frota_operacional/public.viaturas:
   - motomec_frota_mensal          (aba "Descritivo")
   - motomec_remanejamento_mensal  (aba "Remanejada"/"Reamanejada" — nome
     varia por ano; mesmo dado)
   Layout de colunas idêntico ano a ano nas primeiras 13 colunas nomeadas
   (Patrimônio..Situação); as colunas 14/15 mudam de rótulo conforme o ano
   mas SEMPRE na mesma posição semântica (confirmado por inspeção real de
   2021/2022/2023/2024/2025/2026): col.14 = observação/Data da Baixa na
   Descritivo, ou Tipo de Policiamento na Remanejada; col.15 = Tipo de
   Policiamento na Descritivo, ou destino/unidade de remanejamento (coluna
   sem cabeçalho no arquivo original) na Remanejada.

Datasets inspecionados e DESCARTADOS nesta rodada (baixo valor estatístico
por granularidade excessiva, formato não-tabular ou redundância — não
descartados silenciosamente, registrados aqui e no retorno da ingestão):
- MAPA DIÁRIO / MAPA DIARIO / MAPAS\* (2020-2026): milhares de snapshots
  DIÁRIOS da situação da frota — mesma informação que MAPA DESCRITIVO já
  cobre em corte mensal, carregar cada dia individualmente não agrega valor
  estatístico proporcional ao esforço/volume (>8.000 arquivos).
- PROJETO(S) BÁSICO(S), ESCALAS/ESCALA, EFETIVO, PESQUISA DE PREÇO, RADIOS,
  CONTROLE DE FREQUÊNCIA/FREQUENCIA, NUMERADOR, TELEMETRIA, TROCA DE
  PLACAS, PREGÃO, CHECK LIST, QFF: documentos administrativos/processuais
  com layout manual próprio por pasta, sem série tabular consistente ano a
  ano — fora do escopo desta rodada (ver relatório da ingestão).
- PROCESSO DE DESCARGA/DESCAGA de anos anteriores a 2026: só o snapshot
  atual (2026), já carregado em motomec_descarga via motomec_operacional.py,
  foi considerado prioritário; o histórico por ano fica como pendência.
- ABASTECIMENTO PENDENTE, CADASTRO DE MOTORISTA/USUÁRIOS SIAG, TAGs não
  cadastradas etc. dentro de ABASTECIMENTO\: mesma decisão de descarte já
  documentada em motomec_operacional.py (controle administrativo de usuário
  do sistema SIAG, não transação de abastecimento nem frota).
- Pasta "DESCRITIVO" solta dentro de MOTOMEC 2020\ (fora de MAPA
  DESCRITIVO\, estrutura própria não inspecionada) — fica como pendência.

Uso:
    python -m ingest.secoes.motomec_historico [--dry-run]
"""
import argparse
import glob
import os
import re
import sys

import openpyxl
import xlrd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ingest.common.unc import caminho_disponivel
from ingest.common.excel import eh_arquivo_lixo
from ingest.common.carga import upsert_generico
from ingest.secoes.motomec_operacional import (
    _txt,
    _cupom_normalizado,
    _datahora,
    _prefixo_normalizado,
    _mapa_cabecalho,
)

SECAO = "motomec"
RAIZ_MATRIZ = r"\\cmdo\pmesp\16BPMM\16BPMM_EM\MOTOMEC\Matriz Motomec 16M"

_MES_REGEX = re.compile(
    r"(?i)\b(JANEIRO|FEVEREIRO|MAR[CÇ]O|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\b"
)
_MES_ARQUIVO_REGEX = re.compile(
    r"(?i)^\s*(?:\d{1,2}\s*-?\s*)?"
    r"(JANEIRO|FEVEREIRO|MAR[CÇ]O|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)"
    r"(?:\s+(20\d{2}))?\.?\s*$"
)
_MESES_NUM = {
    "JANEIRO": 1, "FEVEREIRO": 2, "MARCO": 3, "MARÇO": 3, "ABRIL": 4, "MAIO": 5,
    "JUNHO": 6, "JULHO": 7, "AGOSTO": 8, "SETEMBRO": 9, "OUTUBRO": 10,
    "NOVEMBRO": 11, "DEZEMBRO": 12,
}

_PASTAS_MAPA_DESCRITIVO = {
    2021: "MAPA DESCRITIVO",
    2022: "MAPA DESCRITIVO",
    2023: "MAPA DESCRITIVO",
    2024: "MAPA DESCRITIVO",
    2025: "MAPA DESCRITIVO DE VIATURAS",
    2026: "MAPA DESCRITIVO",
}


def _prefixo(v):
    return _prefixo_normalizado(v) if not isinstance(v, str) else _txt(v)


# ----------------------------------------------------------------------------
# 1. Abastecimento 2025 — GERAL SIAG (mesma lógica de
#    motomec_operacional.extrair_abastecimento_geral_siag, generalizada para
#    receber o ano como parâmetro em vez de fixar MOTOMEC 2026).
# ----------------------------------------------------------------------------
def extrair_abastecimento_geral_siag(ano: int) -> tuple[list[dict], list[str]]:
    linhas: list[dict] = []
    origem: list[str] = []
    base_abast = os.path.join(RAIZ_MATRIZ, f"MOTOMEC {ano}", "ABASTECIMENTO")
    if not os.path.isdir(base_abast):
        return linhas, origem

    arquivos: list[str] = []
    for nome_mes in sorted(os.listdir(base_abast)):
        caminho_mes = os.path.join(base_abast, nome_mes)
        if not os.path.isdir(caminho_mes) or not _MES_REGEX.search(nome_mes):
            continue
        for dirpath, _dirnames, filenames in os.walk(caminho_mes):
            for fn in filenames:
                if eh_arquivo_lixo(fn):
                    continue
                if fn.lower().endswith(".xls") and "conferido" in fn.lower():
                    arquivos.append(os.path.join(dirpath, fn))

    for caminho in sorted(arquivos):
        try:
            wb = xlrd.open_workbook(caminho)
        except Exception:
            continue
        if "GERAL SIAG" not in wb.sheet_names():
            continue
        ws = wb.sheet_by_name("GERAL SIAG")
        if ws.nrows < 2:
            continue

        header = _mapa_cabecalho([ws.cell_value(0, c) for c in range(ws.ncols)])

        def col(*nomes):
            for nome in nomes:
                if nome in header:
                    return header[nome]
            return None

        c_placa = col("PLACA")
        c_data = col("DATA")
        c_prefixo = col("PREFIXO", "NUMERO FROTA")
        c_motorista = col("MOTORISTA")
        c_produto = col("PRODUTO")
        c_fabricante = col("FABRICANTE")
        c_estab = col("NOME FANTASIA", "ESTABELECIMENTO")
        c_cidade = col("CIDADE")
        c_uf = col("UF")
        c_distancia = col("DISTÂNCIA", "DISTANCIA")
        c_consumo = col("CONSUMO")
        c_hodometro = col("HODÔMETRO/HORÍMETRO", "HODOMETRO")
        c_quantidade = col("QUANTIDADE")
        c_val_unit = col("VALOR UNITÁRIO", "VALOR UNITARIO")
        c_val_total = col("VALOR TOTAL")
        c_cupom = col("CUPOM FISCAL")
        c_programa = col("PROGRAMA DE POLICIAMENTO")

        if c_data is None or c_prefixo is None or c_cupom is None:
            continue

        def val(r, c):
            return ws.cell_value(r, c) if c is not None else None

        rel = os.path.relpath(caminho, base_abast)
        n = 0
        vistos_arquivo: set = set()
        for r in range(1, ws.nrows):
            data_raw = val(r, c_data)
            prefixo_raw = val(r, c_prefixo)
            if not data_raw or not prefixo_raw:
                continue
            data_h = _datahora(data_raw)
            if data_h is None:
                continue
            produto = _txt(val(r, c_produto))
            prefixo = _prefixo(prefixo_raw)
            cupom = _cupom_normalizado(val(r, c_cupom))
            chave = (cupom, produto, prefixo)
            if chave in vistos_arquivo:
                continue
            vistos_arquivo.add(chave)
            linhas.append(
                {
                    "placa": _txt(val(r, c_placa)),
                    "prefixo": prefixo,
                    "data_abastecimento": data_h,
                    "motorista": _txt(val(r, c_motorista)),
                    "produto": produto,
                    "fabricante": _txt(val(r, c_fabricante)),
                    "estabelecimento": _txt(val(r, c_estab)),
                    "cidade": _txt(val(r, c_cidade)),
                    "uf": _txt(val(r, c_uf)),
                    "distancia": _numero(val(r, c_distancia)),
                    "consumo": _numero(val(r, c_consumo)),
                    "hodometro": _numero(val(r, c_hodometro)),
                    "quantidade": _numero(val(r, c_quantidade)),
                    "valor_unitario": _numero(val(r, c_val_unit)),
                    "valor_total": _numero(val(r, c_val_total)),
                    "cupom_fiscal": cupom,
                    "programa_policiamento": _txt(val(r, c_programa)),
                    "origem_arquivo": f"MOTOMEC {ano}/{rel}",
                }
            )
            n += 1
        if n:
            origem.append(f"{rel}: {n} linhas")

    vistos_global: set = set()
    unicas = []
    for l in linhas:
        chave = (l["cupom_fiscal"], l["produto"], l["prefixo"])
        if chave in vistos_global:
            continue
        vistos_global.add(chave)
        unicas.append(l)
    return unicas, origem


def _numero(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


# ----------------------------------------------------------------------------
# 2. Mapa Descritivo mensal (composição da frota + remanejamentos)
# ----------------------------------------------------------------------------
def _mes_ano_do_arquivo(nome_arquivo: str, ano_pasta: int):
    stem = os.path.splitext(nome_arquivo)[0]
    m = _MES_ARQUIVO_REGEX.match(stem.strip())
    if not m:
        return None
    mes_nome = m.group(1).upper()
    mes = _MESES_NUM.get(mes_nome)
    if mes is None:
        return None
    ano = int(m.group(2)) if m.group(2) else ano_pasta
    return ano, mes


def _linha_base(row) -> dict:
    return {
        "patrimonio": _txt(row[0]) if len(row) > 0 else None,
        "gpo": _txt(row[1]) if len(row) > 1 else None,
        "conv": _txt(row[2]) if len(row) > 2 else None,
        "prefixo": _prefixo(row[3]) if len(row) > 3 else None,
        "prefixo_anterior": _prefixo(row[4]) if len(row) > 4 else None,
        "ano_fabricacao": _txt(row[5]) if len(row) > 5 else None,
        "placa": _txt(row[6]) if len(row) > 6 else None,
        "marca": _txt(row[7]) if len(row) > 7 else None,
        "modelo": _txt(row[8]) if len(row) > 8 else None,
        "combustivel": _txt(row[9]) if len(row) > 9 else None,
        "unidade": _txt(row[10]) if len(row) > 10 else None,
        "cia": _txt(row[11]) if len(row) > 11 else None,
        "situacao": _txt(row[12]) if len(row) > 12 else None,
    }


def extrair_mapa_descritivo() -> tuple[list[dict], list[dict], list[str]]:
    """Retorna (linhas_frota, linhas_remanejamento, origem)."""
    linhas_frota: list[dict] = []
    linhas_reman: list[dict] = []
    origem: list[str] = []

    for ano, subpasta in _PASTAS_MAPA_DESCRITIVO.items():
        raiz = os.path.join(RAIZ_MATRIZ, f"MOTOMEC {ano}", subpasta)
        if not os.path.isdir(raiz):
            continue
        for caminho in sorted(glob.glob(os.path.join(raiz, "*.xlsx"))):
            nome_arq = os.path.basename(caminho)
            if eh_arquivo_lixo(nome_arq):
                continue
            periodo = _mes_ano_do_arquivo(nome_arq, ano)
            if periodo is None:
                continue  # não é um arquivo de snapshot mensal (QFF, ofício, etc.)
            ano_mapa, mes_mapa = periodo

            try:
                wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
            except Exception as e:
                origem.append(f"MOTOMEC {ano}/{subpasta}/{nome_arq}: FALHOU ao abrir ({e})")
                continue

            sheet_descritivo = next((s for s in wb.sheetnames if s.strip().lower() == "descritivo"), None)
            sheet_reman = next((s for s in wb.sheetnames if "manejada" in s.strip().lower()), None)

            n_frota = n_reman = 0
            if sheet_descritivo:
                ws = wb[sheet_descritivo]
                vistos: set = set()
                for row in ws.iter_rows(max_col=15, values_only=True):
                    if not row or len(row) < 4 or not row[3]:
                        continue
                    base = _linha_base(row)
                    if not base["prefixo"] or base["prefixo"] in vistos:
                        continue
                    vistos.add(base["prefixo"])
                    base["ano"] = ano_mapa
                    base["mes"] = mes_mapa
                    base["observacao"] = _txt(row[13]) if len(row) > 13 else None
                    base["tipo_policiamento"] = _txt(row[14]) if len(row) > 14 else None
                    base["origem_arquivo"] = f"MOTOMEC {ano}/{subpasta}/{nome_arq}"
                    linhas_frota.append(base)
                    n_frota += 1

            if sheet_reman:
                ws = wb[sheet_reman]
                vistos = set()
                for row in ws.iter_rows(max_col=15, values_only=True):
                    if not row or len(row) < 4 or not row[3]:
                        continue
                    base = _linha_base(row)
                    if not base["prefixo"] or base["prefixo"] in vistos:
                        continue
                    vistos.add(base["prefixo"])
                    base["ano"] = ano_mapa
                    base["mes"] = mes_mapa
                    base["tipo_policiamento"] = _txt(row[13]) if len(row) > 13 else None
                    base["destino"] = _txt(row[14]) if len(row) > 14 else None
                    base["origem_arquivo"] = f"MOTOMEC {ano}/{subpasta}/{nome_arq}"
                    linhas_reman.append(base)
                    n_reman += 1

            wb.close()
            origem.append(
                f"MOTOMEC {ano}/{subpasta}/{nome_arq} -> {ano_mapa}-{mes_mapa:02d}: "
                f"{n_frota} frota, {n_reman} remanejamento"
            )

    # dedupe global por (ano,mes,prefixo) — mesma chave da constraint unique;
    # ON CONFLICT falha em lote se houver 2 linhas colidentes no mesmo POST.
    def _dedupe(linhas):
        vistos_g: set = set()
        unicas = []
        for l in linhas:
            chave = (l["ano"], l["mes"], l["prefixo"])
            if chave in vistos_g:
                continue
            vistos_g.add(chave)
            unicas.append(l)
        return unicas

    return _dedupe(linhas_frota), _dedupe(linhas_reman), origem


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not caminho_disponivel(RAIZ_MATRIZ):
        print(f"[motomec_historico] Fonte indisponível: {RAIZ_MATRIZ}")
        sys.exit(0)

    abast_2025, origem_abast = extrair_abastecimento_geral_siag(2025)
    print(f"[motomec_historico] abastecimento 2025 (GERAL SIAG): {len(abast_2025)} transações, {len(origem_abast)} arquivo(s)")
    for o in origem_abast:
        print(f"    - {o}")

    frota, reman, origem_mapa = extrair_mapa_descritivo()
    print(f"[motomec_historico] mapa descritivo: {len(frota)} linhas de frota, {len(reman)} linhas de remanejamento")
    for o in origem_mapa:
        print(f"    - {o}")

    if args.dry_run:
        print("[motomec_historico] dry-run — nada gravado.")
        return

    if abast_2025:
        # Chave inclui data_abastecimento desde a migration 015 — cupom
        # fiscal sozinho não é confiável (ver docstring do módulo: valores
        # placeholder "0"/"1" para transações sem cupom real colidiam entre
        # dezenas de abastecimentos genuinamente distintos).
        upsert_generico("motomec_abastecimento", abast_2025, on_conflict="cupom_fiscal,produto,prefixo,data_abastecimento")
        print(f"[motomec_historico] motomec_abastecimento: {len(abast_2025)} linha(s) upsertadas.")

    if frota:
        upsert_generico("motomec_frota_mensal", frota, on_conflict="ano,mes,prefixo")
        print(f"[motomec_historico] motomec_frota_mensal: {len(frota)} linha(s) upsertadas.")

    if reman:
        upsert_generico("motomec_remanejamento_mensal", reman, on_conflict="ano,mes,prefixo")
        print(f"[motomec_historico] motomec_remanejamento_mensal: {len(reman)} linha(s) upsertadas.")

    print("[motomec_historico] Concluído.")


if __name__ == "__main__":
    main()
