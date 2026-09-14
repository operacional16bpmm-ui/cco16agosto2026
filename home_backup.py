"""Snapshot documental verificavel. Nao e backup integral de discos/bancos/media."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import stat
from pathlib import Path

EXCLUDED = {'.git', '.venv', 'venv', 'node_modules', '.obsidian', '__pycache__'}
EXTENSIONS = {'.md', '.txt'}
MAX_BYTES = 20 * 1024 * 1024


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def _sources(roots: dict[str, Path], destination: Path) -> dict[str, Path]:
    if not roots or destination.exists():
        raise ValueError('fontes vazias ou destino ja existe')
    resolved = {}
    for name, root in roots.items():
        if not re.fullmatch(r'[a-zA-Z0-9_-]{1,60}', name):
            raise ValueError('identificador de fonte invalido')
        if root.is_symlink() or not root.is_dir():
            raise ValueError('fonte deve ser diretorio real existente')
        root = root.resolve(strict=True)
        if destination.resolve().is_relative_to(root):
            raise ValueError('destino dentro da fonte')
        resolved[name] = root
    return resolved


def _copy_file(path: Path, root: Path, target: Path) -> dict[str, object]:
    if not path.resolve(strict=True).is_relative_to(root):
        raise ValueError('arquivo saiu da raiz autorizada')
    flags = os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_BINARY', 0)
    with os.fdopen(os.open(path, flags), 'rb') as source:
        before = os.fstat(source.fileno())
        if not stat.S_ISREG(before.st_mode) or before.st_size > MAX_BYTES:
            raise ValueError('arquivo nao regular ou acima de 20 MiB')
        target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        sha = hashlib.sha256()
        with target.open('xb') as output:
            os.chmod(target, 0o600)
            for block in iter(lambda: source.read(1024 * 1024), b''):
                output.write(block)
                sha.update(block)
        after = os.fstat(source.fileno())
    current = path.stat(follow_symlinks=False)
    key = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns)
    if key(before) != key(after) or key(after) != key(current):
        raise ValueError('fonte mudou durante a copia; snapshot incompleto')
    return {'sha256': sha.hexdigest(), 'size': before.st_size,
            'source_mtime_ns': before.st_mtime_ns}


def _walk(root: Path, counts: dict[str, int]):
    for parent, dirs, files in os.walk(root, followlinks=False, onerror=_walk_error):
        base = Path(parent)
        kept = []
        for name in dirs:
            if (base / name).is_symlink():
                counts['skipped_symlinks'] += 1
            elif name not in EXCLUDED and not name.startswith('.'):
                kept.append(name)
        dirs[:] = sorted(kept)
        for name in sorted(files):
            path = base / name
            if path.is_symlink():
                counts['skipped_symlinks'] += 1
            elif path.suffix.lower() in EXTENSIONS and not name.startswith('.'):
                yield path


def _walk_error(error: OSError):
    raise error


def snapshot(roots: dict[str, Path], destination: Path) -> dict[str, object]:
    roots = _sources(roots, destination)
    destination.mkdir(mode=0o700, parents=True, exist_ok=False)
    entries = []
    counts = {'skipped_symlinks': 0}
    for label, root in roots.items():
        for path in _walk(root, counts):
            relative = Path(label) / path.relative_to(root)
            entry = _copy_file(path, root, destination / relative)
            entry['path'] = relative.as_posix()
            entries.append(entry)
    manifest = {'schema': 1, 'created_at': dt.datetime.now(dt.timezone.utc).isoformat(),
                'scope': 'documentos md/txt; sem bancos, midia, dependencias ou segredos de configuracao',
                'roots': {k: str(v) for k, v in roots.items()}, 'entries': entries,
                'files': len(entries), **counts}
    with (destination / 'manifest.json').open('x', encoding='utf-8') as output:
        os.chmod(destination / 'manifest.json', 0o600)
        json.dump(manifest, output, ensure_ascii=False, indent=2)
    return {'files': len(entries), 'bytes': sum(int(e['size']) for e in entries), **counts,
            'manifest_sha256': digest(destination / 'manifest.json'), **verify(destination)}


def _safe_entry(root: Path, text: str) -> Path:
    relative = Path(text)
    if relative.is_absolute() or '..' in relative.parts or '\\' in text or ':' in text:
        raise ValueError('path invalido no manifest')
    path = root / relative
    if not relative.parts or any((root.joinpath(*relative.parts[:n])).is_symlink()
                                 for n in range(1, len(relative.parts) + 1)):
        raise ValueError('symlink ou path vazio no manifest')
    if not path.resolve().is_relative_to(root.resolve()):
        raise ValueError('path externo ao snapshot')
    return path


def verify(root: Path, expected_manifest: str | None = None) -> dict[str, object]:
    if (root / 'manifest.json').is_symlink():
        raise ValueError('manifest nao pode ser symlink')
    if expected_manifest and digest(root / 'manifest.json') != expected_manifest:
        raise ValueError('hash externo do manifest diverge')
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('schema') != 1:
        raise ValueError('schema desconhecido')
    errors, seen = [], set()
    for entry in manifest['entries']:
        name = entry['path']
        if name in seen:
            raise ValueError('entrada duplicada')
        seen.add(name)
        path = _safe_entry(root, name)
        if (not path.is_file() or path.stat().st_size != entry['size']
                or digest(path) != entry['sha256']):
            errors.append(name)
    return {'ok': not errors, 'verified_files': len(seen) - len(errors), 'errors': errors}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['snapshot', 'verify'])
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--source', action='append', default=[], help='rotulo=/diretorio')
    parser.add_argument('--manifest-sha256')
    args = parser.parse_args()
    try:
        if args.command == 'verify':
            report = verify(args.destination, args.manifest_sha256)
        else:
            roots = dict(item.split('=', 1) for item in args.source)
            report = snapshot({k: Path(v) for k, v in roots.items()}, args.destination)
        print(json.dumps(report, ensure_ascii=False))
        return 0 if report['ok'] else 1
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(json.dumps({'ok': False, 'error': str(error)}))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
