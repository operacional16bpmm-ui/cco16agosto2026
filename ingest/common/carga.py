"""
Cliente mínimo (REST puro via `requests`, sem SDK novo) para o framework de
seções (migration 007): abre um lote em ingest_batches, faz upsert em
fato_secao/agregado_dimensional/arquivos_fonte, fecha o lote.

Credenciais lidas do .env.local da RAIZ do repo (o mesmo arquivo que o Next.js
usa, já no .gitignore) — nunca criamos um segundo arquivo de credenciais em
disco. Nenhum segredo é impresso em log.
"""
import hashlib
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import dotenv_values

RAIZ_REPO = Path(__file__).resolve().parents[2]
_env_arquivo = dotenv_values(RAIZ_REPO / ".env.local")

SUPABASE_URL = _env_arquivo.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SERVICE_KEY = _env_arquivo.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    print("[carga] SUPABASE_URL/SERVICE_ROLE_KEY não encontrados em .env.local — abortando.", file=sys.stderr)
    sys.exit(1)

_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}


def _url(tabela: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{tabela}"


def agora_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_arquivo(caminho: str) -> str:
    h = hashlib.sha256()
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()


def abrir_batch(secao: str, fonte: str) -> str:
    resp = requests.post(
        _url("ingest_batches"),
        headers={**_HEADERS, "Prefer": "return=representation"},
        json={"secao": secao, "fonte": fonte, "status": "executando"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()[0]["id"]


def fechar_batch(
    batch_id: str,
    status: str,
    linhas_lidas: int | None = None,
    linhas_validas: int | None = None,
    linhas_descartadas: int | None = None,
    descartes: list | None = None,
    erro: str | None = None,
) -> None:
    payload = {"status": status, "terminado_em": agora_iso()}
    if linhas_lidas is not None:
        payload["linhas_lidas"] = linhas_lidas
    if linhas_validas is not None:
        payload["linhas_validas"] = linhas_validas
    if linhas_descartadas is not None:
        payload["linhas_descartadas"] = linhas_descartadas
    if descartes is not None:
        payload["descartes"] = descartes[:50]  # amostra, não despeja tudo
    if erro is not None:
        payload["erro"] = erro[:2000]
    resp = requests.patch(
        _url("ingest_batches"),
        headers=_HEADERS,
        params={"id": f"eq.{batch_id}"},
        json=payload,
        timeout=30,
    )
    resp.raise_for_status()


def upsert_fato_secao(linhas: list[dict]) -> None:
    """Upsert em lote por (secao,indicador,ano,mes,eh_anual,cia) —
    constraint fato_secao_uk (unique nulls not distinct, migration 007)."""
    if not linhas:
        return
    for i in range(0, len(linhas), 500):
        lote = linhas[i : i + 500]
        resp = requests.post(
            _url("fato_secao"),
            headers={**_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            params={"on_conflict": "secao,indicador,ano,mes,eh_anual,cia"},
            json=lote,
            timeout=60,
        )
        resp.raise_for_status()


def upsert_agregado_dimensional(linhas: list[dict]) -> None:
    """Upsert em lote por (secao,fonte,dimensao,chave)."""
    if not linhas:
        return
    for i in range(0, len(linhas), 500):
        lote = linhas[i : i + 500]
        resp = requests.post(
            _url("agregado_dimensional"),
            headers={**_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            params={"on_conflict": "secao,fonte,dimensao,chave"},
            json=lote,
            timeout=60,
        )
        resp.raise_for_status()


def upsert_generico(tabela: str, linhas: list[dict], on_conflict: str) -> None:
    """Upsert em lote para tabelas FORA do framework de seções (ex.:
    public.viaturas, que é pré-existente à migration 007 e tem PK própria).
    Mesmo padrão de paginação/merge-duplicates dos upserts acima — só
    parametriza tabela e coluna(s) de conflito."""
    if not linhas:
        return
    for i in range(0, len(linhas), 500):
        lote = linhas[i : i + 500]
        resp = requests.post(
            _url(tabela),
            headers={**_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            params={"on_conflict": on_conflict},
            json=lote,
            timeout=60,
        )
        resp.raise_for_status()


def deletar_por_valores(tabela: str, coluna: str, valores: list[str]) -> None:
    """Remove linhas cuja `coluna` esteja em `valores` (filtro PostgREST
    `in.(...)`). Usado para tirar de circulação registros de seed/homologação
    (migration 003) que uma ingestão real substitui só parcialmente."""
    if not valores:
        return
    resp = requests.delete(
        _url(tabela),
        headers=_HEADERS,
        params={coluna: f"in.({','.join(valores)})"},
        timeout=30,
    )
    resp.raise_for_status()


def deletar_por_like(tabela: str, coluna: str, padrao: str) -> int:
    """Remove linhas cuja `coluna` combine com `padrao` (filtro PostgREST
    `like.<padrao>`, onde `*` vira `%`). Usado para limpar registros de uma
    rodada de ingestão anterior que ficaram obsoletos (ex.: chave sintética
    substituída por uma fonte melhor). Retorna a contagem de linhas restantes
    com esse padrão (deve ser 0 após a chamada, senão a policy de RLS bloqueou
    o delete)."""
    resp = requests.delete(
        _url(tabela),
        headers={**_HEADERS, "Prefer": "return=representation"},
        params={coluna: f"like.{padrao}"},
        timeout=60,
    )
    resp.raise_for_status()
    return len(resp.json())


def registrar_arquivo(
    secao: str,
    caminho_unc: str,
    sha256: str,
    mtime_iso: str | None,
    linhas_reais: int | None,
    observacao: str | None,
    batch_id: str,
) -> None:
    """Upsert por (secao, caminho_unc, sha256) — arquivo inalterado (mesmo
    hash) não gera nova linha, só atualiza ingerido_em."""
    resp = requests.post(
        _url("arquivos_fonte"),
        headers={**_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
        params={"on_conflict": "secao,caminho_unc,sha256"},
        json={
            "secao": secao,
            "caminho_unc": caminho_unc,
            "sha256": sha256,
            "mtime": mtime_iso,
            "linhas_reais": linhas_reais,
            "observacao": observacao,
            "batch_id": batch_id,
            "ingerido_em": agora_iso(),
        },
        timeout=30,
    )
    resp.raise_for_status()


def arquivo_ja_ingerido(secao: str, caminho_unc: str, sha256: str) -> bool:
    """True se este exato (secao, caminho_unc, sha256) já está registrado —
    permite pular o arquivo (idempotência de arquivo)."""
    resp = requests.get(
        _url("arquivos_fonte"),
        headers=_HEADERS,
        params={
            "secao": f"eq.{secao}",
            "caminho_unc": f"eq.{caminho_unc}",
            "sha256": f"eq.{sha256}",
            "select": "id",
            "limit": "1",
        },
        timeout=30,
    )
    resp.raise_for_status()
    return len(resp.json()) > 0
