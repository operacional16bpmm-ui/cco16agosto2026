#!/usr/bin/env python3
"""
sbv.py — Second Brain Vivo. CLI unico dos 6 modulos.

  capture   (item 6) barramento de captura: joga um evento no RAW + manifest
  feedback  (item 3) correcao-como-sinal: grava memoria negativa
  decay     (item 2) recalcula importancia x recency e arquiva o irrelevante
  eval      (item 1) roda as perguntas-ouro, compara baseline, alarme de drift
  brief     (item 4) brief matinal proativo (cruza dominios)
  reflect   (sono)   digere o dia: extrai fatos, acha contradicoes
  night     (sono)   orquestra reflect -> decay -> eval -> brief

Desenho: append-only, nunca apaga (arquiva). Fonte externa entra em quarentena.
Tudo roda sem LLM (degrada para passo estrutural) — a IA externa so enriquece.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import config
from lib import llm, retrieval

NOW = lambda: dt.datetime.now().astimezone()
ISO = lambda d=None: (d or NOW()).isoformat(timespec="seconds")
TODAY = lambda: NOW().strftime("%Y-%m-%d")


def _append(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(obj, ensure_ascii=False) + "\n")


def _read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return out


def _rewrite_jsonl(path: Path, rows: list[dict]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    tmp.replace(path)


# ── item 6: BARRAMENTO DE CAPTURA ────────────────────────────────────────────
def cmd_capture(a) -> int:
    """
    Entrada unica. Fonte externa (email/whatsapp/web) -> quarentena (untrusted).
    Fonte interna (voz/nota/transcript) -> RAW confiavel. Sempre com proveniencia.
    """
    conteudo = a.text or (sys.stdin.read() if a.stdin else "")
    if not conteudo.strip():
        print("erro: sem conteudo (--text ou --stdin)", file=sys.stderr)
        return 1
    trust = "untrusted" if a.source in ("email", "whatsapp", "web", "sms") else "trusted"
    eid = uuid.uuid4().hex[:12]
    sha = hashlib.sha256(conteudo.encode()).hexdigest()[:16]
    stamp = NOW().strftime("%Y%m%dT%H%M%S")
    dest_dir = config.QUARANTINE if trust == "untrusted" else config.BUS_RAW
    fname = f"{stamp}_{a.source}_{eid}.md"
    fpath = dest_dir / fname
    header = (f"---\nid: {eid}\nsource: {a.source}\ntrust: {trust}\n"
              f"ts: {ISO()}\nsha: {sha}\n---\n\n")
    fpath.write_text(header + conteudo.rstrip() + "\n", encoding="utf-8")
    _append(config.MANIFEST, {
        "id": eid, "ts": ISO(), "source": a.source, "kind": a.kind,
        "trust": trust, "path": str(fpath), "sha": sha, "note": a.note or "",
    })
    print(f"[capturado] {trust} -> {fpath}")
    if trust == "untrusted":
        print("  (quarentena: so entra na memoria confiavel apos /ok no Telegram)")
    return 0


# ── item 3: CORRECAO-COMO-SINAL ──────────────────────────────────────────────
def cmd_feedback(a) -> int:
    """Grava uma correcao do Fabricio como memoria negativa ('nao repetir')."""
    if not a.wrong or not a.right:
        print("erro: --wrong e --right sao obrigatorios", file=sys.stderr)
        return 1
    rec = {
        "id": uuid.uuid4().hex[:12], "created": ISO(),
        "wrong": a.wrong, "right": a.right, "context": a.context or "",
        "source": a.source or "telegram",
    }
    _append(config.NEGATIVE, rec)
    print(f"[negativa gravada] errei: {a.wrong[:60]!r} -> certo: {a.right[:60]!r}")
    print(f"  total de licoes negativas: {len(_read_jsonl(config.NEGATIVE))}")
    return 0


# ── item 2: DECAIMENTO + IMPORTANCIA ─────────────────────────────────────────
def _score(fact: dict) -> float:
    import math
    try:
        last = dt.datetime.fromisoformat(fact.get("last_access") or fact["created"])
    except (KeyError, ValueError):
        return 0.0
    dias = max(0.0, (NOW() - last).total_seconds() / 86400.0)
    recency = 0.5 ** (dias / config.DECAY_HALFLIFE_DAYS)   # meia-vida
    imp = float(fact.get("importance", 0.5))
    hits = int(fact.get("hits", 0))
    return recency * imp * (1.0 + math.log1p(hits))


def cmd_decay(a) -> int:
    """Recalcula score de cada fato e arquiva o que caiu abaixo do piso."""
    facts = _read_jsonl(config.FACTS)
    if not facts:
        print("[decay] sem fatos ainda (facts.jsonl vazio)")
        return 0
    arq = viv = 0
    for f in facts:
        if f.get("status") == "archived":
            continue
        f["score"] = round(_score(f), 4)
        if f["score"] < config.DECAY_ARCHIVE_BELOW and f.get("status") != "pinned":
            f["status"] = "archived"
            f["archived_at"] = ISO()
            arq += 1
        else:
            viv += 1
    _rewrite_jsonl(config.FACTS, facts)
    rep = config.REPORTS / f"decay-{TODAY()}.md"
    top = sorted([f for f in facts if f.get("status") not in ("archived",)],
                 key=lambda x: x.get("score", 0), reverse=True)[:10]
    rep.write_text(
        f"# Decay {TODAY()}\n\nvivos: {viv} · arquivados hoje: {arq} · "
        f"total: {len(facts)}\n\n## Top 10 por score\n"
        + "\n".join(f"- `{f.get('score')}` {f.get('text','')[:90]}" for f in top) + "\n",
        encoding="utf-8")
    print(f"[decay] vivos={viv} arquivados+={arq} -> {rep}")
    return 0


# ── item 1: HARNESS DE AVALIACAO ─────────────────────────────────────────────
def _grade(answer: str, keywords: list[str]) -> float:
    if not keywords:
        return 0.0
    a = answer.lower()
    hit = sum(1 for k in keywords if k.lower() in a)
    return hit / len(keywords)


def cmd_eval(a) -> int:
    """
    Roda as perguntas-ouro em dois modos independentes, cada um com SEU baseline:

      rag-recall  (deterministico) — keyword aparece nos trechos recuperados.
                  E a SENTINELA de drift/poison: sem variancia de LLM, barato.
      llm+rag     (semantico) — Groq responde do contexto; nota = keyword na
                  resposta. Mede QUALIDADE de resposta, nao recall.

    Comparar modos diferentes no mesmo baseline gera falso alarme (licao do
    proprio harness em 02/09). Por isso baseline e por-modo.
    """
    if not config.GOLDEN.exists():
        print("erro: eval/golden.json nao existe", file=sys.stderr)
        return 1
    if not retrieval.disponivel():
        print("[eval] RAG (:8082) fora do ar — abortando p/ nao gerar baseline falso",
              file=sys.stderr)
        return 2

    modo_req = getattr(a, "mode", "auto") or "auto"
    if modo_req == "auto":
        modo = "llm+rag" if llm.disponivel() else "rag-recall"
    elif modo_req in ("llm", "llm+rag"):
        if not llm.disponivel():
            print("[eval] --mode llm pedido mas sem chave; caindo p/ rag-recall",
                  file=sys.stderr)
            modo = "rag-recall"
        else:
            modo = "llm+rag"
    else:
        modo = "rag-recall"

    golden = json.loads(config.GOLDEN.read_text(encoding="utf-8"))
    linhas, notas = [], []
    for i, q in enumerate(golden):
        if modo == "llm+rag" and i:
            # A avaliacao tambem consome TPM. Sem esta janela, as perguntas
            # consecutivas anulam a pausa aplicada pela reflexao noturna.
            time.sleep(REFLECT_PAUSA_S)
        ctx = retrieval.buscar(q["q"], topk=q.get("topk", 6))
        if modo == "llm+rag":
            sistema = ("Responda SO com base no CONTEXTO. Seja factual e inclua os "
                       "valores/nomes/numeros exatos do contexto (portas, IPs, siglas). "
                       "Se o contexto nao trouxer, responda 'nao sei'.")
            ans = llm.refletir(f"CONTEXTO:\n{ctx}\n\nPERGUNTA: {q['q']}",
                               sistema=sistema, max_tokens=300)
            if not ans:
                print("[eval] geracao falhou; avaliacao incompleta, baseline preservado",
                      file=sys.stderr)
                return 2
        else:
            ans = ctx
        nota = _grade(ans, q["expect"])
        notas.append(nota)
        linhas.append(f"- [{nota:.2f}] {q['q']}"
                      + ("" if nota >= 0.5 else f"  ⚠ faltou: {q['expect']}"))
    media = sum(notas) / len(notas)

    # baseline POR MODO (dict). Retrocompat: formato antigo {media,modo} vira dict.
    base = {}
    if config.EVAL_BASELINE.exists():
        try:
            raw = json.loads(config.EVAL_BASELINE.read_text())
            base = raw if all(isinstance(v, dict) for v in raw.values()) else {
                raw.get("modo", "rag-recall"): {"media": raw.get("media"), "ts": raw.get("ts")}}
        except (json.JSONDecodeError, AttributeError):
            base = {}
    prev = (base.get(modo) or {}).get("media")
    drift = (prev - media) if prev is not None else 0.0
    alerta = drift > config.EVAL_ALERT_DROP
    rep = config.REPORTS / f"eval-{TODAY()}-{modo.replace('+','_')}.md"
    rep.write_text(
        f"# Eval {TODAY()} ({modo})\n\n"
        f"**media: {media:.3f}**  ·  baseline: {prev if prev is not None else '—'}"
        f"  ·  drift: {drift:+.3f}  {'🚨 ALERTA' if alerta else ''}\n\n"
        + "\n".join(linhas) + "\n", encoding="utf-8")
    if not alerta:
        base[modo] = {"media": round(media, 3), "ts": ISO()}
        config.EVAL_BASELINE.write_text(json.dumps(base, ensure_ascii=False, indent=2),
                                        encoding="utf-8")
    print(f"[eval] media={media:.3f} drift={drift:+.3f} modo={modo}"
          + ("  🚨 REGRESSAO — possivel poison/drift" if alerta else ""))
    print(f"       -> {rep}")
    return 3 if alerta else 0


# ── SONO: REFLEXAO (digere o dia) ────────────────────────────────────────────
# Groq free-tier: 8000 tokens/min (TPM). Um dump de 40 arquivos estoura (24k+
# tokens de uma vez, licao de 02/09). Processamos em LOTES sob o TPM, com pausa.
REFLECT_FILE_CAP = 3000     # chars por arquivo
REFLECT_BATCH_CHARS = 9000  # ~2200 tokens de entrada; + max_tokens fica < 8000 TPM
REFLECT_PAUSA_S = 62        # janela do TPM e por minuto


def _fontes_do_dia() -> list[str]:
    """Blocos de material novo (ultimas 24h), um por arquivo com proveniencia."""
    corte = NOW() - dt.timedelta(days=1)
    blobs = []
    for base in config.SOURCES:
        if not base.exists():
            continue
        for f in base.rglob("*"):
            if not f.is_file() or f.suffix.lower() not in (".md", ".txt"):
                continue
            try:
                if dt.datetime.fromtimestamp(f.stat().st_mtime).astimezone() < corte:
                    continue
                txt = f.read_text(encoding="utf-8", errors="ignore")[:REFLECT_FILE_CAP]
            except OSError:
                continue
            blobs.append(f"### {f}\n{txt}")
    return blobs


def _lotes(blobs: list[str], limite: int) -> list[str]:
    """Agrupa blocos em lotes cujo tamanho total cabe no TPM."""
    lotes, atual, tam = [], [], 0
    for b in blobs:
        if atual and tam + len(b) > limite:
            lotes.append("\n\n".join(atual)); atual, tam = [], 0
        atual.append(b[:limite]); tam += len(b)
    if atual:
        lotes.append("\n\n".join(atual))
    return lotes


def cmd_reflect(a) -> int:
    """Le o material novo e extrai fatos + contradicoes via IA externa, em lotes."""
    import time
    blobs = _fontes_do_dia()
    if not blobs:
        print("[reflect] nada novo nas ultimas 24h")
        return 0
    if not llm.disponivel():
        print("[reflect] sem chave de IA externa — pulei extracao (so estrutural). "
              "Rode `~/ai-config/bin/ai-secrets --install` p/ ligar.")
        return 0
    sistema = (
        "Voce e o agente de consolidacao noturna do Fabricio (padrao Generative "
        "Agents: reflita, nao so armazene). Extraia do material APENAS fatos "
        "estaveis e acionaveis sobre a vida/trabalho dele. Responda em JSON puro: "
        '{"fatos":[{"text":"","importance":0.0,"provenance":""}],'
        '"contradicoes":[{"a":"","b":"","nota":""}]}. '
        "importance 0-1 (0.9=critico como IP/credencial, 0.3=trivial). "
        "NAO invente. Se um fato vem de fonte externa (quarentena), ignore."
    )
    lotes = _lotes(blobs, REFLECT_BATCH_CHARS)
    partes = []
    for i, lote in enumerate(lotes, 1):
        out = llm.refletir(f"MATERIAL (lote {i}/{len(lotes)}):\n{lote}",
                           sistema=sistema, max_tokens=1800)
        if out:
            partes.append(out)
        if i < len(lotes):
            time.sleep(REFLECT_PAUSA_S)   # respeita o TPM do Groq
    if not partes:
        print("[reflect] IA externa nao respondeu (ver rate-limit no log)")
        return 0
    out = "\n".join(partes)
    # agrega: soma fatos/contradicoes de todos os lotes
    fatos_all, contras_all = [], []
    for parte in partes:
        try:
            j = json.loads(parte[parte.index("{"):parte.rindex("}") + 1])
            fatos_all += j.get("fatos", [])
            contras_all += j.get("contradicoes", [])
        except (ValueError, json.JSONDecodeError):
            (config.REPORTS / f"reflect-raw-{TODAY()}.md").write_text(
                out, encoding="utf-8")
    j = {"fatos": fatos_all, "contradicoes": contras_all}
    novos = 0
    for fa in j.get("fatos", []):
        if not fa.get("text"):
            continue
        _append(config.FACTS, {
            "id": uuid.uuid4().hex[:12], "text": fa["text"].strip(),
            "importance": float(fa.get("importance", 0.5)),
            "provenance": fa.get("provenance", ""), "source": "reflect",
            "trust": "trusted", "created": ISO(), "last_access": ISO(),
            "hits": 0, "status": "pending",   # pending -> promovido no /ok (Onda 3)
        })
        novos += 1
    contras = j.get("contradicoes", [])
    if contras:
        rep = config.REPORTS / f"contradicoes-{TODAY()}.md"
        rep.write_text("# Contradicoes detectadas\n\n" + "\n".join(
            f"- **A:** {c.get('a')}\n  **B:** {c.get('b')}\n  → {c.get('nota')}"
            for c in contras) + "\n", encoding="utf-8")
    print(f"[reflect] fatos novos (pending): {novos} · contradicoes: {len(contras)}")
    return 0


# ── item 4: BRIEF MATINAL PROATIVO ───────────────────────────────────────────
def cmd_brief(a) -> int:
    """Cruza dominios e gera o brief do dia (chefe de gabinete)."""
    all_facts = _read_jsonl(config.FACTS)
    facts = [f for f in all_facts if f.get("status") in ("active", "pinned")]
    negs = _read_jsonl(config.NEGATIVE)[-10:]
    pend = [f for f in all_facts if f.get("status") == "pending"]
    contras = sorted(config.REPORTS.glob("contradicoes-*.md"))
    material = "\n".join(f"- {f['text']}" for f in facts[:60])
    licoes = "\n".join(f"- errei {n['wrong']} -> {n['right']}" for n in negs)
    corpo = ""
    # Anti-alucinacao (licao do proprio brief em 02/09: com contexto magro o LLM
    # confabulou uma agenda inteira). So chama o LLM se ha base real suficiente,
    # e o prompt PROIBE inventar. Abaixo do piso -> so brief estrutural, honesto.
    MIN_FATOS = 8
    if llm.disponivel() and len(facts) >= MIN_FATOS:
        sistema = (
            "Voce e o chefe de gabinete do Fabricio. Gere um brief matinal CURTO em "
            "markdown a partir EXCLUSIVAMENTE dos FATOS abaixo. REGRA ABSOLUTA: nao "
            "invente NADA — nem nomes, numeros, datas, valores, empresas ou eventos "
            "que nao estejam LITERALMENTE nos fatos. Se nao houver base para um item, "
            "escreva 'sem dados'. Estrutura: (1) pendencias reais, (2) conexoes entre "
            "fatos dados, (3) 1 risco/contradicao presente nos fatos. Sem preambulo. "
            "Cada afirmacao deve poder ser rastreada a um fato listado.")
        corpo = llm.refletir(
            f"FATOS (unica fonte permitida):\n{material}\n\n"
            f"LICOES (nao repetir):\n{licoes}",
            sistema=sistema, max_tokens=800)
    if not corpo:
        corpo = ("_(sem IA externa — brief estrutural)_\n\n"
                 f"- Fatos vivos: {len(facts)}\n- Pendentes de aprovacao: {len(pend)}\n"
                 f"- Licoes negativas: {len(negs)}\n"
                 f"- Contradicoes em aberto: {len(contras)}")
    rep = config.REPORTS / f"brief-{TODAY()}.md"
    rep.write_text(f"# Brief {TODAY()}\n\n{corpo}\n\n---\n"
                   f"pendentes p/ /ok: {len(pend)} · contradicoes: {len(contras)}\n",
                   encoding="utf-8")
    print(f"[brief] -> {rep}")
    if a.show:
        print("\n" + rep.read_text(encoding="utf-8"))
    return 0


# ── SONO: ORQUESTRADOR ───────────────────────────────────────────────────────
def cmd_night(a) -> int:
    print(f"=== SBV night {ISO()} ===")
    rc = 0
    # reflect -> decay -> eval(recall, sentinela) -> eval(llm, qualidade) -> brief
    plano = [
        (cmd_reflect, argparse.Namespace()),
        (cmd_decay, argparse.Namespace()),
        (cmd_eval, argparse.Namespace(mode="recall")),   # drift/poison determinist.
        (cmd_eval, argparse.Namespace(mode="llm")),        # qualidade de resposta
        (cmd_brief, argparse.Namespace(show=False)),
    ]
    for step, ns in plano:
        try:
            if step is cmd_eval and getattr(ns, "mode", "") == "llm":
                # A reflexao pode ter acabado de usar a cota de TPM do Groq.
                # Espere uma janela antes de iniciar a avaliacao semantica.
                print(f"[night] aguardando {REFLECT_PAUSA_S}s antes do eval llm")
                time.sleep(REFLECT_PAUSA_S)
            r = step(ns)
            rc = rc or r
        except Exception as e:  # noqa: BLE001 — madrugada nao pode morrer
            sys.stderr.write(f"[night] {step.__name__} falhou: {e}\n")
            rc = rc or 1
    print(f"=== SBV night fim (rc={rc}) ===")
    return rc


def main() -> int:
    p = argparse.ArgumentParser(prog="sbv", description="Second Brain Vivo")
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("capture", help="barramento: joga evento no RAW (item 6)")
    c.add_argument("--source", required=True,
                   help="voz|nota|transcript|email|whatsapp|web|...")
    c.add_argument("--kind", default="text")
    c.add_argument("--text"); c.add_argument("--stdin", action="store_true")
    c.add_argument("--note", default=""); c.set_defaults(fn=cmd_capture)

    c = sub.add_parser("feedback", help="correcao-como-sinal (item 3)")
    c.add_argument("--wrong", required=True); c.add_argument("--right", required=True)
    c.add_argument("--context", default=""); c.add_argument("--source", default="")
    c.set_defaults(fn=cmd_feedback)

    sub.add_parser("decay", help="decaimento+importancia (item 2)").set_defaults(fn=cmd_decay)
    c = sub.add_parser("eval", help="perguntas-ouro + alarme (item 1)")
    c.add_argument("--mode", default="auto", choices=["auto", "recall", "llm"],
                   help="recall=deterministico (sentinela) | llm=semantico | auto")
    c.set_defaults(fn=cmd_eval)
    sub.add_parser("reflect", help="digere o dia (sono)").set_defaults(fn=cmd_reflect)

    c = sub.add_parser("brief", help="brief matinal proativo (item 4)")
    c.add_argument("--show", action="store_true"); c.set_defaults(fn=cmd_brief)

    sub.add_parser("night", help="orquestra tudo (cron 3h)").set_defaults(fn=cmd_night)

    a = p.parse_args()
    return a.fn(a)


if __name__ == "__main__":
    raise SystemExit(main())
