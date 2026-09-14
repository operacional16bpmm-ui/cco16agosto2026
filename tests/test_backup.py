import hashlib
import tempfile
import unittest
from pathlib import Path


class BackupTests(unittest.TestCase):
    def test_snapshot_copies_only_document_sources_and_verifies_bytes(self):
        from home_backup import snapshot, verify
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / 'source'
            source.mkdir()
            (source / 'nota.md').write_text('fonte original', encoding='utf-8')
            (source / '.env').write_text('TOKEN=nao-copiar', encoding='utf-8')
            (source / '.venv').mkdir()
            (source / '.venv' / 'readme.md').write_text('dependencia')
            report = snapshot({'wiki': source}, root / 'snapshot')
            self.assertEqual(report['files'], 1)
            self.assertEqual((root / 'snapshot' / 'wiki' / 'nota.md').read_text(), 'fonte original')
            self.assertTrue(verify(root / 'snapshot')['ok'])
            with self.assertRaises(ValueError):
                verify(root / 'snapshot', '0' * 64)
            (root / 'snapshot' / 'wiki' / 'nota.md').write_text('adulterado')
            self.assertFalse(verify(root / 'snapshot')['ok'])

    def test_existing_destination_and_nested_destination_refused(self):
        from home_backup import snapshot
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'a.md').write_text('a')
            with self.assertRaises(ValueError):
                snapshot({'wiki': root}, root)
            with self.assertRaises(ValueError):
                snapshot({'wiki': root}, root / 'snapshot')

    def test_manifest_traversal_never_reads_external_file(self):
        from home_backup import verify
        import json
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'snapshot').mkdir()
            payload = {'schema': 1, 'entries': [{'path': '../secret.md', 'sha256': hashlib.sha256(b'outside').hexdigest(), 'size': 7}]}
            (root / 'secret.md').write_text('outside')
            (root / 'snapshot' / 'manifest.json').write_text(json.dumps(payload))
            with self.assertRaises(ValueError):
                verify(root / 'snapshot')

    @unittest.skipIf(__import__('os').name == 'nt', 'symlink permissions validated on Linux')
    def test_symlink_source_is_not_followed(self):
        from home_backup import snapshot
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'source').mkdir()
            (root / 'outside.md').write_text('nao-copiar')
            (root / 'source' / 'link.md').symlink_to(root / 'outside.md')
            report = snapshot({'wiki': root / 'source'}, root / 'snapshot')
            self.assertEqual(report['files'], 0)
            self.assertEqual(report['skipped_symlinks'], 1)


if __name__ == '__main__':
    unittest.main()
