# -*- coding: utf-8 -*-
"""
Ingestão Governança — indicadores institucionais próprios desta seção
(framework genérico fato_secao/arquivos_fonte, secao='governanca').

Esta seção é, na prática, um agregador: outros scripts (P4_HISTORICO,
P5_RECONHECIMENTO) também gravam indicadores com secao='governanca'
('indicadores_qualidade', 'objetivos_no_alvo') a partir dos CSVs extraídos
de P4/P5. Este script NÃO reprocessa essas fontes — antes de gravar, ele
consulta o que já existe em fato_secao (secao='governanca') e só grava o
que é trabalho próprio, para não duplicar nem sobrescrever o que outro
agente já carregou.

Trabalho próprio deste script:

1) Indicador 'normativos_vigentes' (fato_secao, eh_anual=true, ano=2026):
   soma de COUNT(public.normative_items) + COUNT(public.integration_catalog)
   — as duas tabelas de normativos/integrações já existentes no banco
   (15 + 13 linhas na varredura de 2026-07-19). Consulta feita via REST
   direto (GET com Prefer: count=exact), sem tocar nas próprias tabelas.

2) Registro em arquivos_fonte do Plano de Comando 2024-2031 (documento
   institucional único, não processado linha a linha — é um PDF de
   referência, não uma planilha de dados):
   C:\\Users\\13934852785\\Desktop\\Documents\\Plano-de-Comando-2024-2031-v1.1.pdf

Uso:
    python -m ingest.secoes.governanca [--dry-run]
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ingest.common.excel import mtime_iso
from ingest.common.carga import (
    SUPABASE_URL,
    _HEADERS,
    abrir_batch,
    fechar_batch,
    upsert_fato_secao,
    registrar_arquivo,
    sha256_arquivo,
)

import requests

SECAO = "governanca"
FONTE = "normativos_e_integracoes"
ANO_REFERENCIA = 2026

PLANO_DE_COMANDO = r"C:\Users\13934852785\Desktop\Documents\Plano-de-Comando-2024-2031-v1.1.pdf"


def contar_linhas(tabela: str) -> int:
    """COUNT(*) via REST puro (head=true + Prefer: count=exact, sem baixar
    linhas)."""
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{tabela}",
        headers={**_HEADERS, "Prefer": "count=exact"},
        params={"select": "id", "limit": "1"},
        timeout=30,
    )
    resp.raise_for_status()
    content_range = resp.headers.get("content-range", "")
    # formato "0-0/15"
    if "/" in content_range:
        return int(content_range.split("/")[-1])
    return len(resp.json())


def governanca_ja_tem(indicador: str) -> bool:
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/fato_secao",
        headers=_HEADERS,
        params={"secao": f"eq.{SECAO}", "indicador": f"eq.{indicador}", "select": "id", "limit": "1"},
        timeout=30,
    )
    resp.raise_for_status()
    return len(resp.json()) > 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="lê e mostra o resumo, não grava no Supabase")
    args = ap.parse_args()

    # (0) Não duplica trabalho de P4_HISTORICO/P5 — só relata o que já existe.
    ja_qualidade = governanca_ja_tem("indicadores_qualidade")
    ja_objetivos = governanca_ja_tem("objetivos_no_alvo")
    print(
        f"[governanca] indicadores_qualidade já carregado por outro agente: {ja_qualidade}; "
        f"objetivos_no_alvo já carregado por outro agente: {ja_objetivos}"
    )

    # (1) normativos_vigentes = COUNT(normative_items) + COUNT(integration_catalog)
    n_normativos = contar_linhas("normative_items")
    n_integracoes = contar_linhas("integration_catalog")
    total = n_normativos + n_integracoes
    print(f"[governanca] normative_items={n_normativos} integration_catalog={n_integracoes} total={total}")

    linha_normativos = {
        "secao": SECAO,
        "indicador": "normativos_vigentes",
        "ano": ANO_REFERENCIA,
        "mes": None,
        "eh_anual": True,
        "cia": None,
        "valor": float(total),
    }

    # (2) Plano de Comando 2024-2031 — registro institucional, não processado linha a linha.
    plano_existe = os.path.isfile(PLANO_DE_COMANDO)
    print(f"[governanca] Plano de Comando 2024-2031 encontrado: {plano_existe} ({PLANO_DE_COMANDO})")

    if args.dry_run:
        print(f"[governanca] dry-run: gravaria fato_secao {linha_normativos}")
        if plano_existe:
            print(f"[governanca] dry-run: registraria arquivos_fonte para {PLANO_DE_COMANDO}")
        return

    batch_id = abrir_batch(SECAO, FONTE)
    descartes: list[str] = []
    erro_fatal = None
    validas = 0

    # (1) fato_secao — achado real da carga: a CHECK constraint
    # fato_secao_secao_check (migration 007) só permite secao IN
    # ('p1','p2','p3','p4','p5','ft','motomec','res_armas','spjmd') — NÃO
    # inclui 'governanca'. Isso bloqueia qualquer gravação em fato_secao
    # com secao='governanca' (não só este indicador — também bloquearia
    # 'indicadores_qualidade'/'objetivos_no_alvo' de outros agentes desta
    # mesma seção) até uma migration adicionar o valor ao enum. Não altero
    # a constraint aqui sem autorização prévia (convenção do projeto) —
    # registro o bloqueio e sigo para a parte independente (arquivos_fonte).
    try:
        linha_normativos["batch_id"] = batch_id
        upsert_fato_secao([linha_normativos])
        validas = 1
    except Exception as e:  # noqa: BLE001
        descartes.append(
            f"normativos_vigentes NÃO gravado em fato_secao: {e}. "
            "CAUSA: fato_secao_secao_check não inclui 'governanca' no enum permitido "
            "(precisa de migration para liberar; não alterado sem autorização prévia)."
        )
        print(f"[governanca] AVISO: {descartes[-1]}")

    # (2) Plano de Comando 2024-2031 — arquivos_fonte não tem CHECK de secao,
    # só UNIQUE(secao, caminho_unc, sha256) — segue independente do bloqueio acima.
    if plano_existe:
        try:
            sha = sha256_arquivo(PLANO_DE_COMANDO)
            registrar_arquivo(
                secao=SECAO,
                caminho_unc=PLANO_DE_COMANDO,
                sha256=sha,
                mtime_iso=mtime_iso(PLANO_DE_COMANDO),
                linhas_reais=None,
                observacao="Plano de Comando 2024-2031 — referência institucional, não processado linha a linha",
                batch_id=batch_id,
            )
            validas += 1
            print("[governanca] Plano de Comando 2024-2031 registrado em arquivos_fonte.")
        except Exception as e:  # noqa: BLE001
            erro_fatal = str(e)
    else:
        descartes.append(f"Plano de Comando não encontrado em {PLANO_DE_COMANDO} — não registrado em arquivos_fonte.")
        print(f"[governanca] AVISO: {descartes[-1]}")

    if erro_fatal:
        fechar_batch(batch_id, "falha", 2, validas, 2 - validas, descartes, erro_fatal)
        print(f"[governanca] FALHA: {erro_fatal}")
        sys.exit(1)

    status = "ok" if not descartes else "parcial"
    fechar_batch(batch_id, status, 2, validas, 2 - validas, descartes)
    print(f"[governanca] Concluído ({status}): 2 lidas, {validas} válida(s), {2 - validas} descartada(s).")


if __name__ == "__main__":
    main()
