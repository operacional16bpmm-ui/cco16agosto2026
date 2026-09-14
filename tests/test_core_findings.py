import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from home_lab import Store, StoreError


class Clock:
    def __init__(self):
        self.now = datetime(2026, 9, 1, 12, tzinfo=timezone.utc)

    def __call__(self):
        return self.now


class CoreFindingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "db.sqlite"
        self.clock = Clock()
        self.store = Store(self.path, self.clock)
        self.store.register_source("s1", "d", "/a", "a" * 64)

    def tearDown(self):
        self.tmp.cleanup()

    def proposal(self, title="T"):
        return self.store.create_proposal("d", title, "B", [{"source_id": "s1", "sha256": "a" * 64}],
                                          reason="R", verification="V")

    def test_expiracao_persiste_quando_operacao_subsequente_recusa(self):
        token = self.store.begin_run("event", "worker")
        self.clock.now += timedelta(seconds=601)
        with self.assertRaises(StoreError):
            self.store.finish_run(token, "completed", "tarde")
        conn = sqlite3.connect(self.path)
        try:
            self.assertEqual(conn.execute("SELECT status FROM runs WHERE token=?", (token,)).fetchone()[0], "failed")
        finally:
            conn.close()

    def test_aba_de_fonte_torna_proposta_terminalmente_stale(self):
        proposal_id = self.proposal()
        digest = self.store.get_proposal(proposal_id)["digest"]
        self.store.register_source("s1", "d", "/novo", "b" * 64)
        self.store.register_source("s1", "d", "/a", "a" * 64)
        with self.assertRaises(StoreError):
            self.store.decide(proposal_id, "approve", "humano", digest)
        self.assertEqual(self.store.get_proposal(proposal_id)["status"], "stale")
        with self.assertRaises(StoreError):
            self.store.decide(proposal_id, "approve", "humano", digest)

    def test_dedup_revalida_fonte_antes_de_retornar_id(self):
        self.proposal()
        self.store.register_source("s1", "d", "/novo", "b" * 64)
        with self.assertRaises(StoreError):
            self.proposal()

    def test_pausa_bloqueia_proposta_e_consumo_de_evento(self):
        event_id = self.store.record_event("s1", "a" * 64)
        token = self.store.begin_run("event", "worker")
        self.store.pause("revisao")
        with self.assertRaises(StoreError):
            self.proposal()
        with self.assertRaises(StoreError):
            self.store.mark_events_processed([event_id], token)
        self.assertEqual(len(self.store.list_events()), 1)

    def test_schema_futuro_e_recusado_sem_alteracao(self):
        other = Path(self.tmp.name) / "future.sqlite"
        conn = sqlite3.connect(other)
        try:
            conn.execute("CREATE TABLE schema_version(version INTEGER NOT NULL)")
            conn.execute("INSERT INTO schema_version VALUES(999)")
            conn.execute("CREATE TABLE sentinel(value TEXT)")
            conn.execute("INSERT INTO sentinel VALUES('intacto')")
            conn.commit()
        finally:
            conn.close()
        before = other.read_bytes()
        with self.assertRaises(StoreError):
            Store(other, self.clock)
        self.assertEqual(other.read_bytes(), before)

    def test_can_experiment_reflete_elegibilidade_efetiva(self):
        run = self.store.begin_run("event", "worker")
        self.store.finish_run(run, "completed", "ok")
        self.store.record_observation_success(run)
        self.clock.now += timedelta(days=7)
        self.store.set_gate("backup_verified", True, "humano", "ok")
        self.store.set_gate("evaluation_ready", True, "humano", "ok")
        self.assertTrue(self.store.status()["can_experiment"])
        active = self.store.begin_run("event", "worker")
        self.assertFalse(self.store.status()["can_experiment"])
        self.store.finish_run(active, "completed", "ok")
        self.store.pause("revisao")
        self.assertFalse(self.store.status()["can_experiment"])

    def test_janela_comeca_apenas_apos_observacao_valida(self):
        self.clock.now += timedelta(days=30)
        self.assertIsNone(self.store.status()["observation_started_at"])
        with self.assertRaises(StoreError):
            self.store.record_observation_success("inexistente")
        token = self.store.begin_run("event", "worker")
        self.store.finish_run(token, "completed", "ok")
        started = self.store.record_observation_success(token)
        self.assertEqual(self.store.start_observation(token), started)

    def test_invalidate_source_remove_contexto_eventos_e_stale_decisao(self):
        proposal_id = self.proposal()
        digest = self.store.get_proposal(proposal_id)["digest"]
        self.store.record_event("s1", "a" * 64)
        self.store.invalidate_source("s1", "arquivo removido")
        self.assertEqual(self.store.context("d")["sources"], [])
        self.assertEqual(self.store.list_events(), [])
        with self.assertRaises(StoreError):
            self.store.record_event("s1", "a" * 64)
        with self.assertRaises(StoreError):
            self.store.decide(proposal_id, "approve", "humano", digest)
        self.assertEqual(self.store.get_proposal(proposal_id)["status"], "stale")


if __name__ == "__main__":
    unittest.main()
