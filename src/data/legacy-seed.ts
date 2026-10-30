// Legacy fixture used only to identify old generated records during migration and in tests. Never used to initialize active data.
import type { Category, FinanceData, Transaction } from "@/types/finance";
import { localDate, monthsEnding } from "@/lib/dates";
import { categoryColors } from "@/lib/category-colors";
const definitions: [string, string, string, number][] = [
  ["food", "อาหารและเครื่องดื่ม", "utensils", 812000],
  ["home", "ที่อยู่อาศัย", "home", 650000],
  ["travel", "เดินทาง", "train", 487000],
  ["shopping", "ช้อปปิ้ง", "shopping", 325000],
  ["health", "สุขภาพ", "heart", 260000],
  ["fun", "บันเทิง", "ticket", 227000],
  ["education", "การศึกษา", "book", 100000],
  ["other", "อื่น ๆ", "wallet", 384000],
];
export function createSeed(today = localDate()): FinanceData {
  const categories: Category[] = definitions.map(([id, name, icon], index) => ({
    id,
    name,
    icon,
    color: categoryColors[index],
    kind: "expense",
    isFood: id === "food",
    order: index,
  }));
  [
    ["meals", "มื้ออาหาร", "utensils"],
    ["coffee", "กาแฟ / เครื่องดื่ม", "coffee"],
    ["delivery", "เดลิเวอรี", "shopping"],
    ["groceries", "ของสด / ของใช้ครัว", "shopping"],
  ].forEach(([id, name, icon], i) =>
    categories.push({
      id,
      name,
      icon,
      kind: "expense",
      isFood: true,
      color: categoryColors[0],
      parentId: "food",
      order: i,
    }),
  );
  [
    ["salary", "เงินเดือน"],
    ["freelance", "งานอิสระ"],
    ["other-income", "รายรับอื่น ๆ"],
  ].forEach(([id, name], i) =>
    categories.push({
      id,
      name,
      kind: "income",
      isFood: false,
      icon: "wallet",
      color: "#16b5a5",
      order: i,
    }),
  );
  const transactions: Transaction[] = [];
  const budgets: FinanceData["budgets"] = [];
  monthsEnding(today.slice(0, 7), 13).forEach((month, i) => {
    const maxDay =
      month === today.slice(0, 7)
        ? Number(today.slice(8))
        : new Date(
            Number(month.slice(0, 4)),
            Number(month.slice(5, 7)),
            0,
          ).getDate();
    const day = (n: number) =>
      `${month}-${String(Math.min(n, maxDay)).padStart(2, "0")}`;
    const add = (
      id: string,
      categoryId: string,
      amountSatang: number,
      n: number,
      description: string,
      accountId = "cash",
      kind: "expense" | "income" = "expense",
    ) =>
      transactions.push({
        id: `${month}-${id}`,
        categoryId,
        amountSatang,
        date: day(n),
        description,
        accountId,
        kind,
      });
    add(
      "salary",
      "salary",
      [4500000, 4700000, 4800000, 5000000][i % 4],
      1,
      "เงินเดือน",
      "bank",
      "income",
    );
    if (i === 12) transactions[transactions.length - 1].amountSatang = 5000000;
    const factor = [
      115, 108, 112, 105, 103, 110, 106, 102, 105, 108, 104, 107, 100,
    ][i];
    const meals = Math.round((520000 * factor) / 100),
      coffee = Math.round((132000 * factor) / 100),
      delivery = Math.round((90000 * factor) / 100),
      groceries = Math.round((70000 * factor) / 100);
    for (let n = 1; n <= 8; n++) {
      const last = n === 8;
      add(
        `meal-${n}`,
        "meals",
        last ? meals - Math.floor(meals / 8) * 7 : Math.floor(meals / 8),
        n * 4 - 2,
        n === 8 ? "ข้าวกลางวัน" : "มื้ออาหารประจำวัน",
      );
    }
    for (let n = 1; n <= 4; n++)
      add(
        `coffee-${n}`,
        "coffee",
        n === 4 ? coffee - Math.floor(coffee / 4) * 3 : Math.floor(coffee / 4),
        n * 7,
        n === 4 ? "กาแฟยามเช้า" : "กาแฟ / เครื่องดื่ม",
      );
    add("delivery", "delivery", delivery, 20, "อาหารเดลิเวอรี", "ewallet");
    add("groceries", "groceries", groceries, 26, "ซื้อของสดเข้าครัว");
    definitions
      .filter(([id]) => id !== "food")
      .forEach(([id, name, , base], n) =>
        add(
          id,
          id,
          id === "home" ? base : Math.round((base * factor) / 100),
          n === 1 ? 29 : 5 + n * 3,
          id === "travel" ? "ค่าเดินทาง BTS" : name,
          id === "travel" ? "ewallet" : "bank",
        ),
      );
    definitions.forEach(([id, , , base]) =>
      budgets.push({
        id: `${month}-${id}`,
        month,
        categoryId: id,
        amountSatang: Math.ceil((base * 120) / 10000000) * 100000,
      }),
    );
    budgets.push({
      id: `${month}-overall`,
      month,
      categoryId: null,
      amountSatang: 4000000,
    });
  });
  return {
    version: 2,
    categories,
    transactions,
    budgets,
    transfers: [],
    accounts: [
      {
        id: "cash",
        name: "เงินสด",
        type: "cash",
        openingBalanceSatang: 15000000,
      },
      {
        id: "bank",
        name: "บัญชีธนาคาร",
        type: "bank",
        openingBalanceSatang: 5000000,
      },
      {
        id: "ewallet",
        name: "e-Wallet",
        type: "ewallet",
        openingBalanceSatang: 10000000,
      },
      {
        id: "credit",
        name: "บัตรเครดิต",
        type: "credit",
        openingBalanceSatang: 0,
      },
    ],
  };
}
