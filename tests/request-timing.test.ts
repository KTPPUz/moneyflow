import assert from "node:assert/strict";
import test from "node:test";
import { RequestTiming } from "../src/lib/request-timing";
test("timing separates session and finance work and retains failed-stage duration", async () => {
  let now = 0;
  const timing = new RequestTiming(() => now);
  await timing.measure("session", async () => {
    now += 30;
  });
  await timing.measure("finance", async () => {
    now += 120;
  });
  assert.equal(
    timing.header(),
    "session;dur=30.0, finance;dur=120.0, total;dur=150.0",
  );
  const failed = new RequestTiming(() => now);
  await assert.rejects(
    failed.measure("session", async () => {
      now += 10;
      throw new Error("connection failed");
    }),
  );
  assert.equal(failed.header(), "session;dur=10.0, total;dur=10.0");
});
