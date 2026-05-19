---
description: Re:lation に対して自由に指示を出す。チケット検索、顧客検索、メール下書き、問い合わせ分析など。relation_* ツールのみを使用。
---

$ARGUMENTS の指示を実行してください。

## ルール

- 使用するツールは **relation_* のみ** に限定してください
- 他の MCP サーバーのツール（mssql, freee, github 等）は使わないでください
- 受信箱IDが不明な場合は `relation_message_box_list` で確認してください
- 担当者名が出てきたら `relation_user_list` で mention_name を確認してください

## よくある指示の解釈

- 「未対応」「未処理」→ status_cds: ["open"]
- 「対応済み」「完了」→ status_cds: ["closed"]
- 「楽天」「R-Messe」→ method_cds: ["r_messe"]
- 「Yahoo」→ method_cds: ["yahoo"]
- 「メール」→ method_cds: ["mail"]
- 「LINE」→ method_cds: ["line"]
- 「今日」→ within: "1days"
- 「今週」→ within: "7days"
- 「今月」→ within: "1months"

## 出力

結果はテーブル形式で見やすく整理してください。
件数が多い場合は上位20件を表示し、残件数を案内してください。
