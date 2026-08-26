"""
Ingestão Motomec — dados operacionais demonstrativos ALÉM da frota (que já vive
em public.viaturas via motomec_frota.py).

Pedido explícito do usuário: cada .xlsx pode ter várias abas, e cada aba é um
dataset diferente — não descartar um arquivo inteiro pela 1ª aba. Este script
é resultado de uma varredura completa (abrindo TODAS as abas de TODOS os
.xlsx/.xlsm candidatos em MOTOMEC 2026\) e carrega os datasets que tinham
dado tabular real e não-redundante com o que já está em viaturas/fato_secao:

1. Abastecimento  — transações de combustível/produtos por viatura, de DUAS
   fontes complementares dentro de ABASTECIMENTO\:
   1a. "Relatório_Analise de Consumo..." (.xlsx, aba "Dados") — relatório
       consolidado SIAG, uma linha por transação com cupom fiscal, cobrindo
       TODAS as Cias de uma vez. Só existe para junho e julho/2026 (é gerado
       sob demanda, não é rotina mensal).
   1b. Aba "GERAL SIAG" dentro de cada "CONFERIDO <N>ª QUINZENA <mês>*.xls"
       (formato Excel 97-2003 antigo, lido com xlrd — ver
       `extrair_abastecimento_geral_siag` para a correção completa de um
       erro factual de rodada anterior, que afirmou não existir 2ª/3ª CIA/FT
       em ABASTECIMENTO\ por ter varrido só .xlsx com openpyxl). É o export
       bruto do SIAG, mesma granularidade/cupom fiscal real do relatório 1a,
       cobrindo de uma vez só 1ª a 4ª CIA + Força Tática + Estado-Maior, para
       as 12 quinzenas de janeiro a junho/2026.
2. Empenhos       — notas de empenho (NE) de manutenção/aquisição por
   viatura. Fonte: Empenhos 2026.xlsx (aba Plan1). (O arquivo "EMPENHOS NOS
   ULTIMOS 3 MESES.xlsx" é um subconjunto redundante — mesmas colunas
   PREFIXO+EMPENHO já contidas neste arquivo maior — não é carregado à parte.)
3. Acidentes      — acidentes de trânsito com viatura moto, por Cia/FT, com
   nº de sindicância. Fonte: PLANILHAS ACIDENTE COM MOTO PREENCHIDAS PELAS
   CIAS\GERAL.xlsx (aba Planilha1 — consolidado; os arquivos por Cia
   individuais são o mesmo dado desmembrado, sem informação nova).
4. Descarga       — pipeline de baixa/sucateamento de viatura (2 fases:
   em_andamento/sindicância e finalizada). Fonte: PROCESSO DE DESCAGA\
   DESCARGA DE VIATURA atualizado em <data>.xlsx (abas "DESCARGAS." e
   "DESCARGAS FINALIZADAS" — parseadas por cabeçalho nomeado, robusto a
   colunas reordenadas/duplicadas entre os 2 blocos "04 RODAS"/"02 RODAS" de
   cada aba).
5. Remanejamento  — decisão de manter/remanejar/cancelar remanejamento de
   viatura excedente, por prefixo. Fonte: RECOLHA DE VIATURAS CMM - PLANILHA
   GERAL (TRAILL E EXCEDENTES) - Atualizado 16JUN25.xlsx (aba "16M").
6. Tags           — cadastro de TAG de abastecimento "sem parar" por
   viatura/Cia. Fonte: ABASTECIMENTO\TAGs DE ABASTECIMENTO E NOVOS CARTÕES\
   TAG - PLANILHA DE CADASTRO DAS VIATURAS 16º BPMM.xlsx (aba "TOTAL" —
   consolidada por blocos de seção; as abas por Cia/"FT"/"P2"/"SERÁ
   REMANEJADA" são o mesmo dado desmembrado, sem informação nova).

Datasets inspecionados e DESCARTADOS (não-tabulares, template vazio, ou
redundantes — ver relatório da ingestão para a lista completa):
CLASSIFICAÇÃO VEÍCULOS.xlsx (formulários/legendas em branco, sem dado real),
QUANTITAVO MOTOS - BTL.xlsx (matriz de contagem por OPM de toda a CPA/M-5,
quase toda zerada — só a linha do 16º BPM/M tem valor, e é redundante com a
contagem de motocicletas já em public.viaturas), NUMERADOR - 2026.xlsm
(controle de numeração sequencial de documentos administrativos, não é dado
de frota), TELEMETRIA RETIRADA ABR26 (~10 linhas de anotações soltas em texto
livre, não é tabela), EMPENHOS NOS ULTIMOS 3 MESES.xlsx (redundante, ver
acima), LCM\\/CRLV\\/MULTAS\\/Avaliação de Sucata\\ (só PDFs/scans, sem planilha).
Dentro de ABASTECIMENTO\ (varredura recursiva com os.walk, SEM filtro de
extensão: 4.662 arquivos no total — 74 .xlsx/.xlsm + 76 .xls antigo (Excel
97-2003, só legível com xlrd, não openpyxl) + 4.444 .pdf + resto
msg/mp4/zip/rar/db/imagem): "1 - ATESTADO SERVIÇO PRESTADO PADRÃO GERAL..."
e "3 - Termo de Conferência Geral Siag..." são o mesmo atestado/termo em
texto livre (sem tabela de transações, só assinatura/rótulo), "ABASTECIMENTO
PENDENTE...xlsx" (3 arquivos, e a aba de mesmo nome dentro da pasta 4ª CIA/
fev) tem estrutura tabular diferente (pendências de lançamento no cartão,
não transação confirmada) e volume ínfimo (0-1 linha de dado real cada) —
não carregado por não ser transação efetivada e não valer o esforço de
outra chave de dedup para ~1 linha; CADASTRO DE MOTORISTA/USUÁRIOS SIAG,
MOTORISTAS VALIDADOS (Vale Card, listas de RE por BPM da CPA/M-5 inteira,
não só o 16º), Aquisição de TAG sem parar.xlsx, ATUALIZAÇÃO DE SUBFROTA,
Cat D.xlsx, Postos de combustível, Recusa de abastecimento, TAGs não
cadastradas — são cadastro/controle administrativo de usuário do sistema
SIAG/Vale Card (não transação de abastecimento nem cadastro de viatura),
avaliados e descartados por não acrescentarem indicador operacional da
frota.

CORREÇÃO DE ERRO FACTUAL (rodada anterior): a rodada anterior afirmou
textualmente "não existe pasta 2ª CIA/3ª CIA/FT equivalente em nenhum mês
dentro de ABASTECIMENTO 2026 — só 1ª CIA e 4ª CIA têm essas conferências por
quinzena". Isso era FALSO — resultado de ter varrido só .xlsx/.xlsm com
openpyxl, que não abre .xls antigo. Os 76 arquivos .xls foram abertos um a
um com xlrd e classificados (ver `extrair_abastecimento_geral_siag` para o
detalhamento completo da decisão de fonte). Resumo da classificação:
9 arquivos "lstAnaliseConsumoCombustivel*.xls" e ~46 arquivos "PLANILHA
PRINCIPAL" por Cia/FT/EM individual (2ª CIA, 3ª CIA, FT, "2 - EM -
CONFERÊNCIA...") são DESCARTADOS por serem redundantes com a aba "GERAL
SIAG" do "CONFERIDO <quinzena>.xls" da mesma quinzena (mesmo dado, cupom
fiscal real, cobertura maior); 13 arquivos "CONFERIDO <N>ª QUINZENA
<mês>.xls" têm a aba "GERAL SIAG" CARREGADA (12 com dado real jan-jun, 1
vazia em julho — já coberta pelo relatório 1a) e as abas "CONFERIDO GERAL
SIAG"/"CONFERIDO COM CUPONS EXISTENTES"/"EM"/"FALTAM CUPONS" do mesmo
arquivo DESCARTADAS (reconciliação manual parcial/subconjunto do GERAL
SIAG, sem cupom fiscal real na maioria — carregar geraria contagem dupla);
1 arquivo "ATUALIZAÇÃO e ATIVAÇÃO DE VTR NO SIOPM..." é procedimento em
texto livre (sem tabela de transação) — descartado.

EXISTE uma pasta ABASTECIMENTO em MOTOMEC 2025\ (ao lado de 2020, 2021,
2022, 2023, 2024) — não inspecionada nesta rodada (prioridade #1 foi fechar
2026 por completo, conforme pedido). Fica registrado como pendência
explícita para uma ingestão de série histórica futura, não como "não existe".

Uso:
    python -m ingest.secoes.motomec_operacional [--dry-run] [--forcar]
"""
import argparse
import glob
import os
import re
import sys
from datetime import date, datetime

import openpyxl
import xlrd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ingest.common.unc import caminho_disponivel
from ingest.common.excel import eh_arquivo_lixo, numero_ou_none
from ingest.common.carga import (
    upsert_generico,
    sha256_arquivo,
    deletar_por_like,
)

SECAO = "motomec"
RAIZ_UNC = r"\\cmdo\pmesp\16BPMM\16BPMM_EM\MOTOMEC\Matriz Motomec 16M\MOTOMEC 2026"

CIA_UNIDADES = {
    "1ª CIA": 1, "2ª CIA": 2, "3ª CIA": 3, "4ª CIA": 4,
    "FORÇA TÁTICA": None,
}

SUMARIO_PREFIXOS = (
    "viaturas em sind", "sem nº de pd", "falta pd", "4 rodas -", "2 rodas -",
    "total descarga",
)


def _cupom_normalizado(v) -> str | None:
    """Normaliza cupom fiscal para string sem ponto decimal — a mesma
    transação de junho aparece tanto no relatório .xlsx (openpyxl devolve a
    célula numérica como float, ex.: 9743.0) quanto na aba 'GERAL SIAG' do
    .xls (xlrd/planilha já devolve texto, ex.: '9743'). Sem essa
    normalização a chave (cupom_fiscal,produto,prefixo) não bate entre as
    duas fontes e a mesma transação entra duas vezes na tabela — bug real
    encontrado por conferência cruzada nesta rodada (~1.000 pares
    duplicados em junho/2026, todos com cupom 'N.0' vs 'N')."""
    if v is None:
        return None
    if isinstance(v, float):
        if v.is_integer():
            return str(int(v))
        return str(v)
    s = str(v).strip()
    if not s:
        return None
    if s.endswith(".0") and s[:-2].lstrip("-").isdigit():
        return s[:-2]
    return s


def _txt(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def _bool_simnao(v) -> bool | None:
    s = _txt(v)
    if s is None:
        return None
    s = s.strip().lower()
    if s == "sim":
        return True
    if s == "não" or s == "nao":
        return False
    return None


def _data(v) -> date | None:
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, str) and v.strip():
        for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y"):
            try:
                return datetime.strptime(v.strip(), fmt).date()
            except ValueError:
                continue
    return None


def _datahora(v):
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, str) and v.strip():
        for fmt in ("%d/%m/%Y %H:%M:%S", "%d/%m/%Y"):
            try:
                return datetime.strptime(v.strip(), fmt).isoformat()
            except ValueError:
                continue
    return None


def _prefixo_normalizado(v) -> str | None:
    """Números puros de 5 dígitos iniciando com '16' viram 'M-16xxx' (mesma
    convenção de public.viaturas); demais valores (códigos de outras
    subfrotas, ex.: '08-639', '22-1117') ficam como texto bruto."""
    if v is None:
        return None
    if isinstance(v, (int, float)) and float(v).is_integer():
        n = int(v)
        if 16000 <= n <= 16999:
            return f"M-{n}"
        return str(n)
    return str(v).strip() or None


# ----------------------------------------------------------------------------
# 1. Abastecimento
# ----------------------------------------------------------------------------
def extrair_abastecimento() -> tuple[list[dict], list[str]]:
    arquivos = sorted(
        glob.glob(os.path.join(RAIZ_UNC, "ABASTECIMENTO", "**", "Relat*Consumo*.xlsx"), recursive=True)
    )
    arquivos = [a for a in arquivos if not eh_arquivo_lixo(os.path.basename(a))]
    linhas: list[dict] = []
    origem: list[str] = []
    for caminho in arquivos:
        wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
        if "Dados" not in wb.sheetnames:
            wb.close()
            continue
        ws = wb["Dados"]
        rows = list(ws.iter_rows(max_col=28, values_only=True))
        wb.close()
        if not rows:
            continue
        nome_arq = os.path.basename(caminho)
        n = 0
        vistos_arquivo: set = set()
        for row in rows[1:]:
            if not row or row[0] is None:
                continue
            # dedupe dentro do próprio arquivo por (cupom,produto,prefixo) —
            # mesma chave da constraint unique; ON CONFLICT falha com erro 500
            # (postgres "cannot affect row a second time") se o lote de upsert
            # tiver 2 linhas colidentes, então garante aqui a 1ª ocorrência.
            cupom = _cupom_normalizado(row[21])
            chave = (cupom, row[13], row[5])
            if chave in vistos_arquivo:
                continue
            vistos_arquivo.add(chave)
            linhas.append(
                {
                    "placa": _txt(row[0]),
                    "prefixo": _prefixo_normalizado(row[5]) if not isinstance(row[5], str) else _txt(row[5]),
                    "data_abastecimento": _datahora(row[2]),
                    "motorista": _txt(row[4]),
                    "produto": _txt(row[13]),
                    "fabricante": _txt(row[8]),
                    "estabelecimento": _txt(row[10]),
                    "cidade": _txt(row[11]),
                    "uf": _txt(row[12]),
                    "distancia": numero_ou_none(row[14]),
                    "consumo": numero_ou_none(row[15]),
                    "hodometro": numero_ou_none(row[17]),
                    "quantidade": numero_ou_none(row[18]),
                    "valor_unitario": numero_ou_none(row[19]),
                    "valor_total": numero_ou_none(row[20]),
                    "cupom_fiscal": cupom,
                    "programa_policiamento": _txt(row[27]) if len(row) > 27 else None,
                    "origem_arquivo": nome_arq,
                }
            )
            n += 1
        origem.append(f"{nome_arq}: {n} linhas")

    # dedupe global (entre arquivos) pela mesma chave — precaução extra,
    # embora cupom fiscal já deva ser único por transação.
    vistos_global: set = set()
    unicas = []
    for l in linhas:
        chave = (l["cupom_fiscal"], l["produto"], l["prefixo"])
        if chave in vistos_global:
            continue
        vistos_global.add(chave)
        unicas.append(l)
    return unicas, origem


# ----------------------------------------------------------------------------
# 1b. Abastecimento — CORREÇÃO DE ERRO FACTUAL DE RODADA ANTERIOR.
#
# A rodada anterior afirmou "não existe pasta 2ª CIA/3ª CIA/FT equivalente
# em nenhum mês" porque usou só openpyxl, que NÃO abre .xls antigo (só
# .xlsx/.xlsm). Uma varredura recursiva com os.walk (sem filtro de
# extensão) em ABASTECIMENTO\ encontrou 76 arquivos .xls (formato Excel
# 97-2003), incluindo pastas "2ª CIA", "3ª CIA" e "FT" em TODOS os meses de
# janeiro a junho/2026 — a afirmação anterior era falsa. Abertos com xlrd
# (já instalado no ambiente, agora também em requirements.txt).
#
# Melhor ainda: dentro de cada "CONFERIDO <N>ª QUINZENA <mês>*.xls" (13
# arquivos, um por quinzena jan-jul) existe uma aba "GERAL SIAG" que é o
# export bruto do sistema SIAG — mesma granularidade e mesmas colunas (com
# 2 variações de template conforme o período, tratadas por nome de coluna
# abaixo) do relatório "Relatório_Análise de Consumo" .xlsx já usado para
# jun/jul — MAS cobrindo de uma vez só TODAS as Cias (1ª a 4ª), Força
# Tática e Estado-Maior, com cupom fiscal real. Confirmado (contagem de
# linhas + coluna "Cia PM") que essa aba tem dado real e completo nas 12
# quinzenas de jan-jun/2026; em julho ela está vazia (só cabeçalho, 1
# linha) porque julho já é coberto pelo relatório .xlsx (extrair_abastecimento).
#
# Decisão: GERAL SIAG substitui por completo a abordagem anterior (arquivos
# "CONFERÊNCIA"/"PLANILHA PRINCIPAL" por Cia individual, com chave sintética
# "CONF|caminho|posição") — GERAL SIAG já agrega o mesmo dado com cupom
# fiscal real (chave melhor, mesma natureza da chave usada em jun/jul) e
# cobertura maior (2ª/3ª CIA e FT/EM, que a rodada anterior nem viu). Os
# arquivos "PLANILHA PRINCIPAL" por Cia individual (ex.: "abastecimento
# BTL.xls" em 2ª CIA\, "NN___Controle_de_Abastec...XLS" em 3ª CIA\, "<N>ª
# QUINZENA DE <mês>.xls" em FT\, "2 - EM - CONFERÊNCIA...xls") e os arquivos
# "lstAnaliseConsumoCombustivel*.xls" (9 arquivos — cópias standalone da
# MESMA aba GERAL SIAG, confirmado por contagem de linhas idêntica em
# jan/1ªQ: 532=532) são DESCARTADOS por serem exatamente o mesmo dado já
# coberto pela aba GERAL SIAG do arquivo CONFERIDO da mesma quinzena — não
# a lacuna que a rodada anterior imaginou. As demais abas de cada CONFERIDO
# ("CONFERIDO GERAL SIAG", "CONFERIDO COM CUPONS EXISTENTES", "EM",
# "FALTAM CUPONS") são reconciliações manuais parciais/subconjuntos do
# mesmo GERAL SIAG (verificado: linhas muito próximas, sem cupom fiscal
# real na maioria) e também não são carregadas, para não contar a mesma
# transação duas vezes.
#
# Consequência prática: as linhas de jan-maio 2026 carregadas em rodada
# anterior com a chave sintética "CONF|..." (só 1ª/4ª CIA) tornaram-se
# duplicatas do que esta função agora carrega com chave real — main() as
# apaga antes de gravar o novo lote (ver bloco de limpeza em main()).
# ----------------------------------------------------------------------------
_MESES_GERAL_SIAG_XLS = ("1 - JANEIRO", "2 - FEVEREIRO", "3 - MARÇO", "4 - ABRIL", "5 - MAIO", "6 - JUNHO")


def _mapa_cabecalho(valores) -> dict[str, int]:
    m: dict[str, int] = {}
    for idx, v in enumerate(valores):
        if v is None:
            continue
        chave = str(v).strip().upper()
        if chave and chave not in m:
            m[chave] = idx
    return m


def extrair_abastecimento_geral_siag() -> tuple[list[dict], list[str]]:
    linhas: list[dict] = []
    origem: list[str] = []
    base_abast = os.path.join(RAIZ_UNC, "ABASTECIMENTO")

    arquivos: list[str] = []
    for mes_dir in _MESES_GERAL_SIAG_XLS:
        raiz_mes = os.path.join(base_abast, mes_dir)
        if not os.path.isdir(raiz_mes):
            continue
        for dirpath, _dirnames, filenames in os.walk(raiz_mes):
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
            # julho fica vazio de propósito (só cabeçalho) — já coberto por
            # extrair_abastecimento(); outros meses vazios são pulados aqui.
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
            # template inesperado sem as 3 colunas mínimas — pula em vez de
            # gravar lixo; não deve ocorrer nos 13 arquivos verificados.
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
            prefixo = (
                _prefixo_normalizado(prefixo_raw)
                if not isinstance(prefixo_raw, str)
                else _txt(prefixo_raw)
            )
            cupom = _cupom_normalizado(val(r, c_cupom))
            # dedupe dentro do próprio arquivo — mesma chave da constraint
            # unique (cupom_fiscal,produto,prefixo); precaução para arquivos
            # com cupom "0"/vazio repetido não colidir no upsert em lote.
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
                    "distancia": numero_ou_none(val(r, c_distancia)),
                    "consumo": numero_ou_none(val(r, c_consumo)),
                    "hodometro": numero_ou_none(val(r, c_hodometro)),
                    "quantidade": numero_ou_none(val(r, c_quantidade)),
                    "valor_unitario": numero_ou_none(val(r, c_val_unit)),
                    "valor_total": numero_ou_none(val(r, c_val_total)),
                    "cupom_fiscal": cupom,
                    "programa_policiamento": _txt(val(r, c_programa)),
                    "origem_arquivo": rel,
                }
            )
            n += 1
        if n:
            origem.append(f"{rel}: {n} linhas")

    # dedupe global (entre arquivos/quinzenas) pela mesma chave — precaução
    # extra, e também cobre o overlap seguro com jun/jul já carregados via
    # extrair_abastecimento() (mesmo cupom fiscal real => upsert idempotente,
    # não duplica).
    vistos_global: set = set()
    unicas = []
    for l in linhas:
        chave = (l["cupom_fiscal"], l["produto"], l["prefixo"])
        if chave in vistos_global:
            continue
        vistos_global.add(chave)
        unicas.append(l)
    return unicas, origem


# ----------------------------------------------------------------------------
# 2. Empenhos
# ----------------------------------------------------------------------------
def extrair_empenhos() -> tuple[list[dict], str | None]:
    caminho = os.path.join(RAIZ_UNC, "Empenhos 2026.xlsx")
    if not os.path.exists(caminho):
        return [], None
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    ws = wb["Plan1"]
    rows = list(ws.iter_rows(max_col=11, values_only=True))
    wb.close()

    linhas: list[dict] = []
    for row in rows[2:]:
        item = row[1]
        if item is None:
            continue
        linhas.append(
            {
                "item_num": int(item) if isinstance(item, (int, float)) else None,
                "marca": _txt(row[2]),
                "modelo": _txt(row[3]),
                "placa": _txt(row[4]),
                "prefixo": _prefixo_normalizado(row[5]) if not isinstance(row[5], str) else _txt(row[5]),
                "prazo_entrega": _txt(row[6]),
                "ne": _txt(row[7]),
                "valor_total": numero_ou_none(row[8]),
                "sei": _txt(row[9]),
                "data_orcamento": (_data(row[10]).isoformat() if _data(row[10]) else None),
            }
        )
    return [l for l in linhas if l["ne"]], os.path.basename(caminho)


# ----------------------------------------------------------------------------
# 3. Acidentes
# ----------------------------------------------------------------------------
def extrair_acidentes() -> tuple[list[dict], str | None]:
    caminho = os.path.join(
        RAIZ_UNC, "PLANILHAS ACIDENTE COM MOTO PREENCHIDAS PELAS CIAS", "GERAL.xlsx"
    )
    if not os.path.exists(caminho):
        return [], None
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    ws = wb["Planilha1"]
    rows = list(ws.iter_rows(max_col=5, values_only=True))
    wb.close()

    linhas: list[dict] = []
    unidade_atual = None
    for row in rows[3:]:  # pula título + linha "Subfrota" + cabeçalho de coluna
        col0 = _txt(row[0])
        if col0 is None:
            continue
        if all(v is None for v in row[1:]):
            # linha-rótulo de bloco ("1ª CIA".."4ª CIA", "FORÇA TÁTICA") —
            # casa por normalização tolerante a variação de acento/grau (º/ª).
            alvo = col0.upper().replace("º", "ª").replace("  ", " ").strip()
            unidade_atual = next((c for c in CIA_UNIDADES if c.upper() == alvo), col0)
            continue
        if unidade_atual is None:
            continue
        sindicancia = col0.replace("Nº ", "").replace("N° ", "").strip()
        linhas.append(
            {
                "unidade": unidade_atual,
                "cia_id": CIA_UNIDADES.get(unidade_atual),
                "sindicancia": sindicancia,
                "data_acidente": (_data(row[1]).isoformat() if _data(row[1]) else None),
                "lesao_pm": _txt(row[2]),
                "morte_pm": _bool_simnao(row[3]),
                "moto_lander": _bool_simnao(row[4]),
            }
        )
    return linhas, os.path.basename(caminho)


# ----------------------------------------------------------------------------
# 4. Descarga (pipeline de baixa)
# ----------------------------------------------------------------------------
def _parse_blocos_descarga(ws, fase: str) -> list[dict]:
    rows = list(ws.iter_rows(max_col=12, values_only=True))
    linhas: list[dict] = []
    header: dict[str, int] = {}
    for row in rows:
        col0 = row[0]
        col0_txt = _txt(col0) if isinstance(col0, str) else None

        if col0_txt and col0_txt.upper() in ("04 RODAS", "02 RODAS", "EM SINDICÂNCIA"):
            continue  # rótulo de seção — não carrega dado próprio
        if col0_txt and col0_txt.strip().upper() == "PREFIXO":
            header = {}
            for idx, nome in enumerate(row):
                if nome is None:
                    continue
                chave = str(nome).strip().upper()
                if chave not in header:  # primeira ocorrência vence (ex.: "PLACA" duplicada)
                    header[chave] = idx
            continue
        if col0_txt and col0_txt.strip().lower().startswith(SUMARIO_PREFIXOS):
            continue  # linha de resumo/contagem no rodapé da aba, não é registro
        if not header or "PREFIXO" not in header:
            continue
        if col0 is None:
            continue

        def campo(nome):
            idx = header.get(nome)
            return row[idx] if idx is not None and idx < len(row) else None

        linhas.append(
            {
                "prefixo": _prefixo_normalizado(campo("PREFIXO")),
                "placa": _txt(campo("PLACA")),
                "fase": fase,
                "telemetria": _txt(campo("TELEMETRIA")),
                "giroflex": _txt(campo("GIROFLEX")),
                "radio": _txt(campo("RADIO")),
                "num_descarga": _txt(campo("Nº DESCARGA") or campo("N° DESCARGA")),
                "status": _txt(campo("STATUS")),
                "observacao": _txt(campo("SIND.")),
            }
        )
    return linhas


def extrair_descarga() -> tuple[list[dict], str | None]:
    candidatos = sorted(
        glob.glob(os.path.join(RAIZ_UNC, "PROCESSO DE DESCAGA", "DESCARGA DE VIATURA*.xlsx"))
    )
    candidatos = [c for c in candidatos if not eh_arquivo_lixo(os.path.basename(c))]
    if not candidatos:
        return [], None
    caminho = max(candidatos, key=os.path.getmtime)  # versão mais recente

    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    linhas: list[dict] = []
    if "DESCARGAS." in wb.sheetnames:
        linhas += _parse_blocos_descarga(wb["DESCARGAS."], "em_andamento")
    if "DESCARGAS FINALIZADAS" in wb.sheetnames:
        linhas += _parse_blocos_descarga(wb["DESCARGAS FINALIZADAS"], "finalizada")
    wb.close()

    # descarta linha sem prefixo NEM placa (não identifica viatura) e dedupe
    # por (placa, fase, num_descarga) — mesma chave da constraint da tabela.
    vistos = set()
    validas = []
    for l in linhas:
        if not l["prefixo"] and not l["placa"]:
            continue
        if not l["placa"]:
            # placa é a coluna da constraint unique — usa o prefixo como
            # substituto estável para não perder idempotência nas raras
            # linhas sem placa preenchida na fonte.
            l["placa"] = f"SEM_PLACA_{l['prefixo']}"
        chave = (l["placa"], l["fase"], l["num_descarga"])
        if chave in vistos:
            continue
        vistos.add(chave)
        validas.append(l)
    return validas, os.path.basename(caminho)


# ----------------------------------------------------------------------------
# 5. Remanejamento
# ----------------------------------------------------------------------------
def extrair_remanejamento() -> tuple[list[dict], str | None]:
    caminho = os.path.join(
        RAIZ_UNC,
        "RECOLHA DE VIATURAS CMM - PLANILHA GERAL (TRAILL E EXCEDENTES) - Atualizado 16JUN25.xlsx",
    )
    if not os.path.exists(caminho):
        return [], None
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    ws = wb["16M"]
    rows = list(ws.iter_rows(max_col=3, values_only=True))
    wb.close()

    linhas: list[dict] = []
    vistos = set()
    for row in rows[1:]:
        prefixo = _txt(row[1])
        if not prefixo or prefixo in vistos:
            continue
        vistos.add(prefixo)
        linhas.append(
            {
                "marca_modelo": _txt(row[0]),
                "prefixo": prefixo,
                "situacao": _txt(row[2]),
            }
        )
    return linhas, os.path.basename(caminho)


# ----------------------------------------------------------------------------
# 6. Tags de abastecimento (cadastro por viatura/Cia)
# ----------------------------------------------------------------------------
_RESUMO_TAGS_PREFIXOS = ("tags recebidas", "total de cadastros", "devolvido ao cpa")


def extrair_tags() -> tuple[list[dict], str | None]:
    candidatos = glob.glob(
        os.path.join(RAIZ_UNC, "ABASTECIMENTO", "TAGs*", "TAG - PLANILHA DE CADASTRO*.xlsx")
    )
    candidatos = [c for c in candidatos if not eh_arquivo_lixo(os.path.basename(c))]
    if not candidatos:
        return [], None
    caminho = candidatos[0]

    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    ws = wb["TOTAL"]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    linhas: list[dict] = []
    secao_atual = None
    vistos: set = set()
    for row in rows[1:]:  # pula cabeçalho BATALHÃO/PREFIXO/...
        col0 = _txt(row[0]) if row else None
        if col0 is None:
            continue
        if col0.strip().lower().startswith(_RESUMO_TAGS_PREFIXOS):
            continue  # linhas de resumo numérico no rodapé da aba
        if all(v is None for v in row[1:]):
            # linha-rótulo de bloco de seção, ex.: "1ª CIA (feito 17
            # cadastros da TAGs)" — normaliza tirando o sufixo "(feito...)"
            secao_atual = re.sub(r"\s*\(.*\)\s*$", "", col0).strip()
            continue
        if col0 != "16º BPM/M":
            continue
        prefixo = _prefixo_normalizado(row[1]) if not isinstance(row[1], str) else _txt(row[1])
        if not prefixo or prefixo in vistos:
            continue
        vistos.add(prefixo)
        linhas.append(
            {
                "secao": secao_atual,
                "prefixo": prefixo,
                "emplacamento": _txt(row[2]) if len(row) > 2 else None,
                "marca": _txt(row[3]) if len(row) > 3 else None,
                "modelo": _txt(row[4]) if len(row) > 4 else None,
                "num_tag": _txt(row[5]) if len(row) > 5 else None,
                "status_tag": _txt(row[6]) if len(row) > 6 else None,
                "instalacao": _txt(row[7]) if len(row) > 7 else None,
                "origem_arquivo": os.path.basename(caminho),
            }
        )
    return linhas, os.path.basename(caminho)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--forcar", action="store_true")
    args = ap.parse_args()

    if not caminho_disponivel(RAIZ_UNC):
        print(f"[motomec_operacional] Fonte indisponível: {RAIZ_UNC}")
        sys.exit(0)

    resultados = {}

    # Chave de unicidade inclui data_abastecimento desde a migration 015 —
    # cupom fiscal do SIAG é reutilizado entre anos (achado real na ingestão
    # do histórico 2025, ver motomec_historico.py), (cupom,produto,prefixo)
    # sozinho colidia entre transações de anos diferentes.
    abastecimento_siag, origem_siag = extrair_abastecimento()
    abastecimento_geral, origem_geral = extrair_abastecimento_geral_siag()
    # Duas fontes complementares: SIAG .xlsx cobre jun/jul (relatório sob
    # demanda), GERAL SIAG .xls (aba dentro de CONFERIDO <quinzena>.xls)
    # cobre jan-jun com cupom fiscal real — overlap de junho é seguro por
    # upsert idempotente na mesma chave (cupom_fiscal,produto,prefixo).
    abastecimento = abastecimento_siag + abastecimento_geral
    origem_abast = origem_siag + origem_geral
    resultados["motomec_abastecimento"] = (abastecimento, "cupom_fiscal,produto,prefixo,data_abastecimento", origem_abast)
    print(
        f"[motomec_operacional] abastecimento: {len(abastecimento)} transações "
        f"({len(abastecimento_siag)} SIAG .xlsx jun/jul + {len(abastecimento_geral)} GERAL SIAG .xls jan-jun, "
        f"{len(origem_abast)} arquivo(s))"
    )
    for o in origem_abast:
        print(f"    - {o}")

    empenhos, origem_emp = extrair_empenhos()
    resultados["motomec_empenhos"] = (empenhos, "ne", [origem_emp] if origem_emp else [])
    print(f"[motomec_operacional] empenhos: {len(empenhos)} notas de empenho ({origem_emp})")

    acidentes, origem_acid = extrair_acidentes()
    resultados["motomec_acidentes"] = (acidentes, "sindicancia", [origem_acid] if origem_acid else [])
    print(f"[motomec_operacional] acidentes: {len(acidentes)} registros ({origem_acid})")

    descarga, origem_desc = extrair_descarga()
    resultados["motomec_descarga"] = (descarga, "placa,fase,num_descarga", [origem_desc] if origem_desc else [])
    print(f"[motomec_operacional] descarga: {len(descarga)} viaturas em processo ({origem_desc})")

    remanejamento, origem_rem = extrair_remanejamento()
    resultados["motomec_remanejamento"] = (remanejamento, "prefixo", [origem_rem] if origem_rem else [])
    print(f"[motomec_operacional] remanejamento: {len(remanejamento)} viaturas ({origem_rem})")

    tags, origem_tags = extrair_tags()
    resultados["motomec_tags"] = (tags, "prefixo", [origem_tags] if origem_tags else [])
    print(f"[motomec_operacional] tags: {len(tags)} viaturas cadastradas ({origem_tags})")

    if args.dry_run:
        print("[motomec_operacional] dry-run — nada gravado.")
        return

    # Limpeza da chave sintética "CONF|..." de uma rodada de ingestão
    # anterior (per-Cia CONFERÊNCIA .xlsx só de 1ª/4ª CIA, jan-mai) — esses
    # registros são agora duplicatas do que extrair_abastecimento_geral_siag()
    # carrega com chave real (cupom fiscal), com cobertura maior (todas as
    # Cias + FT/EM). Remove antes do upsert para não contar as mesmas
    # transações duas vezes sob chaves diferentes.
    removidas = deletar_por_like("motomec_abastecimento", "cupom_fiscal", "CONF|*")
    print(f"[motomec_operacional] limpeza chave sintética CONF|...: {removidas} linha(s) removida(s).")

    for tabela, (linhas, on_conflict, _origens) in resultados.items():
        if not linhas:
            continue
        upsert_generico(tabela, linhas, on_conflict=on_conflict)
        print(f"[motomec_operacional] {tabela}: {len(linhas)} linha(s) upsertadas.")

    print("[motomec_operacional] Concluído.")


if __name__ == "__main__":
    main()
