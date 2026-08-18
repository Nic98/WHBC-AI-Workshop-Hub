/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  ASSETS: Fetcher;
  DB: D1Database;
  PROJECTS: R2Bucket;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
}

declare module "cloudflare:workers" {
  export const env: CloudflareEnv;
}
