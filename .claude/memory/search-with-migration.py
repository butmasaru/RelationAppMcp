#!/usr/bin/env python3
"""
search-with-migration.py — search.py を migration_links で拡張するラッパー。

挙動:
  1. 引数のクエリトークンから migration_links を LIKE 検索
  2. ヒットした old_name / new_name をクエリに追加して search.py を呼ぶ
  3. 末尾に「移行関連」セクションを付与

migration_links が無い / 空でも検索は通常通り動作する。

DB パス:
  - 環境変数 SUPERMEMORY_DB を最優先
  - なければプロジェクトルートを自動検出 (<root>/.claude/memory/memory.db)
"""
from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SEARCH_PY = SCRIPT_DIR / "search.py"


def find_project_root(start: Path) -> Path:
    cur = start.resolve()
    for p in [cur, *cur.parents]:
        if (p / ".claude" / "memory").is_dir():
            return p
    return start.resolve()


def resolve_db_path() -> Path:
    env = os.environ.get("SUPERMEMORY_DB")
    if env:
        return Path(env)
    root = find_project_root(Path.cwd())
    return root / ".claude" / "memory" / "memory.db"


def find_python() -> str:
    root = find_project_root(Path.cwd())
    venv_py = root / ".venv" / "bin" / "python3"
    if venv_py.exists():
        return str(venv_py)
    return sys.executable or "python3"


def find_migration_entries(query: str, db: Path) -> tuple[list[dict], str | None]:
    if not db.exists():
        return [], f"DB not found: {db}"
    try:
        conn = sqlite3.connect(str(db))
        conn.row_factory = sqlite3.Row
    except sqlite3.Error as e:
        return [], f"DB connect failed: {e}"
    try:
        tokens = [t for t in query.split() if t.strip()]
        if not tokens:
            return [], None
        clauses, params = [], []
        for t in tokens:
            like = f"%{t}%"
            clauses.append("(old_name LIKE ? OR new_name LIKE ?)")
            params.extend([like, like])
        sql = (
            "SELECT id, logical_id, old_name, new_name, kind, status, "
            "migrated_at, reason, notes "
            "FROM migration_links WHERE " + " OR ".join(clauses) + " "
            "ORDER BY migrated_at DESC, id DESC"
        )
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows], None
    except sqlite3.OperationalError as e:
        return [], f"migration_links unavailable: {e}"
    finally:
        conn.close()


def build_expanded_query(original: str, entries: list[dict]) -> str:
    seen = {t.lower() for t in original.split()}
    out = [original.strip()] if original.strip() else []
    for e in entries:
        for f in ("old_name", "new_name"):
            v = e.get(f)
            if not v:
                continue
            k = v.lower()
            if k in seen:
                continue
            seen.add(k)
            out.append(v)
    return " ".join(out).strip()


def render_migration_section(entries: list[dict]) -> str:
    lines = ["", "=== 移行関連 ==="]
    for e in entries:
        old = e.get("old_name") or "?"
        new = e.get("new_name") or "?"
        kind = e.get("kind") or "-"
        when = e.get("migrated_at") or "-"
        status = e.get("status") or "-"
        lid = e.get("logical_id") or "-"
        reason = e.get("reason") or ""
        lines.append(f"  {old} → {new} [{kind}] {when} {status}")
        lines.append(f"    logical_id: {lid}")
        if reason:
            lines.append(f"    理由: {reason}")
    return "\n".join(lines)


def extract_query(argv: list[str]) -> tuple[str, list[int]]:
    """Pull non-flag tokens out as the query; return (query_str, indices)."""
    value_opts = {"--limit", "--root"}
    tokens, indices = [], []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a.startswith("--"):
            if a in value_opts and i + 1 < len(argv):
                i += 2
                continue
            i += 1
            continue
        tokens.append(a)
        indices.append(i)
        i += 1
    return " ".join(tokens), indices


def replace_query(argv: list[str], indices: list[int], new_query: str) -> list[str]:
    if not indices:
        return list(argv) + ([new_query] if new_query else [])
    new_argv: list[str] = []
    first = indices[0]
    rest = set(indices[1:])
    for idx, val in enumerate(argv):
        if idx == first:
            new_argv.append(new_query)
        elif idx in rest:
            continue
        else:
            new_argv.append(val)
    return new_argv


def main() -> int:
    argv = sys.argv[1:]
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        print("\nUsage: search-with-migration.py <query> [search.py options...]")
        return 0

    db = resolve_db_path()
    original_query, q_idx = extract_query(argv)
    entries, warn = find_migration_entries(original_query, db)
    expanded = build_expanded_query(original_query, entries)

    new_argv = replace_query(argv, q_idx, expanded)
    cmd = [find_python(), str(SEARCH_PY)] + new_argv
    rc = subprocess.run(cmd, check=False).returncode

    if warn:
        print(f"\n[migration_links 注意] {warn}", file=sys.stderr)
    if entries:
        print(render_migration_section(entries))
    return rc


if __name__ == "__main__":
    sys.exit(main())
