import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const token = process.argv[2];
if (!token) {
  console.error("Usage: node test-run.mjs <API_TOKEN>");
  process.exit(1);
}

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

try {
  await client.connect(transport);
  console.log("=== Connected to MCP server ===\n");

  // 1. List tools
  const { tools } = await client.listTools();
  console.log(`Registered tools: ${tools.length}`);
  for (const t of tools) {
    console.log(`  - ${t.name} : ${t.description.slice(0, 60)}...`);
  }

  // 2. Call relation_message_box_list (simplest READ - no params)
  console.log("\n=== Test: relation_message_box_list ===");
  const mbResult = await client.callTool({
    name: "relation_message_box_list",
    arguments: {},
  });
  console.log(JSON.stringify(mbResult, null, 2));

  // 3. Call relation_customer_group_list
  console.log("\n=== Test: relation_customer_group_list ===");
  const cgResult = await client.callTool({
    name: "relation_customer_group_list",
    arguments: {},
  });
  console.log(JSON.stringify(cgResult, null, 2));

  console.log("\n=== All tests passed ===");
} catch (error) {
  console.error("Test failed:", error);
} finally {
  await client.close();
}
