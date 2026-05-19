---
name: handoff-vs-official-api
description: HANDOFF.htmlは参考情報であり公式APIドキュメント(developer.ingage.jp)と複数の差異がある。実装時は必ず公式を参照。
metadata:
  type: feedback
  updated: 2026-05-19
---

# HANDOFF.html vs 公式APIドキュメントの差異

**HANDOFF.html は概要把握用。実装の正式仕様は https://developer.ingage.jp/ を参照する。**

## 確認された差異

| 項目 | HANDOFF | 公式 |
|------|---------|------|
| 応対メモパス | `/:mb_id/tickets/:id/customer_notes` | `/:mb_id/records` |
| 応対メモパラメータ | body, operator | subject(必須), operated_at(必須), duration(必須), body(必須), icon_cd等 |
| チケット検索メソッド | GET | POST |
| チケット更新メソッド | 記載なし（PATCHと誤解） | PUT |
| ユーザー一覧パス | `/:mb_id/users` | `/users` |
| メール to/cc/bcc | 配列と推定 | 文字列 |
| メール本文 | text_body / html_body | body + is_html |
| コンタクト emails | string[] | object[] `[{email}]` |
| コンタクト tels | string[] | object[] `[{tel}]` |
| コンタクト department | department_name | department |
| コンタクト position | position | title |
| 担当者指定 | ユーザーID(数値) | メンション名(文字列) |

**Why:** HANDOFFは事前調査時の概要メモで、細部が不正確な箇所がある
**How to apply:** 新しいエンドポイントの実装や既存の修正時は、必ず公式ドキュメントを WebFetch で確認してからコードを書く
