"""Reserva de Armas — deriva public.reserva_armas e public.reserva_armas_criticas
a partir de public.p4_material_belico (já ingerido por scripts/ingest_p4.py).

Por quê essa fonte: a pasta de rede dedicada a Reserva de Armas
(\\cmdo\\pmesp\\16BPMM\\16BPMM_EM\\RES_ARMAS\\) só tem UM arquivo em toda a
árvore — "RELATÓRIO COP - EM - F TAT AGO24.docx", de AGO/2024, desatualizado
demais para servir de "situação atual". p4_material_belico tem 1.612 linhas
reais (ARMA_PORTE + ARMA_PORTATIL) por Cia, com ESTADO, ingeridas em
19JUL2026 — é a fonte viva.

Mapeamento tipo -> categoria exibida (por palavra-chave no texto livre de
`tipo`, já que a mesma arma aparece grafada de dezenas de formas):
    PISTOL*              -> Pistola .40
    TASER*                -> Arma de choque (Taser)
    SUBMETRALHADORA*      -> Submetralhadora 9mm
    METRALHADORA*         -> Metralhadora cal. .40
    CARABINA*             -> Carabina cal. .30
    M964 / FUZIL*7,62      -> Fuzil 7.62
    FUZIL* / IMBEL* / *SCAR* -> Fuzil 5.56
    CAL 12 / CBC / M3 TACTICAL -> Espingarda cal. 12
    (resto)                -> Outros armamentos

Mapeamento estado -> disponível / retida / crítica (decisão registrada em
supabase/migrations/013_reserva_armas_p4.sql):
  - "Na reserva" (universo do par disponível/retida) = RESERVA + RESERVA DE
    ARMAS + DISPONÍVEL. Dentro desse universo:
      disponível = RESERVA / RESERVA DE ARMAS / DISPONÍVEL
      retida     = MANUTENÇÃO / AGUARDANDO DESCARGA (fora de uso imediato)
  - CARGA PESSOAL / BTL / CIA / DETENTOR USUÁRIO / ENTREGUE / OUTRA OPM /
    OUTRA CIA DO BTL / EXCLUIDO / RECOLHIDA / TRANSFERIDA / TRANFERÊNCIA /
    SUBSTITUIÇÃO / DESCARREGADA / OPERAÇÃO / OUTROS: já em uso operacional ou
    outra situação administrativa que NÃO é "estoque em reserva" — não entram
    no total. (Ficam de fora deliberadamente: contá-las infla "reserva" além
    do que está fisicamente no armário.)
  - APREENDIDA / APREENDIDO / APEENDIDA (typo da fonte) / ROUBO / FURTO /
    EXTRAVIADA / NÃO ENCONTRADA: situação crítica/jurídica — vão para
    reserva_armas_criticas, não para o par disponível/retida.
  - estado NULL (~373 linhas): não entram em nenhum total. É lacuna de
    preenchimento da planilha-fonte, reportada como limitação, não inventada.

Uso:
    python scripts/reserva_armas_from_p4.py            # grava
    python scripts/reserva_armas_from_p4.py --dry-run   # só relata
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DATA_REFERENCIA = "2026-07-19"  # data da varredura P4 (ver 008_p4_logistica.sql)
SOURCE_DOCUMENT = (
    r"P4 · Material Bélico — Z:\16BPMM_EM\P4\P4 2026\MATERIAL BÉLICO\INFORMAÇÕES\ "
    "(GERAL + 1ª-4ª Cia + EM + FT), via p4_material_belico"
)


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


URL, KEY = carrega_env()
DRY = False


def _req(method: str, path: str, body=None, extra_headers=None):
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    if extra_headers:
        headers.update(extra_headers)
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body is not None else None
    req = urllib.request.Request(f"{URL}/rest/v1/{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def get_all(tabela: str, select: str) -> list[dict]:
    """GET paginado (Range) — p4_material_belico tem >1000 linhas."""
    out = []
    offset = 0
    step = 1000
    while True:
        req = urllib.request.Request(
            f"{URL}/rest/v1/{tabela}?select={select}&offset={offset}&limit={step}",
            headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
        )
        with urllib.request.urlopen(req, timeout=120) as r:
            lote = json.loads(r.read())
        out.extend(lote)
        if len(lote) < step:
            break
        offset += step
    return out


# --------------------------------------------------------------- categorização

def bucket_tipo(tipo: str | None) -> str:
    t = (tipo or "").upper()
    if "PISTOL" in t:
        return "Pistola .40"
    if "TASER" in t:
        return "Arma de choque (Taser)"
    if "SUBMETRALHADORA" in t:
        return "Submetralhadora 9mm"
    if "METRALHADORA" in t:
        return "Metralhadora cal. .40"
    if "CARABINA" in t:
        return "Carabina cal. .30"
    if "M964" in t or ("FUZIL" in t and ("7,62" in t or "7.62" in t)):
        return "Fuzil 7.62"
    if "FUZIL" in t or "IMBEL" in t or "SCAR" in t:
        return "Fuzil 5.56"
    if "CAL 12" in t or "CBC" in t or "M3 TACTICAL" in t:
        return "Espingarda cal. 12"
    return "Outros armamentos"


ESTADOS_DISPONIVEL = {"RESERVA", "RESERVA DE ARMAS", "DISPONÍVEL"}
ESTADOS_RETIDA = {"MANUTENÇÃO", "AGUARDANDO DESCARGA"}
ESTADOS_CRITICA = {
    "APREENDIDA": "Apreendida",
    "APREENDIDO": "Apreendida",
    "APEENDIDA": "Apreendida",  # typo real da planilha-fonte
    "ROUBO": "Roubo",
    "FURTO": "Furto",
    "EXTRAVIADA": "Extraviada",
    "NÃO ENCONTRADA": "Não encontrada",
}


def bucket_estado(estado: str | None) -> str | None:
    if estado is None:
        return None
    e = estado.strip().upper()
    if e in ESTADOS_DISPONIVEL:
        return "disponivel"
    if e in ESTADOS_RETIDA:
        return "retida"
    if e in ESTADOS_CRITICA:
        return "critica"
    return "fora_da_reserva"


def agrega(linhas: list[dict]) -> tuple[dict, dict]:
    """Retorna (reserva, criticas):
    reserva[categoria] = {"disponiveis": n, "retidas": n}
    criticas[(categoria, situacao)] = n
    """
    reserva = defaultdict(lambda: {"disponiveis": 0, "retidas": 0})
    criticas = defaultdict(int)
    sem_estado = 0
    fora = 0
    for l in linhas:
        cat = bucket_tipo(l.get("tipo"))
        estado = l.get("estado")
        b = bucket_estado(estado)
        if b is None:
            sem_estado += 1
            continue
        if b == "disponivel":
            reserva[cat]["disponiveis"] += 1
        elif b == "retida":
            reserva[cat]["retidas"] += 1
        elif b == "critica":
            situacao = ESTADOS_CRITICA[estado.strip().upper()]
            criticas[(cat, situacao)] += 1
        else:
            fora += 1
    print(f"   (fora do universo de reserva: {fora} | sem ESTADO preenchido: {sem_estado})")
    return reserva, criticas


def main() -> None:
    global DRY
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    DRY = args.dry_run

    print("== lendo p4_material_belico (ARMA_PORTE + ARMA_PORTATIL) ==")
    linhas = get_all(
        "p4_material_belico",
        "categoria,tipo,calibre,estado",
    )
    linhas = [l for l in linhas if l.get("categoria") in ("ARMA_PORTE", "ARMA_PORTATIL")]
    print(f"   {len(linhas)} linhas")

    reserva, criticas = agrega(linhas)

    linhas_reserva = [
        {
            "categoria": cat,
            "total": v["disponiveis"] + v["retidas"],
            "disponiveis": v["disponiveis"],
            "retidas": v["retidas"],
            "data_referencia": DATA_REFERENCIA,
            "source_document": SOURCE_DOCUMENT,
        }
        for cat, v in sorted(reserva.items())
        if v["disponiveis"] + v["retidas"] > 0
    ]

    linhas_criticas = [
        {
            "categoria": cat,
            "situacao": situacao,
            "quantidade": n,
            "data_referencia": DATA_REFERENCIA,
            "source_document": SOURCE_DOCUMENT,
        }
        for (cat, situacao), n in sorted(criticas.items())
        if n > 0
    ]

    print("\n== reserva (disponível / retida) ==")
    for r in linhas_reserva:
        print(f"   {r['categoria']:<28} total={r['total']:>4}  disp={r['disponiveis']:>4}  retida={r['retidas']:>3}")
    print(f"   TOTAL disponiveis={sum(r['disponiveis'] for r in linhas_reserva)}"
          f"  retidas={sum(r['retidas'] for r in linhas_reserva)}")

    print("\n== situações críticas ==")
    for r in linhas_criticas:
        print(f"   {r['categoria']:<28} {r['situacao']:<16} {r['quantidade']:>4}")
    print(f"   TOTAL={sum(r['quantidade'] for r in linhas_criticas)}")

    if DRY:
        print("\n[dry-run] nada gravado.")
        return

    print("\n== gravando ==")
    # Carga idempotente e sem mistura fake/real: apaga TUDO de reserva_armas
    # (inclusive o seed de amostra da 003_seed_homologacao.sql, cujas 3 linhas
    # tinham data_referencia = 2026-07-17 mas eram dado inventado) e da tabela
    # de críticas, depois reinsere o agregado real.
    _req("DELETE", "reserva_armas?id=not.is.null")
    _req("DELETE", "reserva_armas_criticas?id=not.is.null")
    if linhas_reserva:
        _req("POST", "reserva_armas", linhas_reserva)
    if linhas_criticas:
        _req("POST", "reserva_armas_criticas", linhas_criticas)
    print(f"   reserva_armas: {len(linhas_reserva)} linhas")
    print(f"   reserva_armas_criticas: {len(linhas_criticas)} linhas")


if __name__ == "__main__":
    main()
