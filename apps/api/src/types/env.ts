export type Env = {
  // Cloudflare bindings
  DB: D1Database;
  SESSIONS: KVNamespace;

  // Secrets (set via wrangler secret)
  ANTHROPIC_API_KEY: string;
  JWT_SECRET: string;

  // Vars
  ENVIRONMENT: "development" | "production";
};
