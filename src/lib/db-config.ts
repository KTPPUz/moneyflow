import type { PoolConfig } from "mariadb";
// One DATABASE_URL serves Prisma Migrate and the runtime driver, which name TLS options differently.
export function databaseConfig(url: string): PoolConfig {
  const parsed = new URL(url);
  if (parsed.protocol !== "mysql:")
    throw new Error("DATABASE_URL must start with mysql://");
  const tls = ["strict", "accept_invalid_certs"].includes(
    parsed.searchParams.get("sslaccept") ?? "",
  );
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    ssl: tls
      ? {
          rejectUnauthorized:
            parsed.searchParams.get("sslaccept") === "strict",
        }
      : false,
    // Without TLS, MySQL 8 caching_sha2_password needs the server key (local development).
    allowPublicKeyRetrieval: !tls,
    // Each serverless instance holds its own pool, so keep it small.
    connectionLimit: 3,
    minimumIdle: 0,
    idleTimeout: 30,
    // The driver default of 1s is shorter than a TLS handshake to a cloud database.
    connectTimeout: 10000,
  };
}
