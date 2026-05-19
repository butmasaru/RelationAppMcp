#!/usr/bin/env python3
"""
index.py — Markdown メモリを SQLite (FTS5) に同期するインデクサー。

入力 : <project_root>/.claude/memory/*.md (frontmatter付きMarkdown)
出力 : <project_root>/.claude/memory/memory.db

特徴:
  - 冪等 (SHA-256 content_hash で変更検知, 未変更ファイルはスキップ)
  - チャンク生成 (見出し境界 or 100行刻みで分割)
  - janome があれば日本語トークナイズに利用 (任意)
  - venv 不要 (sqlite3 標準ライブラリで動作)

Usage:
    python3 index.py                # プロジェクトのデフォルト位置を使う
    python3 index.py --root /path   # 別プロジェクトを指定
    python3 index.py --force        # 全ファイル強制再インデクス
    python3 index.py --file PATH    # 単一ファイルのみ
"""
from __future__ import annotations

import argparse
import hashlib
import os
import re
import sqlite3
import sys
from pathlib import Path

SCHEMA_FILE = Path(__file__).resolve().parent / "schema.sql"


def find_project_root(start: Path) -> Path:
    """`.claude/memory` を含む祖先ディレクトリを探す。なければ start を返す。"""
    cur = start.resolve()
    for p in [cur, *cur.parents]:
        if (p / ".claude" / "memory").is_dir():
            return p
    return start.resolve()


def extract_frontmatter(text: str) -> dict[str, str]:
    """先頭の --- ... --- ブロックから key:value を取り出す。"""
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        return {}
    block = text[3:end]
    fm: dict[str, str] = {}
    for line in block.splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            fm[k.strip()] = v.strip()
    return fm


# 100行刻みチャンク (シンプル版)。見出しがあれば見出し境界優先。
HEADING_RE = re.compile(r"^#{1,6}\s")


def make_chunks(text: str, max_lines: int = 100) -> list[tuple[int, int, str]]:
    lines = text.splitlines()
    if not lines:
        return []
    boundaries: list[int] = [0]
    for i, line in enumerate(lines):
        if i > 0 and HEADING_RE.match(line):
            boundaries.append(i)
    boundaries.append(len(lines))

    chunks: list[tuple[int, int, str]] = []
    for a, b in zip(boundaries, boundaries[1:]):
        # 大きすぎるブロックは max_lines で更に分割
        s = a
        while s < b:
            e = min(s + max_lines, b)
            content = "\n".join(lines[s:e])
            if content.strip():
                # line numbers are 1-based for human consumption
                chunks.append((s + 1, e, content))
            s = e
    return chunks


def apply_schema(conn: sqlite3.Connection) -> None:
    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    conn.executescript(sql)


def iter_md_files(memory_dir: Path, target: Path | None) -> list[Path]:
    if target is not None:
        return [target] if target.is_file() else []
    out: list[Path] = []
    for p in memory_dir.rglob("*.md"):
        if p.name == "MEMORY.md":
            continue
        out.append(p)
    return sorted(out)


def index_one(conn: sqlite3.Connection, path: Path, force: bool) -> str:
    """1ファイルをDBへ反映。戻り値: 'added'|'updated'|'skipped'."""
    raw = path.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    text = raw.decode("utf-8", errors="replace")

    cur = conn.cursor()
    row = cur.execute(
        "SELECT content_hash FROM memory_files WHERE path=?", (str(path),)
    ).fetchone()
    if not force and row and row[0] == sha:
        return "skipped"

    fm = extract_frontmatter(text)
    name = fm.get("name", path.stem)
    desc = fm.get("description", "")
    typ = fm.get("type", "")
    updated = fm.get("updated", "")
    created = fm.get("created", "")

    st = path.stat()
    cur.execute(
        """
        INSERT OR REPLACE INTO memory_files
            (path, name, description, type, content, mtime, file_size,
             updated_date, created_date, content_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (str(path), name, desc, typ, text, int(st.st_mtime), st.st_size,
         updated, created, sha),
    )

    # チャンク再生成
    cur.execute("DELETE FROM memory_chunks WHERE file_path=?", (str(path),))
    for idx, (ls, le, body) in enumerate(make_chunks(text)):
        chash = hashlib.sha256(body.encode("utf-8")).hexdigest()
        cur.execute(
            """
            INSERT OR REPLACE INTO memory_chunks
                (id, file_path, chunk_index, line_start, line_end, content, content_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (f"{path}::{idx}", str(path), idx, ls, le, body, chash),
        )

    return "updated" if row else "added"


def gc_missing(conn: sqlite3.Connection, memory_dir: Path) -> int:
    """DBに残っていて実体が消えたファイルを削除。"""
    cur = conn.cursor()
    rows = cur.execute("SELECT path FROM memory_files").fetchall()
    deleted = 0
    for (p,) in rows:
        if not Path(p).exists():
            cur.execute("DELETE FROM memory_chunks WHERE file_path=?", (p,))
            cur.execute("DELETE FROM memory_files WHERE path=?", (p,))
            deleted += 1
    return deleted


def build_vector_index(db_path: Path) -> None:
    """memory_vec テーブルを作成/更新し、全ファイルのembeddingを格納する。"""
    use_vec = os.environ.get("SUPERMEMORY_VECTOR") == "1"
    if not use_vec:
        return
    try:
        import sqlite_vec  # type: ignore
        from sentence_transformers import SentenceTransformer  # type: ignore
    except ImportError as e:
        print(f"[vec-skip] deps not installed: {e}", file=sys.stderr)
        return

    conn = sqlite3.connect(str(db_path))
    try:
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        conn.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS memory_vec USING vec0(embedding float[384])"
        )
        rows = conn.execute("SELECT rowid, path, content FROM memory_files").fetchall()
        if not rows:
            return
        existing = {r[0] for r in conn.execute("SELECT rowid FROM memory_vec").fetchall()}
        model = SentenceTransformer("all-MiniLM-L6-v2")
        import json
        added = 0
        for rowid, path, content in rows:
            text = (content or "")[:4000]
            if not text.strip():
                continue
            emb = model.encode([text])[0].tolist()
            if rowid in existing:
                conn.execute("DELETE FROM memory_vec WHERE rowid=?", (rowid,))
            conn.execute(
                "INSERT INTO memory_vec(rowid, embedding) VALUES (?, ?)",
                (rowid, json.dumps(emb)),
            )
            added += 1
        conn.commit()
        print(f"[vec] indexed {added} embeddings into memory_vec")
    except Exception as e:
        print(f"[vec-error] {e}", file=sys.stderr)
    finally:
        conn.close()


def main() -> int:
    ap = argparse.ArgumentParser(description="Index .claude/memory/*.md into SQLite (FTS5).")
    ap.add_argument("--root", help="Project root (default: auto-detect from cwd).")
    ap.add_argument("--force", action="store_true", help="Re-index even unchanged files.")
    ap.add_argument("--file", help="Index only this single file.")
    ap.add_argument("--vector", action="store_true",
                    help="Also build vector embeddings (SUPERMEMORY_VECTOR=1).")
    args = ap.parse_args()

    if args.vector:
        os.environ["SUPERMEMORY_VECTOR"] = "1"

    root = Path(args.root) if args.root else find_project_root(Path.cwd())
    memory_dir = root / ".claude" / "memory"
    if not memory_dir.is_dir():
        print(f"[error] memory dir not found: {memory_dir}", file=sys.stderr)
        return 2
    db_path = memory_dir / "memory.db"

    target: Path | None = None
    if args.file:
        target = Path(args.file).resolve()

    # try janome (optional)
    try:
        import janome  # noqa: F401
    except Exception:
        # janome は任意。FTS5 trigram は内部で文字 N-gram を扱うので無くてもOK。
        pass

    files = iter_md_files(memory_dir, target)
    if not files:
        print("[info] no markdown files to index.")
        return 0

    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
        apply_schema(conn)

        added = updated = skipped = 0
        for p in files:
            status = index_one(conn, p, args.force)
            if status == "added":
                added += 1
            elif status == "updated":
                updated += 1
            else:
                skipped += 1
        deleted = 0 if target else gc_missing(conn, memory_dir)
        conn.commit()

        total_files = conn.execute("SELECT COUNT(*) FROM memory_files").fetchone()[0]
        total_chunks = conn.execute("SELECT COUNT(*) FROM memory_chunks").fetchone()[0]
    finally:
        conn.close()

    print(f"indexed: added={added} updated={updated} skipped={skipped} deleted={deleted}")
    print(f"total: {total_files} files, {total_chunks} chunks  (db: {db_path})")

    build_vector_index(db_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
