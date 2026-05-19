---
name: project-overview
description: RelationAppMCP - Re:lation API v2の全エンドポイントを網羅するMCPサーバー（TypeScript）
metadata:
  type: project
  updated: 2026-05-19
---

# RelationAppMCP

Re:lation API v2の全エンドポイントを網羅するMCPサーバー。TypeScript + @modelcontextprotocol/sdk。

## 技術スタック
- TypeScript (ES2022, Node16 modules)
- @modelcontextprotocol/sdk ^1.12.0
- Node.js v22.17.0

## 構造
- `src/index.ts` - MCPサーバー本体（ツール登録・ディスパッチ）
- `src/client.ts` - Re:lation APIクライアント（認証・レートリミット制御）
- `src/tools.ts` - 35ツール定義（データ駆動型、汎用ハンドラ）

## 安全性レベル（環境変数で制御）
- READ (19ツール): 常時公開
- WRITE (8ツール): 公開、descriptionに確認促し
- DANGEROUS (4ツール): `RELATION_ENABLE_DANGEROUS=true` で有効化
- MASTER (4ツール): `RELATION_ENABLE_MASTER=true` で有効化

## 環境変数
- `RELATION_API_TOKEN` - APIトークン
- `RELATION_SUBDOMAIN` - テナントサブドメイン（world-ne）
- `RELATION_ENABLE_DANGEROUS` - 破壊的ツール有効化
- `RELATION_ENABLE_MASTER` - マスタ管理ツール有効化

## API仕様の注意点
- チケット検索はPOST（GETではない）
- ユーザー一覧は `/users`（message_box_id不要）
- チケット更新はPATCH（PUTではない）
- レートリミット: 60 req/min、403で超過通知

**Why:** Re:lation APIのMCP化により、Claude/Codex/Gemini等のAIツールから統一的にRe:lation操作が可能になる
**How to apply:** API呼び出し時は上記の注意点を遵守する
