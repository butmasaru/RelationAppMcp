---
description: Re:lation のチケットを検索する。顧客名、件名、チャネル（メール/R-Messe/Yahoo/LINE）、ステータス、期間で絞り込み可能。
---

# Re:lation チケット検索

ユーザーの検索意図を解釈して、`relation_ticket_search` ツールで検索を実行してください。

## 引数の解釈ガイド

- 「未対応」「未処理」→ `status_cds: ["open"]`
- 「対応中」→ `status_cds: ["ongoing"]`
- 「完了」「対応済み」→ `status_cds: ["closed"]`
- 「楽天」「R-Messe」→ `method_cds: ["r_messe"]`
- 「Yahoo」→ `method_cds: ["yahoo"]`
- 「メール」→ `method_cds: ["mail"]`
- 「LINE」→ `method_cds: ["line"]`
- 「電話」→ `method_cds: ["call"]`
- 「今日」→ `within: "1days"`
- 「今週」→ `within: "7days"`
- 「今月」→ `within: "1months"`
- 担当者名が含まれていたら → `relation_user_list` で mention_name を確認して `assignee` に設定

## 検索引数

`$ARGUMENTS` の内容をもとに検索条件を組み立ててください。
受信箱IDが不明な場合は `relation_message_box_list` で確認してください（通常は `message_box_id: 1`）。

## 出力フォーマット

結果は以下の形式で見やすく表示してください：

| チケットID | 件名 | ステータス | 担当者 | 日時 |
|---|---|---|---|---|

件数が多い場合は上位20件を表示し、残件数を案内してください。
