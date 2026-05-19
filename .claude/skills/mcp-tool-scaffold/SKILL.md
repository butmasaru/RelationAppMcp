---
name: mcp-tool-scaffold
description: Re:lation MCP Server 用の新しい tool を雛形から生成する。エンドポイント名を引数に取り、tool定義・handler・テストを一括作成。
disable-model-invocation: true
---

# MCP Tool Scaffold

Re:lation MCP Server の新しいツールを定型テンプレートから生成するスキル。

## 使い方

```
/mcp-tool-scaffold <resource_name> [operation]
```

例:
- `/mcp-tool-scaffold customer search` → コンタクト検索ツールを生成
- `/mcp-tool-scaffold ticket` → チケット関連の全ツールを生成
- `/mcp-tool-scaffold mail send` → メール送信ツールを生成

## 実行手順

### 1. エンドポイント情報の取得

`/relation-api-ref` スキル（または HANDOFF.html セクション3）から対象エンドポイントの詳細を取得:
- HTTPメソッド、パス、パラメータ、安全性レベル（READ/WRITE/MASTER）

### 2. ファイル生成

以下の3ファイルを生成する。既存のツール実装があれば、そのコードスタイルに合わせる。

#### A. Tool定義 (`src/tools/<resource>/<operation>.ts`)

```typescript
import { z } from "zod";

// Zod schema for input validation
export const <ToolName>InputSchema = z.object({
  // パラメータをHANDOFF.htmlの仕様に基づいて定義
});

export const <toolName>Tool = {
  name: "relation_<resource>_<operation>",
  description: `<日本語の説明>。<安全性注記>`,
  inputSchema: <ToolName>InputSchema,
};
```

#### B. Handler (`src/handlers/<resource>/<operation>.ts`)

```typescript
import { RelationApiClient } from "../../client.js";
import { <ToolName>InputSchema } from "../../tools/<resource>/<operation>.js";

export async function handle<ToolName>(
  client: RelationApiClient,
  input: z.infer<typeof <ToolName>InputSchema>
) {
  // API呼び出し
  // レートリミットヘッダの監視
  // エラーハンドリング
}
```

#### C. テスト (`tests/<resource>/<operation>.test.ts`)

```typescript
import { describe, it, expect } from "vitest";

describe("relation_<resource>_<operation>", () => {
  it("should validate input schema", () => { /* ... */ });
  it("should handle successful response", () => { /* ... */ });
  it("should handle error response", () => { /* ... */ });
});
```

### 3. 安全性レベルに応じた追加処理

- **READ**: そのまま公開
- **WRITE（確認付き）**: description に「実行前にユーザーに確認してください」を含める
- **WRITE（要フラグ）**: ツール登録をフラグで制御するコードを生成
- **MASTER**: デフォルト非公開のオプションツールとして登録

### 4. インデックス更新

`src/tools/index.ts` と `src/handlers/index.ts` にエクスポートを追加。

### 5. 確認

生成後に以下を実施:
- TypeScript型チェック (`npx tsc --noEmit`)
- テスト実行 (`npx vitest run tests/<resource>/`)
- 生成されたファイルの一覧を報告

## 命名規則

| 項目 | 規則 | 例 |
|------|------|-----|
| ツール名 | `relation_<resource>_<operation>` | `relation_customer_search` |
| ファイル名 | `<operation>.ts` | `search.ts` |
| ディレクトリ | `src/tools/<resource>/` | `src/tools/customer/` |
| Zodスキーマ | `<ToolName>InputSchema` | `CustomerSearchInputSchema` |
| ハンドラ関数 | `handle<ToolName>` | `handleCustomerSearch` |
