import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { createPool } from "mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseConfig } from "./db-config";
function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({
    adapter: new PrismaMariaDb(createPool(databaseConfig(url))),
  });
}
const cache = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = cache.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") cache.prisma = prisma;
