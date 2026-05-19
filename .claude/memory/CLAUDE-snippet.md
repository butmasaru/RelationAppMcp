<!--
  CLAUDE-snippet.md - 既存の CLAUDE.md に追記する、記憶システム運用ルール。
  プレースホルダ RelationAppMCP は install.sh が置換します。
  既存 CLAUDE.md の末尾、または「メモリ管理ルール」セクションに貼り込んでください。
-->

## Auto-memory パス統合（重要）

**このプロジェクトでは auto-memory の保存先を `.claude/memory/` に統合しています。**

デフォルトの `~/.claude/projects/*/memory/` には書かないでください。
代わりに以下のルールに従ってください：

- メモリファイルの保存先: `.claude/memory/` （プロジェクトルート相対）
- MEMORY.md インデックス: `.claude/memory/MEMORY.md`
- user / feedback / project / reference 全タイプをここに書く
- frontmatter 形式はシステムデフォルトと同じ（name, description, metadata.type）
- ファイルを書くと PostToolUse hook が自動で DB にインデックスする

これにより auto-memory → FTS5/ベクトル検索が全自動で連携します。

## 記憶システム（Supermemory）

このプロジェクトには `.claude/memory/` 配下に永続記憶ストアが組み込まれています。
HOT/COLD 二層構造で、**容量を肥大化させずに「忘れない」** ことを目的とします。

### 配置と用途

```
.claude/memory/
├── MEMORY.md                # HOT: 毎セッション自動読込（200行まで）
├── <topic>.md               # COLD: 個別トピックの詳細
├── daily/YYYY-MM-DD.md      # 日次アクティビティログ
├── learnings/               # 失敗パターン・教訓
├── memory.db                # FTS5 + ベクトル検索インデックス
├── search.ps1               # 検索 CLI
└── index.py                 # 再インデックス（hookから自動呼出）
```

### HOT / COLD 分離の鉄則

- **HOT (`MEMORY.md`)** は鉄則・アイデンティティ・最頻参照リンクのみ。**200行を超えない**。
- **COLD (個別md)** に詳細を書き、HOT からはリンクだけ張る。
- 200行を超えそうになったら、最も参照頻度の低いブロックを COLD へ降格。

### daily ログ規約

- 重要な判断・操作・障害・気づきは `.claude/memory/daily/YYYY-MM-DD.md` に追記する。
- 形式: `## HH:MM - タイトル` + 内容（簡潔に）。
- 既にその日のファイルがあれば追記、なければ新規作成。

### セッション開始時の確認

- セッション開始フックが今日と昨日の daily ログのパスを案内します。
- 直近の文脈を把握してから本題に入る。
- `MEMORY.md` のリンク一覧で関連 COLD を必要に応じて読む。

### コンテキスト保全

- 会話が長くなり圧縮が近いと感じたら、重要情報を daily ログまたは適切な COLD md へ書き出す。
- 「あとで思い出せなくなりそう」な情報は積極的にメモリへ。
- PreCompact フックが圧縮直前のマーカーを daily に残します。

### メモリの鮮度管理

- 古いメモリを参照したら **その場で更新**。frontmatter の `updated:` を当日に書き換える。
- 内容が陳腐化していたら追記ではなく **書き換える**。

### 検索コマンド

- 全文＋ベクトルのハイブリッド検索:
  `& .claude/memory/search.ps1 "<query>"`
- リネーム系譜の追跡:
  `& .claude/memory/search.ps1 --trace "<name>"`
- 旧名込みで検索（移行前の名前で当てる）:
  `& .claude/memory/search.ps1 --legacy "<query>"`

### 同義語（synonyms）の活用

- 同義語ファイル: `.claude/memory/synonyms.json`
- 例: 「DB」と「database」と「データベース」を1グループにまとめると検索精度が大幅に上がる。
- プロジェクト固有用語が増えてきたら必ず追加する。

### 失敗パターンの蓄積

- 同じミス・誤診断を 2 回したら `.claude/memory/learnings/` に書く。
- 3 回目を見たら `MEMORY.md` の鉄則セクションへ昇格。
- 教訓は **「次回どう行動を変えるか」** を必ず明記する（感想で終わらせない）。

### 自動運用（hooks）

- `SessionStart` → 直近 daily と HOT メモリを案内
- `SessionEnd` → セッション終了マーカーを daily に追記
- `PostToolUse` → メモリmdの編集を検知し再インデックス
- `PreCompact` → 圧縮前のマーカーを daily に追記

これらは `.claude/settings.json` の `hooks` 設定で自動実行されます。
失敗してもセッションを止めない設計なので、フックがエラーを吐いても作業は続行可能。

### 鉄則まとめ

1. HOT は 200 行を超えない、超えそうなら COLD へ降格
2. daily への追記は HH:MM タイトル形式
3. 古いメモリは参照したら更新、放置しない
4. 同じ失敗 3 回で HOT 昇格
5. プロジェクト固有用語は synonyms.json に追加

