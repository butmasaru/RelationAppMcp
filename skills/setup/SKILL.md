---
description: Re:lation MCP Server の初期セットアップ。APIトークンとサブドメインを対話的に設定します。
---

# Re:lation MCP セットアップ

ユーザーの Re:lation API 接続を設定します。以下の手順で進めてください。

## 手順

1. ユーザーにテキストで以下の2つを質問してください（AskUserQuestion は使わないでください）：

> Re:lation の接続設定を行います。以下の2つを教えてください：
>
> **1. APIトークン** — Re:lation 管理画面 > API設定 から取得できます
> **2. サブドメイン** — ログインURLが `https://xxx.relation-app.jp` の場合、`xxx` の部分です

2. 入力を受け取ったら、`~/.claude.json` を読み取り、トップレベルの `mcpServers` セクションに以下の設定を追加してください：

```json
"relation": {
  "command": "node",
  "args": ["<このプラグインの dist/index.js へのパス>"],
  "env": {
    "RELATION_API_TOKEN": "<入力されたトークン>",
    "RELATION_SUBDOMAIN": "<入力されたサブドメイン>"
  }
}
```

`dist/index.js` のパスは、このスキルの Base directory から `../../dist/index.js` を解決してください。
Base directory はスキル実行時に表示される `Base directory for this skill:` の値です。
パスの例: `C:\Users\<user>\.claude\plugins\cache\relation-tools\relation\1.0.0\dist\index.js`

3. 設定を書き込んだら、以下のメッセージを表示してください：

> 設定完了です。`/mcp` を実行して MCP サーバーを起動してください。
> 起動後、接続テストを行います。

4. ユーザーが `/mcp` を実行したら、`relation_message_box_list` ツールで接続テストを行い、結果を表示してください。

## 注意事項
- 既に `relation` の設定がある場合は上書き確認をしてください
- トークンは `~/.claude.json`（ユーザースコープ）にのみ保存し、プロジェクトの `.mcp.json` には書かないでください
- 安全性オプションについて案内してください：
  - `RELATION_ENABLE_DANGEROUS=true` → メール送信・コンタクト削除を有効化
  - `RELATION_ENABLE_MASTER=true` → ラベル・分類の作成・更新を有効化
  - いずれもデフォルト無効、必要時に env に追加可能
