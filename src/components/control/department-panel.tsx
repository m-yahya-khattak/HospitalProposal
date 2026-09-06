"use client";

import { NumberInput } from "@/components/control/number-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { departmentKit } from "@/lib/department-kit";
import { categoryLabel, formatInt, formatNumber } from "@/lib/format";
import type { Evaluation, PlanningModel } from "@/lib/types";
import { Trash2, X } from "lucide-react";

export function DepartmentPanel({
  deptId,
  model,
  result,
  onChange,
  onClose,
}: {
  deptId: string;
  model: PlanningModel;
  result: Evaluation;
  onChange: (next: PlanningModel) => void;
  onClose: () => void;
}) {
  const dept = model.departments.find((d) => d.id === deptId);
  const beds = result.departments.find((d) => d.id === deptId)?.beds ?? 0;
  const lines = departmentKit(model, result, deptId);

  if (!dept) return null;

  const patch = (fn: (m: PlanningModel) => void) => {
    const next = structuredClone(model);
    fn(next);
    onChange(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/20"
        aria-label="Close department"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <p className="text-xs font-medium text-teal-800">
              Department
            </p>
            <h2 className="font-heading text-2xl tracking-tight">{dept.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatInt(beds)} beds in the current plan
              {dept.furniture ? " · furniture set on" : ""}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No items use this department yet. Open an item and set a quantity
              against “{dept.name} beds”.
            </p>
          ) : (
            <ul className="grid gap-3">
              {lines.map((line) => (
                <li
                  key={`${line.item.id}-${line.formulaIndex}`}
                  className="rounded-xl px-4 py-3 ring-1 ring-stone-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{line.item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(line.item.category, model.categoryLabels)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        patch((m) => {
                          const item = m.items[line.itemIndex];
                          if (!item) return;
                          item.contributions = item.contributions.filter(
                            (_, i) => i !== line.formulaIndex,
                          );
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{line.formulaLabel}</p>
                  {"n" in line.formula ? (
                    <div className="mt-3 flex items-center gap-2">
                      <Label className="text-xs">Qty</Label>
                      <NumberInput
                        className="w-20"
                        value={line.formula.n}
                        min={1}
                        onChange={(value) =>
                          patch((m) => {
                            const formula =
                              m.items[line.itemIndex]?.contributions[
                                line.formulaIndex
                              ];
                            if (formula && "n" in formula) {
                              formula.n = Math.max(1, Math.round(value));
                            }
                          })
                        }
                      />
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    From this department: {formatNumber(line.fromThisDept, 2)} ·
                    item total {formatInt(line.itemQty)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
