export declare class RelationApiClient {
    private readonly baseUrl;
    private readonly token;
    private rateLimitRemaining;
    private rateLimitReset;
    constructor(token: string, subdomain: string);
    request(method: string, path: string, options?: {
        query?: Record<string, unknown>;
        body?: unknown;
    }): Promise<unknown>;
    get rateLimit(): {
        limit: number;
        remaining: number;
        resetAt: string | null;
    };
}
