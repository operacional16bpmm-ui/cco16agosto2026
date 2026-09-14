from __future__ import annotations

import hashlib
import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterator, Sequence

from .policy import PROPOSAL_KINDS, RUN_LIMITS, SHA256_RE, SOURCE_KINDS, local_day
from .proposals import canonical_json, proposal_digest


class StoreError(ValueError):
    pass


class Store:
    SCHEMA_VERSION = 2
    def __init__(self, path: str | Path, clock: Callable[[], datetime] | None = None):
        self.path = str(path)
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, timeout=5, isolation_level=None)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA busy_timeout=5000")
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    @contextmanager
    def _transaction(self) -> Iterator[sqlite3.Connection]:
        conn = self._connect()
        try:
            conn.execute("BEGIN IMMEDIATE")
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self) -> None:
        # Reject future databases before PRAGMA/WAL or any DDL can mutate them.
        probe = sqlite3.connect(self.path)
        try:
            version_row = probe.execute("SELECT version FROM schema_version LIMIT 1").fetchone()
        except sqlite3.OperationalError:
            version_row = None
        finally:
            probe.close()
        if version_row and int(version_row[0]) > self.SCHEMA_VERSION:
            raise StoreError("schema futuro nao suportado")
        with self._transaction() as conn:
            schema = """
                CREATE TABLE IF NOT EXISTS schema_version(version INTEGER NOT NULL);
                INSERT INTO schema_version(version) SELECT 2 WHERE NOT EXISTS(SELECT 1 FROM schema_version);
                CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY, value TEXT);
                CREATE TABLE IF NOT EXISTS sources(
                  source_id TEXT PRIMARY KEY, domain TEXT NOT NULL, path TEXT NOT NULL,
                  sha256 TEXT NOT NULL, kind TEXT NOT NULL, version INTEGER NOT NULL,
                  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, invalidated INTEGER NOT NULL DEFAULT 0);
                CREATE TABLE IF NOT EXISTS events(
                  id INTEGER PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(source_id),
                  sha256 TEXT NOT NULL, event_type TEXT NOT NULL, created_at TEXT NOT NULL,
                  processed_at TEXT, run_token TEXT, UNIQUE(source_id,sha256,event_type));
                CREATE TABLE IF NOT EXISTS proposals(
                  id INTEGER PRIMARY KEY, domain TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
                  kind TEXT NOT NULL, reason TEXT NOT NULL, verification TEXT NOT NULL,
                  sources_json TEXT NOT NULL, digest TEXT NOT NULL, dedup_hash TEXT NOT NULL UNIQUE,
                  status TEXT NOT NULL, created_at TEXT NOT NULL, created_day TEXT NOT NULL,
                  decided_at TEXT);
                CREATE TABLE IF NOT EXISTS decisions(
                  proposal_id INTEGER PRIMARY KEY REFERENCES proposals(id), decision TEXT NOT NULL,
                  actor TEXT NOT NULL, note TEXT NOT NULL, digest TEXT NOT NULL, created_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS runs(
                  token TEXT PRIMARY KEY, kind TEXT NOT NULL, owner TEXT NOT NULL, status TEXT NOT NULL,
                  started_at TEXT NOT NULL, expires_at REAL NOT NULL, day TEXT NOT NULL,
                  finished_at TEXT, detail TEXT NOT NULL DEFAULT '');
                CREATE TABLE IF NOT EXISTS gates(
                  name TEXT PRIMARY KEY, value INTEGER NOT NULL, actor TEXT NOT NULL,
                  evidence TEXT NOT NULL, updated_at TEXT NOT NULL);
            """
            for statement in schema.split(";"):
                statement = statement.strip()
                if statement:
                    conn.execute(statement)
            columns = {row[1] for row in conn.execute("PRAGMA table_info(sources)")}
            if "invalidated" not in columns:
                conn.execute("ALTER TABLE sources ADD COLUMN invalidated INTEGER NOT NULL DEFAULT 0")
            version = int(conn.execute("SELECT version FROM schema_version LIMIT 1").fetchone()[0])
            if version < self.SCHEMA_VERSION:
                conn.execute("UPDATE schema_version SET version=?", (self.SCHEMA_VERSION,))
            conn.execute("INSERT OR IGNORE INTO state(key,value) VALUES('observation_started_at',NULL)")

    def _now(self) -> datetime:
        value = self.clock()
        if value.tzinfo is None:
            raise StoreError("clock deve retornar datetime aware")
        return value.astimezone(timezone.utc)

    def _iso(self) -> str:
        return self._now().isoformat()

    @staticmethod
    def _require(value: str, name: str, maximum: int | None = None) -> str:
        if not isinstance(value, str) or not value.strip():
            raise StoreError(f"{name} obrigatorio")
        if maximum is not None and len(value) > maximum:
            raise StoreError(f"{name} excede {maximum}")
        return value

    def register_source(self, source_id: str, domain: str, path: str, sha256: str,
                        kind: str = "source") -> int:
        for value, name in ((source_id, "source_id"), (domain, "domain"), (path, "path")):
            self._require(value, name)
        if kind not in SOURCE_KINDS or not SHA256_RE.fullmatch(sha256):
            raise StoreError("kind ou sha256 invalido")
        now = self._iso()
        with self._transaction() as conn:
            row = conn.execute("SELECT * FROM sources WHERE source_id=?", (source_id,)).fetchone()
            if (row and row["sha256"] == sha256 and row["domain"] == domain and row["path"] == path
                    and row["kind"] == kind and not row["invalidated"]):
                return int(row["version"])
            version = int(row["version"]) + 1 if row else 1
            conn.execute("""INSERT INTO sources VALUES(?,?,?,?,?,?,?,?,?)
                ON CONFLICT(source_id) DO UPDATE SET domain=excluded.domain,path=excluded.path,
                sha256=excluded.sha256,kind=excluded.kind,version=excluded.version,updated_at=excluded.updated_at,invalidated=0""",
                (source_id, domain, path, sha256, kind, version, now, now, 0))
            return version

    def record_event(self, source_id: str, sha256: str, event_type: str = "changed") -> int:
        self._require(event_type, "event_type")
        with self._transaction() as conn:
            source = conn.execute("SELECT sha256,invalidated FROM sources WHERE source_id=?", (source_id,)).fetchone()
            if not source or source["invalidated"] or source["sha256"] != sha256:
                raise StoreError("fonte ausente ou sha divergente")
            conn.execute("INSERT OR IGNORE INTO events(source_id,sha256,event_type,created_at) VALUES(?,?,?,?)",
                         (source_id, sha256, event_type, self._iso()))
            row = conn.execute("SELECT id FROM events WHERE source_id=? AND sha256=? AND event_type=?",
                               (source_id, sha256, event_type)).fetchone()
            return int(row["id"])

    def list_events(self, domain: str | None = None, unprocessed_only: bool = True) -> list[dict]:
        sql = "SELECT e.* FROM events e JOIN sources s ON s.source_id=e.source_id WHERE s.invalidated=0"
        args: list[object] = []
        if domain is not None:
            sql += " AND s.domain=?"; args.append(domain)
        if unprocessed_only:
            sql += " AND e.processed_at IS NULL"
        conn = self._connect()
        try:
            return [dict(row) for row in conn.execute(sql + " ORDER BY e.id", args)]
        finally:
            conn.close()

    def pause(self, reason: str) -> None:
        self._require(reason, "reason")
        with self._transaction() as conn:
            conn.execute("INSERT OR REPLACE INTO state VALUES('paused_reason',?)", (reason,))

    def resume(self) -> None:
        with self._transaction() as conn:
            conn.execute("DELETE FROM state WHERE key='paused_reason'")

    def _expire_runs(self, conn: sqlite3.Connection) -> None:
        conn.execute("UPDATE runs SET status='failed',finished_at=?,detail='lease expirado' WHERE status='active' AND expires_at<=?",
                     (self._iso(), self._now().timestamp()))

    def _expire_runs_persisted(self) -> None:
        with self._transaction() as conn:
            self._expire_runs(conn)

    def begin_run(self, kind: str, owner: str) -> str:
        self._require(owner, "owner")
        if kind not in RUN_LIMITS:
            raise StoreError("kind de run invalido")
        limit, timeout = RUN_LIMITS[kind]
        now = self._now()
        self._expire_runs_persisted()
        with self._transaction() as conn:
            if conn.execute("SELECT 1 FROM state WHERE key='paused_reason'").fetchone():
                raise StoreError("HOME pausado")
            if conn.execute("SELECT COUNT(*) n FROM proposals WHERE status='pending'").fetchone()["n"] >= 20:
                raise StoreError("backlog cheio")
            if conn.execute("SELECT 1 FROM runs WHERE status='active'").fetchone():
                raise StoreError("ja existe run ativo")
            day = local_day(now)
            count = conn.execute("SELECT COUNT(*) n FROM runs WHERE kind=? AND day=?", (kind, day)).fetchone()["n"]
            if count >= limit:
                raise StoreError("quota de run excedida")
            if kind == "experiment":
                started_value = conn.execute("SELECT value FROM state WHERE key='observation_started_at'").fetchone()["value"]
                if not started_value:
                    raise StoreError("observacao ainda nao iniciada")
                started = datetime.fromisoformat(started_value)
                if (now - started).total_seconds() < 7 * 86400:
                    raise StoreError("janela de observacao incompleta")
                gates = {r["name"]: bool(r["value"]) for r in conn.execute("SELECT name,value FROM gates")}
                if not gates.get("backup_verified") or not gates.get("evaluation_ready"):
                    raise StoreError("gates incompletos")
            token = uuid.uuid4().hex
            conn.execute("INSERT INTO runs(token,kind,owner,status,started_at,expires_at,day) VALUES(?,?,?,'active',?,?,?)",
                         (token, kind, owner, now.isoformat(), now.timestamp() + timeout, day))
            return token

    def finish_run(self, token: str, status: str, detail: str) -> None:
        if status not in {"completed", "failed", "suspended"}:
            raise StoreError("status de run invalido")
        self._expire_runs_persisted()
        with self._transaction() as conn:
            row = conn.execute("SELECT status FROM runs WHERE token=?", (token,)).fetchone()
            if not row or row["status"] != "active":
                raise StoreError("lease invalido ou encerrado")
            conn.execute("UPDATE runs SET status=?,finished_at=?,detail=? WHERE token=?",
                         (status, self._iso(), detail, token))
            if status == "completed" and conn.execute("SELECT value FROM state WHERE key='observation_started_at'").fetchone()["value"] is None:
                conn.execute("UPDATE state SET value=? WHERE key='observation_started_at'", (self._iso(),))

    def mark_events_processed(self, ids: Sequence[int], run_token: str) -> None:
        if not ids:
            raise StoreError("ids obrigatorios")
        self._expire_runs_persisted()
        with self._transaction() as conn:
            if conn.execute("SELECT 1 FROM state WHERE key='paused_reason'").fetchone():
                raise StoreError("HOME pausado")
            run = conn.execute("SELECT status FROM runs WHERE token=?", (run_token,)).fetchone()
            if not run or run["status"] != "active":
                raise StoreError("run invalido")
            for event_id in ids:
                event = conn.execute("""SELECT e.processed_at,e.sha256,s.sha256 current_sha,s.invalidated
                    FROM events e JOIN sources s ON s.source_id=e.source_id WHERE e.id=?""", (event_id,)).fetchone()
                if (not event or event["processed_at"] or event["invalidated"]
                        or event["sha256"] != event["current_sha"]):
                    raise StoreError("evento invalido ou fonte atualizada")
            placeholders = ",".join("?" for _ in ids)
            conn.execute(f"UPDATE events SET processed_at=?,run_token=? WHERE id IN ({placeholders})",
                         (self._iso(), run_token, *ids))

    def set_gate(self, name: str, value: bool, actor: str, evidence: str) -> None:
        if name not in {"backup_verified", "evaluation_ready"} or not isinstance(value, bool):
            raise StoreError("gate invalido")
        self._require(actor, "actor"); self._require(evidence, "evidence")
        with self._transaction() as conn:
            conn.execute("INSERT OR REPLACE INTO gates VALUES(?,?,?,?,?)",
                         (name, int(value), actor, evidence, self._iso()))

    def create_proposal(self, domain: str, title: str, body: str,
                        sources: list[dict[str, str]], kind: str = "hypothesis",
                        reason: str = "", verification: str = "") -> int:
        self._require(domain, "domain")
        for value, name, maximum in ((title, "title", 200), (body, "body", 12000),
                                     (reason, "reason", 2000),
                                     (verification, "verification", 2000)):
            self._require(value, name, maximum)
        if kind not in PROPOSAL_KINDS or not isinstance(sources, list) or not sources:
            raise StoreError("kind ou sources invalido")
        normalized: list[dict[str, str]] = []
        for item in sources:
            if not isinstance(item, dict) or set(item) != {"source_id", "sha256"}:
                raise StoreError("referencia de fonte invalida")
            source_id, sha256 = item["source_id"], item["sha256"]
            if not isinstance(source_id, str) or not isinstance(sha256, str):
                raise StoreError("referencia de fonte invalida")
            normalized.append({"source_id": source_id, "sha256": sha256})
        now = self._now()
        with self._transaction() as conn:
            if conn.execute("SELECT 1 FROM state WHERE key='paused_reason'").fetchone():
                raise StoreError("HOME pausado")
            enriched: list[dict[str, str | int]] = []
            for item in normalized:
                source = conn.execute("SELECT domain,sha256,kind,version,invalidated FROM sources WHERE source_id=?",
                                      (item["source_id"],)).fetchone()
                if (not source or source["invalidated"] or source["domain"] != domain
                        or source["sha256"] != item["sha256"] or source["kind"] not in SOURCE_KINDS):
                    raise StoreError("fonte ausente, cruzada, obsoleta ou nao autorizada")
                enriched.append({**item, "version": int(source["version"])})
            enriched.sort(key=lambda item: (str(item["source_id"]), str(item["sha256"]), int(item["version"])))
            digest = proposal_digest(domain, title, body, kind, reason, verification, enriched)
            dedup_hash = digest
            duplicate = conn.execute("SELECT id FROM proposals WHERE dedup_hash=?", (dedup_hash,)).fetchone()
            if duplicate:
                return int(duplicate["id"])
            pending = conn.execute("SELECT COUNT(*) n FROM proposals WHERE status='pending'").fetchone()["n"]
            if pending >= 20:
                raise StoreError("fila pendente cheia")
            day = local_day(now)
            daily = conn.execute("SELECT COUNT(*) n FROM proposals WHERE created_day=?", (day,)).fetchone()["n"]
            if daily >= 5:
                raise StoreError("quota diaria de propostas excedida")
            cursor = conn.execute("""INSERT INTO proposals(domain,title,body,kind,reason,verification,
                sources_json,digest,dedup_hash,status,created_at,created_day) VALUES(?,?,?,?,?,?,?,?,?,'pending',?,?)""",
                (domain, title, body, kind, reason, verification, canonical_json(enriched),
                 digest, dedup_hash, now.isoformat(), day))
            return int(cursor.lastrowid)

    def _proposal_dict(self, row: sqlite3.Row) -> dict:
        result = dict(row)
        result["sources"] = json.loads(result.pop("sources_json"))
        result.pop("dedup_hash", None)
        return result

    def get_proposal(self, proposal_id: int) -> dict:
        conn = self._connect()
        try:
            row = conn.execute("SELECT * FROM proposals WHERE id=?", (proposal_id,)).fetchone()
            if not row:
                raise StoreError("proposta inexistente")
            return self._proposal_dict(row)
        finally:
            conn.close()

    def list_proposals(self, domain: str | None = None, status: str | None = None) -> list[dict]:
        sql, args = "SELECT * FROM proposals WHERE 1=1", []
        if domain is not None:
            sql += " AND domain=?"; args.append(domain)
        if status is not None:
            sql += " AND status=?"; args.append(status)
        conn = self._connect()
        try:
            return [self._proposal_dict(row) for row in conn.execute(sql + " ORDER BY id", args)]
        finally:
            conn.close()

    def decide(self, proposal_id: int, decision: str, actor: str,
               expected_digest: str, note: str = "") -> dict:
        if decision not in {"approve", "reject"}:
            raise StoreError("decisao invalida")
        self._require(actor, "actor");
        if not isinstance(note, str):
            raise StoreError("note invalida")
        stale = False
        result: dict | None = None
        with self._transaction() as conn:
            row = conn.execute("SELECT * FROM proposals WHERE id=?", (proposal_id,)).fetchone()
            if not row or row["digest"] != expected_digest:
                raise StoreError("proposta inexistente ou digest divergente")
            prior = conn.execute("SELECT decision,actor,note,digest FROM decisions WHERE proposal_id=?", (proposal_id,)).fetchone()
            if prior:
                if prior["decision"] == decision and prior["actor"] == actor and prior["note"] == note and prior["digest"] == expected_digest:
                    return self._proposal_dict(row)
                raise StoreError("decisao contraditoria")
            for item in json.loads(row["sources_json"]):
                source = conn.execute("SELECT sha256,domain,kind,version,invalidated FROM sources WHERE source_id=?", (item["source_id"],)).fetchone()
                if (not source or source["invalidated"] or source["sha256"] != item["sha256"]
                        or source["domain"] != row["domain"] or source["kind"] not in SOURCE_KINDS
                        or int(source["version"]) != int(item.get("version", 0))):
                    conn.execute("UPDATE proposals SET status='stale' WHERE id=?", (proposal_id,))
                    stale = True
                    break
            if not stale:
                status = "approved_proposal" if decision == "approve" else "rejected"
                now = self._iso()
                conn.execute("INSERT INTO decisions VALUES(?,?,?,?,?,?)",
                             (proposal_id, decision, actor, note, expected_digest, now))
                conn.execute("UPDATE proposals SET status=?,decided_at=? WHERE id=?", (status, now, proposal_id))
                result = self._proposal_dict(conn.execute("SELECT * FROM proposals WHERE id=?", (proposal_id,)).fetchone())
        if stale:
            raise StoreError("fonte atualizada ou removida; proposta marcada stale")
        assert result is not None
        return result

    def context(self, domain: str, limit: int = 5) -> dict:
        self._require(domain, "domain")
        if not isinstance(limit, int) or limit < 1:
            raise StoreError("limit invalido")
        conn = self._connect()
        try:
            sources = [dict(row) for row in conn.execute("""SELECT source_id,domain,path,sha256,kind,version,updated_at
                FROM sources WHERE domain=? AND invalidated=0 AND kind IN ('source','approved') ORDER BY source_id LIMIT ?""", (domain, limit))]
            pending = [dict(row) | {"label": "pending_proposal"} for row in conn.execute("""SELECT id,domain,title,kind,reason,verification,status,created_at
                FROM proposals WHERE domain=? AND status='pending' ORDER BY id DESC LIMIT ?""", (domain, limit))]
            return {"domain": domain, "sources": sources, "pending_proposals": pending}
        finally:
            conn.close()

    def status(self) -> dict:
        self._expire_runs_persisted()
        with self._transaction() as conn:
            state = {r["key"]: r["value"] for r in conn.execute("SELECT key,value FROM state")}
            counts = {r["status"]: r["n"] for r in conn.execute("SELECT status,COUNT(*) n FROM proposals GROUP BY status")}
            started = datetime.fromisoformat(state["observation_started_at"]) if state.get("observation_started_at") else None
            ready_at = started.timestamp() + 7 * 86400 if started else None
            gates = {r["name"]: bool(r["value"]) for r in conn.execute("SELECT name,value FROM gates")}
            return {"paused": "paused_reason" in state, "pause_reason": state.get("paused_reason"),
                    "proposal_counts": counts, "pending": counts.get("pending", 0),
                    "observation_started_at": started.isoformat() if started else None,
                    "experiment_ready_at": datetime.fromtimestamp(ready_at, timezone.utc).isoformat() if ready_at else None,
                    "can_experiment": (not state.get("paused_reason") and not conn.execute("SELECT 1 FROM runs WHERE status='active'").fetchone()
                        and counts.get("pending", 0) < 20 and ready_at is not None and self._now().timestamp() >= ready_at
                        and gates.get("backup_verified", False) and gates.get("evaluation_ready", False)), "gates": gates}

    def start_observation(self, run_token: str) -> str:
        with self._transaction() as conn:
            run = conn.execute("SELECT status FROM runs WHERE token=?", (run_token,)).fetchone()
            if not run or run["status"] != "completed":
                raise StoreError("ciclo de observacao invalido")
            current = conn.execute("SELECT value FROM state WHERE key='observation_started_at'").fetchone()["value"]
            if current:
                return current
            started = self._iso()
            conn.execute("UPDATE state SET value=? WHERE key='observation_started_at'", (started,))
            return started

    def record_observation_success(self, run_token: str) -> str:
        return self.start_observation(run_token)

    def invalidate_source(self, source_id: str, reason: str) -> None:
        self._require(source_id, "source_id"); self._require(reason, "reason")
        with self._transaction() as conn:
            source = conn.execute("SELECT source_id FROM sources WHERE source_id=?", (source_id,)).fetchone()
            if not source:
                raise StoreError("fonte inexistente")
            conn.execute("UPDATE sources SET invalidated=1,updated_at=? WHERE source_id=?", (self._iso(), source_id))
            conn.execute("DELETE FROM events WHERE source_id=?", (source_id,))
            proposals = conn.execute("SELECT id,sources_json FROM proposals WHERE status='pending'").fetchall()
            for proposal in proposals:
                if any(item.get("source_id") == source_id for item in json.loads(proposal["sources_json"])):
                    conn.execute("UPDATE proposals SET status='stale' WHERE id=?", (proposal["id"],))
