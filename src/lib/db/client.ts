import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";

function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    prepare: false,
  });

  return {
    client,
    db: drizzle(client, { schema }),
  };
}

type DatabaseBundle = ReturnType<typeof createDatabase>;
export type AppDatabase = DatabaseBundle["db"];

const globalForDatabase = globalThis as typeof globalThis & {
  __nvltrnsltDatabase?: DatabaseBundle;
};

export function getDatabase() {
  if (!globalForDatabase.__nvltrnsltDatabase) {
    globalForDatabase.__nvltrnsltDatabase = createDatabase(serverEnv.DATABASE_URL);
  }

  return globalForDatabase.__nvltrnsltDatabase;
}

export function getDb() {
  return getDatabase().db;
}
