from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
SOURCE_KINDS = {"source", "approved"}
PROPOSAL_KINDS = {"hypothesis", "checklist", "skill", "retrieval", "prompt"}
RUN_LIMITS = {"event": (6, 600), "night": (1, 3600), "experiment": (2, 600)}


def local_timezone():
    try:
        return ZoneInfo("America/Sao_Paulo")
    except ZoneInfoNotFoundError:
        # Windows sem tzdata: Sao Paulo usa UTC-3 atualmente. Nao modela regras historicas.
        return timezone(timedelta(hours=-3), "America/Sao_Paulo-fallback")


def local_day(value: datetime) -> str:
    return value.astimezone(local_timezone()).date().isoformat()
