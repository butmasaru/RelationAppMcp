#!/usr/bin/env python3
"""
init-migration.py — migration_links テーブルを作成するだけのスクリプト。

このスキル雛形では「初期データ」は投入しない。プロジェクト固有の系譜は
migration-add.sh で1件ずつ追加する想定。

冪等: schema.sql は CREATE IF NOT EXISTS なので何度実行しても安全。

Usage:
  python3 init-migration.py
  python3 init-migration.py --db /path/to/memory.db
  SUPERMEMORY_DB=/path python3 init-migration.py
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SCHEMA_FILE = SCRIPT_DIR / "schema.sql"


def find_project_root(start: Path) -> Path:
    cur = start.resolve()
    for p in [cur, *cur.parents]:
        if (p / ".claude" / "memory").is_dir():
            return p
    return start.resolve()


def default_db() -> Path:
    env = os.environ.get("SUPERMEMORY_DB")
    if env:
        return Path(env)
    return find_project_root(Path.cwd()) / ".claude" / "memory" / "memory.db"


def main() -> int:
    ap = argparse.ArgumentParser(description="Create migration_links (and other) tables.")
    ap.add_argument("--db", default=None, help="DB path (overrides SUPERMEMORY_DB).")
    args = ap.parse_args()

    db_path = Path(args.db) if args.db else default_db()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    if not SCHEMA_FILE.exists():
        print(f"[error] schema.sql not found at {SCHEMA_FILE}", file=sys.stderr)
        return 2

    conn = sqlite3.connect(str(db_path))
    try:
        conn.executescript(SCHEMA_FILE.read_text(encoding="utf-8"))
        total = conn.execute("SELECT COUNT(*) FROM migration_links").fetchone()[0]
    finally:
        conn.close()

    print(f"[ok] schema applied to {db_path}")
    print(f"[ok] migration_links rows: {total}")
    print("[hint] add entries with: ./migration-add.sh <logical_id> <old> <new> <kind> [reason]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
