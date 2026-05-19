#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { RelationApiClient } from "./client.js";
import { allTools, annotationsFor } from "./tools.js";
const token = process.env.RELATION_API_TOKEN;
const subdomain = process.env.RELATION_SUBDOMAIN;
if (!token || !subdomain) {
    process.stderr.write("Error: RELATION_API_TOKEN and RELATION_SUBDOMAIN environment variables are required.\n");
    process.exit(1);
}
const enableDangerous = process.env.RELATION_ENABLE_DANGEROUS === "true";
const enableMaster = process.env.RELATION_ENABLE_MASTER === "true";
function getEnabledTools() {
    return allTools.filter((t) => {
        if (t.safety === "dangerous" && !enableDangerous)
            return false;
        if (t.safety === "master" && !enableMaster)
            return false;
        return true;
    });
}
function buildPathAndParams(tool, args) {
    const remaining = { ...args };
    const path = tool.path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => {
        const value = remaining[key];
        delete remaining[key];
        return encodeURIComponent(String(value));
    });
    const hasRemaining = Object.keys(remaining).length > 0;
    if (tool.method === "GET" || tool.method === "DELETE") {
        return { path, query: hasRemaining ? remaining : undefined };
    }
    return { path, body: hasRemaining ? remaining : undefined };
}
const client = new RelationApiClient(token, subdomain);
const server = new Server({ name: "relation-mcp-server", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getEnabledTools().map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: annotationsFor(t),
    })),
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = getEnabledTools().find((t) => t.name === name);
    if (!tool) {
        return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
        };
    }
    try {
        const { path, query, body } = buildPathAndParams(tool, (args ?? {}));
        const result = await client.request(tool.method, path, { query, body });
        const rl = client.rateLimit;
        const rateLimitNote = rl.remaining <= 10
            ? `\n\n[Rate Limit] remaining: ${rl.remaining}/60`
            : "";
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2) + rateLimitNote,
                },
            ],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true,
        };
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map