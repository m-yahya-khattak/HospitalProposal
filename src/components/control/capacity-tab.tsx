"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/control/number-input";
import { formatInt, formatPercent } from "@/lib/format";
import type { Evaluation, PlanningModel } from "@/lib/types";
import { Minus, Plus } from "lucide-react";

type Props = {
  model: PlanningModel;
  result: Evaluation;
  onChange: (next: PlanningModel) => void;
};

function departmentBeds(model: PlanningModel, result: Evaluation) {
  return model.departments.map((dept) => {
    if (typeof dept.beds === "number") return Math.max(0, Math.round(dept.beds));
    return result.departments.find((d) => d.id === dept.id)?.beds ?? 0;
  });
}

function applyBedCounts(model: PlanningModel, counts: number[]) {
  const total = counts.reduce((sum, n) => sum + n, 0);
  model.totalBeds = Math.max(1, total);
  model.departments.forEach((dept, index) => {
    dept.beds = counts[index] ?? 0;
    dept.sharePercent = (dept.beds / model.totalBeds) * 100;
  });
}

export function CapacityTab({ model, result, onChange }: Props) {
  const patch = (fn: (m: PlanningModel) => void) => {
    const next = structuredClone(model);
    fn(next);
    onChange(next);
  };

  const counts = departmentBeds(model, result);
  const allocated = counts.reduce((sum, n) => sum + n, 0);
  const bedsOk = allocated === model.totalBeds;

  const setTotalBeds = (total: number) => {
    patch((m) => {
      const nextTotal = Math.max(10, Math.round(total));
      const current = departmentBeds(m, result);
      const prevTotal = current.reduce((sum, n) => sum + n, 0) || m.totalBeds;
      const scaled = current.map((n) =>
        Math.round((n * nextTotal) / prevTotal),
      );
      const drift = nextTotal - scaled.reduce((sum, n) => sum + n, 0);
      if (scaled.length) scaled[scaled.length - 1] += drift;
      applyBedCounts(m, scaled);
      m.totalBeds = nextTotal;
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl">Bed capacity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter beds for each department. The total is their sum; theatres
              follow the OT rules.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTotalBeds(model.totalBeds - 10)}
            >
              <Minus />
            </Button>
            <NumberInput
              className="w-28"
              value={model.totalBeds}
              min={10}
              max={2000}
              onChange={setTotalBeds}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTotalBeds(model.totalBeds + 10)}
            >
              <Plus />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Department mix</p>
          <p
            className={
              bedsOk ? "text-teal-800" : "font-medium text-destructive"
            }
          >
            {formatInt(allocated)} of {formatInt(model.totalBeds)} beds
            {bedsOk ? "" : " — department beds should match the total"}
          </p>
        </div>

        <ul className="mt-3 divide-y rounded-xl ring-1 ring-foreground/10">
          {model.departments.map((dept, index) => {
            const beds = counts[index] ?? 0;
            const share = model.totalBeds ? (beds / model.totalBeds) * 100 : 0;
            return (
              <li
                key={dept.id}
                className="grid grid-cols-[1fr_120px] items-center gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{dept.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercent(share)} of total
                  </p>
                </div>
                <NumberInput
                  value={beds}
                  min={0}
                  max={2000}
                  suffix="beds"
                  className="w-[7.5rem]"
                  onChange={(value) =>
                    patch((m) => {
                      const next = departmentBeds(m, result);
                      next[index] = Math.max(0, Math.round(value));
                      applyBedCounts(m, next);
                    })
                  }
                />
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="space-y-6">
        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h3 className="font-heading text-lg">Theatre rules</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Beds per OT</Label>
              <NumberInput
                className="mt-1"
                value={model.theatre.otPerBeds}
                min={1}
                onChange={(v) =>
                  patch((m) => {
                    m.theatre.otPerBeds = v;
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">OTs per minor</Label>
              <NumberInput
                className="mt-1"
                value={model.theatre.minorPerOt}
                min={1}
                onChange={(v) =>
                  patch((m) => {
                    m.theatre.minorPerOt = v;
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Beds per L&amp;D</Label>
              <NumberInput
                className="mt-1"
                value={model.theatre.ldPerBeds}
                min={1}
                onChange={(v) =>
                  patch((m) => {
                    m.theatre.ldPerBeds = v;
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Cath lab count</Label>
              <NumberInput
                className="mt-1"
                value={model.theatre.cathLabCount}
                min={0}
                onChange={(v) =>
                  patch((m) => {
                    m.theatre.cathLabCount = v;
                  })
                }
              />
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
