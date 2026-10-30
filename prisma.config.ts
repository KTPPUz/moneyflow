import "dotenv/config";
import { defineConfig } from "prisma/config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // `prisma generate` runs on install, before any database env is available.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
