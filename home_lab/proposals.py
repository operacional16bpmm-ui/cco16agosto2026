from __future__ import annotations

import hashlib
import json


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def proposal_digest(domain: str, title: str, body: str, kind: str, reason: str,
                    verification: str, sources: list[dict[str, str]]) -> str:
    immutable = {"domain": domain, "title": title, "body": body, "kind": kind,
                 "reason": reason, "verification": verification, "sources": sources}
    return hashlib.sha256(canonical_json(immutable).encode()).hexdigest()
