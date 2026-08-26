"""
Ingestão Estado-Maior (EM) — escala semanal do EM, escala de serviço da Cia FT,
ativos de rede/material da Telemática e numerador de mensagens eletrônicas
expedidas (dependência: fonte P4, já staged).

LIMITAÇÃO CONHECIDA (bloqueio de schema, não corrigido nesta ingestão): a
tabela fato_secao tem uma CHECK constraint (fato_secao_secao_check, migration
007_secoes_framework.sql) restrita a
secao in ('p1','p2','p3','p4','p5','ft','motomec','res_armas','spjmd') —
'estado_maior' NÃO está nessa lista. Todos os indicadores desta seção que
iriam para fato_secao (frequencia_presente, em_efetivo_*,
escalas_servico_dia, numeradores_expedidos) são computados e impressos no
console, mas o INSERT é rejeitado pelo Postgres (23514) e a linha entra em
`descartes` do batch — NÃO ficam persistidos até alguém rodar uma migração
ampliando a constraint (ver comentário em main()). agregado_dimensional NÃO
tem CHECK de secao, então TELEMATICA/RES_ARMAS/SISALMOX_ESTOQUE persistem
normalmente. Migração de schema não foi aplicada aqui por exigir autorização
prévia do usuário (memória feedback_autorizacao_previa) — decisão de negócio,
não técnica.

Fontes reais (caminhos UNC conforme manifest de staging
C:\\Users\\13934852785\\AppData\\Local\\Temp\\claude\\C--Users-13934852785
\\2253b4c5-a93d-4781-8566-f9a8a2526978\\scratchpad\\staging\\manifests\\EM.jsonl):

1) Escala EM — vários arquivos .xls/.xlsx duplicados em Desktop/Downloads (nomes
   "Escala Nova 20JUL a 26JUL...", "...(1)", "...- Atual"). Todos, quando
   comparado o cabeçalho real da aba EM/JULHO (não o cabeçalho da aba
   ALTERAÇÕES, que ficou com texto de template desatualizado "PERÍODO DE
   22JUN26 A 28JUN26"), correspondem ao MESMO período real: 20JUL26 a 26JUL26,
   16º BPM/M — são cópias redundantes do mesmo conteúdo, não semanas
   diferentes. Usada a mais rica: Downloads\\Documents\\
   Escala Nova 20JUL a 26JUL.xlsx (aba "JULHO" = escala + aba "Calc_Data" =
   QSE do EM já pré-agregado pela própria planilha).
   O outro candidato de período que aparecia no manifest, "Escala - 15JUN26 à
   21JUN26-MODELO.xls" (e suas cópias), é um MODELO/TEMPLATE do 1º BPM/M — não
   16º — identificável tanto pelo nome do arquivo ("MODELO", já coberto por
   ingest/common/excel.py:eh_arquivo_lixo) quanto pelo próprio conteúdo
   ("1º BATALHÃO DE POLÍCIA MILITAR...", "1º BPM/M - EM" no cabeçalho da aba
   ALTERAÇÕES) — DESCARTADO por completo, não é dado real do 16º BPM/M.
   Z:\\16BPMM_EM\\... (a escala em si não tem cópia direta na rede mapeada
   pelo manifest; os arquivos vieram de Desktop/Downloads do usuário, que é
   onde o EM efetivamente distribui a escala semanal).
   → indicador 'frequencia_presente': percentual de células E/S (Expediente
     Integral / Serviço, presença efetiva) sobre o total de células
     preenchidas com status nas tabelas de escala da semana (oficiais +
     P1-P5 + serviço de dia/guarda) — 68 presentes / 250 escaladas = 27,2%.
   → indicadores 'em_efetivo_existente' / 'em_efetivo_aptos' /
     'em_efetivo_restricao_medica' / 'em_efetivo_restricao_operacional': aba
     Calc_Data já traz o QSE pronto, mas com ESCOPO só do efetivo do EM (79
     existente), não do Batalhão inteiro — por isso chaves com prefixo
     "em_", distintas das chaves de p1 (que são Btl/Cia), para não colidir
     nem duplicar linha de p1_qse.

2) Escala de Serviço da Cia FT — Downloads\\19.xlsx aba "Serviço A e B":
   plantão real de domingo, 19JUL26 (Cia de Força Tática, 16º BPM/M). A aba
   irmã "Serviço C e D" é um MODELO em branco (cabeçalho "- FEIRA, XX DE
   JANEIRO DE 2020", nenhum nome preenchido em nenhuma das 67 linhas) —
   DESCARTADA.
   → indicador 'escalas_servico_dia': contagem de policiais com RE preenchido
     nas vagas de VTR/função da escala daquele dia = 86. Representa 1 (um)
     dia de plantão (19JUL26), não o mês inteiro — não há série diária no
     manifest para agregar mês completo; registrado em ano/mês=2026-07 como
     ponto único.

3) TELEMATICA\\Documentos Telemática\\IP REDE 16BPMM.xlsx aba Plan1 — mapa de
   IPs estáticos do 16BPMM (P/1 a P/5, PJMD, FT, MOTOMEC, impressoras,
   notebooks, prédio do Cmt). → agregado_dimensional chave='TELEMATICA',
   valor=67 (pares IP+rótulo preenchidos = ativos de rede identificados).

4) TELEMATICA\\Documentos Telemática\\SISALMOX-16BPMM.xlsm aba CADASTRO —
   catálogo de itens de almoxarifado com QTDE em estoque (175 linhas, 170 com
   quantidade numérica válida). → agregado_dimensional chave='SISALMOX_ESTOQUE',
   valor=20035 (soma das QTDE — volume total de itens catalogados em estoque).
   As abas irmãs 1Cia/2Cia/3Cia/4Cia/Cia FT "Recibo" são um TEMPLATE de e-mail
   automático (macro de notificação: mesma frase-boilerplate repetida ~100x
   por aba, colunas MATERIAL/QUANTIDADE/RECIBO 100% vazias em todas) — sem
   dado real, DESCARTADAS. Aba MAPA (8 linhas, mapeamento físico de prateleira)
   também descartada — sem série temporal nem valor estatístico.

5) RES_ARMAS\\Relatório COP\\RELATÓRIO COP - EM - F TAT AGO24.docx — único
   arquivo desta célula no manifest, é um .docx (não planilha, o
   extrator já registrou "sem processar"). → agregado_dimensional
   chave='RES_ARMAS', valor=1 (só presença da célula — não há dado numérico
   extraível de um relatório .docx nesta ingestão).

6) DEPENDÊNCIA P4 (numerador) — Z:\\...\\P4\\...\\NUMERADOR - 2026\\
   MENSAGEM ELETRÔNICA.xlsx, já staged pelo agente P4 em
   scratchpad\\staging\\csv\\P4\\P4_2026__NUMERADOR_-_2026__MENSAGEM_ELETRÔNICA.csv
   → indicador 'numeradores_expedidos': contagem de linhas com Nº+data válida
   por mês de 2026 (103 mensagens eletrônicas numeradas de jan a 16/jul/2026;
   as ~897 linhas restantes, Nº 104 a 1000, são numeração reservada sem uso —
   sem data, corretamente descartadas, não é perda de dado real). Duas linhas
   tinham "ANO"=206 (erro de digitação claro, cercado de linhas 2026 no mesmo
   arquivo cujo próprio nome já fixa o ano) — corrigidas para 2026.

Não carregados (ver retorno nao_carregado):
   - 8 cópias redundantes da escala EM (mesmo conteúdo/período da fonte usada)
   - "Escala - 15JUN26 à 21JUN26-MODELO.xls" (todas as cópias) — template do
     1º BPM/M, não é dado do 16º BPM/M
   - aba "Serviço C e D" de 19.xlsx — template em branco
   - abas ALTERAÇÕES / Plan1 / Dashboard — vazias ou só texto de cabeçalho
   - SISALMOX abas 1-4Cia_Recibo / Cia FT_Recibo — template de e-mail (macro),
     sem dado real
   - SISALMOX aba MAPA — sem valor estatístico
   - Plano-de-Comando-2024-2031-v1.1.pdf — fora de escopo (Governança, não EM)
   - RELATÓRIO COP - EM - F TAT AGO24.docx — conteúdo não extraído (só .docx),
     registrada apenas a presença da célula RES_ARMAS
   - P4 NUMERADOR MENSAGEM ELETRÔNICA 2026, linhas Nº 104-1000 (numeração
     reservada sem uso, sem data)

Uso:
    python -m ingest.secoes.estado_maior [--dry-run]
"""
import argparse
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ingest.common.carga import (
    abrir_batch,
    fechar_batch,
    upsert_fato_secao,
    upsert_agregado_dimensional,
    registrar_arquivo,
    sha256_arquivo,
)
from ingest.common.excel import mtime_iso

SECAO = "estado_maior"
FONTE = "escala_em_telematica_numerador"

_STAGING = (
    r"C:\Users\13934852785\AppData\Local\Temp\claude\C--Users-13934852785"
    r"\2253b4c5-a93d-4781-8566-f9a8a2526978\scratchpad\staging\csv"
)

CSV_ESCALA_EM = _STAGING + r"\EM\DownloadsDocuments__Escala_Nova_20JUL_a_26JUL.xlsx__JULHO.csv"
UNC_ESCALA_EM = r"Downloads\Documents\Escala Nova 20JUL a 26JUL.xlsx (aba JULHO)"

CSV_CALC_DATA = _STAGING + r"\EM\DownloadsDocuments__Escala_Nova_20JUL_a_26JUL.xlsx__Calc_Data.csv"
UNC_CALC_DATA = r"Downloads\Documents\Escala Nova 20JUL a 26JUL.xlsx (aba Calc_Data)"

CSV_SERVICO_FT = _STAGING + r"\EM\Downloads__19.xlsx__Serviço_A_e_B.csv"
UNC_SERVICO_FT = r"Downloads\19.xlsx (aba Serviço A e B)"

CSV_IP_REDE = _STAGING + r"\EM\TELEMATICA__IP_REDE_16BPMM.xlsx__Plan1.csv"
UNC_IP_REDE = r"Z:\16BPMM_EM\TELEMATICA\Documentos Telemática\IP REDE 16BPMM.xlsx (aba Plan1)"

CSV_SISALMOX_CADASTRO = _STAGING + r"\EM\TELEMATICA__SISALMOX-16BPMM.xlsm__CADASTRO.csv"
UNC_SISALMOX_CADASTRO = r"Z:\16BPMM_EM\TELEMATICA\Documentos Telemática\SISALMOX-16BPMM.xlsm (aba CADASTRO)"

CSV_NUMERADOR_P4 = _STAGING + r"\P4\P4_2026__NUMERADOR_-_2026__MENSAGEM_ELETRÔNICA.csv"
UNC_NUMERADOR_P4 = r"Z:\16BPMM_EM\P4\...\NUMERADOR - 2026\MENSAGEM ELETRÔNICA.xlsx (staged pelo agente P4)"

RES_ARMAS_DOCX = r"Z:\16BPMM_EM\RES_ARMAS\Relatório COP\RELATÓRIO COP - EM - F TAT AGO24.docx"

STATUS_PRESENTE = {"E", "S"}

ANO_EM = 2026
MES_EM = 7


# ----------------------------------------------------------------------------
# Escala EM (semanal) — % presença
# ----------------------------------------------------------------------------
def _ler_csv(caminho: str) -> list[list[str]]:
    with open(caminho, encoding="utf-8-sig", newline="") as f:
        return list(csv.reader(f))


def parse_escala_em(caminho: str) -> tuple[int, int]:
    """Percorre TODOS os blocos de escala da planilha (cada bloco começa numa
    linha cuja coluna 'Dia' identifica o cabeçalho de dias do mês, seguida da
    linha de abreviação de dia da semana). Retorna (presentes, escalados)
    somando oficiais + P1-P5 + serviço de dia/guarda."""
    linhas = _ler_csv(caminho)
    n = len(linhas)
    presentes = escalados = 0
    i = 0
    while i < n:
        row = linhas[i]
        col5 = row[5].strip() if len(row) > 5 else ""
        if col5.upper() != "DIA":
            i += 1
            continue
        i += 2  # pula cabeçalho "Dia" + cabeçalho "NOME/2ª,3ª..."
        while i < n:
            r = linhas[i]
            c0 = r[0].strip() if len(r) > 0 else ""
            if c0.upper().startswith("LEGENDA"):
                break
            if not any(c.strip() for c in r):
                break
            if len(r) > 5 and r[5].strip().upper() == "DIA":
                break  # novo bloco — não consome, o loop externo pega
            dias = [d.strip() for d in (r[6:13] if len(r) >= 13 else r[6:]) if d.strip()]
            if dias:
                escalados += len(dias)
                presentes += sum(1 for d in dias if d.upper().rstrip("*") in STATUS_PRESENTE)
            i += 1
    return presentes, escalados


# ----------------------------------------------------------------------------
# Calc_Data — QSE já agregado, escopo EM
# ----------------------------------------------------------------------------
MAPA_METRICA_CALC_DATA = {
    "Efetivo Total": "em_efetivo_existente",
    "Aptos": "em_efetivo_aptos",
    "Rest. Médica": "em_efetivo_restricao_medica",
    "Rest. Operacional": "em_efetivo_restricao_operacional",
}


def parse_calc_data(caminho: str) -> dict[str, float]:
    linhas = _ler_csv(caminho)
    valores: dict[str, float] = {}
    for r in linhas[1:]:
        if len(r) < 6:
            continue
        metrica = r[4].strip()
        indicador = MAPA_METRICA_CALC_DATA.get(metrica)
        if not indicador:
            continue
        bruto = r[5].strip()
        try:
            valores[indicador] = float(bruto.replace(",", "."))
        except ValueError:
            continue
    return valores


# ----------------------------------------------------------------------------
# Escala de Serviço da Cia FT — contagem de escalados no dia
# ----------------------------------------------------------------------------
RE_PATTERN = None


def parse_servico_ft(caminho: str) -> int:
    import re

    pat = re.compile(r"\d{4,6}-[0-9A-Za-z]")
    linhas = _ler_csv(caminho)
    return sum(1 for r in linhas for c in r if pat.search(c))


# ----------------------------------------------------------------------------
# TELEMATICA — IP REDE (ativos de rede mapeados)
# ----------------------------------------------------------------------------
def parse_ip_rede(caminho: str) -> int:
    linhas = _ler_csv(caminho)
    n = 0
    for row in linhas:
        for i in range(0, len(row) - 1, 2):
            ip = row[i].strip()
            rotulo = row[i + 1].strip() if i + 1 < len(row) else ""
            if ip.count(".") == 3 and rotulo:
                n += 1
    return n


# ----------------------------------------------------------------------------
# SISALMOX — estoque total (CADASTRO)
# ----------------------------------------------------------------------------
def parse_sisalmox_estoque(caminho: str) -> tuple[float, int]:
    with open(caminho, encoding="utf-8-sig", newline="") as f:
        leitor = csv.DictReader(f)
        total = 0.0
        n = 0
        for row in leitor:
            bruto = (row.get("QTDE") or "").strip()
            try:
                total += float(bruto.replace(",", "."))
                n += 1
            except ValueError:
                continue
    return total, n


# ----------------------------------------------------------------------------
# Numerador P4 — Mensagem Eletrônica (dependência)
# ----------------------------------------------------------------------------
def parse_numerador_mensagem_eletronica(caminho: str) -> dict[tuple[int, int], int]:
    """Conta linhas com Nº + dia/mês/ano válidos, por (ano, mês). Linhas de
    numeração reservada sem uso (Nº preenchido, sem data) são ignoradas."""
    linhas = _ler_csv(caminho)
    contagem: dict[tuple[int, int], int] = {}
    for r in linhas[2:]:
        if len(r) < 4:
            continue
        numero = r[0].strip()
        if not numero:
            continue
        mes_bruto, ano_bruto = r[2].strip(), r[3].strip()
        try:
            mes = int(float(mes_bruto))
            ano = int(float(ano_bruto))
        except ValueError:
            continue
        if not (1 <= mes <= 12):
            continue
        # "ANO"=206 é erro de digitação claro (arquivo inteiro é do ano de
        # 2026, linhas vizinhas confirmam) — corrige em vez de descartar.
        if ano != 2026:
            ano = 2026
        contagem[(ano, mes)] = contagem.get((ano, mes), 0) + 1
    return contagem


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    batch_id = None if args.dry_run else abrir_batch(SECAO, FONTE)
    linhas_fato: list[dict] = []
    linhas_agregado: list[dict] = []
    linhas_lidas = 0
    descartes: list[str] = []
    erro_fatal = None

    try:
        # 1) Escala EM — frequência de presença
        presentes, escalados = parse_escala_em(CSV_ESCALA_EM)
        linhas_lidas += escalados
        if escalados > 0:
            pct = round(presentes / escalados * 100, 1)
            linhas_fato.append(
                {"secao": SECAO, "indicador": "frequencia_presente", "ano": ANO_EM, "mes": MES_EM,
                 "eh_anual": False, "cia": None, "valor": pct}
            )
        else:
            descartes.append("escala EM: nenhuma célula de status localizada")

        # 2) Calc_Data — QSE do EM
        qse_em = parse_calc_data(CSV_CALC_DATA)
        linhas_lidas += len(MAPA_METRICA_CALC_DATA)
        for indicador, valor in qse_em.items():
            linhas_fato.append(
                {"secao": SECAO, "indicador": indicador, "ano": ANO_EM, "mes": MES_EM,
                 "eh_anual": False, "cia": None, "valor": valor}
            )
        for metrica, indicador in MAPA_METRICA_CALC_DATA.items():
            if indicador not in qse_em:
                descartes.append(f"Calc_Data: métrica '{metrica}' não localizada")

        # 3) Escala de Serviço FT — escalados no dia
        escalados_ft = parse_servico_ft(CSV_SERVICO_FT)
        linhas_lidas += 1
        if escalados_ft > 0:
            linhas_fato.append(
                {"secao": SECAO, "indicador": "escalas_servico_dia", "ano": ANO_EM, "mes": MES_EM,
                 "eh_anual": False, "cia": None, "valor": escalados_ft}
            )
        else:
            descartes.append("Serviço A e B: nenhum RE de policial localizado")

        # 4) Numerador P4 — mensagens eletrônicas expedidas por mês
        por_mes = parse_numerador_mensagem_eletronica(CSV_NUMERADOR_P4)
        linhas_lidas += sum(por_mes.values())
        for (ano, mes), qtd in sorted(por_mes.items()):
            linhas_fato.append(
                {"secao": SECAO, "indicador": "numeradores_expedidos", "ano": ano, "mes": mes,
                 "eh_anual": False, "cia": None, "valor": qtd}
            )
        if not por_mes:
            descartes.append("numerador P4 mensagem eletrônica: nenhuma linha com data válida")

        # 5) TELEMATICA — IP REDE
        ips_ativos = parse_ip_rede(CSV_IP_REDE)
        linhas_lidas += 1
        linhas_agregado.append(
            {"secao": SECAO, "fonte": "celulas", "dimensao": "celula", "chave": "TELEMATICA", "valor": ips_ativos}
        )

        # 6) SISALMOX — estoque total
        estoque_total, itens_validos = parse_sisalmox_estoque(CSV_SISALMOX_CADASTRO)
        linhas_lidas += 1
        linhas_agregado.append(
            {"secao": SECAO, "fonte": "celulas", "dimensao": "celula", "chave": "SISALMOX_ESTOQUE", "valor": estoque_total}
        )

        # 7) RES_ARMAS — só presença de célula (fonte é .docx, não processável aqui)
        linhas_agregado.append(
            {"secao": SECAO, "fonte": "celulas", "dimensao": "celula", "chave": "RES_ARMAS", "valor": 1}
        )
        descartes.append(f"RES_ARMAS: fonte é .docx ({RES_ARMAS_DOCX}) — sem dado numérico extraído, só presença")

        print(f"[estado_maior] escala EM: {presentes}/{escalados} presentes ({pct if escalados else 'NA'}%)")
        print(f"[estado_maior] Calc_Data (QSE EM): {qse_em}")
        print(f"[estado_maior] Serviço FT (19JUL26): {escalados_ft} escalados")
        print(f"[estado_maior] numerador P4 mensagem eletrônica por mês: {sorted(por_mes.items())}")
        print(f"[estado_maior] TELEMATICA: {ips_ativos} IPs ativos")
        print(f"[estado_maior] SISALMOX estoque: {estoque_total} unidades ({itens_validos} itens)")

        if args.dry_run:
            print(f"[estado_maior] dry-run: {len(linhas_fato)} fato_secao, {len(linhas_agregado)} agregado_dimensional, "
                  f"{linhas_lidas} linhas lidas, descartes={descartes}")
            return

        for linha in linhas_fato:
            linha["batch_id"] = batch_id
        for linha in linhas_agregado:
            linha["batch_id"] = batch_id

        # agregado_dimensional não tem CHECK de secao — funciona direto.
        upsert_agregado_dimensional(linhas_agregado)

        # fato_secao TEM CHECK constraint fato_secao_secao_check (migration
        # 007) restrita a ('p1','p2','p3','p4','p5','ft','motomec',
        # 'res_armas','spjmd') — 'estado_maior' NÃO está nessa lista (gap de
        # schema, não descoberto até esta ingestão). Isolado num try/except
        # próprio para não derrubar o que já foi persistido em
        # agregado_dimensional acima. NÃO alteramos a constraint aqui —
        # alterar schema de projeto exige autorização prévia do usuário
        # (memória feedback_autorizacao_previa) e está fora do escopo desta
        # tarefa de carga. Migração sugerida, a aplicar só mediante "pode
        # fazer" do usuário:
        #   ALTER TABLE fato_secao DROP CONSTRAINT fato_secao_secao_check;
        #   ALTER TABLE fato_secao ADD CONSTRAINT fato_secao_secao_check
        #     CHECK (secao = ANY (ARRAY['p1','p2','p3','p4','p5','ft',
        #     'motomec','res_armas','spjmd','estado_maior']));
        try:
            upsert_fato_secao(linhas_fato)
        except Exception as e_fato:  # noqa: BLE001
            descartes.append(
                "fato_secao BLOQUEADO: constraint fato_secao_secao_check (migration 007) não permite "
                "secao='estado_maior' — só p1/p2/p3/p4/p5/ft/motomec/res_armas/spjmd. "
                f"{len(linhas_fato)} linha(s) computada(s) e NÃO persistida(s): "
                f"{sorted({l['indicador'] for l in linhas_fato})}. Requer migração (não aplicada — precisa "
                f"autorização prévia) para adicionar 'estado_maior' à lista. Erro bruto: {e_fato}"
            )
            linhas_fato = []  # não persistidas — não contam como válidas no fechamento do batch

        for caminho_csv, caminho_unc, obs in [
            (CSV_ESCALA_EM, UNC_ESCALA_EM, "Escala EM semanal 20-26JUL26 — frequência de presença"),
            (CSV_CALC_DATA, UNC_CALC_DATA, "QSE do EM pré-agregado (escopo EM, não Btl)"),
            (CSV_SERVICO_FT, UNC_SERVICO_FT, "Escala de Serviço Cia FT — plantão 19JUL26"),
            (CSV_IP_REDE, UNC_IP_REDE, "Mapa de IPs estáticos 16BPMM"),
            (CSV_SISALMOX_CADASTRO, UNC_SISALMOX_CADASTRO, "Catálogo de estoque SISALMOX"),
            (CSV_NUMERADOR_P4, UNC_NUMERADOR_P4, "Numerador Mensagem Eletrônica 2026 (dependência P4)"),
        ]:
            if os.path.exists(caminho_csv):
                registrar_arquivo(
                    secao=SECAO,
                    caminho_unc=caminho_unc,
                    sha256=sha256_arquivo(caminho_csv),
                    mtime_iso=mtime_iso(caminho_csv),
                    linhas_reais=None,
                    observacao=obs,
                    batch_id=batch_id,
                )
    except Exception as e:  # noqa: BLE001
        erro_fatal = str(e)

    if erro_fatal:
        fechar_batch(batch_id, "falha", linhas_lidas, len(linhas_fato) + len(linhas_agregado), 0, descartes, erro_fatal)
        print(f"[estado_maior] FALHA: {erro_fatal}")
        sys.exit(1)

    status = "ok" if not descartes else "parcial"
    fechar_batch(batch_id, status, linhas_lidas, len(linhas_fato) + len(linhas_agregado), len(descartes), descartes)
    print(f"[estado_maior] Concluído ({status}): {len(linhas_fato)} fato_secao, {len(linhas_agregado)} agregado_dimensional, "
          f"{len(descartes)} descartes.")


if __name__ == "__main__":
    main()
