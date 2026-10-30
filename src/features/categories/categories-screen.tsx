"use client";
import { useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Utensils,
} from "lucide-react";
import { useFinance } from "@/components/providers";
import { PageHeading } from "@/components/shared/page-heading";
import { CategoryIcon, iconOptions } from "@/components/shared/category-icon";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/states";
import { categoryColors } from "@/lib/category-colors";
import { localDate } from "@/lib/dates";
import { categorySchema } from "@/lib/validation";
import type { Category } from "@/types/finance";
export function CategoriesScreen() {
  const { data, update, notify } = useFinance();
  const [kind, setKind] = useState<"income" | "expense">("expense"),
    [archived, setArchived] = useState(false),
    [editing, setEditing] = useState<Category | null | undefined>(undefined),
    [archiving, setArchiving] = useState<Category | null>(null),
    [draft, setDraft] = useState({
      name: "",
      parentId: "",
      icon: "utensils",
      color: categoryColors[0],
      isFood: false,
    }),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const roots = data.categories
    .filter(
      (c) =>
        c.kind === kind &&
        !c.parentId &&
        (archived
          ? !!c.archivedAt ||
            data.categories.some(
              (child) => child.parentId === c.id && child.archivedAt,
            )
          : !c.archivedAt),
    )
    .sort((a, b) => a.order - b.order);
  function edit(category: Category | null, parentId = "") {
    setEditing(category);
    setDraft(
      category
        ? {
            name: category.name,
            parentId: category.parentId ?? "",
            icon: category.icon,
            color: category.color,
            isFood: category.isFood,
          }
        : {
            name: "",
            parentId,
            icon: kind === "income" ? "wallet" : "utensils",
            color: categoryColors[0],
            isFood: false,
          },
    );
    setError("");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parent = data.categories.find((c) => c.id === draft.parentId);
    const candidate: Category = {
      id: editing?.id ?? crypto.randomUUID(),
      name: draft.name.trim(),
      kind,
      isFood: parent?.isFood ?? (kind === "expense" && draft.isFood),
      icon: draft.icon,
      color: draft.color,
      parentId: draft.parentId || undefined,
      order: editing?.order ?? data.categories.length,
      archivedAt: editing?.archivedAt,
    };
    const checked = categorySchema.safeParse(candidate);
    if (!checked.success) {
      setError("กรอกชื่อหมวดหมู่ 1–60 ตัวอักษร และเลือกสี / ไอคอนให้ถูกต้อง");
      return;
    }
    if (
      data.categories.some(
        (c) =>
          c.id !== candidate.id &&
          c.kind === kind &&
          c.parentId === candidate.parentId &&
          c.name === candidate.name &&
          !c.archivedAt,
      )
    ) {
      setError("มีชื่อหมวดนี้อยู่แล้ว กรุณาใช้ชื่ออื่น");
      return;
    }
    setPending(true);
    const ok = await update((current) => ({
      ...current,
      categories: editing
        ? current.categories.map((c) => (c.id === editing.id ? candidate : c))
        : [...current.categories, candidate],
    }));
    setPending(false);
    if (ok) {
      setEditing(undefined);
      notify(
        editing
          ? "ปรับชื่อและรูปแบบหมวดหมู่แล้ว ประวัติรายการยังอยู่ครบ"
          : "เพิ่มหมวดหมู่แล้ว เลือกใช้ในรายการได้ทันที",
      );
    } else setError("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
  }
  async function archive(category: Category, restore = false) {
    setPending(true);
    const ok = await update((current) => ({
      ...current,
      categories: current.categories.map((c) =>
        c.id === category.id || c.parentId === category.id
          ? { ...c, archivedAt: restore ? undefined : localDate() }
          : c,
      ),
    }));
    setPending(false);
    if (ok) {
      setArchiving(null);
      notify(
        restore
          ? "นำหมวดหมู่กลับมาใช้งานแล้ว"
          : "เก็บหมวดหมู่ถาวรแล้ว ยังคงประวัติรายการทั้งหมด",
      );
    }
  }
  async function move(c: Category, by: number) {
    const siblings = data.categories
      .filter(
        (s) => s.kind === c.kind && s.parentId === c.parentId && !s.archivedAt,
      )
      .sort((a, b) => a.order - b.order);
    const other = siblings[siblings.findIndex((s) => s.id === c.id) + by];
    if (!other) return;
    await update((current) => ({
      ...current,
      categories: current.categories.map((s) =>
        s.id === c.id
          ? { ...s, order: other.order }
          : s.id === other.id
            ? { ...s, order: c.order }
            : s,
      ),
    }));
  }
  function actions(c: Category) {
    const siblings = data.categories
      .filter(
        (s) => s.kind === c.kind && s.parentId === c.parentId && !s.archivedAt,
      )
      .sort((a, b) => a.order - b.order);
    const position = siblings.findIndex((s) => s.id === c.id);
    return (
      <div className="category-actions">
        {!c.archivedAt && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`เลื่อนขึ้น ${c.name}`}
              disabled={position <= 0}
              onClick={() => move(c, -1)}
            >
              <ArrowUp size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`เลื่อนลง ${c.name}`}
              disabled={position === siblings.length - 1}
              onClick={() => move(c, 1)}
            >
              <ArrowDown size={14} />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`แก้ไขหมวด ${c.name}`}
          onClick={() => edit(c)}
        >
          <Pencil size={15} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`${c.archivedAt ? "นำกลับมาใช้" : "เก็บถาวร"} ${c.name}`}
          disabled={
            pending ||
            !!(
              c.parentId &&
              c.archivedAt &&
              data.categories.find((parent) => parent.id === c.parentId)
                ?.archivedAt
            )
          }
          title={
            c.parentId &&
            data.categories.find((parent) => parent.id === c.parentId)
              ?.archivedAt
              ? "นำหมวดหลักกลับมาใช้ก่อน"
              : undefined
          }
          onClick={() => (c.archivedAt ? archive(c, true) : setArchiving(c))}
        >
          {c.archivedAt ? <RotateCcw size={15} /> : <Archive size={15} />}
        </Button>
      </div>
    );
  }
  return (
    <>
      <PageHeading
        title="หมวดหมู่ในแบบของคุณ"
        description="จัดระเบียบเรื่องเงิน ให้เข้ากับวิธีใช้ชีวิตของคุณ"
        eyebrow="A PLACE FOR EVERY LITTLE THING"
        showMonth={false}
        action={
          <Button onClick={() => edit(null)}>
            <Plus size={17} />
            สร้างหมวดหมู่
          </Button>
        }
      />
      <div className="category-toolbar">
        <div className="segmented-tabs">
          <button
            className={kind === "expense" ? "selected" : ""}
            aria-pressed={kind === "expense"}
            onClick={() => setKind("expense")}
          >
            หมวดรายจ่าย
          </button>
          <button
            className={kind === "income" ? "selected" : ""}
            aria-pressed={kind === "income"}
            onClick={() => setKind("income")}
          >
            หมวดรายรับ
          </button>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          ดูหมวดที่เก็บถาวร
        </label>
      </div>
      <div className="category-cards">
        {roots.map((c) => (
          <Card
            className={`category-card ${c.archivedAt ? "archived" : ""}`}
            key={c.id}
          >
            <div className="category-card-top">
              <CategoryIcon icon={c.icon} color={c.color} />
              <div>
                <h2>{c.name}</h2>
                <span>
                  {
                    data.transactions.filter(
                      (t) =>
                        t.categoryId === c.id ||
                        data.categories.find((ch) => ch.id === t.categoryId)
                          ?.parentId === c.id,
                    ).length
                  }{" "}
                  รายการในประวัติ
                </span>
              </div>
              {c.isFood && (
                <span className="food-label">
                  <Utensils size={12} />
                  อาหาร
                </span>
              )}
            </div>
            <div className="root-category-actions">
              {actions(c)}
              {!c.archivedAt && (
                <button
                  className="text-button"
                  onClick={() => edit(null, c.id)}
                >
                  <Plus size={14} />
                  หมวดย่อย
                </button>
              )}
            </div>
            <div className="subcategory-list">
              {data.categories
                .filter(
                  (ch) =>
                    ch.parentId === c.id &&
                    (archived ? !!ch.archivedAt : !ch.archivedAt),
                )
                .sort((a, b) => a.order - b.order)
                .map((ch) => (
                  <div key={ch.id} className={ch.archivedAt ? "archived" : ""}>
                    <CategoryIcon icon={ch.icon} color={ch.color} size={14} />
                    <span>
                      {ch.name}
                      {ch.archivedAt && <small> · เก็บถาวร</small>}
                    </span>
                    {actions(ch)}
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>
      {!roots.length && (
        <Card>
          <EmptyState
            title="ยังไม่มีหมวดหมู่ในส่วนนี้"
            description="สร้างหมวดใหม่ หรือเปลี่ยนตัวเลือกแสดงหมวดที่เก็บถาวร"
          />
        </Card>
      )}
      <div className="info-callout">
        <Archive size={17} />
        <p>
          เก็บถาวรเพื่อหยุดใช้หมวด โดยไม่ลบประวัติรายการ ·
          หมวดอาหารระบุด้วยป้ายอาหาร เปลี่ยนชื่อแล้วรายงานยังคำนวณได้ถูกต้อง
        </p>
      </div>
      <Modal
        open={editing !== undefined}
        onOpenChange={(v) => {
          if (!v && !pending) setEditing(undefined);
        }}
        title={editing ? "แก้ไขหมวดหมู่" : "สร้างหมวดหมู่ใหม่"}
        description="ชื่อ สี และไอคอนที่ช่วยให้คุณจำได้ง่ายขึ้น"
      >
        <form className="editor-form" onSubmit={save} noValidate>
          <label>
            ชื่อหมวดหมู่
            <input
              data-dialog-autofocus
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={60}
              placeholder="เช่น สัตว์เลี้ยง, ท่องเที่ยว"
              aria-invalid={!!error}
            />
          </label>
          <label>
            หมวดหลัก
            <select
              value={draft.parentId}
              disabled={!!editing}
              onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}
            >
              <option value="">สร้างเป็นหมวดหลัก</option>
              {data.categories
                .filter((c) => c.kind === kind && !c.parentId && !c.archivedAt)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <fieldset>
            <legend>ไอคอน</legend>
            <div className="icon-picker">
              {Object.entries(iconOptions).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`ไอคอน ${key}`}
                  aria-pressed={draft.icon === key}
                  className={draft.icon === key ? "selected" : ""}
                  onClick={() => setDraft({ ...draft, icon: key })}
                >
                  <Icon size={21} />
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>สีหมวดหมู่</legend>
            <div className="color-picker">
              {categoryColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`สี ${color}`}
                  aria-pressed={draft.color === color}
                  style={{ background: color }}
                  onClick={() => setDraft({ ...draft, color })}
                >
                  {draft.color === color && <Check size={17} />}
                </button>
              ))}
              <label className="custom-color">
                <span>เลือกสีเอง</span>
                <input
                  type="color"
                  aria-label="สีที่กำหนดเอง"
                  value={draft.color}
                  onChange={(e) =>
                    setDraft({ ...draft, color: e.target.value })
                  }
                />
              </label>
            </div>
          </fieldset>
          {kind === "expense" && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={
                  draft.parentId
                    ? !!data.categories.find((c) => c.id === draft.parentId)
                        ?.isFood
                    : draft.isFood
                }
                disabled={!!editing || !!draft.parentId}
                onChange={(e) =>
                  setDraft({ ...draft, isFood: e.target.checked })
                }
              />
              จัดเป็นค่าอาหารสำหรับการวิเคราะห์
            </label>
          )}
          {editing && (
            <p className="form-note">
              ชนิด หมวดหลัก
              และกลุ่มอาหารคงเดิมเพื่อรักษาความหมายของข้อมูลย้อนหลัง
            </p>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(undefined)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "กำลังบันทึก…" : "บันทึกหมวดหมู่"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!archiving}
        onOpenChange={(v) => {
          if (!v && !pending) setArchiving(null);
        }}
        title="เก็บหมวดหมู่ถาวร?"
        description="รายการย้อนหลังและรายงานจะยังอยู่ครบ"
      >
        <div className="help-content">
          <p>
            หมวด “{archiving?.name}”
            และหมวดย่อยจะไม่ปรากฏในตัวเลือกเพิ่มรายการใหม่
            คุณสามารถนำกลับมาใช้ภายหลังได้
          </p>
        </div>
        <div className="form-actions">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setArchiving(null)}
          >
            ยกเลิก
          </Button>
          <Button
            disabled={pending}
            onClick={() => archiving && archive(archiving)}
          >
            ยืนยันเก็บถาวร
          </Button>
        </div>
      </Modal>
    </>
  );
}
