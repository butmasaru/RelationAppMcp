# RelationAppMCP HOT Memory

> このファイルは毎セッション自動読込される（200行制限）。
> 重要な鉄則と最頻参照のリンクのみ置く。詳細は個別mdへ。

---

## 鉄則（全セッション必読）

### アイデンティティ
- ユーザー: Dai さん（dai@world-ne.jp / butmasaru@gmail.com）
- プロジェクト: Re:lation API v2 MCP Server

### 言語・コミュニケーション
- 日本語で会話する

### 安全運用
- 大規模変更は必ずユーザーへ事前確認
- ユーザーの明示的な指示なしに `git commit` / `git push` をしない
- 既存実装を理解してから書き換える（読まずに編集しない）

---

## メモリ・インデックス（COLDメモリへのリンク）

> 各 md は `.claude/memory/` 配下の個別ファイル。HOT に書ききれない詳細を置く場所。

- [user_profile.md](user_profile.md) - ユーザーの役割・呼び名・関心領域
- [project_overview.md](project_overview.md) - Re:lation MCP Server 構成・安全性設計・API注意点
- [project_environment.md](project_environment.md) - 開発環境（OS, Shell, 言語, ランタイム）
- [conventions.md](conventions.md) - コーディング規約・命名・レイアウト方針
- [learnings/handoff-vs-official-api.md](learnings/handoff-vs-official-api.md) - HANDOFF vs 公式APIの差異一覧（実装時は公式を参照）

---

## daily ログ規約

- 重要な判断・操作・障害・気づきは `.claude/memory/daily/YYYY-MM-DD.md` に追記
- 形式: `## HH:MM - タイトル` + 内容（簡潔に）
- セッション開始時は **今日と昨日** の daily を確認して文脈を取り戻す

---

## 検索・操作コマンド

- 全文＋ベクトル検索: `bash .claude/memory/search.sh "<query>"`
- リネーム系譜の追跡: `bash .claude/memory/search.sh --trace "<name>"`
- 旧名（移行前の名前）込みで検索: `bash .claude/memory/search.sh --legacy "<query>"`
- 古いメモリ（30日以上未更新）一覧: `bash .claude/memory/stale.sh`

---

## メモリ更新ルール（鉄則）

- 古いメモリを参照したら **その場で更新** し、frontmatter の `updated:` を当日に書き換える
- 同じ失敗パターンを 3 回見たら HOT（このファイル）の鉄則に昇格
- HOT が 200 行を超えそうになったら個別 md へ分割（リンクだけ残す）

