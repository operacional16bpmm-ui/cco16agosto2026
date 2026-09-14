"""Scanner local baseado em allowlist de fontes confiáveis."""
from __future__ import annotations
import hashlib, json, os
from pathlib import Path
from typing import Any
from .store import Store, StoreError

MAX_FILE = 256 * 1024
ALLOWED_SUFFIXES = {".md", ".txt"}
class ObservationError(ValueError): pass

def _safe_path(raw: str) -> Path:
    p = Path(raw)
    if not p.is_absolute(): raise ObservationError("path deve ser absoluto")
    if any(part.startswith(".") for part in p.parts if part not in (p.anchor, ".", "..")):
        raise ObservationError("path oculto recusado")
    if p.suffix.lower() not in ALLOWED_SUFFIXES: raise ObservationError("extensao recusada")
    # Resolve every existing parent and refuse symlink traversal.
    cur = p
    while cur != cur.parent:
        if cur.exists() and cur.is_symlink(): raise ObservationError("symlink recusado")
        cur = cur.parent
    if any(part.lower() in {".env", "vault", "cofre", "outputs"} for part in p.parts):
        raise ObservationError("local protegido recusado")
    return p

def load_allowlist(config: str | Path) -> list[dict[str, str]]:
    try: data = json.loads(Path(config).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc: raise ObservationError(f"config invalida: {exc}") from exc
    sources = data.get("sources") if isinstance(data, dict) else None
    if not isinstance(sources, list): raise ObservationError("sources deve ser lista")
    out=[]; ids=set()
    for item in sources:
        if not isinstance(item, dict) or set(item) != {"id","domain","path"}: raise ObservationError("fonte invalida")
        sid, domain, raw = item["id"], item["domain"], item["path"]
        if not all(isinstance(x,str) and x.strip() for x in (sid,domain,raw)) or sid in ids: raise ObservationError("id de fonte invalido")
        _safe_path(raw); ids.add(sid); out.append({"id":sid,"domain":domain,"path":raw})
    return out

def scan(store: Store, config: str | Path) -> list[dict[str, Any]]:
    results=[]
    for item in load_allowlist(config):
        p=_safe_path(item["path"])
        if not p.is_file():
            store.pause(f"reconciliacao necessaria: fonte ausente {item['id']}")
            raise ObservationError(f"fonte ausente: {item['id']}")
        if p.stat().st_size > MAX_FILE: raise ObservationError("fonte excede 256 KiB")
        first=p.read_bytes(); digest=hashlib.sha256(first).hexdigest()
        second=p.read_bytes()
        if first != second: raise ObservationError("fonte mudou durante leitura")
        try: text=first.decode("utf-8")
        except UnicodeDecodeError as exc: raise ObservationError("fonte nao UTF-8") from exc
        try:
            store.register_source(item["id"],item["domain"],str(p),digest)
            store.record_event(item["id"],digest,"observed")
        except StoreError as exc: raise ObservationError(str(exc)) from exc
        results.append({"source_id":item["id"],"domain":item["domain"],"path":str(p),"sha256":digest,"text":text})
    return results
