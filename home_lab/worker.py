"""Controlador confiavel: nunca executa texto vindo do modelo."""
from __future__ import annotations
import argparse, json, os, sys, time
from .observer import scan, ObservationError
from .model import OllamaClient, ModelError
from .store import Store, StoreError

def available_memory() -> int|None:
    try:
        for line in open('/proc/meminfo',encoding='ascii'):
            if line.startswith('MemAvailable:'): return int(line.split()[1])*1024
    except (OSError, ValueError): return None
    return None
def run(db, config, kind="event", model=None, clock=time.monotonic):
    memory = available_memory()
    if memory is not None and memory < 8*1024**3: raise StoreError("memoria insuficiente; run suspenso")
    store=Store(db); token=store.begin_run(kind,"worker")
    deadline=clock()+(600 if kind=="event" else 3600)
    try:
        docs=scan(store,config)
        if clock()>deadline: raise StoreError("deadline excedido")
        current={d["source_id"]:d["sha256"] for d in docs}
        events=[e for e in store.list_events(unprocessed_only=True) if current.get(e["source_id"]) == e["sha256"]]
        if not events: store.finish_run(token,"completed","sem novidade"); return 0
        grouped={}
        for d in docs: grouped.setdefault(d["domain"],[]).append(d)
        client=model or OllamaClient(); new=0
        for domain, items in grouped.items():
            if store.status().get("paused"): raise StoreError("HOME pausado antes da chamada")
            items=items[:4]; context="\n".join(x["text"][:12000] for x in items)
            for p in client.propose(domain,[{"source_id":x["source_id"],"sha256":x["sha256"]} for x in items],context):
                if store.status().get("paused"): raise StoreError("HOME pausado antes da persistencia")
                store.create_proposal(domain,p["title"],p["body"],p["sources"],p["kind"],p["reason"],p["verification"]); new+=1
        store.mark_events_processed([int(e["id"]) for e in events],token); store.finish_run(token,"completed",f"{new} propostas")
        return new
    except Exception as exc:
        try: store.finish_run(token,"failed",str(exc))
        except Exception: pass
        raise
def main(argv=None):
    ap=argparse.ArgumentParser(); ap.add_argument('--db',required=True); ap.add_argument('--config',required=True); ap.add_argument('--kind',choices=['event','night'],default='event'); a=ap.parse_args(argv)
    try: print(json.dumps({"new":run(a.db,a.config,a.kind)},ensure_ascii=False)); return 0
    except (StoreError,ObservationError,ModelError,OSError,ValueError) as e: print(json.dumps({"error":str(e)},ensure_ascii=False),file=sys.stderr); return 2
if __name__=='__main__': raise SystemExit(main())
