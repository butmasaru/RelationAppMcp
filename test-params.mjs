import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const token = process.argv[2];
const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: {
    ...process.env,
    RELATION_API_TOKEN: token,
    RELATION_SUBDOMAIN: "world-ne",
  },
});

const client = new Client({ name: "test-client", version: "1.0.0" });

async function test(name, toolName, args) {
  console.log(`\n=== ${name} ===`);
  try {
    const result = await client.callTool({ name: toolName, arguments: args });
    const text = result.content[0].text;
    const isError = result.isError || text.startsWith("Error:");
    console.log(isError ? `FAIL: ${text}` : `OK: ${text.slice(0, 400)}`);
    return !isError;
  } catch (e) {
    console.log(`FAIL: ${e.message}`);
    return false;
  }
}

try {
  await client.connect(transport);
  let pass = 0, fail = 0;

  const results = [
    await test("受信箱一覧", "relation_message_box_list", {}),
    await test("アドレス帳一覧", "relation_customer_group_list", {}),
    await test("ユーザー一覧", "relation_user_list", {}),
    await test("ラベル一覧(mb=1)", "relation_label_list", { message_box_id: 1 }),
    await test("保留理由一覧(mb=1)", "relation_pending_reason_list", { message_box_id: 1 }),
    await test("コンタクト検索(cg=1)", "relation_customer_search", { customer_group_id: 1, per_page: 2 }),
    await test("チケット検索(mb=1)", "relation_ticket_search", { message_box_id: 1, per_page: 2 }),
    await test("バッジ一覧(cg=1)", "relation_badge_list", { customer_group_id: 1 }),
    await test("送信メール設定(mb=1)", "relation_mail_account_list", { message_box_id: 1 }),
    await test("チケット分類(mb=1)", "relation_case_category_list", { message_box_id: 1 }),
    await test("テンプレート一覧(mb=1)", "relation_template_list", { message_box_id: 1 }),
  ];

  pass = results.filter(Boolean).length;
  fail = results.length - pass;

  console.log(`\n=============================`);
  console.log(`Results: ${pass} passed, ${fail} failed out of ${results.length}`);
} catch (error) {
  console.error("Fatal:", error);
} finally {
  await client.close();
}
