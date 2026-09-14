from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from typing import Sequence

from .store import Store, StoreError


class JsonArgumentParser(argparse.ArgumentParser):
    def error(self, message: str) -> None:
        raise StoreError(message)


def parser() -> argparse.ArgumentParser:
    root = JsonArgumentParser(prog="python -m home_lab")
    root.add_argument("--db", required=True)
    commands = root.add_subparsers(dest="command", required=True)
    commands.add_parser("status")
    proposals = commands.add_parser("proposals")
    proposals.add_argument("--domain")
    proposals.add_argument("--status")
    context = commands.add_parser("context")
    context.add_argument("--domain", required=True)
    context.add_argument("--limit", type=int, default=5)
    pause = commands.add_parser("pause")
    pause.add_argument("--reason", required=True)
    commands.add_parser("resume")
    decide = commands.add_parser("decide")
    decide.add_argument("id", type=int)
    decide.add_argument("--decision", choices=("approve", "reject"), required=True)
    decide.add_argument("--actor", required=True)
    decide.add_argument("--digest", required=True)
    decide.add_argument("--note", default="")
    gate = commands.add_parser("gate")
    gate.add_argument("name", choices=("backup_verified", "evaluation_ready"))
    gate.add_argument("--value", choices=("true", "false"), required=True)
    gate.add_argument("--actor", required=True)
    gate.add_argument("--evidence", required=True)
    return root


def execute(args: argparse.Namespace) -> object:
    store = Store(args.db)
    if args.command == "status":
        return store.status()
    if args.command == "proposals":
        return store.list_proposals(args.domain, args.status)
    if args.command == "context":
        return store.context(args.domain, args.limit)
    if args.command == "pause":
        store.pause(args.reason); return store.status()
    if args.command == "resume":
        store.resume(); return store.status()
    if args.command == "decide":
        return store.decide(args.id, args.decision, args.actor, args.digest, args.note)
    if args.command == "gate":
        store.set_gate(args.name, args.value == "true", args.actor, args.evidence)
        return store.status()
    raise StoreError("comando invalido")


def main(argv: Sequence[str] | None = None) -> int:
    try:
        args = parser().parse_args(argv)
        print(json.dumps(execute(args), ensure_ascii=False, sort_keys=True))
        return 0
    except (StoreError, OSError, ValueError, sqlite3.Error) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2
