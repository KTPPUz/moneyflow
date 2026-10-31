import "dotenv/config";
import { defineConfig } from "prisma/config";
import { prismaDatabaseUrl } from "./src/lib/db-config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // `prisma generate` runs on install, before any database env is available.
  datasource: { url: prismaDatabaseUrl(process.env.DATABASE_URL ?? "") },
});
