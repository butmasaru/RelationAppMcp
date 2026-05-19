---
description: Re:lation MCP Server の初期セットアップ。APIトークンとサブドメインを対話的に設定します。
---

# Re:lation MCP セットアップ

ユーザーの Re:lation API 接続を設定します。以下の手順で進めてください。

## 手順

1. AskUserQuestion ツールを使って、以下の2つを聞いてください：
   - **Re:lation APIトークン**: Re:lation 管理画面 > API設定 から取得できるトークン
   - **サブドメイン**: Re:lation のログインURLが `https://xxx.relation-app.jp` の場合、`xxx` の部分

2. 入力を受け取ったら、ユーザーのホームディレクトリにある `~/.claude.json` を読み取り、`mcpServers` セクションに以下の設定を追加してください：

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

パスは実際のプラグインのインストール先を `Glob` で確認して解決してください。
`dist/index.js` が存在しない場合は、プラグインディレクトリで `npm install && npm run build` を実行してください。

3. 設定を書き込んだら、ユーザーに `/mcp` で MCP サーバーを再起動するよう案内してください。

4. 再起動後、`relation_message_box_list` ツールを呼び出して接続テストを行い、結果を表示してください。

## 注意事項
- 既に `relation` の設定がある場合は上書き確認をしてください
- トークンは `~/.claude.json`（ユーザースコープ）にのみ保存し、プロジェクトの `.mcp.json` には書かないでください
- RELATION_ENABLE_DANGEROUS や RELATION_ENABLE_MASTER はデフォルトで無効です。必要に応じて後から追加できることを説明してください
