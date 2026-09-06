"use client";

import { useState } from "react";
import { DepartmentPanel } from "@/components/control/department-panel";
import { NumberInput } from "@/components/control/number-input";
import { SpecialtyPanel } from "@/components/control/specialty-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { bedsFromArea, scaleHospitalBeds } from "@/lib/engine";
import { slugify } from "@/lib/id";
import { formatInt, formatPercent } from "@/lib/format";
import type { Evaluation, PlanningModel } from "@/lib/types";
import { Minus, Plus, Trash2 } from "lucide-react";

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
  const [deptName, setDeptName] = useState("");
  const [specName, setSpecName] = useState("");
  const [openDeptId, setOpenDeptId] = useState<string | null>(null);
  const [openSpecId, setOpenSpecId] = useState<string | null>(null);

  const setTotalBeds = (total: number) => {
    patch((m) => {
      scaleHospitalBeds(m, total);
    });
  };

  const setArea = (area: number) => {
    patch((m) => {
      scaleHospitalBeds(m, bedsFromArea(area, m.capex.areaBands));
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-medium tracking-tight">Beds</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Department beds add up to the hospital total. Theatres follow the
              rules on the right.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTotalBeds(model.totalBeds - 10)}
            >
              <Minus />
            </Button>
            <NumberInput
              className="w-32"
              value={model.totalBeds}
              min={10}
              max={2000}
              suffix="beds"
              onChange={setTotalBeds}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTotalBeds(model.totalBeds + 10)}
            >
              <Plus />
            </Button>
            <NumberInput
              className="w-40"
              value={Math.round(result.areaSqft)}
              min={1}
              suffix="sq.ft"
              onChange={setArea}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Departments</p>
          <p
            className={
              bedsOk ? "text-teal-800" : "font-medium text-destructive"
            }
          >
            {formatInt(allocated)} of {formatInt(model.totalBeds)} beds
            {bedsOk ? "" : " — should match the total"}
          </p>
        </div>

        <ul className="mt-3 divide-y rounded-xl bg-white ring-1 ring-stone-200">
          {model.departments.map((dept, index) => {
            const beds = counts[index] ?? 0;
            const share = model.totalBeds ? (beds / model.totalBeds) * 100 : 0;
            return (
              <li
                key={dept.id}
                className="grid grid-cols-[1fr_auto_120px_auto] items-center gap-3 px-4 py-3"
              >
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => setOpenDeptId(dept.id)}
                >
                  <p className="text-sm font-medium hover:text-teal-800">
                    {dept.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPercent(share)} of total
                  </p>
                </button>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Switch
                    size="sm"
                    checked={dept.furniture}
                    onCheckedChange={(checked) =>
                      patch((m) => {
                        m.departments[index].furniture = Boolean(checked);
                      })
                    }
                  />
                  Furn.
                </label>
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
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    patch((m) => {
                      m.departments = m.departments.filter((_, i) => i !== index);
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
        <form
          className="mt-3 flex max-w-md gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = deptName.trim();
            if (!trimmed) return;
            patch((m) => {
              m.departments.push({
                id: slugify(trimmed),
                name: trimmed,
                sharePercent: 0,
                beds: 0,
                furniture: true,
              });
            });
            setDeptName("");
          }}
        >
          <Input
            placeholder="Add department"
            value={deptName}
            onChange={(event) => setDeptName(event.target.value)}
          />
          <Button type="submit" variant="outline">
            Add
          </Button>
        </form>
      </section>

      <aside className="space-y-6">
        <section className="rounded-xl bg-white p-4 ring-1 ring-stone-200">
          <h3 className="text-sm font-medium">Theatre rules</h3>
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
          <p className="mt-3 text-xs text-muted-foreground">
            {formatInt(result.theatres.ot)} OT · {formatInt(result.theatres.minorOt)}{" "}
            minor · {formatInt(result.theatres.cathLab)} cath ·{" "}
            {formatInt(result.theatres.labourDelivery)} L&amp;D
          </p>
        </section>

        <section className="rounded-xl bg-white p-4 ring-1 ring-stone-200">
          <h3 className="text-sm font-medium">Specialties</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Off drops related rooms and kit.
          </p>
          <ul className="mt-3 divide-y">
            {model.specialties.map((spec, index) => (
              <li
                key={spec.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left text-sm hover:text-teal-800"
                  onClick={() => setOpenSpecId(spec.id)}
                >
                  {spec.name}
                </button>
                <Switch
                  checked={spec.enabled}
                  onCheckedChange={(checked) =>
                    patch((m) => {
                      m.specialties[index].enabled = Boolean(checked);
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    patch((m) => {
                      m.specialties = m.specialties.filter((_, i) => i !== index);
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = specName.trim();
              if (!trimmed) return;
              const base = slugify(trimmed);
              patch((m) => {
                const taken = new Set(m.specialties.map((s) => s.id));
                let id = base;
                let n = 2;
                while (taken.has(id)) {
                  id = `${base}-${n}`;
                  n += 1;
                }
                m.specialties.push({ id, name: trimmed, enabled: true });
              });
              setSpecName("");
            }}
          >
            <Input
              placeholder="Add specialty"
              value={specName}
              onChange={(event) => setSpecName(event.target.value)}
            />
            <Button type="submit" variant="outline">
              Add
            </Button>
          </form>
        </section>
      </aside>

      {openDeptId ? (
        <DepartmentPanel
          deptId={openDeptId}
          model={model}
          result={result}
          onChange={onChange}
          onClose={() => setOpenDeptId(null)}
        />
      ) : null}
      {openSpecId ? (
        <SpecialtyPanel
          specialtyId={openSpecId}
          model={model}
          result={result}
          onChange={onChange}
          onClose={() => setOpenSpecId(null)}
        />
      ) : null}
    </div>
  );
}
