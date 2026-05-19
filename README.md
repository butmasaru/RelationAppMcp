# RelationAppMCP

Re:lation API v2 の全エンドポイントを網羅する MCP (Model Context Protocol) サーバー。
Claude Code / Codex / Gemini 等の AI ツールから Re:lation を統一的に操作できます。

> **Re:lation API v2 公式ドキュメント**: https://developer.ingage.jp/

## 特徴

- **35 ツール** — 顧客管理、チケット検索、メール送受信、チャット履歴、ラベル・分類管理など
- **3 段階安全性レベル** — READ / WRITE / DANGEROUS (+MASTER) を環境変数で制御
- **MCP annotations 対応** — `destructiveHint` / `readOnlyHint` 等をクライアントに通知
- **データ駆動型設計** — ToolDef 配列 + 汎用ハンドラで DRY に実装
- **レートリミット制御** — 残数 10 以下で自動警告

## セットアップ

```bash
npm install
npm run build
```

## MCP サーバー登録

`.mcp.json` または `~/.claude.json` に追加:

```json
{
  "mcpServers": {
    "relation": {
      "command": "node",
      "args": ["<path-to>/dist/index.js"],
      "env": {
        "RELATION_API_TOKEN": "<your-api-token>",
        "RELATION_SUBDOMAIN": "<your-subdomain>"
      }
    }
  }
}
```

## 環境変数

| 変数 | 必須 | 説明 |
|---|---|---|
| `RELATION_API_TOKEN` | Yes | Re:lation API v2 トークン |
| `RELATION_SUBDOMAIN` | Yes | テナントサブドメイン |
| `RELATION_ENABLE_DANGEROUS` | No | `true` でメール送信・コンタクト削除を有効化 |
| `RELATION_ENABLE_MASTER` | No | `true` でラベル・分類の作成・更新を有効化 |

## 安全性レベル

| レベル | ツール数 | 環境変数 | 内容 |
|---|---|---|---|
| **READ** | 19 | 不要（常時有効） | 検索・取得・一覧 |
| **WRITE** | 8 | 不要（常時有効） | 下書き作成、コメント追加、顧客登録・更新、応対メモ |
| **DANGEROUS** | 4 | `RELATION_ENABLE_DANGEROUS=true` | メール送信・返信、コンタクト削除 |
| **MASTER** | 4 | `RELATION_ENABLE_MASTER=true` | ラベル・チケット分類の作成・更新 |

環境変数ゲートは **サーバー側で制御** されるため、どの MCP クライアントから接続しても有効です。

## MCP Annotations

各ツールに MCP 標準の annotations を付与しています:

```
READ      → readOnlyHint: true,  destructiveHint: false
WRITE     → readOnlyHint: false, destructiveHint: false, openWorldHint: true
DANGEROUS → readOnlyHint: false, destructiveHint: true,  openWorldHint: true
MASTER    → readOnlyHint: false, destructiveHint: true,  openWorldHint: false
```

対応クライアントは `destructiveHint: true` のツール実行前にユーザー確認を要求できます。

## ツール一覧

### READ (19)
- `relation_message_box_list` — 受信箱一覧
- `relation_user_list` — ユーザー一覧
- `relation_customer_search` — コンタクト検索
- `relation_customer_get_by_email` — コンタクト取得（メールアドレス）
- `relation_customer_get_by_system_id` — コンタクト取得（外部ID）
- `relation_customer_group_list` — アドレス帳一覧
- `relation_ticket_search` — チケット検索
- `relation_ticket_get` — チケット詳細取得
- `relation_label_list` — ラベル一覧
- `relation_case_category_list` — チケット分類一覧
- `relation_badge_list` — バッジ一覧
- `relation_pending_reason_list` — 保留理由一覧
- `relation_mail_account_list` — 送信メールアカウント一覧
- `relation_template_list` — テンプレート一覧
- `relation_template_search` — テンプレート検索
- `relation_attachment_url` — 添付ファイルURL発行
- `relation_chat_rmesse` — R-Messe（楽天）会話履歴
- `relation_chat_yahoo` — Yahoo!会話履歴
- `relation_chat_line` — LINE 会話履歴
- `relation_chat_chatplus` — ChatPlus 会話履歴

### WRITE (8)
- `relation_mail_draft` — メール下書き作成
- `relation_comment_create` — コメント追加
- `relation_record_create` — 応対メモ作成
- `relation_ticket_update` — チケット更新
- `relation_customer_create` — コンタクト登録
- `relation_customer_update_by_email` — コンタクト更新（メールアドレス）
- `relation_customer_update_by_system_id` — コンタクト更新（外部ID）

### DANGEROUS (4)
- `relation_mail_send` — メール送信
- `relation_mail_reply` — メール返信
- `relation_customer_delete_by_email` — コンタクト削除（メールアドレス）
- `relation_customer_delete_by_system_id` — コンタクト削除（外部ID）

### MASTER (4)
- `relation_label_create` — ラベル作成
- `relation_label_update` — ラベル更新
- `relation_case_category_create` — チケット分類作成
- `relation_case_category_update` — チケット分類更新

## 技術スタック

- TypeScript (ES2022, Node16 modules)
- @modelcontextprotocol/sdk ^1.12.0
- Node.js v22+

## 免責事項

本ソフトウェアは **非公式** の MCP サーバー実装であり、株式会社インゲージおよび Re:lation とは一切関係ありません。

- Re:lation API の利用にあたっては、[Re:lation API v2 公式ドキュメント](https://developer.ingage.jp/) および各自のサービス利用規約を遵守してください
- 本ソフトウェアの使用により生じたいかなる損害についても、作者は一切の責任を負いません
- メール送信・コンタクト削除等の破壊的操作は **取り消しできません**。`RELATION_ENABLE_DANGEROUS` の有効化は自己責任で行ってください
- API トークンの管理は利用者の責任です。リポジトリへのコミットや公開場所への配置は避けてください

**USE AT YOUR OWN RISK.**

## ライセンス

[Apache License 2.0](LICENSE)
