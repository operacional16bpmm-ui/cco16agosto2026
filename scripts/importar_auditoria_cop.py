"""Importação Auditoria de COP — CSV exportado do Google Sheet -> Supabase
(public.cop_auditoria_respostas).

O formulário Google (0 respostas em 22/07/2026, recém-publicado) NÃO tem
sincronização automática com o Supabase neste repositório — sem credencial
de Google Sheets API disponível, isso ficou fora de escopo. Este script é o
passo manual e re-executável: alguém exporta a aba de respostas do Sheet
como CSV (Arquivo > Fazer download > Valores separados por vírgula) e roda
este script apontando para o arquivo.

Colunas esperadas (cabeçalho exato do formulário):
  Carimbo de data/hora
  Data da Auditoria
  Informe o RE
  Informe o NOME de GUERRA
  Informe Posto/Graduação
  Selecione sua função
  Selecione sua Unidade/Subunidade
  Você auditou vídeo nesta data (SIM/NÃO)
  Informe quantos vídeos você auditou (0-5+)
  Informe o Nº da PARTE confeccionada
  Justifique

Sem upsert (o Sheet não tem uma chave natural estável linha a linha): por
padrão o script TRUNCA a tabela antes de inserir, igual ao padrão já usado
em scripts/ingest_p4.py — cada rodada é uma carga limpa da exportação mais
recente do Sheet. Use --sem-truncar para só adicionar (ex.: importar um
CSV incremental de respostas novas).

Uso:
    python scripts/importar_auditoria_cop.py --csv caminho/respostas.csv
    python scripts/importar_auditoria_cop.py --csv caminho/respostas.csv --dry-run
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import sys
import unicodedata
from pathlib import Path

import requests

RAIZ = Path(__file__).resolve().parent.parent

COLUNAS_ESPERADAS = {
    "carimbodedatahora": "carimbo",
    "datadaauditoria": "data_auditoria",
    "informeore": "re",
    "informeonomedeguerra": "nome_guerra",
    "informepostograduacao": "posto_graduacao",
    "selecionesuafuncao": "funcao",
    "selecionesuaunidadesubunidade": "subunidade",
    # o texto exato após "SIM/NÃO)" varia pouco entre exportações do Forms;
    # normalizado (sem acento/pontuação) o prefixo abaixo já é suficiente.
    "vocêauditouvideonestadata": "auditou_video",
    "voceauditouvideonestadata": "auditou_video",
    "informequantosvideosvoceauditou": "quantidade_videos",
    "informeonºdaparteconfeccionada": "numero_parte",
    "informeonumerodaparteconfeccionada": "numero_parte",
    "justifique": "justificativa",
}


def carrega_env() -> tuple[str, str]:
    env = RAIZ / ".env.local"
    vals = {}
    if env.exists():
        for linha in env.read_text(encoding="utf-8").splitlines():
            linha = linha.strip()
            if not linha or linha.startswith("#") or "=" not in linha:
                continue
            k, v = linha.split("=", 1)
            vals[k.strip()] = v.strip().strip('"').strip("'")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or vals.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or vals.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local")
    return url.rstrip("/"), key


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def limpa(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s if s and s.upper() != "NULL" else None


def data_iso(v) -> str | None:
    s = limpa(v)
    if not s:
        return None
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return m.group(0)
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m:
        return f"{m.group(3)}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"
    return None


def carimbo_iso(v) -> str | None:
    s = limpa(v)
    if not s:
        return None
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})", s)
    if m:
        dia, mes, ano, h, mi, se = m.groups()
        return f"{ano}-{int(mes):02d}-{int(dia):02d}T{int(h):02d}:{mi}:{se}"
    return data_iso(v)


def para_bool(v) -> bool:
    s = limpa(v)
    return bool(s) and s.strip().upper().startswith("SIM")


def quantidade(v) -> int:
    s = limpa(v)
    if not s:
        return 0
    s = s.strip().rstrip("+")
    try:
        return max(0, int(float(s.replace(",", "."))))
    except ValueError:
        return 0


def mapear_cabecalho(campos: list[str]) -> dict[str, str]:
    """cabeçalho da linha CSV -> nome da coluna da tabela, casando por
    prefixo normalizado (o Google Forms varia pontuação/emoji entre
    exportações, então casar por igualdade exata do texto é frágil)."""
    mapa: dict[str, str] = {}
    nao_reconhecidas: list[str] = []
    for campo in campos:
        chave = norm(campo)
        destino = COLUNAS_ESPERADAS.get(chave)
        if destino is None:
            destino = next(
                (v for k, v in COLUNAS_ESPERADAS.items() if chave.startswith(k) or k.startswith(chave)),
                None,
            )
        if destino:
            mapa[campo] = destino
        else:
            nao_reconhecidas.append(campo)
    if nao_reconhecidas:
        print(f"[auditoria_cop] Colunas do CSV não reconhecidas (ignoradas): {nao_reconhecidas}")
    return mapa


def montar_linhas(caminho_csv: Path) -> list[dict]:
    with open(caminho_csv, encoding="utf-8-sig", newline="") as f:
        leitor = csv.DictReader(f)
        mapa = mapear_cabecalho(leitor.fieldnames or [])
        linhas = []
        for bruta in leitor:
            porcoluna = {mapa[k]: v for k, v in bruta.items() if k in mapa}
            data_aud = data_iso(porcoluna.get("data_auditoria"))
            subunidade = limpa(porcoluna.get("subunidade"))
            if not data_aud or not subunidade:
                continue  # linha sem os dois campos not-null da tabela: descarta
            linhas.append(
                {
                    "carimbo": carimbo_iso(porcoluna.get("carimbo")),
                    "data_auditoria": data_aud,
                    "re": limpa(porcoluna.get("re")),
                    "nome_guerra": limpa(porcoluna.get("nome_guerra")),
                    "posto_graduacao": limpa(porcoluna.get("posto_graduacao")),
                    "funcao": limpa(porcoluna.get("funcao")),
                    "subunidade": subunidade,
                    "auditou_video": para_bool(porcoluna.get("auditou_video")),
                    "quantidade_videos": quantidade(porcoluna.get("quantidade_videos")),
                    "numero_parte": limpa(porcoluna.get("numero_parte")),
                    "justificativa": limpa(porcoluna.get("justificativa")),
                }
            )
        return linhas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True, help="caminho do CSV exportado do Google Sheet")
    ap.add_argument("--dry-run", action="store_true", help="lê e mostra o resumo, não grava no Supabase")
    ap.add_argument("--sem-truncar", action="store_true", help="não apaga a tabela antes de inserir")
    args = ap.parse_args()

    caminho_csv = Path(args.csv)
    if not caminho_csv.is_file():
        sys.exit(f"Arquivo não encontrado: {caminho_csv}")

    linhas = montar_linhas(caminho_csv)
    print(f"[auditoria_cop] {len(linhas)} linha(s) válida(s) no CSV.")
    if not linhas:
        return

    if args.dry_run:
        for l in linhas[:10]:
            print("  ", l)
        return

    url, key = carrega_env()
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    if not args.sem_truncar:
        resp = requests.delete(
            f"{url}/rest/v1/cop_auditoria_respostas",
            headers=headers,
            params={"id": "gt.0"},
            timeout=30,
        )
        resp.raise_for_status()
        print("[auditoria_cop] Tabela cop_auditoria_respostas truncada (carga limpa).")

    total = 0
    for i in range(0, len(linhas), 500):
        lote = linhas[i : i + 500]
        resp = requests.post(
            f"{url}/rest/v1/cop_auditoria_respostas",
            headers={**headers, "Prefer": "return=minimal"},
            json=lote,
            timeout=60,
        )
        resp.raise_for_status()
        total += len(lote)
    print(f"[auditoria_cop] {total} linha(s) inserida(s) em cop_auditoria_respostas.")


if __name__ == "__main__":
    main()
