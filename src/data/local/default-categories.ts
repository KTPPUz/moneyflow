import type { Category, FinanceData } from "@/types/finance";

// Reference categories only: no transactions, balances, accounts or budgets.
const definitions: Array<
  [string, string, Category["kind"], string, string, boolean?, string?]
> = [
  ["salary", "เงินเดือน", "income", "work", "#16b5a5"],
  ["freelance", "งานอิสระ", "income", "work", "#6385f5"],
  ["bonus", "โบนัส", "income", "ticket", "#a294ef"],
  ["interest", "ดอกเบี้ย / ผลตอบแทน", "income", "wallet", "#8db7e2"],
  ["other-income", "รายรับอื่น ๆ", "income", "wallet", "#16b5a5"],
  ["food", "อาหารและเครื่องดื่ม", "expense", "utensils", "#16b5a5", true],
  ["home", "ที่อยู่อาศัย", "expense", "home", "#6385f5"],
  ["travel", "เดินทาง", "expense", "train", "#ffae72"],
  ["shopping", "ช้อปปิ้ง", "expense", "shopping", "#a294ef"],
  ["health", "สุขภาพ", "expense", "heart", "#df92df"],
  ["fun", "บันเทิง", "expense", "ticket", "#ed9dcc"],
  ["education", "การศึกษา", "expense", "book", "#8db7e2"],
  ["utilities", "ค่าน้ำ / ค่าไฟ", "expense", "home", "#ffae72"],
  ["communication", "โทรศัพท์ / อินเทอร์เน็ต", "expense", "wallet", "#6385f5"],
  ["insurance", "ประกัน", "expense", "heart", "#16b5a5"],
  ["family", "ครอบครัว / ของขวัญ", "expense", "heart", "#ed9dcc"],
  ["other", "อื่น ๆ", "expense", "tag", "#b6c2d5"],
  ["meals", "มื้ออาหาร", "expense", "utensils", "#16b5a5", true, "food"],
  [
    "coffee",
    "กาแฟ / เครื่องดื่ม",
    "expense",
    "coffee",
    "#16b5a5",
    true,
    "food",
  ],
  ["delivery", "เดลิเวอรี", "expense", "shopping", "#16b5a5", true, "food"],
  [
    "groceries",
    "ของสด / ของใช้ครัว",
    "expense",
    "shopping",
    "#16b5a5",
    true,
    "food",
  ],
];

export function ensureDefaultCategories(data: FinanceData): FinanceData {
  const categories = [...data.categories];
  const mapping = new Map<string, string>();
  const normalize = (value: string) =>
    value.trim().normalize("NFC").toLocaleLowerCase("th");
  for (const [
    id,
    name,
    kind,
    icon,
    color,
    isFood = false,
    parent,
  ] of definitions) {
    const parentId = parent ? mapping.get(parent) : undefined;
    if (parent && !parentId) continue;
    const scope = (c: Category) => c.kind === kind && c.parentId === parentId;
    const existing =
      categories.find(
        (c) => scope(c) && (c.id === id || c.id === `standard-${id}`),
      ) ??
      categories.find((c) => scope(c) && normalize(c.name) === normalize(name));
    if (existing) {
      mapping.set(id, existing.id);
      continue;
    }
    let nextId = id;
    if (categories.some((c) => c.id === nextId)) nextId = `standard-${id}`;
    while (categories.some((c) => c.id === nextId))
      nextId = `standard-${nextId}`;
    const siblings = categories.filter(scope);
    const parentCategory = categories.find((c) => c.id === parentId);
    categories.push({
      id: nextId,
      name,
      kind,
      icon,
      color: parentCategory?.color ?? color,
      isFood: parentCategory?.isFood ?? isFood,
      parentId,
      order: siblings.length
        ? Math.max(...siblings.map((c) => c.order)) + 1
        : 0,
    });
    mapping.set(id, nextId);
  }
  return categories.length === data.categories.length
    ? data
    : { ...data, categories };
}
