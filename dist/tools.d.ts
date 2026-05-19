export type Safety = "read" | "write" | "dangerous" | "master";
export interface ToolAnnotations {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
}
export interface ToolDef {
    name: string;
    description: string;
    safety: Safety;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    inputSchema: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
    };
}
export declare function annotationsFor(t: ToolDef): ToolAnnotations;
export declare const allTools: ToolDef[];
