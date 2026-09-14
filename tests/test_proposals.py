import tempfile
import threading
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from home_lab import Store, StoreError


class Clock:
    now = datetime(2026, 9, 1, 12, tzinfo=timezone.utc)

    def __call__(self):
        return self.now


class ProposalTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.clock = Clock()
        self.store = Store(Path(self.tmp.name) / "db.sqlite", self.clock)
        self.store.register_source("s1", "d1", "/a", "a" * 64)
        self.store.register_source("s2", "d2", "/b", "b" * 64)

    def tearDown(self):
        self.tmp.cleanup()

    def proposal(self, **overrides):
        values = dict(domain="d1", title="Titulo", body="Corpo", sources=[{"source_id": "s1", "sha256": "a" * 64}],
                      kind="hypothesis", reason="Razao", verification="Verificar")
        values.update(overrides)
        return self.store.create_proposal(**values)

    def test_recusa_fonte_cruzada_obsoleta_e_proposta_como_fonte(self):
        with self.assertRaises(StoreError):
            self.proposal(sources=[{"source_id": "s2", "sha256": "b" * 64}])
        with self.assertRaises(StoreError):
            self.proposal(sources=[{"source_id": "s1", "sha256": "c" * 64}])
        proposal_id = self.proposal()
        with self.assertRaises(StoreError):
            self.proposal(sources=[{"source_id": str(proposal_id), "sha256": "a" * 64}])

    def test_dedup_nao_consume_quota_e_limite_diario(self):
        first = self.proposal()
        self.assertEqual(self.proposal(), first)
        for index in range(1, 5):
            self.proposal(title=f"T{index}")
        with self.assertRaises(StoreError):
            self.proposal(title="sexto")

    def test_digest_decisao_idempotente_contraditoria_e_fonte_stale(self):
        proposal_id = self.proposal()
        digest = self.store.get_proposal(proposal_id)["digest"]
        with self.assertRaises(StoreError):
            self.store.decide(proposal_id, "approve", "humano", "0" * 64)
        self.store.decide(proposal_id, "approve", "humano", digest)
        self.store.decide(proposal_id, "approve", "humano", digest)
        with self.assertRaises(StoreError):
            self.store.decide(proposal_id, "reject", "humano", digest)
        stale = self.proposal(title="Outro")
        stale_digest = self.store.get_proposal(stale)["digest"]
        self.store.register_source("s1", "d1", "/a", "c" * 64)
        with self.assertRaises(StoreError):
            self.store.decide(stale, "approve", "humano", stale_digest)
        self.assertEqual(self.store.get_proposal(stale)["status"], "stale")

    def test_contexto_separa_pending_e_nunca_promove_body(self):
        self.proposal(body="NAO E FATO")
        context = self.store.context("d1")
        self.assertEqual(context["sources"][0]["source_id"], "s1")
        self.assertNotIn("body", context["pending_proposals"][0])
        self.assertEqual(context["pending_proposals"][0]["label"], "pending_proposal")
        with self.assertRaises(StoreError):
            self.store.context("")

    def test_concorrencia_respeita_quota_atomica(self):
        results = []
        barrier = threading.Barrier(8)
        def create(index):
            barrier.wait()
            try:
                results.append(self.proposal(title=f"C{index}"))
            except StoreError:
                results.append(None)
        threads = [threading.Thread(target=create, args=(i,)) for i in range(8)]
        for thread in threads: thread.start()
        for thread in threads: thread.join()
        self.assertEqual(sum(value is not None for value in results), 5)


if __name__ == "__main__":
    unittest.main()
