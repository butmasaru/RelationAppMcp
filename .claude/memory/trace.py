#!/usr/bin/env python3
"""
trace.py — migration_links から名前の系譜を追う独立CLI。

Usage:
  python3 trace.py "<name>"             # テキスト表示
  python3 trace.py "<name>" --json      # JSON 出力
  python3 trace.py "<name>" --db /path  # DB 明示
  SUPERMEMORY_DB=/path python3 trace.py # 環境変数で DB 指定

動作:
  1. <name> を old_name / new_name 両方で完全一致検索 (COLLATE NOCASE)
  2. 見つからなければ LIKE フォールバック
  3. ヒットしたエントリの logical_id をすべて集めて、同 logical_id の全行を時系列で表示

終了コード:
  0: 系譜が表示できた
  1: 該当なし
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path


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


def find_logical_ids(conn: sqlite3.Connection, name: str) -> list[str]:
    cur = conn.cursor()
    rows = cur.execute(
        """
        SELECT DISTINCT logical_id
          FROM migration_links
         WHERE old_name = ? COLLATE NOCASE
            OR new_name = ? COLLATE NOCASE
        """,
        (name, name),
    ).fetchall()
    if rows:
        return [r[0] for r in rows]

    like = f"%{name}%"
    rows = cur.execute(
        """
        SELECT DISTINCT logical_id
          FROM migration_links
         WHERE old_name LIKE ? COLLATE NOCASE
            OR new_name LIKE ? COLLATE NOCASE
        """,
        (like, like),
    ).fetchall()
    return [r[0] for r in rows]


def fetch_chain(conn: sqlite3.Connection, logical_id: str) -> list[dict]:
    cur = conn.cursor()
    rows = cur.execute(
        """
        SELECT id, logical_id, old_name, new_name, kind, status,
               migrated_at, reason, notes, created_at
          FROM migration_links
         WHERE logical_id = ?
         ORDER BY COALESCE(migrated_at, created_at) ASC, id ASC
        """,
        (logical_id,),
    ).fetchall()
    cols = ["id", "logical_id", "old_name", "new_name", "kind", "status",
            "migrated_at", "reason", "notes", "created_at"]
    return [dict(zip(cols, r)) for r in rows]


def render_text(logical_id: str, chain: list[dict]) -> str:
    lines = [f"logical_id: {logical_id}"]
    if not chain:
        return "\n".join(lines)
    first = chain[0]
    lines.append(
        f"{first['old_name']} ({first['kind']}, "
        f"{first.get('migrated_at') or first.get('created_at') or '-'}, "
        f"{first['status']})"
    )
    for row in chain:
        when = row.get("migrated_at") or row.get("created_at") or "-"
        reason = row.get("reason") or ""
        arrow = f"  ↓ {when}"
        if reason:
            arrow += f": {reason}"
        lines.append(arrow)
        lines.append(f"{row['new_name']} ({row['kind']}, {when}, {row['status']})")
        if row.get("notes"):
            lines.append(f"    note: {row['notes']}")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="Trace migration history of a name.")
    ap.add_argument("name", help="Name to trace.")
    ap.add_argument("--db", default=None, help="DB path (overrides SUPERMEMORY_DB).")
    ap.add_argument("--json", dest="as_json", action="store_true")
    args = ap.parse_args()

    db_path = Path(args.db) if args.db else default_db()
    if not db_path.exists():
        print(f"[error] DB not found: {db_path}", file=sys.stderr)
        return 2

    conn = sqlite3.connect(str(db_path))
    try:
        ids = find_logical_ids(conn, args.name)
        if not ids:
            if args.as_json:
                print(json.dumps({"query": args.name, "matches": []}, ensure_ascii=False))
            else:
                print(f"No migration record for '{args.name}'", file=sys.stderr)
            return 1
        results = []
        text_blocks = []
        for lid in ids:
            chain = fetch_chain(conn, lid)
            results.append({"logical_id": lid, "chain": chain})
            text_blocks.append(render_text(lid, chain))
    finally:
        conn.close()

    if args.as_json:
        print(json.dumps({"query": args.name, "matches": results},
                         ensure_ascii=False, indent=2))
    else:
        print("\n\n".join(text_blocks))
    return 0


if __name__ == "__main__":
    sys.exit(main())
