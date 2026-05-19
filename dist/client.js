const DEFAULT_RATE_LIMIT = 60;
export class RelationApiClient {
    baseUrl;
    token;
    rateLimitRemaining = DEFAULT_RATE_LIMIT;
    rateLimitReset = 0;
    constructor(token, subdomain) {
        this.token = token;
        this.baseUrl = `https://${subdomain}.relationapp.jp/api/v2`;
    }
    async request(method, path, options) {
        if (this.rateLimitRemaining <= 1) {
            const now = Date.now() / 1000;
            if (this.rateLimitReset > now) {
                const waitMs = (this.rateLimitReset - now) * 1000 + 500;
                await new Promise((r) => setTimeout(r, Math.min(waitMs, 61000)));
            }
        }
        let url = `${this.baseUrl}${path}`;
        if (options?.query) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(options.query)) {
                if (value == null)
                    continue;
                if (Array.isArray(value)) {
                    for (const v of value)
                        params.append(`${key}[]`, String(v));
                }
                else {
                    params.append(key, String(value));
                }
            }
            const qs = params.toString();
            if (qs)
                url += `?${qs}`;
        }
        const headers = {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/json",
        };
        const init = { method, headers };
        if (options?.body != null &&
            (method === "POST" || method === "PUT" || method === "PATCH")) {
            headers["Content-Type"] = "application/json";
            init.body = JSON.stringify(options.body);
        }
        const res = await fetch(url, init);
        const rlRemaining = res.headers.get("X-RateLimit-Remaining");
        const rlReset = res.headers.get("X-RateLimit-Reset");
        if (rlRemaining != null)
            this.rateLimitRemaining = parseInt(rlRemaining, 10);
        if (rlReset != null)
            this.rateLimitReset = parseInt(rlReset, 10);
        if (res.status === 403 && rlReset) {
            const waitMs = (parseInt(rlReset, 10) - Date.now() / 1000) * 1000 + 500;
            if (waitMs > 0 && waitMs < 61000) {
                await new Promise((r) => setTimeout(r, waitMs));
                return this.request(method, path, options);
            }
        }
        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`Re:lation API ${res.status}: ${body}`);
        }
        if (res.status === 204)
            return { success: true };
        return res.json();
    }
    get rateLimit() {
        return {
            limit: DEFAULT_RATE_LIMIT,
            remaining: this.rateLimitRemaining,
            resetAt: this.rateLimitReset
                ? new Date(this.rateLimitReset * 1000).toISOString()
                : null,
        };
    }
}
//# sourceMappingURL=client.js.map