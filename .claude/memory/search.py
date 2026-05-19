#!/usr/bin/env python3
"""
search.py — Hybrid search CLI for the Supermemory template.

スコア統合:
  - BM25 (全文転置: 必須, sqlite3 標準で実装)
  - FTS5 BM25 (trigram tokenizer, 部分一致に強い)
  - 鮮度ボーナス (updated_date が新しいほど高加点)
  - vector cosine (任意, sqlite-vec + sentence-transformers)

ベクトルは --vector フラグ または環境変数 SUPERMEMORY_VECTOR=1 で有効化。
無効時はBM25 + FTS5のみで動作する。

Usage:
    python3 search.py "<query>" [--limit 10] [--json] [--vector]
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

SYNONYMS_FILE = Path(__file__).resolve().parent / "synonyms.json"


# ─── Project detection ────────────────────────────────────────────────
def find_project_root(start: Path) -> Path:
    cur = start.resolve()
    for p in [cur, *cur.parents]:
        if (p / ".claude" / "memory").is_dir():
            return p
    return start.resolve()


# ─── Synonyms ─────────────────────────────────────────────────────────
def load_synonyms(path: Path) -> dict[str, list[str]]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    syn: dict[str, list[str]] = {}
    for group in data.get("groups", []):
        lowers = [w.lower() for w in group]
        for w in group:
            syn[w.lower()] = lowers
    return syn


def expand_query(terms: list[str], syn: dict[str, list[str]]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for t in terms:
        for cand in [t, *syn.get(t.lower(), [])]:
            k = cand.lower()
            if k in seen:
                continue
            seen.add(k)
            out.append(cand)
    return out


# ─── Tokenize ─────────────────────────────────────────────────────────
_TOKEN_RE = re.compile(r"[A-Za-z0-9_]+|[぀-ヿ一-鿿]+", re.UNICODE)


def tokenize(text: str) -> list[str]:
    if not text:
        return []
    return [m.group(0).lower() for m in _TOKEN_RE.finditer(text)]


# ─── BM25 ─────────────────────────────────────────────────────────────
def compute_bm25(query_tokens: list[str],
                 doc_token_pairs: list[tuple[str, list[str]]],
                 k1: float = 1.5, b: float = 0.75) -> dict[str, float]:
    if not doc_token_pairs:
        return {}
    n_docs = len(doc_token_pairs)
    avgdl = sum(len(toks) for _, toks in doc_token_pairs) / max(n_docs, 1)

    # df
    df: dict[str, int] = {}
    for _, toks in doc_token_pairs:
        for t in set(toks):
            df[t] = df.get(t, 0) + 1

    scores: dict[str, float] = {}
    for path, toks in doc_token_pairs:
        if not toks:
            continue
        dl = len(toks)
        tf: dict[str, int] = {}
        for t in toks:
            tf[t] = tf.get(t, 0) + 1
        s = 0.0
        for q in query_tokens:
            if q not in tf:
                continue
            n = df.get(q, 0)
            idf = math.log((n_docs - n + 0.5) / (n + 0.5) + 1)
            num = tf[q] * (k1 + 1)
            den = tf[q] + k1 * (1 - b + b * dl / max(avgdl, 1e-9))
            s += idf * num / den
        if s > 0:
            scores[path] = s
    return scores


# ─── FTS5 ─────────────────────────────────────────────────────────────
def fts5_query(terms: list[str]) -> str:
    parts = [f'"{t}"' for t in terms if len(t) >= 3]
    return " OR ".join(parts)


def run_fts5(db: sqlite3.Connection, q: str, limit: int = 200) -> dict[str, float]:
    if not q:
        return {}
    try:
        rows = db.execute(
            """
            SELECT mf.path, bm25(memory_fts) AS s
              FROM memory_fts
              JOIN memory_files mf ON mf.rowid = memory_fts.rowid
             WHERE memory_fts MATCH ?
             ORDER BY s LIMIT ?
            """,
            (q, limit),
        ).fetchall()
    except sqlite3.OperationalError:
        return {}
    # bm25() は小さいほど良い → 反転して大きいほど良いに揃える
    return {p: -float(s) for p, s in rows}


# ─── Freshness ────────────────────────────────────────────────────────
def freshness_score(mtime: int) -> float:
    if not mtime:
        return 0.0
    age_days = (time.time() - mtime) / 86400.0
    if age_days < 0:
        age_days = 0
    half_life = 60.0
    return math.exp(-age_days / half_life)


# ─── Optional vector search ───────────────────────────────────────────
def maybe_vector_scores(db_path: Path, query: str, allowed: set[str]) -> dict[str, float]:
    use_vec = os.environ.get("SUPERMEMORY_VECTOR") == "1"
    if not use_vec:
        return {}
    try:
        import sqlite_vec  # type: ignore
        from sentence_transformers import SentenceTransformer  # type: ignore
    except Exception as e:
        print(f"[vec-skip] vector deps unavailable: {e}", file=sys.stderr)
        return {}
    try:
        conn = sqlite3.connect(str(db_path))
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        # Check vec table existence; if missing, bail.
        row = conn.execute(
            "SELECT name FROM sqlite_master WHERE name='memory_vec'"
        ).fetchone()
        if not row:
            return {}
        model = SentenceTransformer("all-MiniLM-L6-v2")
        emb = model.encode([query])[0].tolist()
        rows = conn.execute(
            """
            SELECT mf.path, vec_distance_cosine(memory_vec.embedding, ?) AS d
              FROM memory_vec
              JOIN memory_files mf ON mf.rowid = memory_vec.rowid
             ORDER BY d ASC LIMIT 200
            """,
            (json.dumps(emb),),
        ).fetchall()
        conn.close()
        return {p: 1.0 - float(d) for p, d in rows if p in allowed}
    except Exception as e:
        print(f"[vec-error] {e}", file=sys.stderr)
        return {}


# ─── Normalize / combine ──────────────────────────────────────────────
def normalize(scores: dict[str, float]) -> dict[str, float]:
    if not scores:
        return {}
    vs = list(scores.values())
    lo, hi = min(vs), max(vs)
    if hi - lo < 1e-9:
        return {k: 1.0 for k in scores}
    return {k: (v - lo) / (hi - lo) for k, v in scores.items()}


# ─── Main ─────────────────────────────────────────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser(description="Hybrid memory search.")
    ap.add_argument("query", nargs="+", help="Query terms.")
    ap.add_argument("--root", help="Project root (auto-detected by default).")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--json", dest="as_json", action="store_true")
    ap.add_argument("--vector", action="store_true",
                    help="Enable vector search (also via SUPERMEMORY_VECTOR=1).")
    args = ap.parse_args()

    if args.vector:
        os.environ["SUPERMEMORY_VECTOR"] = "1"

    root = Path(args.root) if args.root else find_project_root(Path.cwd())
    db_path = root / ".claude" / "memory" / "memory.db"
    if not db_path.exists():
        print(f"[error] DB not found: {db_path}\n  run: python3 index.py first.",
              file=sys.stderr)
        return 2

    query_str = " ".join(args.query)
    raw_terms = query_str.split()
    syn = load_synonyms(SYNONYMS_FILE)
    expanded = expand_query(raw_terms, syn)

    db = sqlite3.connect(str(db_path))
    try:
        docs = db.execute(
            "SELECT path, name, description, type, content, mtime FROM memory_files"
        ).fetchall()
        if not docs:
            print(f"[info] no documents indexed yet.")
            return 0

        # tokenized doc set with weighted fields
        pairs: list[tuple[str, list[str]]] = []
        for path, name, desc, typ, content, _mt in docs:
            blob = " ".join([(name or "") * 3, (desc or "") * 2, typ or "", content or ""])
            pairs.append((path, tokenize(blob)))

        q_tokens: list[str] = []
        seen_t: set[str] = set()
        for term in expanded + raw_terms:
            for tok in tokenize(term):
                if tok not in seen_t:
                    seen_t.add(tok)
                    q_tokens.append(tok)

        bm25 = compute_bm25(q_tokens, pairs)
        fts = run_fts5(db, fts5_query(expanded))
        fresh = {p: freshness_score(int(mt or 0)) for p, _n, _d, _t, _c, mt in docs}

        allowed = {p for p, *_ in docs}
        vec = maybe_vector_scores(db_path, query_str, allowed)
    finally:
        db.close()

    bm25_n = normalize(bm25)
    fts_n = normalize(fts)
    vec_n = normalize(vec) if vec else {}

    use_vec = bool(vec_n)
    all_paths = set(bm25_n) | set(fts_n) | set(vec_n)

    final: dict[str, float] = {}
    for p in all_paths:
        b = bm25_n.get(p, 0.0)
        f = fts_n.get(p, 0.0)
        fr = fresh.get(p, 0.0)
        if use_vec:
            v = vec_n.get(p, 0.0)
            final[p] = 0.30 * b + 0.20 * f + 0.35 * v + 0.15 * fr
        else:
            final[p] = 0.45 * b + 0.35 * f + 0.20 * fr

    ranked = sorted(final.items(), key=lambda kv: kv[1], reverse=True)[: args.limit]

    # Build doc lookup for output
    meta = {p: {"name": n, "description": d, "type": t, "mtime": mt}
            for (p, n, d, t, _c, mt) in docs}

    if args.as_json:
        out = [{"path": p, "score": round(s, 4), **meta.get(p, {})} for p, s in ranked]
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0

    if not ranked:
        print(f"\n検索結果なし: {query_str}\n")
        return 0

    mode = "BM25 + FTS5 + vector" if use_vec else "BM25 + FTS5"
    print(f"\n=== Memory Search ({mode}): {query_str} ===\n")
    print(f"{'Score':>7}  {'File':<40}  Description")
    print(f"{'-'*7}  {'-'*40}  {'-'*40}")
    for p, s in ranked:
        rel = p
        try:
            rel = str(Path(p).relative_to(root))
        except Exception:
            pass
        m = meta.get(p, {})
        desc = (m.get("description") or "")[:60]
        print(f"{s:>7.4f}  {rel[:40]:<40}  {desc}")
    print(f"\n{len(ranked)} hits.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
