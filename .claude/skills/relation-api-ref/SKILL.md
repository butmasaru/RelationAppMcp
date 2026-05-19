---
name: relation-api-ref
description: Re:lation API v2 の全エンドポイント仕様を参照する。実装時にAPIパス・パラメータ・レスポンス・安全性レベルを即座に確認できる。
---

# Re:lation API v2 リファレンス

Re:lation API の実装時にこのスキルを参照して、正確なエンドポイント情報に基づいたコードを書く。

## 使い方

- 引数なし: 全エンドポイントの一覧を表示
- 引数あり: 指定リソースの詳細を表示（例: `/relation-api-ref customer`）

## 実行手順

1. `C:\repos\RelationAppMCP\HANDOFF.html` のセクション3「全エンドポイント一覧」を読む
2. 引数がある場合は該当リソースのセクションのみ抽出して表示
3. 引数がない場合は全リソースのサマリーテーブルを出力

## API基本情報

- **ベースURL**: `https://<subdomain>.relationapp.jp/api/v2/`
- **認証**: `Authorization: Bearer <ACCESS_TOKEN>`
- **レートリミット**: 60 req/min（HTTP 403で超過通知）
- **環境変数**: `RELATION_API_TOKEN`, `RELATION_SUBDOMAIN`

## リソース一覧

| # | リソース | キー名 | エンドポイント接頭辞 | 操作数 |
|---|---------|--------|---------------------|-------|
| 1 | コンタクト | customer | `/customer_groups/:cg_id/customers/` | 8 (検索,登録,更新x2,取得x2,削除x2) |
| 2 | アドレス帳 | customer_group | `/customer_groups` | 1 (一覧) |
| 3 | チケット | ticket | `/:mb_id/tickets/` | 4 (検索,取得,メモ作成,更新) |
| 4 | チャット | chat | `/:mb_id/tickets/:t_id/messages/:m_id/<provider>` | 4 (ChatPlus,Yahoo,R-Messe,LINE) |
| 5 | 受信箱 | message_box | `/message_boxes` | 1 (一覧) |
| 6 | 保留理由 | pending_reason | `/:mb_id/pending_reasons` | 1 (一覧) |
| 7 | ユーザー | user | `/:mb_id/users` | 1 (一覧) |
| 8 | チケット分類 | case_category | `/:mb_id/case_categories` | 3 (一覧,登録,更新) |
| 9 | ラベル | label | `/:mb_id/labels` | 3 (一覧,登録,更新) |
| 10 | バッジ | badge | `/customer_groups/:cg_id/badges` | 1 (一覧) |
| 11 | 送信メール設定 | mail_account | `/:mb_id/mail_accounts` | 1 (一覧) |
| 12 | メール | mail | `/:mb_id/mails` | 3 (送信,返信,下書き) |
| 13 | テンプレート | template | `/:mb_id/templates` | 2 (一覧,検索) |
| 14 | コメント | comment | `/:mb_id/comments` | 1 (作成) |
| 15 | 添付ファイル | attachment | `/:mb_id/messages/attachments/:a_id` | 1 (DL URL発行) |

## 安全性レベル（3段階）

| レベル | 対象 | MCP公開方針 |
|--------|------|------------|
| **READ** | 検索・一覧取得・チャット取得・添付DL | 常時公開、制限なし |
| **WRITE（確認付き）** | コンタクトCRUD・チケット更新・メモ・下書き・コメント | 公開するがツール説明で確認を促す |
| **WRITE（要フラグ）** | コンタクト削除・メール送信・メール返信 | デフォルト非公開、設定で有効化 |
| **MASTER** | チケット分類・ラベルの登録/更新 | オプション、デフォルト非公開 |

## 詳細が必要な場合

HANDOFF.html の該当セクションを直接読み、パラメータ・レスポンス・制約事項を確認すること。
