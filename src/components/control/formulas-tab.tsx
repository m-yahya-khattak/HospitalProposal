"use client";

import { NumberInput } from "@/components/control/number-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { emptyFormula, formulaPreview, sourceOptions } from "@/lib/formula-label";
import { categoryLabel } from "@/lib/format";
import type { Evaluation, Formula, FormulaType, PlanningModel } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  model: PlanningModel;
  result: Evaluation;
  onChange: (next: PlanningModel) => void;
};

const TYPES: { id: FormulaType; label: string }[] = [
  { id: "timesSource", label: "n × source" },
  { id: "perSource", label: "1 per n of source" },
  { id: "oneIfExists", label: "n if source exists" },
  { id: "constant", label: "Fixed number" },
];

function toFormula(
  type: FormulaType,
  current: Formula,
  source: string,
): Formula {
  if (type === "constant") {
    return { type, value: current.type === "constant" ? current.value : 1 };
  }
  if (type === "perSource") {
    return {
      type,
      source,
      n: "n" in current ? current.n : 1,
    };
  }
  if (type === "oneIfExists") {
    return {
      type,
      source,
      n: "n" in current ? current.n : 1,
    };
  }
  return {
    type: "timesSource",
    source,
    n: "n" in current ? current.n : 1,
  };
}

export function FormulasTab({ model, result, onChange }: Props) {
  const sources = sourceOptions(model);
  const groups = [...new Set(sources.map((s) => s.group))];

  const patch = (fn: (m: PlanningModel) => void) => {
    const next = structuredClone(model);
    fn(next);
    onChange(next);
  };

  const priced = model.items.filter(
    (i) =>
      i.category === "furniture" ||
      i.category === "ward-equipment" ||
      i.category === "theatre-equipment",
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl">What connects to what</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Each line is a contribution. They add up, then round up to whole
          units. Example: ICU crash carts = 2 if ICU beds exist.
        </p>
      </div>

      <div className="space-y-4">
        {priced.map((item) => {
          const qty = result.items.find((i) => i.id === item.id);
          const index = model.items.findIndex((i) => i.id === item.id);
          return (
            <article
              key={item.id}
              className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabel(item.category)}
                  </p>
                </div>
                <p className="font-mono text-sm tabular-nums text-teal-800">
                  {qty?.qty ?? 0} units
                  {qty && qty.qtyRaw !== qty.qty
                    ? ` · raw ${qty.qtyRaw.toFixed(2)}`
                    : ""}
                </p>
              </div>

              <ul className="mt-3 space-y-2">
                {item.contributions.map((formula, fIndex) => (
                  <li
                    key={`${item.id}-${fIndex}`}
                    className="grid items-center gap-2 rounded-lg bg-stone-50 p-2 md:grid-cols-[160px_1fr_88px_auto]"
                  >
                    <Select
                      value={formula.type === "sum" ? "timesSource" : formula.type}
                      onValueChange={(value) => {
                        if (!value) return;
                        patch((m) => {
                          const current = m.items[index].contributions[fIndex];
                          const source =
                            "source" in current ? current.source : "totalBeds";
                          m.items[index].contributions[fIndex] = toFormula(
                            value as FormulaType,
                            current,
                            source,
                          );
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {formula.type === "constant" ? (
                      <p className="px-2 text-sm text-muted-foreground">
                        {formulaPreview(formula, sources)}
                      </p>
                    ) : formula.type === "sum" ? (
                      <p className="px-2 text-sm text-muted-foreground">
                        {formulaPreview(formula, sources)}
                      </p>
                    ) : (
                      <Select
                        value={formula.source}
                        onValueChange={(value) => {
                          if (!value) return;
                          patch((m) => {
                            const current = m.items[index].contributions[fIndex];
                            if ("source" in current) current.source = value;
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectGroup key={group}>
                              <SelectLabel>{group}</SelectLabel>
                              {sources
                                .filter((s) => s.group === group)
                                .map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <NumberInput
                      value={
                        formula.type === "constant"
                          ? formula.value
                          : formula.type === "sum"
                            ? 0
                            : formula.n
                      }
                      min={0}
                      step={0.5}
                      onChange={(v) =>
                        patch((m) => {
                          const current = m.items[index].contributions[fIndex];
                          if (current.type === "constant") current.value = v;
                          else if (current.type !== "sum") current.n = v;
                        })
                      }
                    />

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        patch((m) => {
                          m.items[index].contributions = m.items[
                            index
                          ].contributions.filter((_, i) => i !== fIndex);
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() =>
                  patch((m) => {
                    m.items[index].contributions.push(emptyFormula());
                  })
                }
              >
                <Plus data-icon="inline-start" />
                Add connection
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
