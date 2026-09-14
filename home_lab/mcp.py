"""Servidor JSON-RPC stdio somente leitura para consumidores locais."""
from __future__ import annotations
import argparse, json, sys
from .store import Store, StoreError
MAX_LINE=1024*1024
def dispatch(req, store, domains):
    if not isinstance(req,dict) or req.get("jsonrpc")!="2.0" or not isinstance(req.get("method"),str): return {"jsonrpc":"2.0","id":req.get("id") if isinstance(req,dict) else None,"error":{"code":-32600,"message":"JSON-RPC invalido"}}
    ident=req.get("id"); method=req["method"]; params=req.get("params",{})
    if method.startswith("notifications/"): return None
    if method in {"initialize","ping"}: result={"protocolVersion":"2024-11-05","capabilities":{"tools":{}}} if method=="initialize" else {}
    elif method=="tools/list": result={"tools":[{"name":n,"description":d,"inputSchema":{"type":"object"}} for n,d in (("home_status","Status do HOME"),("home_context","Contexto por dominio"),("home_proposals","Propostas"),("home_experiments","Experimentos"))]}
    elif method=="tools/call":
        if not isinstance(params,dict) or not isinstance(params.get("name"),str) or not isinstance(params.get("arguments",{}),dict): return _err(ident,-32602,"argumentos invalidos")
        name=params["name"]; args=params.get("arguments",{})
        try:
            if name=="home_status":
                if args: raise StoreError("argumentos inesperados")
                result=store.status()
            elif name in {"home_context","home_proposals","home_experiments"}:
                domain=args.get("domain")
                if not isinstance(domain,str) or domain not in domains: raise StoreError("dominio recusado")
                extra=set(args)-{"domain","status"};
                if extra: raise StoreError("argumentos inesperados")
                if name=="home_context": result=store.context(domain)
                elif name=="home_proposals": result=store.list_proposals(domain,args.get("status"))
                else: result=[]
            else: return _err(ident,-32601,"tool inexistente")
        except (StoreError, ValueError) as exc: return _err(ident,-32602,str(exc))
    else: return _err(ident,-32601,"metodo inexistente")
    return {"jsonrpc":"2.0","id":ident,"result":result}
def _err(ident,code,message): return {"jsonrpc":"2.0","id":ident,"error":{"code":code,"message":message}}
def serve(db, domains):
    store=Store(db)
    for line in sys.stdin:
        if len(line.encode())>MAX_LINE: print(json.dumps(_err(None,-32600,"linha excede limite")),flush=True); continue
        try: req=json.loads(line); response=dispatch(req,store,set(domains))
        except json.JSONDecodeError: response=_err(None,-32700,"JSON invalido")
        if response is not None: print(json.dumps(response,ensure_ascii=False,separators=(",",":")),flush=True)
def main(argv=None):
    ap=argparse.ArgumentParser(); ap.add_argument('--db',required=True); ap.add_argument('--domains',required=True); a=ap.parse_args(argv); serve(a.db,[x for x in a.domains.split(',') if x]); return 0
if __name__=='__main__': raise SystemExit(main())
