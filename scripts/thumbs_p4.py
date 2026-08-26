"""Thumbnails do inventário fotográfico do material bélico (P4).

As 769 fotos originais somam 5,3 GB em rede — não vão para o repositório.
Este script gera thumbs WEBP (largura máx. 640px, qualidade 72) em
public/p4/fotos/ e emite um catálogo JSON que o ingest_p4.py grava em
p4_fotos_inventario, preservando o caminho UNC do original.

Uso:
    python scripts/thumbs_p4.py [--saida-catalogo <arquivo.json>] [--limite N]
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
FONTE = Path(r"Z:\16BPMM_EM\P4\P4 2026\MATERIAL BÉLICO\INVENTÁRIO FOTOGRÁICO 2026")
DESTINO = RAIZ / "public" / "p4" / "fotos"
LARGURA_MAX = 640
QUALIDADE = 72
EXTS = {".jpg", ".jpeg", ".png", ".heic"}


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^\w\s-]", "", s).strip().lower()
    return re.sub(r"[\s_]+", "-", s)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida-catalogo", default=str(RAIZ / "scripts" / "p4_fotos_catalogo.json"))
    ap.add_argument("--limite", type=int, default=0, help="0 = todas")
    args = ap.parse_args()

    if not FONTE.exists():
        raise SystemExit(f"Pasta de rede indisponível: {FONTE}")

    DESTINO.mkdir(parents=True, exist_ok=True)
    fotos = [p for p in sorted(FONTE.rglob("*")) if p.is_file() and p.suffix.lower() in EXTS]
    if args.limite:
        fotos = fotos[: args.limite]
    print(f"{len(fotos)} fotos encontradas em {FONTE}")

    catalogo, erros = [], 0
    for i, p in enumerate(fotos, 1):
        rel = p.relative_to(FONTE)
        partes = rel.parts
        unidade = partes[0] if len(partes) > 1 else "GERAL"
        categoria = partes[1] if len(partes) > 2 else None
        nome_thumb = f"{slug(unidade)}__{slug(categoria) if categoria else 'geral'}__{slug(p.stem)}.webp"
        alvo = DESTINO / nome_thumb

        try:
            if not alvo.exists():
                with Image.open(p) as im:
                    im = ImageOps.exif_transpose(im)   # respeita orientação da câmera
                    im = im.convert("RGB")
                    if im.width > LARGURA_MAX:
                        alt = round(im.height * LARGURA_MAX / im.width)
                        im = im.resize((LARGURA_MAX, alt), Image.LANCZOS)
                    im.save(alvo, "WEBP", quality=QUALIDADE, method=6)
            with Image.open(alvo) as t:
                larg, alt = t.size
        except Exception as e:
            erros += 1
            print(f"  ERRO {rel}: {str(e)[:100]}")
            continue

        catalogo.append({
            "unidade": unidade,
            "categoria": categoria,
            "nome_arquivo": p.name,
            "thumb_path": f"/p4/fotos/{nome_thumb}",
            "caminho_unc": str(p),
            "largura": larg,
            "altura": alt,
            "bytes_original": p.stat().st_size,
        })
        if i % 50 == 0:
            print(f"  {i}/{len(fotos)}...", flush=True)

    Path(args.saida_catalogo).write_text(
        json.dumps(catalogo, ensure_ascii=False, indent=1), encoding="utf-8")

    peso = sum(f.stat().st_size for f in DESTINO.glob("*.webp"))
    print(f"\n{len(catalogo)} thumbs · {erros} erro(s)")
    print(f"public/p4/fotos/: {peso/1e6:.1f} MB")
    print(f"catálogo -> {args.saida_catalogo}")


if __name__ == "__main__":
    main()
