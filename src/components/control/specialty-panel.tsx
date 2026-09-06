"use client";

import { useState } from "react";
import { NumberInput } from "@/components/control/number-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { specialtyKit, specialtySourceIds } from "@/lib/department-kit";
import { categoryLabel, formatInt, formatNumber } from "@/lib/format";
import type { Evaluation, PlanningModel } from "@/lib/types";
import { Plus, X } from "lucide-react";

export function SpecialtyPanel({
  specialtyId,
  model,
  result,
  onChange,
  onClose,
}: {
  specialtyId: string;
  model: PlanningModel;
  result: Evaluation;
  onChange: (next: PlanningModel) => void;
  onClose: () => void;
}) {
  const spec = model.specialties.find((s) => s.id === specialtyId);
  const lines = specialtyKit(model, result, specialtyId);
  const linkedIds = new Set(lines.map((line) => line.item.id));
  const assignable = model.items.filter((item) => !linkedIds.has(item.id));
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);

  if (!spec) return null;

  const source = `specialty:${specialtyId}`;
  const on = Boolean(result.sources[source] || result.sources[specialtySourceIds(specialtyId)[1] ?? ""]);

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
        aria-label="Close specialty"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-teal-800 uppercase">
              Specialty
            </p>
            <h2 className="font-heading text-2xl tracking-tight">{spec.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {spec.enabled ? "On" : "Off"} — assigned qty applies when this
              service is on
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-xl bg-stone-50 p-3">
            <p className="text-sm font-medium">Assign catalog item</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adds “n if {spec.name} is on” to that item’s formulas.
            </p>
            <div className="mt-3 grid grid-cols-[1fr_72px_auto] items-end gap-2">
              <div>
                <Label className="text-xs">Item</Label>
                <Select
                  value={itemId}
                  onValueChange={(value) => {
                    if (value) setItemId(value);
                  }}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Choose item" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignable.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Qty</Label>
                <NumberInput
                  className="mt-1"
                  value={qty}
                  min={1}
                  onChange={setQty}
                />
              </div>
              <Button
                onClick={() => {
                  if (!itemId) return;
                  patch((m) => {
                    const item = m.items.find((row) => row.id === itemId);
                    if (!item) return;
                    item.contributions.push({
                      type: "oneIfExists",
                      source,
                      n: Math.max(1, Math.round(qty)),
                    });
                  });
                  setItemId("");
                  setQty(1);
                }}
              >
                <Plus data-icon="inline-start" />
                Add
              </Button>
            </div>
          </div>

          {lines.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Nothing assigned yet. Add an item above, or in Formulas use “
              {spec.name} (on/off)”.
            </p>
          ) : (
            <ul className="mt-5 grid gap-3">
              {lines.map((line, index) => (
                <li
                  key={`${line.item.id}-${index}`}
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
                    From this specialty: {formatNumber(line.fromThisDept, 2)}
                    {on ? "" : " (off)"} · item total {formatInt(line.itemQty)}
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
