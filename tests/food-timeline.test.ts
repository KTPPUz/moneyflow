import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FoodChart } from "../src/components/dashboard/charts";
import { dailyFoodTimeline, summarize } from "../src/lib/finance";
import { percentage, sumSatang } from "../src/lib/money";
import { createSeed } from "../src/data/legacy-seed";

test("daily food points include empty days, reconcile to monthly totals and retain the monthly income base", () => {
  const data = createSeed("2026-10-30");
  const points = dailyFoodTimeline(data, "2026-09", "2026-10");
  assert.equal(points.length, 61);
  assert.equal(points[0].key, "2026-09-01");
  assert.equal(points.at(-1)?.key, "2026-10-31");
  for (const month of ["2026-09", "2026-10"]) {
    const days = points.filter((p) => p.key.startsWith(month));
    const summary = summarize(data, month);
    assert.equal(sumSatang(days.map((p) => p.food)), summary.food);
    assert.ok(days.every((p) => p.income === summary.income));
  }
  const markup = renderToStaticMarkup(
    createElement(FoodChart, { data: points, period: "daily", mode: "share" }),
  );
  assert.match(markup, /<th>วันที่<\/th>/);
  assert.match(markup, /ต่อรายรับเดือนนั้น/);
  assert.equal((markup.match(/<tr>/g) ?? []).length, 62);
});

test("daily food handles leap days, refunds, missing income and invalid ranges", () => {
  const data = createSeed("2024-02-29");
  data.transactions = [
    {
      id: "food",
      kind: "expense",
      categoryId: "food",
      accountId: "cash",
      amountSatang: 10000,
      date: "2024-02-29",
      description: "food",
    },
    {
      id: "refund",
      kind: "refund",
      categoryId: "food",
      accountId: "cash",
      amountSatang: 2000,
      date: "2024-02-29",
      description: "refund",
    },
  ];
  const points = dailyFoodTimeline(data, "2024-02", "2024-02");
  assert.equal(points.length, 29);
  assert.equal(points[0].food, 0);
  assert.equal(points.at(-1)?.food, 8000);
  assert.equal(percentage(points[28].food, points[28].income), null);
  for (const [from, to] of [
    ["", "2024-02"],
    ["2024-13", "2024-13"],
    ["2024-03", "2024-02"],
    ["2020-01", "2024-02"],
  ]) {
    assert.deepEqual(dailyFoodTimeline(data, from, to), []);
  }
});
