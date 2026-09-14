import tempfile
import threading
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from home_lab import Store, StoreError


SHA_A = "a" * 64
SHA_B = "b" * 64


class MutableClock:
    def __init__(self) -> None:
        self.now = datetime(2026, 9, 1, 12, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        return self.now


class StoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "home.db"
        self.clock = MutableClock()
        self.store = Store(self.path, clock=self.clock)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_restart_preserva_fontes_eventos_e_idempotencia(self) -> None:
        self.assertEqual(self.store.register_source("s1", "geral", "/a", SHA_A), 1)
        self.assertEqual(self.store.register_source("s1", "geral", "/a", SHA_A), 1)
        event_id = self.store.record_event("s1", SHA_A)
        self.assertEqual(self.store.record_event("s1", SHA_A), event_id)
        restarted = Store(self.path, clock=self.clock)
        self.assertEqual(restarted.list_events()[0]["id"], event_id)

    def test_source_validacao_e_sql_injection_como_valor(self) -> None:
        self.store.register_source("x'; DROP TABLE sources;--", "d", "/x", SHA_A)
        self.assertEqual(self.store.register_source("s2", "d", "/y", SHA_B), 1)
        with self.assertRaises(StoreError):
            self.store.register_source("bad", "d", "/x", "abc")

    def test_run_quotas_pause_expiry_e_gates(self) -> None:
        token = self.store.begin_run("event", "worker")
        with self.assertRaises(StoreError):
            self.store.begin_run("event", "worker")
        self.clock.now += timedelta(seconds=601)
        token2 = self.store.begin_run("event", "worker")
        with self.assertRaises(StoreError):
            self.store.finish_run(token, "completed", "tarde")
        self.store.finish_run(token2, "completed", "ok")
        self.store.pause("manutencao")
        with self.assertRaises(StoreError):
            self.store.begin_run("night", "worker")
        self.store.resume()
        with self.assertRaises(StoreError):
            self.store.begin_run("experiment", "worker")
        self.clock.now += timedelta(days=7)
        self.store.set_gate("backup_verified", True, "humano", "manifest ok")
        self.store.set_gate("evaluation_ready", True, "humano", "fixture ok")
        exp = self.store.begin_run("experiment", "worker")
        self.store.finish_run(exp, "suspended", "encerrado")

    def test_eventos_so_processam_em_run_valido_e_fonte_atual(self) -> None:
        self.store.register_source("s1", "d", "/x", SHA_A)
        event = self.store.record_event("s1", SHA_A)
        token = self.store.begin_run("event", "worker")
        self.store.mark_events_processed([event], token)
        self.assertEqual(self.store.list_events(), [])

    def test_quotas_exatas_evento_e_noite(self) -> None:
        for _ in range(6):
            token = self.store.begin_run("event", "worker")
            self.store.finish_run(token, "completed", "ok")
        with self.assertRaises(StoreError):
            self.store.begin_run("event", "worker")
        night = self.store.begin_run("night", "worker")
        self.store.finish_run(night, "completed", "ok")
        with self.assertRaises(StoreError):
            self.store.begin_run("night", "worker")

    def test_concorrencia_concede_uma_unica_lease(self) -> None:
        barrier = threading.Barrier(6)
        results: list[str | None] = []
        def begin() -> None:
            barrier.wait()
            try:
                results.append(self.store.begin_run("event", "worker"))
            except StoreError:
                results.append(None)
        threads = [threading.Thread(target=begin) for _ in range(6)]
        for thread in threads: thread.start()
        for thread in threads: thread.join()
        self.assertEqual(sum(token is not None for token in results), 1)


if __name__ == "__main__":
    unittest.main()
