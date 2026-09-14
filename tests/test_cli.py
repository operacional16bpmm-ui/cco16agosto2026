import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from home_lab import Store


class CliTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / "cli.db"

    def tearDown(self):
        self.tmp.cleanup()

    def run_cli(self, *args):
        return subprocess.run([sys.executable, "-m", "home_lab", "--db", str(self.db), *args],
                              capture_output=True, text=True, check=False)

    def test_status_pause_resume_e_erros_sao_json(self):
        status = self.run_cli("status")
        self.assertEqual(status.returncode, 0)
        self.assertFalse(json.loads(status.stdout)["paused"])
        paused = self.run_cli("pause", "--reason", "revisao")
        self.assertEqual(paused.returncode, 0)
        self.assertTrue(json.loads(self.run_cli("status").stdout)["paused"])
        self.assertEqual(self.run_cli("resume").returncode, 0)
        error = self.run_cli("context", "--domain", "")
        self.assertNotEqual(error.returncode, 0)
        self.assertIn("error", json.loads(error.stderr))
        self.assertNotIn("Traceback", error.stderr)
        syntax = self.run_cli("gate", "backup_verified", "--value", "talvez")
        self.assertEqual(syntax.returncode, 2)
        self.assertIn("error", json.loads(syntax.stderr))

    def test_proposals_context_decide_e_gate(self):
        store = Store(self.db)
        store.register_source("s1", "d", "/x", "a" * 64)
        proposal_id = store.create_proposal("d", "T", "B", [{"source_id": "s1", "sha256": "a" * 64}], reason="R", verification="V")
        proposal = store.get_proposal(proposal_id)
        self.assertEqual(self.run_cli("proposals", "--domain", "d").returncode, 0)
        self.assertEqual(self.run_cli("context", "--domain", "d").returncode, 0)
        decision = self.run_cli("decide", str(proposal_id), "--decision", "approve",
                                "--actor", "humano", "--digest", proposal["digest"])
        self.assertEqual(decision.returncode, 0)
        gate = self.run_cli("gate", "backup_verified", "--value", "true",
                            "--actor", "humano", "--evidence", "manifest")
        self.assertEqual(gate.returncode, 0)


if __name__ == "__main__":
    unittest.main()
