# -*- coding: utf-8 -*-
"""
Ingestão P4 — série histórica 2019-2025 (LCM/Inventário anual + Indicadores
da Qualidade CPA/M-5 mensal).

IMPORTANTE: P4 2026 já está ingerido nas tabelas dedicadas p4_patrimonio /
p4_material_belico / etc. via scripts/ingest_p4.py — este script NÃO toca
nelas. Aqui só entra o framework genérico (fato_secao / agregado_dimensional)
para o histórico pré-2026, que não tinha carga alguma.

Fonte 1 — LCM / Inventário Geral anual (indicadores 'itens_patrimoniados' e
'valor_total_carga', fato_secao, eh_anual=true):
\\cmdo\pmesp\16BPMM\16BPMM_EM\P4\P4 <ano>\...\INVENTÁRIO ...\<aba INVENTÁRIO>
Cada planilha desse tipo (LCM — Listagem de Controle de Material, conforme
o próprio cabeçalho do arquivo: "Secretaria da Segurança Pública / Polícia
Militar do Estado de São Paulo / OPM: 16º BPM/M") termina com uma linha
'TOTAL INVENTÁRIO' (valor R$) + 'TOTAL DE ITENS' (contagem) — esse par é o
que vira, respectivamente, 'valor_total_carga' e 'itens_patrimoniados' do
ano. Ignora deliberadamente as linhas 'TOTAL TERMO DE INVENTÁRIO' e 'TOTAL
GERAL' que aparecem em alguns arquivos mais antigos (baixas/movimentações
do Termo de Entrega, não o inventário físico em si) para manter os 7 anos
comparáveis entre si na mesma definição de indicador.

ACHADO REAL (não hipotético) da varredura do manifest: o arquivo do 16º
BPM/M NÃO tem um inventário único consolidado todo ano — a cobertura de
empresa/fração varia ano a ano (ver ESCOPO_POR_ANO abaixo). 2019 e 2020 só
têm inventário de Cia FT/4ª Cia isolada (as demais frações não foram
encontradas ou estão ilegíveis); 2021/2022 têm um arquivo "INVENTÁRIO
16BPMM-<ano>" sem sufixo de Cia (provável carga geral, mas sem confirmação
documental de que cobre TODAS as frações); 2023-2025 só têm o inventário do
EM. Ou seja: esta série NÃO é um total de batalhão estritamente comparável
ano a ano — é a melhor aproximação disponível no arquivo morto para cada
ano, com a fração coberta documentada em arquivos_fonte.observacao. Por
isso os valores ficam em fato_secao com cia=NULL ("sem quebra por cia",
conforme o comentário da própria coluna na migration 007) em vez de um
cia=0 que sugeriria indevidamente "batalhão inteiro".

Dedupe aplicado manualmente durante a varredura (arquivos abaixo já são a
escolha final, não a lista bruta): 2021 tinha o mesmo arquivo "INVENTÁRIO
16BPMM-2021.xlsm" duplicado em 3 pastas (DIVERSOS/COLETES/FT 2021, mesmo
conteúdo) — usa 1x. 2024 tinha "INVENTÁRIO 2024.xlsx" do EM duplicado em 3
pastas (P4 2024 e 2x dentro de P4 2025, mesmo conteúdo) — usa 1x. 2025 tinha
2 rascunhos "INVENTÁRIO telematica 2025*.xlsx" com valores diferentes do
"INVENTÁRIO 2025.xlsx" final — usa só o final (nome sem "telematica",
presumivelmente a versão fechada). O inventário de 4ª CIA de 2019
("INVENTÁRIO 4ª 16BPMM-001-34-19.xlsm") tem a linha TOTAL INVENTÁRIO/TOTAL
DE ITENS com todas as células numéricas vazias (arquivo com fórmula
quebrada/planilha corrompida) — descartado, ver nao_carregado no retorno da
ingestão.

Fonte 2 — Indicadores da Qualidade CPA/M-5 (agregado_dimensional, mensal):
\\cmdo\pmesp\16BPMM\16BPMM_EM\P4\P4 2025\DOCUMENTOS CPA COM PRAZO\
INDICADORES DA QUALIDADE - MAI25.xlsx (aba única, "Página1")
Usa só o arquivo de MAI25 (não ABR25): é um superset do ABR25 (mesmo layout,
mesmos ~41 indicadores, só que com mais meses preenchidos — jan-mai vs
jan-fev/abr conforme o indicador) — ABR25 vira redundante e fica de fora
(nao_carregado).

ACHADO REAL sobre a instrução original: o pedido era gravar um único
indicador escalar 'indicadores_qualidade' (fato_secao, duplicado com
secao='governanca'). A planilha real, porém, não tem um índice único — são
~41 indicadores de naturezas completamente diferentes (frota baixada,
resíduos recicláveis, processos SEI, etc.), cada um com série mensal 2025 +
totais anuais 2022-2024, todos só para a linha "16º BPM/M" do quadro
(que também lista CPA/M-5, 4º/23º/49º BPM/M e CAEP, fora de escopo aqui).
Colapsar os 41 em 1 valor destruiria a informação. Além disso — e esse é o
motivo estrutural, não só de fidelidade — fato_secao.secao tem CHECK
constraint travado em ('p1','p2','p3','p4','p5','ft','motomec','res_armas',
'spjmd'); 'governanca' NÃO está nessa lista (confirmado via
pg_get_constraintdef no projeto lypxujjyllmibxqvdogr em 19/07/2026), então
um insert fato_secao com secao='governanca' FALHARIA. Por isso os 41
indicadores vão para agregado_dimensional (sem esse CHECK), com
dimensao=<indicador sanitizado> e chave='<ano>-<mês:02d>' (mensal) ou
'<ano>-anual' (totais 2022-2024) — gravados 2x: secao='p4' (arquivo de
origem) e secao='governanca' (para a página /governanca consumir via
rankingDimensao). ATENÇÃO: a página /governanca hoje lê a série
"Indicadores de Qualidade" via fato_secao (serieMensal/totalIndicador,
lib/db/secao.ts), não via agregado_dimensional — ou seja, os cards de KPI e
o gráfico de série daquela página CONTINUAM vazios para este indicador até
alguém (a) alterar a CHECK constraint de fato_secao.secao para aceder
'governanca' e decidir qual dos 41 indicadores vira o escalar do KPI, OU
(b) atualizar governanca/page.tsx para ler agregado_dimensional em vez de
fato_secao. Nenhuma das duas coisas foi feita aqui — mexer em migration ou
em página do produto está fora do escopo de uma ingestão e exige aprovação
prévia do usuário (norma do projeto). Os 41 indicadores ficam disponíveis
em agregado_dimensional para quando essa decisão for tomada.

Uso:
    python -m ingest.secoes.p4_historico [--dry-run] [--forcar]
"""
import argparse
import os
import re
import sys
import unicodedata

import openpyxl

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ingest.common.unc import caminho_disponivel
from ingest.common.excel import mtime_iso, numero_ou_none
from ingest.common.carga import (
    abrir_batch,
    fechar_batch,
    upsert_fato_secao,
    upsert_agregado_dimensional,
    registrar_arquivo,
    arquivo_ja_ingerido,
    sha256_arquivo,
)

SECAO = "p4"
RAIZ_UNC = r"\\cmdo\pmesp\16BPMM\16BPMM_EM\P4"

# (ano_conteudo -> lista de (escopo_documentado, caminho_relativo_a_RAIZ_UNC))
# escopo é só documentação (arquivos_fonte.observacao) — não vira cia= no
# fato_secao (ver docstring: cobertura não é uniforme ano a ano).
INVENTARIOS_POR_ANO: dict[int, list[tuple[str, str]]] = {
    2019: [
        ("Cia FT (única fração legível — 4ª Cia do mesmo ano tem TOTAL "
         "INVENTÁRIO com células numéricas vazias, arquivo corrompido, "
         "descartada)",
         r"P4 2019\INVENTÁRIO E PASSAGEM DE CARGA\INVENTÁRIO DAS CIAS E FT 2019\INVENTÁRIO Cia FT.xlsm"),
    ],
    2020: [
        ("4ª Cia", r"P4 2020\INVENTÁRIO GERAL 2020\INVENTÁRIO 4ª CIA\01-24JAN19-INVENTÁRIO 4ª CIA 16BPMM.xlsm"),
        ("Cia FT", r"P4 2020\INVENTÁRIO GERAL 2020\INVENTÁRIO FT\Cópia de INVENTÁRIO 16BPMM-2020 (3).xlsm"),
    ],
    2021: [
        ("escopo não identificável no arquivo (nome 'INVENTÁRIO 16BPMM-2021' "
         "sem sufixo de Cia, achado em pasta de Cia FT — pode ser geral ou "
         "só FT)",
         r"P4 2021\INVENTÁRIO GERAL MATERIAIS 2021\FT 2021\INVENTÁRIO 16BPMM-2021.xlsm"),
    ],
    2022: [
        ("escopo não identificável (mesmo padrão de nome do 2021, achado em pasta de Cia FT)",
         r"P4 2022\INVENTÁRIO 2022\FT\Cópia de INVENTÁRIO 16BPMM-2022.xlsm"),
    ],
    2023: [("EM (Estado-Maior)", r"P4 2023\INVENTÁRIO 2023\EM\INVENTÁRIO 2023.xlsx")],
    2024: [("EM (Estado-Maior)", r"P4 2024\INVENTÁRIO 2024\EM\INVENTÁRIO 2024.xlsx")],
    2025: [("EM (Estado-Maior)", r"P4 2025\INVENTÁRIO 2024\INVENTÁRIO 2025\EM\INVENTÁRIO 2025.xlsx")],
}

INDICADORES_QUALIDADE_ARQUIVO = r"P4 2025\DOCUMENTOS CPA COM PRAZO\INDICADORES DA QUALIDADE - MAI25.xlsx"


def normalizar(v) -> str:
    """Maiúsculo, sem acento, sem espaço nas pontas — para comparação de
    rótulo robusta a 'º'/'°'/variação de maiúscula que aparece nas fontes."""
    if v is None:
        return ""
    s = str(v).strip()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return s.upper().strip()


def slugify(nome: str, maxlen: int = 200) -> str:
    """maxlen bem folgado (200): achado real — dois indicadores da CPA/M-5
    só diferem depois do caractere 160 ('...de área menor que 200m² de área
    construída' vs '...construída e que possui sistema de combate a
    incêndio regularizado pelo CB'); um corte curto colidia os dois no
    mesmo slug e quebrava o upsert (dois valores 'diferentes' pro mesmo
    par dimensao+chave na mesma request -> Postgres rejeita o upsert em
    lote com 'ON CONFLICT DO UPDATE command cannot affect row a second
    time')."""
    s = normalizar(nome)
    s = re.sub(r"[^A-Z0-9]+", "_", s).strip("_")
    return s[:maxlen].lower() or "indicador"


def achar_aba_inventario(wb):
    for nome in wb.sheetnames:
        n = normalizar(nome)
        if n.startswith("INVENT"):
            return wb[nome]
    return None


def extrair_total_lcm(caminho: str) -> tuple[float | None, int | None]:
    """Abre a aba INVENTÁRIO e procura a linha 'TOTAL INVENTÁRIO' (valor R$)
    + 'TOTAL DE ITENS' (contagem) — ver docstring do módulo para o porquê de
    ignorar TOTAL GERAL/TOTAL TERMO DE INVENTÁRIO."""
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    try:
        ws = achar_aba_inventario(wb)
        if ws is None:
            return None, None
        for row in ws.iter_rows(values_only=True):
            cells = list(row)
            norm_cells = [normalizar(c) for c in cells]
            if "TOTAL INVENTARIO" not in norm_cells:
                continue
            idx_label = norm_cells.index("TOTAL INVENTARIO")
            valor = None
            for c in cells[idx_label + 1 :]:
                v = numero_ou_none(c)
                if v is not None and v > 0:
                    valor = v
                    break
            itens = None
            if "TOTAL DE ITENS" in norm_cells:
                idx_itens = norm_cells.index("TOTAL DE ITENS")
                for c in cells[idx_itens + 1 :]:
                    v = numero_ou_none(c)
                    if v is not None:
                        itens = int(round(v))
                        break
            if itens is None:
                # variante sem o rótulo 'TOTAL DE ITENS' na mesma linha
                # (achado real: arquivo 01-24JAN19-INVENTÁRIO 4ª CIA) — a
                # contagem de itens é a última célula numérica da linha.
                for c in reversed(cells):
                    v = numero_ou_none(c)
                    if v is not None and v != valor:
                        itens = int(round(v))
                        break
            if valor is not None or itens is not None:
                return valor, itens
        return None, None
    finally:
        wb.close()


def extrair_indicadores_qualidade(caminho: str):
    """Retorna lista de (nome_indicador, ano_atual, {mes: valor}, {ano: valor})
    para a linha '16º BPM/M' de cada bloco de indicador da planilha CPA/M-5.
    Ver docstring do módulo para o layout (bloco de 10 linhas: título /
    PROCESSO+ano / nome+meses / CPA-M5 / 4ºBPM / 16ºBPM / 23ºBPM / 49ºBPM /
    CAEP / TOTAL MÊS)."""
    wb = openpyxl.load_workbook(caminho, data_only=True, read_only=True)
    try:
        ws = wb[wb.sheetnames[0]]
        linhas = list(ws.iter_rows(values_only=True))
        resultados = []
        for i, row in enumerate(linhas):
            col1 = normalizar(row[1]) if len(row) > 1 else ""
            if not (col1.startswith("16") and "BPM/M" in col1):
                continue
            idx_nome = i - 3
            idx_processo = i - 4
            if idx_nome < 0 or idx_processo < 0:
                continue
            linha_nome = linhas[idx_nome]
            linha_processo = linhas[idx_processo]
            if len(linha_nome) < 3 or normalizar(linha_nome[2]) != "JAN":
                continue  # não é o cabeçalho de mês esperado 3 linhas acima — pula (layout inesperado)
            nome_bruto = linha_nome[1]
            if not nome_bruto:
                continue
            nome = " ".join(str(nome_bruto).split())
            try:
                ano_atual = int(float(linha_processo[2]))
            except (TypeError, ValueError, IndexError):
                continue
            mensal: dict[int, float] = {}
            for k in range(12):
                idx_col = 2 + k
                if idx_col < len(row):
                    v = numero_ou_none(row[idx_col])
                    if v is not None:
                        mensal[k + 1] = v
            anuais: dict[int, float] = {}
            for idx_col in (16, 17, 18):
                if idx_col < len(linha_processo) and idx_col < len(row):
                    try:
                        ano_p = int(float(linha_processo[idx_col]))
                    except (TypeError, ValueError):
                        continue
                    v = numero_ou_none(row[idx_col])
                    if v is not None:
                        anuais[ano_p] = v
            resultados.append((nome, ano_atual, mensal, anuais))
        return resultados
    finally:
        wb.close()


def processar_inventarios(dry_run: bool, forcar: bool):
    fonte = "inventario_lcm_anual"
    batch_id = None if dry_run else abrir_batch(SECAO, fonte)
    linhas_fato: list[dict] = []
    lidos = 0
    descartes: list[str] = []
    erro_fatal = None
    try:
        for ano, arquivos in sorted(INVENTARIOS_POR_ANO.items()):
            soma_valor = 0.0
            soma_itens = 0
            teve_valor = teve_itens = False
            for escopo, rel in arquivos:
                caminho = os.path.join(RAIZ_UNC, rel)
                lidos += 1
                if not os.path.exists(caminho):
                    descartes.append(f"{ano} [{escopo}]: arquivo não encontrado — {caminho}")
                    continue
                sha = sha256_arquivo(caminho)
                if not forcar and not dry_run and arquivo_ja_ingerido(SECAO, caminho, sha):
                    print(f"  - {ano} [{escopo}]: sem mudança (hash igual), pulando")
                    continue
                valor, itens = extrair_total_lcm(caminho)
                print(f"  - {ano} [{escopo}]: {os.path.basename(caminho)} -> valor={valor} itens={itens}")
                if valor is None and itens is None:
                    descartes.append(f"{ano} [{escopo}]: TOTAL INVENTÁRIO/TOTAL DE ITENS não encontrado ou ilegível")
                    continue
                if valor is not None:
                    soma_valor += valor
                    teve_valor = True
                if itens is not None:
                    soma_itens += itens
                    teve_itens = True
                if not dry_run:
                    registrar_arquivo(
                        secao=SECAO,
                        caminho_unc=caminho,
                        sha256=sha,
                        mtime_iso=mtime_iso(caminho),
                        linhas_reais=1,
                        observacao=f"LCM/Inventário {ano} — escopo: {escopo} — valor={valor} itens={itens}",
                        batch_id=batch_id,
                    )
            if teve_valor:
                linhas_fato.append(
                    {"secao": SECAO, "indicador": "valor_total_carga", "ano": ano, "mes": None,
                     "eh_anual": True, "cia": None, "valor": round(soma_valor, 2)}
                )
            if teve_itens:
                linhas_fato.append(
                    {"secao": SECAO, "indicador": "itens_patrimoniados", "ano": ano, "mes": None,
                     "eh_anual": True, "cia": None, "valor": soma_itens}
                )
        if not dry_run:
            for linha in linhas_fato:
                linha["batch_id"] = batch_id
            upsert_fato_secao(linhas_fato)
    except Exception as e:  # noqa: BLE001
        erro_fatal = str(e)

    if dry_run:
        print(f"[p4_historico/inventarios] dry-run: {lidos} arquivos lidos, {len(linhas_fato)} linhas fato_secao válidas.")
        if descartes:
            print("  descartes:", descartes)
        return len(linhas_fato), descartes, erro_fatal

    if erro_fatal:
        fechar_batch(batch_id, "falha", lidos, len(linhas_fato), len(descartes), descartes, erro_fatal)
        print(f"[p4_historico/inventarios] FALHA: {erro_fatal}")
    else:
        status = "ok" if not descartes else "parcial"
        fechar_batch(batch_id, status, lidos, len(linhas_fato), len(descartes), descartes)
        print(f"[p4_historico/inventarios] {len(linhas_fato)} linhas fato_secao gravadas ({len(INVENTARIOS_POR_ANO)} anos), {len(descartes)} descartes.")
    return len(linhas_fato), descartes, erro_fatal


def processar_indicadores_qualidade(dry_run: bool, forcar: bool):
    fonte = "indicadores_qualidade_cpam5"
    batch_id = None if dry_run else abrir_batch(SECAO, fonte)
    linhas_dim: list[dict] = []
    descartes: list[str] = []
    erro_fatal = None
    caminho = os.path.join(RAIZ_UNC, INDICADORES_QUALIDADE_ARQUIVO)
    try:
        if not os.path.exists(caminho):
            descartes.append(f"arquivo não encontrado: {caminho}")
        else:
            sha = sha256_arquivo(caminho)
            pular = not forcar and not dry_run and arquivo_ja_ingerido(SECAO, caminho, sha)
            if pular:
                print(f"  - {os.path.basename(caminho)}: sem mudança (hash igual), pulando")
            else:
                resultados = extrair_indicadores_qualidade(caminho)
                print(f"  - {os.path.basename(caminho)}: {len(resultados)} blocos de indicador (16º BPM/M) encontrados")
                for nome, ano_atual, mensal, anuais in resultados:
                    dimensao = slugify(nome)
                    for mes, valor in mensal.items():
                        chave = f"{ano_atual}-{mes:02d}"
                        for secao_alvo in (SECAO, "governanca"):
                            linhas_dim.append(
                                {"secao": secao_alvo, "fonte": fonte, "dimensao": dimensao,
                                 "chave": chave, "valor": valor}
                            )
                    for ano_p, valor in anuais.items():
                        chave = f"{ano_p}-anual"
                        for secao_alvo in (SECAO, "governanca"):
                            linhas_dim.append(
                                {"secao": secao_alvo, "fonte": fonte, "dimensao": dimensao,
                                 "chave": chave, "valor": valor}
                            )
                if not dry_run:
                    upsert_agregado_dimensional(linhas_dim)
                    registrar_arquivo(
                        secao=SECAO,
                        caminho_unc=caminho,
                        sha256=sha,
                        mtime_iso=mtime_iso(caminho),
                        linhas_reais=len(resultados),
                        observacao=(
                            f"Indicadores da Qualidade CPA/M-5 — {len(resultados)} indicadores, "
                            f"linha 16º BPM/M, gravado em agregado_dimensional (secao=p4 e "
                            f"secao=governanca; ver docstring do script sobre fato_secao.secao "
                            f"não aceitar 'governanca')."
                        ),
                        batch_id=batch_id,
                    )
    except Exception as e:  # noqa: BLE001
        erro_fatal = str(e)

    if dry_run:
        print(f"[p4_historico/indicadores_qualidade] dry-run: {len(linhas_dim)} linhas agregado_dimensional válidas.")
        if descartes:
            print("  descartes:", descartes)
        return len(linhas_dim), descartes, erro_fatal

    if erro_fatal:
        fechar_batch(batch_id, "falha", None, len(linhas_dim), len(descartes), descartes, erro_fatal)
        print(f"[p4_historico/indicadores_qualidade] FALHA: {erro_fatal}")
    else:
        status = "ok" if not descartes else "parcial"
        fechar_batch(batch_id, status, None, len(linhas_dim), len(descartes), descartes)
        print(f"[p4_historico/indicadores_qualidade] {len(linhas_dim)} linhas agregado_dimensional gravadas, {len(descartes)} descartes.")
    return len(linhas_dim), descartes, erro_fatal


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="lê e mostra o resumo, não grava no Supabase")
    ap.add_argument("--forcar", action="store_true", help="reingere mesmo se o hash do arquivo não mudou")
    args = ap.parse_args()

    if not caminho_disponivel(RAIZ_UNC):
        print(f"[p4_historico] Fonte indisponível: {RAIZ_UNC}")
        if not args.dry_run:
            batch_id = abrir_batch(SECAO, "p4_historico_2019_2025")
            fechar_batch(batch_id, "fonte_indisponivel", erro="UNC inacessível no momento da execução")
        sys.exit(0)

    print("[p4_historico] === Inventários/LCM anuais (2019-2025) ===")
    n1, desc1, erro1 = processar_inventarios(args.dry_run, args.forcar)
    print("\n[p4_historico] === Indicadores da Qualidade CPA/M-5 (mensal 2025 + anual 2022-2024) ===")
    n2, desc2, erro2 = processar_indicadores_qualidade(args.dry_run, args.forcar)

    if erro1 or erro2:
        print(f"[p4_historico] FALHA — inventarios: {erro1!r} | indicadores_qualidade: {erro2!r}")
        sys.exit(1)


if __name__ == "__main__":
    main()
