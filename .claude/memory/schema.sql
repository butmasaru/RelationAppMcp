-- Supermemory schema (template v1)
-- 提供する機能:
--   1. memory_files     : Markdownファイル本体 + frontmatterメタ (FTS5 trigram)
--   2. memory_chunks    : 行ベースチャンク (FTS5 trigram, optional)
--   3. migration_links  : 名前/パスの変遷履歴 ("変遷ごと覚える")
-- 設計方針: CREATE IF NOT EXISTS で完全に冪等。再実行で破壊しない。
-- ベクトル検索 (sqlite-vec) は別途 search.py 側で動的に作る。

-- ── memory_files: 1ファイル = 1行 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_files (
    path          TEXT PRIMARY KEY,
    name          TEXT DEFAULT '',
    description   TEXT DEFAULT '',
    type          TEXT DEFAULT '',
    content       TEXT DEFAULT '',
    mtime         INTEGER DEFAULT 0,
    file_size     INTEGER DEFAULT 0,
    updated_date  TEXT DEFAULT '',
    created_date  TEXT DEFAULT '',
    content_hash  TEXT DEFAULT ''
);

CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    name, description, type, content,
    content=memory_files,
    content_rowid=rowid,
    tokenize='trigram'
);

CREATE TRIGGER IF NOT EXISTS memory_files_ai AFTER INSERT ON memory_files BEGIN
    INSERT INTO memory_fts(rowid, name, description, type, content)
    VALUES (new.rowid, new.name, new.description, new.type, new.content);
END;
CREATE TRIGGER IF NOT EXISTS memory_files_ad AFTER DELETE ON memory_files BEGIN
    INSERT INTO memory_fts(memory_fts, rowid, name, description, type, content)
    VALUES ('delete', old.rowid, old.name, old.description, old.type, old.content);
END;
CREATE TRIGGER IF NOT EXISTS memory_files_au AFTER UPDATE ON memory_files BEGIN
    INSERT INTO memory_fts(memory_fts, rowid, name, description, type, content)
    VALUES ('delete', old.rowid, old.name, old.description, old.type, old.content);
    INSERT INTO memory_fts(rowid, name, description, type, content)
    VALUES (new.rowid, new.name, new.description, new.type, new.content);
END;

-- ── memory_chunks: 行レンジ単位のサブドキュメント ───────────────────
-- 大きなファイルでも近傍チャンクをピンポイントで返せる。
-- 不要なら index.py の chunk 生成をスキップしても全体は動作する。
CREATE TABLE IF NOT EXISTS memory_chunks (
    id            TEXT PRIMARY KEY,        -- "<path>::<index>"
    file_path     TEXT NOT NULL,
    chunk_index   INTEGER NOT NULL,
    line_start    INTEGER NOT NULL,
    line_end      INTEGER NOT NULL,
    content       TEXT DEFAULT '',
    content_hash  TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_chunks_file ON memory_chunks(file_path);

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
    content,
    content=memory_chunks,
    content_rowid=rowid,
    tokenize='trigram'
);
CREATE TRIGGER IF NOT EXISTS memory_chunks_ai AFTER INSERT ON memory_chunks BEGIN
    INSERT INTO chunks_fts(rowid, content) VALUES (new.rowid, new.content);
END;
CREATE TRIGGER IF NOT EXISTS memory_chunks_ad AFTER DELETE ON memory_chunks BEGIN
    INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
END;
CREATE TRIGGER IF NOT EXISTS memory_chunks_au AFTER UPDATE ON memory_chunks BEGIN
    INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
    INSERT INTO chunks_fts(rowid, content) VALUES (new.rowid, new.content);
END;

-- ── migration_links: 同一エンティティの old→new 変遷を保持 ──────────
CREATE TABLE IF NOT EXISTS migration_links (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    logical_id   TEXT NOT NULL,
    old_name     TEXT NOT NULL,
    new_name     TEXT NOT NULL,
    kind         TEXT NOT NULL CHECK(kind IN ('project','technology','concept','path')),
    status       TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','partial','planned')),
    migrated_at  TEXT,
    reason       TEXT DEFAULT '',
    notes        TEXT DEFAULT '',
    created_at   TEXT DEFAULT (datetime('now')),
    UNIQUE(logical_id, old_name, new_name)
);
CREATE INDEX IF NOT EXISTS idx_migration_logical ON migration_links(logical_id);
CREATE INDEX IF NOT EXISTS idx_migration_old     ON migration_links(old_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_migration_new     ON migration_links(new_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_migration_kind    ON migration_links(kind);
