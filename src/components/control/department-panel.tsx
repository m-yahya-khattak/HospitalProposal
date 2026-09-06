"use client";

import { Button } from "@/components/ui/button";
import { departmentKit } from "@/lib/department-kit";
import { categoryLabel, formatInt, formatNumber } from "@/lib/format";
import type { Evaluation, PlanningModel } from "@/lib/types";
import { X } from "lucide-react";

export function DepartmentPanel({
  deptId,
  model,
  result,
  onClose,
}: {
  deptId: string;
  model: PlanningModel;
  result: Evaluation;
  onClose: () => void;
}) {
  const dept = model.departments.find((d) => d.id === deptId);
  const beds = result.departments.find((d) => d.id === deptId)?.beds ?? 0;
  const lines = departmentKit(model, result, deptId);

  if (!dept) return null;

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
            <p className="text-[11px] font-medium tracking-[0.18em] text-teal-800 uppercase">
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
              No catalog items point at this department yet. In Formulas, add a
              line that uses “{dept.name} beds”.
            </p>
          ) : (
            <ul className="grid gap-3">
              {lines.map((line) => (
                <li
                  key={`${line.item.id}-${line.formulaLabel}`}
                  className="rounded-xl px-4 py-3 ring-1 ring-stone-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{line.item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(line.item.category)}
                      </p>
                    </div>
                    <p className="font-mono text-sm tabular-nums">
                      {formatNumber(line.fromThisDept, 2)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{line.formulaLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
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
