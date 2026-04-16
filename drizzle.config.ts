import { loadEnvConfig } from "@next/env";
import type { Config } from "drizzle-kit";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL ?? "";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  breakpoints: true,
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
    prefix: "timestamp",
  },
  strict: true,
  verbose: true,
} satisfies Config;
