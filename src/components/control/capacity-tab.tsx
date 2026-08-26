"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { NumberInput } from "@/components/control/number-input";
import { formatInt, formatPercent } from "@/lib/format";
import type { Evaluation, PlanningModel } from "@/lib/types";
import { Minus, Plus } from "lucide-react";

type Props = {
  model: PlanningModel;
  result: Evaluation;
  onChange: (next: PlanningModel) => void;
};

export function CapacityTab({ model, result, onChange }: Props) {
  const patch = (fn: (m: PlanningModel) => void) => {
    const next = structuredClone(model);
    fn(next);
    onChange(next);
  };

  const shareOk = Math.abs(result.shareTotal - 100) < 0.05;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl">Bed capacity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One master input. Department shares allocate beds; theatres follow
              the OT rules.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                patch((m) => {
                  m.totalBeds = Math.max(10, m.totalBeds - 10);
                })
              }
            >
              <Minus />
            </Button>
            <NumberInput
              className="w-28"
              value={model.totalBeds}
              min={10}
              max={2000}
              onChange={(v) =>
                patch((m) => {
                  m.totalBeds = Math.round(v);
                })
              }
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                patch((m) => {
                  m.totalBeds = Math.min(2000, m.totalBeds + 10);
                })
              }
            >
              <Plus />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Department mix</p>
          <p
            className={
              shareOk
                ? "text-teal-800"
                : "font-medium text-destructive"
            }
          >
            {formatPercent(result.shareTotal)} of 100%
            {shareOk ? "" : " — shares should total 100%"}
          </p>
        </div>

        <ul className="mt-3 divide-y rounded-xl ring-1 ring-foreground/10">
          {model.departments.map((dept, index) => {
            const beds =
              result.departments.find((d) => d.id === dept.id)?.beds ?? 0;
            return (
              <li
                key={dept.id}
                className="grid grid-cols-[1fr_72px_88px] items-center gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{dept.name}</p>
                  <Slider
                    className="mt-2"
                    min={0}
                    max={60}
                    step={0.5}
                    value={[dept.sharePercent]}
                    onValueChange={(value) => {
                      const n = Array.isArray(value) ? value[0] : 0;
                      patch((m) => {
                        m.departments[index].sharePercent = n;
                      });
                    }}
                  />
                </div>
                <NumberInput
                  value={dept.sharePercent}
                  min={0}
                  max={100}
                  step={0.5}
                  suffix="%"
                  onChange={(v) =>
                    patch((m) => {
                      m.departments[index].sharePercent = v;
                    })
                  }
                />
                <p className="text-right font-mono text-sm tabular-nums">
                  {formatInt(beds)} beds
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="space-y-6">
        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <h3 className="font-heading text-lg">Specialties</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Off units drop Cath Lab, L&amp;D rooms, and related kit.
          </p>
          <ul className="mt-4 space-y-3">
            {model.specialties.map((spec, index) => (
              <li key={spec.id} className="flex items-center justify-between gap-3">
                <Label htmlFor={`spec-${spec.id}`} className="text-sm font-normal">
                  {spec.name}
                </Label>
                <Switch
                  id={`spec-${spec.id}`}
                  checked={spec.enabled}
                  onCheckedChange={(checked) =>
                    patch((m) => {
                      m.specialties[index].enabled = Boolean(checked);
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </section>

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
