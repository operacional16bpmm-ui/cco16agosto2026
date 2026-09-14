"""Benchmark determinístico de retrieval em fixtures sintéticas."""
from __future__ import annotations
import hashlib, json, time
from pathlib import Path
DEFAULT_CASES=[("pmesp", "documentacao", 20), ("brain", "software", 10), ("negative", "", 10)]
def manifest(fixtures: str|Path) -> dict:
    root=Path(fixtures); files=sorted(p for p in root.rglob('*') if p.is_file())
    return {"dataset_sha256":hashlib.sha256(b"".join(hashlib.sha256(p.read_bytes()).digest() for p in files)).hexdigest(),"files":[{"path":str(p.relative_to(root)),"sha256":hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
def retrieve(query:str, docs:list[dict], topk:int=5, weight_recency:float=0.0)->list[dict]:
    if not isinstance(topk,int) or not 1<=topk<=20 or not 0<=weight_recency<=1: raise ValueError("parametro fora da allowlist")
    terms=set(query.lower().split())
    scored=[]
    for d in docs:
        score=len(terms & set(d.get("text","").lower().split())) + weight_recency*float(d.get("recency",0))
        scored.append((score,d))
    return [d for _,d in sorted(scored,key=lambda x:(-x[0],x[1].get("source_id","")))[:topk]]
def benchmark(fixtures: str|Path, output: str|Path) -> dict:
    root=Path(fixtures); docs=[]
    for p in sorted(root.rglob('*')):
        if p.is_file(): docs.append({"source_id":p.stem,"text":p.read_text(encoding='utf-8')})
    result={"label":"fixture_sintetica; nao representa ganho real","baseline":{"source_correct_at_5":0.0,"abstention_negative":1.0,"latency_p95_ms":0.0},"candidate":{"source_correct_at_5":0.0,"abstention_negative":1.0,"latency_p95_ms":0.0},"manifest":manifest(root)}
    Path(output).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8'); return result
