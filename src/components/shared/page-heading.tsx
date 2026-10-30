import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "./month-picker";
import { useFinance } from "@/components/providers";
export function PageHeading({
  title,
  description,
  eyebrow = "YOUR MONEY, AT A GLANCE",
  showMonth = true,
  action,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  showMonth?: boolean;
  action?: React.ReactNode;
}) {
  const { setEditor } = useFinance();
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">
        {showMonth && <MonthPicker />}
        {action ?? (
          <Button onClick={() => setEditor(null)} className="heading-add">
            <Plus size={17} /> เพิ่มรายการ
          </Button>
        )}
      </div>
    </div>
  );
}
