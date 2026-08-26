"""
Ingestão Força Tática — Efetivo, Férias e Escalas (Matriz FT).

Fonte: \\cmdo\pmesp\16BPMM\16BPMM_FT\Matriz FT\<ano>\...
       (mapeada localmente como Z:\16BPMM_FT\Matriz FT — mesma raiz do
       disco de rede documentado em reference_circunscricao_16bpmm; regra
       do projeto é sempre usar o caminho UNC completo, nunca a letra).

secao='ft' em fato_secao/agregado_dimensional/arquivos_fonte — é o valor
aceito pela CHECK constraint fato_secao_secao_check (migration 007); 'ft'
é a abreviação usada em todo o resto do projeto para Força Tática (não
existe 'forca_tatica' no enum).

Três indicadores extraídos:

1. 'efetivo_total' (eh_anual=true) — um arquivo <ano>\EFETIVO\
   Efetivo - Atualizado*.xlsx por ano (2018 e 2020-2026; 2019 só tem
   plano de férias, sem planilha de efetivo dedicada), aba "Efetivo
   atualizado". Conta linhas com RE preenchido. Arquivos alternativos
   (\DIVERSOS\..., \P4\..., \CNH, \FOTOS) são variantes/cópias e ficam de
   fora — só o arquivo direto em <ano>\EFETIVO\ é a fonte oficial.

2. 'ferias_concedidas' (eh_anual=true) — um arquivo <ano>\P1\Férias\...\
   Férias <ano>.xlsx por ano (2018, 2020-2026), somando linhas com RE
   preenchido em todas as abas do arquivo (2026 tem 2 abas: "FT ROCAM" e
   "RPM"; anos anteriores têm 1 aba só). Cada linha é um período de férias
   concedido (planilha quebrada em blocos JANEIRO..DEZEMBRO dentro da
   mesma aba, com o cabeçalho Nº/GRADUAÇÃO/RE/NOME/MÊS/DIAS/INÍCIO/VISTO
   repetido a cada bloco de mês).

3. 'dias_empregados' (eh_anual=false, ano+mes) — proxy rápida de dias com
   escala publicada: conta os arquivos <DD>.xls(x) dentro de cada pasta
   <ano>\ESCALAS\<NN-MES>\ (não abre o conteúdo de cada escala, só conta
   arquivos — long tail de ~3200 arquivos individuais, abrir um a um não
   compensa). O walk é genérico (dirpath terminando em "ESCALAS") porque a
   árvore tem anos antigos aninhados dentro de pastas mais novas
   (2017 dentro de 2020\, 2018 dentro de 2021\) — o ano vem da pasta que
   contém directamente "ESCALAS", não do ano-raiz do caminho.

Além disso, agregado_dimensional secao='ft' fonte='efetivo' dimensao=
'pelotao' — snapshot ÚNICO (tabela não é temporal, unique key é
secao+fonte+dimensao+chave) tirado do arquivo de efetivo MAIS RECENTE
(2026), somando as abas dedicadas por unidade (ADM, Pel 1, Pel 2,
ROCAM A, ROCAM B, RPM "A", RPM "B" — as que existirem no arquivo do ano).

FOLHA DE CARATER GERAL por pelotão (pasta "Documentos para o serviço")
foi avaliada e descartada: dezenas de cópias/versões conflitantes
("Cópia de Cópia de...", "...EM BRANCO", múltiplas datas de atualização
no nome do arquivo sem um "mais recente" inequívoco) — reportado em
nao_carregado, não em agregado_dimensional.

Uso:
    python -m ingest.secoes.forca_tatica [--dry-run] [--forcar]
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
    upsert_agregado_dimensional,
    registrar_arquivo,
    arquivo_ja_ingerido,
    sha256_arquivo,
)

SECAO = "ft"
RAIZ_UNC = r"\\cmdo\pmesp\16BPMM\16BPMM_FT\Matriz FT"

# Um arquivo canônico de EFETIVO por ano (o arquivo direto em <ano>\EFETIVO\,
# não as variantes \DIVERSOS\..., \P4\..., \CNH, \FOTOS que são cópias ou
# recortes parciais do mesmo dado).
EFETIVO_POR_ANO = {
    2018: r"2021\2018\EFETIVO\Efetivo - Atualizado .xlsx",
    2020: r"2020\EFETIVO\Efetivo - Atualizado .xlsx",
    2021: r"2021\EFETIVO\Efetivo - Atualizado .xlsx",
    2022: r"2022\EFETIVO\Efetivo - Atualizado .xlsx",
    2023: r"2023\EFETIVO\Efetivo - Atualizado .xlsx",
    2024: r"2024\EFETIVO\Efetivo - Atualizado .xlsx",
    2025: r"2025\EFETIVO\Efetivo - Atualizado .xlsx",
    2026: r"2026\EFETIVO\Efetivo - Atualizado.xlsx",
}
ANO_PELOTAO_SNAPSHOT = 2026  # arquivo mais recente -> fonte do agregado_dimensional

# Abas de unidade (não a lista geral "Efetivo atualizado" nem os anexos
# TELEFONE E EMAIL / CAFÉ / SAT) usadas para o agregado por pelotão.
ABAS_UNIDADE = {"ADM", "Pel 1", "Pel 2", "ROCAM A", "ROCAM B", 'RPM "A"', 'RPM "B"'}

# Um arquivo canônico de FÉRIAS por ano (o que fica na pasta do próprio ano;
# quando o mesmo "Férias <ano>.xlsx" aparece replicado dentro da pasta do
# ano seguinte também, ignora a réplica).
FERIAS_POR_ANO = {
    2018: r"2021\2018\P1\Férias\Férias 2018.xlsx",
    2020: r"2020\P1\Férias\FÉRIAS\Férias 2020 .xlsx",
    2021: r"2021\P1\Férias\FÉRIAS\Férias 2021 .xlsx",
    2022: r"2022\P1\Férias\FÉRIAS\PLANILHA DE FÉRIAS\Férias 2022 .xlsx",
    2023: r"2023\P1\Férias\PAF 2023\Férias 2023.xlsx",
    2024: r"2024\P1\Férias\PAF 2024\Férias 2024.xlsx",
    2025: r"2025\P1\Férias\PAF 2025\Férias 2025.xlsx",
    2026: r"2026\P1\FÉRIAS\Férias 2026.xlsx",
}

RE_DIA_ARQUIVO = re.compile(r"^\d{1,2}\.xlsx?$", re.IGNORECASE)
RE_MES_PASTA = re.compile(r"^(\d{1,2})\s*-")


def _norm(s) -> str:
    return re.sub(r"\s+", "", str(s or "")).strip().upper()


def _linha_fato(indicador: str, ano: int, valor: float, mes: int | None = None, eh_anual: bool = False) -> dict:
    """Monta uma linha fato_secao com o MESMO conjunto de chaves sempre
    (mes/cia sempre presentes, mesmo que None) — o upsert em lote via
    PostgREST recusa o batch inteiro (PGRST102 'All object keys must
    match') se os dicts do array tiverem conjuntos de chaves diferentes,
    o que acontecia quando linhas anuais (sem 'mes') eram misturadas com
    linhas mensais (com 'mes') no mesmo POST."""
    return {
        "secao": SECAO,
        "indicador": indicador,
        "ano": ano,
        "mes": mes,
        "eh_anual": eh_anual,
        "cia": None,
        "valor": valor,
    }


def _achar_col(header_row, alvo: str) -> int | None:
    """Índice da coluna cujo cabeçalho normalizado (sem espaços, maiúsculo)
    bate com `alvo` (ex.: 'RE' casa tanto 'RE' quanto 'R E')."""
    for i, cel in enumerate(header_row):
        if _norm(cel) == alvo:
            return i
    return None


def _eh_linha_cabecalho(row) -> bool:
    """Uma linha é cabeçalho se tem uma coluna 'RE' (ou 'R E') E outra coluna
    de nome/graduação por perto — não basta achar 'RE' sozinho (aparece
    exato só em cabeçalho, mas confirmar com NOME/GRADUAÇÃO evita qualquer
    falso positivo de dado). Cobre tanto o cabeçalho clássico
    (Nº/GRADUAÇÃO/RE/NOME...) quanto o da planilha RPM, que começa com
    QTD/QTD/POSTO/R E/N O M E/CIA/..."""
    normalizados = [_norm(c) for c in row]
    if "RE" not in normalizados:
        return False
    return any("NOME" in c or "GRADUA" in c or "POSTO" in c for c in normalizados)


def _contar_linhas_com_re(ws) -> tuple[int, int | None]:
    """Varre a worksheet inteira, redetectando o cabeçalho a cada bloco
    (usado tanto pelo Efetivo — cabeçalho único no topo — quanto pelas
    planilhas de Férias, que repetem Nº/GRADUAÇÃO/RE/... a cada bloco de
    mês). Retorna (linhas_com_re, indice_coluna_re_do_ultimo_cabecalho)."""
    idx_re = None
    total = 0
    for row in ws.iter_rows(values_only=True):
        if _eh_linha_cabecalho(row):
            idx_re = _achar_col(row, "RE")
            continue
        if idx_re is None or idx_re >= len(row):
            continue
        valor = row[idx_re]
        if valor is not None and str(valor).strip():
            total += 1
    return total, idx_re


def processar_efetivo(caminho: str) -> tuple[int, list[str]]:
    """Retorna (contagem_re_valido, avisos) da aba 'Efetivo atualizado'."""
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    nome_aba = next((n for n in wb.sheetnames if _norm(n) == "EFETIVOATUALIZADO"), None)
    if nome_aba is None:
        wb.close()
        return 0, [f"aba 'Efetivo atualizado' ausente em {os.path.basename(caminho)}"]
    ws = wb[nome_aba]
    total, _ = _contar_linhas_com_re(ws)
    wb.close()
    return total, []


def processar_pelotoes(caminho: str) -> tuple[list[dict], list[str]]:
    """Retorna (linhas_agregado_dimensional, avisos) — uma linha por aba de
    unidade presente no arquivo (ABAS_UNIDADE ∩ abas do arquivo)."""
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    linhas: list[dict] = []
    avisos: list[str] = []
    presentes = [n for n in wb.sheetnames if n in ABAS_UNIDADE]
    if not presentes:
        avisos.append(f"nenhuma aba de unidade (ADM/Pel 1/Pel 2/ROCAM/RPM) em {os.path.basename(caminho)}")
    for nome_aba in presentes:
        ws = wb[nome_aba]
        total, _ = _contar_linhas_com_re(ws)
        linhas.append(
            {
                "secao": SECAO,
                "fonte": "efetivo",
                "dimensao": "pelotao",
                "chave": nome_aba.strip(),
                "valor": total,
            }
        )
    wb.close()
    return linhas, avisos


def processar_ferias(caminho: str) -> tuple[int, list[str]]:
    """Soma linhas com RE válido em TODAS as abas do arquivo (2026 tem 2
    abas — FT ROCAM + RPM — que juntas formam o total do ano)."""
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    total = 0
    avisos: list[str] = []
    for nome_aba in wb.sheetnames:
        ws = wb[nome_aba]
        n, idx = _contar_linhas_com_re(ws)
        if idx is None:
            continue  # aba auxiliar sem cabeçalho Nº/RE (ex.: Plan2/Plan3 vazias)
        total += n
    wb.close()
    if total == 0:
        avisos.append(f"nenhuma linha com RE válido em {os.path.basename(caminho)}")
    return total, avisos


def localizar_pastas_escalas() -> list[tuple[int, str]]:
    """Acha toda pasta literalmente chamada ESCALAS até 2 níveis abaixo da
    raiz (glob dirigido, não os.walk — a árvore completa da Matriz FT tem
    dezenas de milhares de arquivos em pastas irrelevantes como FOTOS/
    Documentos para o serviço, e os.walk recursivo nelas é lento demais
    sobre SMB). Cobre tanto <ano>\ESCALAS quanto os anos antigos aninhados
    <ano_pasta>\<ano_real>\ESCALAS. Retorna (ano, caminho_pasta_escalas),
    onde ano vem do nome da pasta que contém ESCALAS diretamente."""
    # Dedupe por ano: alguns anos antigos existem em DOIS lugares (ex.: 2018
    # tem tanto <RAIZ>\2018\ESCALAS quanto <RAIZ>\2021\2018\ESCALAS — cópia
    # arquivada dentro da pasta de 2021, achado real na varredura). Sem
    # dedupe, os dois gerariam fato_secao duplicado para o mesmo
    # (ano,mes) e o upsert em lote falha (PostgreSQL: "ON CONFLICT DO
    # UPDATE command cannot affect row a second time" — a constraint só
    # protege contra duplicata *entre* lotes, não *dentro* do mesmo POST).
    # Prioridade: pasta de 1 nível (<RAIZ>\<ano>\ESCALAS, a localização
    # "oficial") vence sobre a aninhada de 2 níveis.
    por_ano: dict[int, str] = {}
    # 1º passo (prioridade alta): pastas de 1 nível <RAIZ>\<ano>\ESCALAS.
    for caminho in glob.glob(os.path.join(RAIZ_UNC, "*", "ESCALAS")):
        if not os.path.isdir(caminho):
            continue
        nome_pai = os.path.basename(os.path.dirname(caminho))
        if re.fullmatch(r"\d{4}", nome_pai):
            por_ano[int(nome_pai)] = caminho
    # 2º passo (fallback): pastas aninhadas de 2 níveis, só para anos que
    # ainda não têm pasta de 1 nível.
    for caminho in glob.glob(os.path.join(RAIZ_UNC, "*", "*", "ESCALAS")):
        if not os.path.isdir(caminho):
            continue
        nome_pai = os.path.basename(os.path.dirname(caminho))
        if re.fullmatch(r"\d{4}", nome_pai):
            por_ano.setdefault(int(nome_pai), caminho)
    return sorted(por_ano.items())


def contar_dias_empregados(pasta_escalas: str) -> list[dict]:
    """Uma linha fato_secao por subpasta de mês (NN-MES) dentro da pasta
    ESCALAS, valor = nº de arquivos <DD>.xls(x) nela (proxy de dias com
    escala publicada naquele mês)."""
    linhas = []
    if not os.path.isdir(pasta_escalas):
        return linhas
    for nome_mes in sorted(os.listdir(pasta_escalas)):
        caminho_mes = os.path.join(pasta_escalas, nome_mes)
        if not os.path.isdir(caminho_mes):
            continue
        m = RE_MES_PASTA.match(nome_mes.strip())
        if not m:
            continue
        mes = int(m.group(1))
        if not (1 <= mes <= 12):
            continue
        n_dias = sum(
            1
            for f in os.listdir(caminho_mes)
            if RE_DIA_ARQUIVO.match(f) and not eh_arquivo_lixo(f)
        )
        linhas.append({"mes": mes, "valor": n_dias, "pasta": caminho_mes})
    return linhas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="lê e mostra o resumo, não grava no Supabase")
    ap.add_argument("--forcar", action="store_true", help="reingere mesmo se o hash do arquivo não mudou")
    args = ap.parse_args()

    if not caminho_disponivel(RAIZ_UNC):
        print(f"[forca_tatica] Fonte indisponível: {RAIZ_UNC}")
        if not args.dry_run:
            batch_id = abrir_batch(SECAO, "efetivo_ferias_escalas")
            fechar_batch(batch_id, "fonte_indisponivel", erro="UNC inacessível no momento da execução")
        sys.exit(0)

    batch_id = None if args.dry_run else abrir_batch(SECAO, "efetivo_ferias_escalas")
    linhas_fato: list[dict] = []
    linhas_agregado: list[dict] = []
    arquivos_processados: list[tuple[str, str, int]] = []  # (caminho, observacao, linhas_reais)
    avisos: list[str] = []
    erro_fatal = None

    try:
        # 1) EFETIVO TOTAL por ano + snapshot por pelotão (ano mais recente)
        for ano, rel in sorted(EFETIVO_POR_ANO.items()):
            caminho = os.path.join(RAIZ_UNC, rel)
            if not os.path.isfile(caminho):
                avisos.append(f"efetivo_total {ano}: arquivo não encontrado ({rel})")
                continue
            total, w = processar_efetivo(caminho)
            avisos.extend(w)
            if total > 0:
                linhas_fato.append(_linha_fato("efetivo_total", ano, total, eh_anual=True))
            arquivos_processados.append((caminho, f"EFETIVO {ano} — Efetivo atualizado ({total} RE válidos)", total))

            if ano == ANO_PELOTAO_SNAPSHOT:
                linhas_pel, w2 = processar_pelotoes(caminho)
                avisos.extend(w2)
                linhas_agregado.extend(linhas_pel)

        # 2) FÉRIAS CONCEDIDAS por ano
        for ano, rel in sorted(FERIAS_POR_ANO.items()):
            caminho = os.path.join(RAIZ_UNC, rel)
            if not os.path.isfile(caminho):
                avisos.append(f"ferias_concedidas {ano}: arquivo não encontrado ({rel})")
                continue
            total, w = processar_ferias(caminho)
            avisos.extend(w)
            if total > 0:
                linhas_fato.append(_linha_fato("ferias_concedidas", ano, total, eh_anual=True))
            arquivos_processados.append((caminho, f"FÉRIAS {ano} ({total} períodos com RE válido)", total))

        # 3) DIAS EMPREGADOS (proxy = contagem de arquivos de escala por mês)
        pastas_escalas = localizar_pastas_escalas()
        print(f"[forca_tatica] {len(pastas_escalas)} pasta(s) ESCALAS encontrada(s).")
        for ano, pasta in sorted(pastas_escalas):
            for item in contar_dias_empregados(pasta):
                linhas_fato.append(_linha_fato("dias_empregados", ano, item["valor"], mes=item["mes"]))
            arquivos_processados.append(
                (pasta, f"ESCALAS {ano} — contagem de arquivos por mês (proxy dias empregados)", None)
            )

        print(f"[forca_tatica] fato_secao: {len(linhas_fato)} linha(s) válida(s) preparada(s).")
        print(f"[forca_tatica] agregado_dimensional (pelotão, {ANO_PELOTAO_SNAPSHOT}): {len(linhas_agregado)} linha(s).")
        if avisos:
            print(f"[forca_tatica] avisos ({len(avisos)}):")
            for a in avisos[:20]:
                print("  -", a)

        if args.dry_run:
            for l in linhas_fato[:15]:
                print("  ", l)
            for l in linhas_agregado:
                print("  ", l)
            return

        for l in linhas_fato:
            l["batch_id"] = batch_id
        upsert_fato_secao(linhas_fato)
        for l in linhas_agregado:
            l["batch_id"] = batch_id
        upsert_agregado_dimensional(linhas_agregado)

        for caminho, observacao, linhas_reais in arquivos_processados:
            sha = sha256_arquivo(caminho) if os.path.isfile(caminho) else None
            if sha is None:
                # pasta (ESCALAS), não arquivo — registra proveniência sem hash
                continue
            if not args.forcar and arquivo_ja_ingerido(SECAO, caminho, sha):
                continue
            registrar_arquivo(
                secao=SECAO,
                caminho_unc=caminho,
                sha256=sha,
                mtime_iso=mtime_iso(caminho),
                linhas_reais=linhas_reais,
                observacao=observacao,
                batch_id=batch_id,
            )
    except Exception as e:  # noqa: BLE001 — precisa fechar o batch como 'falha' em qualquer exceção
        erro_fatal = str(e)

    if erro_fatal:
        fechar_batch(batch_id, "falha", len(linhas_fato) + len(linhas_agregado), None, None, avisos, erro_fatal)
        print(f"[forca_tatica] FALHA: {erro_fatal}")
        sys.exit(1)

    status = "ok" if not avisos else "parcial"
    fechar_batch(
        batch_id,
        status,
        len(linhas_fato) + len(linhas_agregado),
        len(linhas_fato) + len(linhas_agregado),
        0,
        avisos,
    )
    print(f"[forca_tatica] Concluído ({status}): {len(linhas_fato)} fato_secao, {len(linhas_agregado)} agregado_dimensional.")


if __name__ == "__main__":
    main()
