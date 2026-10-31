import assert from "node:assert/strict";
import { test } from "node:test";
import { databaseConfig, prismaDatabaseUrl } from "../src/lib/db-config";
import { decimalToSatang, MAX_AMOUNT, satangToDecimal } from "../src/lib/money";
const decimal = (value: string) => ({ toFixed: () => value });
test("satang converts to DECIMAL(15,2) strings and back without loss", () => {
  for (const [satang, text] of [
    [1, "0.01"],
    [440000, "4400.00"],
    [-50, "-0.50"],
    [MAX_AMOUNT, "9999999999999.99"],
  ] as const) {
    assert.equal(satangToDecimal(satang), text);
    assert.equal(decimalToSatang(decimal(text)), satang);
  }
});
test("database url maps TLS and encoded credentials to the driver", () => {
  const cloud = databaseConfig(
    "mysql://us%40er:p%2Fw@db.example.com:4000/money?sslaccept=strict",
  );
  assert.equal(cloud.user, "us@er");
  assert.equal(cloud.password, "p/w");
  assert.equal(cloud.port, 4000);
  assert.equal(cloud.database, "money");
  assert.deepEqual(cloud.ssl, { rejectUnauthorized: true });
  assert.equal(cloud.allowPublicKeyRetrieval, false);
  assert.ok(cloud.connectTimeout! >= 5000);
  const local = databaseConfig("mysql://root@127.0.0.1:3399/money");
  assert.equal(local.ssl, false);
  assert.equal(local.allowPublicKeyRetrieval, true);
  assert.throws(() => databaseConfig("postgres://x@y/z"));
});
test("TiDB Cloud uses certificate-verified TLS without relying on URL flags", () => {
  for (const suffix of [
    "",
    "?sslaccept=strict",
    "?sslaccept=accept_invalid_certs",
  ]) {
    const config = databaseConfig(
      `mysql://example:placeholder@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/money${suffix}`,
    );
    assert.deepEqual(config.ssl, { rejectUnauthorized: true });
    assert.equal(config.allowPublicKeyRetrieval, false);
    assert.equal(
      new URL(
        prismaDatabaseUrl(
          `mysql://example:placeholder@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/money${suffix}`,
        ),
      ).searchParams.get("sslaccept"),
      "strict",
    );
  }
  const other = databaseConfig(
    "mysql://example:placeholder@tidbcloud.com.example.org:3306/money",
  );
  assert.equal(other.ssl, false);
  assert.equal(prismaDatabaseUrl(""), "");
});
