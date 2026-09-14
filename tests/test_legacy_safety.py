"""Executa funcoes reais do SBV sem importar config/cofre do host."""
import argparse
import ast
import json
import contextlib
import io
import tempfile
import types
import unittest
from pathlib import Path


def functions(names, namespace):
    source = Path(__file__).resolve().parents[1] / 'legacy' / 'sbv.py'
    tree = ast.parse(source.read_text(encoding='utf-8'))
    tree.body = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
    exec(compile(tree, str(source), 'exec'), namespace)
    return namespace


class LegacySafetyTests(unittest.TestCase):
    def setUp(self):
        self.stdout = io.StringIO()
        self.stderr = io.StringIO()
        self.redirect_out = contextlib.redirect_stdout(self.stdout)
        self.redirect_err = contextlib.redirect_stderr(self.stderr)
        self.redirect_out.__enter__()
        self.redirect_err.__enter__()
        self.addCleanup(self.redirect_err.__exit__, None, None, None)
        self.addCleanup(self.redirect_out.__exit__, None, None, None)

    def test_pending_never_given_to_brief_model_as_facts(self):
        with tempfile.TemporaryDirectory() as folder:
            reports = Path(folder)
            calls = []
            facts = [{'status': 'active', 'text': f'confirmado {n}'} for n in range(8)]
            facts.append({'status': 'pending', 'text': 'HIPOTESE-NAO-APROVADA'})
            ns = functions({'cmd_brief'}, {'config': types.SimpleNamespace(FACTS='facts', NEGATIVE='neg', REPORTS=reports),
                '_read_jsonl': lambda p: facts if p == 'facts' else [], 'TODAY': lambda: '2026-09-14',
                'llm': types.SimpleNamespace(disponivel=lambda: True,
                    refletir=lambda prompt, **kw: calls.append(prompt) or 'resumo')})
            self.assertEqual(ns['cmd_brief'](argparse.Namespace(show=False)), 0)
            self.assertEqual(len(calls), 1)
            self.assertNotIn('HIPOTESE-NAO-APROVADA', calls[0])

    def test_night_failure_propagates_nonzero(self):
        def failed(_):
            raise OSError('falha injetada')
        ns = functions({'cmd_night'}, {'argparse': argparse, 'ISO': lambda: 'now',
            'sys': __import__('sys'), 'time': types.SimpleNamespace(sleep=lambda _: None),
            'REFLECT_PAUSA_S': 0, 'cmd_reflect': failed, 'cmd_decay': lambda _: 0,
            'cmd_eval': lambda _: 0, 'cmd_brief': lambda _: 0})
        self.assertEqual(ns['cmd_night'](None), 1)

    def test_empty_llm_does_not_score_context_or_save_baseline(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            golden = root / 'golden.json'
            golden.write_text(json.dumps([{'q': 'teste', 'expect': ['resposta']}]))
            config = types.SimpleNamespace(GOLDEN=golden, EVAL_BASELINE=root / 'baseline.json',
                                           REPORTS=root, EVAL_ALERT_DROP=0.1)
            ns = functions({'cmd_eval', '_grade'}, {'config': config, 'json': json,
                'sys': __import__('sys'), 'time': types.SimpleNamespace(sleep=lambda _: None),
                'REFLECT_PAUSA_S': 0, 'TODAY': lambda: '2026-09-14', 'ISO': lambda: 'now',
                'llm': types.SimpleNamespace(disponivel=lambda: True, refletir=lambda *a, **kw: ''),
                'retrieval': types.SimpleNamespace(disponivel=lambda: True, buscar=lambda *a, **kw: 'resposta')})
            self.assertEqual(ns['cmd_eval'](argparse.Namespace(mode='llm')), 2)
            self.assertFalse(config.EVAL_BASELINE.exists())

    @unittest.skipIf(__import__('os').name == 'nt', 'bash execution validated on Linux')
    def test_night_wrapper_propagates_pipeline_failure(self):
        import os
        import subprocess
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'logs').mkdir()
            (root / 'reports').mkdir()
            (root / 'sbv.py').write_text('raise SystemExit(7)\n')
            script = Path(__file__).resolve().parents[1] / 'legacy' / 'night.sh'
            result = subprocess.run(['bash', str(script)], env={**os.environ,
                'SBV_ROOT': str(root), 'SBV_SKIP_INGEST': '1'}, capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 7)


if __name__ == '__main__':
    unittest.main()
