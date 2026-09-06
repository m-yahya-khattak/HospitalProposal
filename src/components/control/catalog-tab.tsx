"use client";

import { useMemo, useState } from "react";
import { NumberInput } from "@/components/control/number-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { newId, slugify } from "@/lib/id";
import { DepartmentPanel } from "@/components/control/department-panel";
import { SpecialtyPanel } from "@/components/control/specialty-panel";
import { categoryLabel, formatInt, modelCategories } from "@/lib/format";
import type { Evaluation, PlanningModel } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  model: PlanningModel;
  result: Evaluation;
  onChange: (next: PlanningModel) => void;
};

export function CatalogTab({ model, result, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("ward-equipment");
  const [deptName, setDeptName] = useState("");
  const [specName, setSpecName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [openDeptId, setOpenDeptId] = useState<string | null>(null);
  const [openSpecId, setOpenSpecId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const patch = (fn: (m: PlanningModel) => void) => {
    const next = structuredClone(model);
    fn(next);
    onChange(next);
  };

  const categories = modelCategories(model);
  const visibleItems = useMemo(
    () =>
      model.items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => filter === "all" || item.category === filter),
    [model.items, filter],
  );

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl">Equipment & furniture</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Unit prices are live. Quantity comes from the Formulas tab.
            </p>
          </div>
          <Button
            onClick={() => {
              setName("");
              setCategory("ward-equipment");
              setOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Add item
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", ...categories] as const).map((c) => (
            <Button
              key={c}
              size="sm"
              variant={filter === c ? "default" : "outline"}
              onClick={() => setFilter(c)}
            >
              {c === "all" ? "All" : categoryLabel(c)}
            </Button>
          ))}
        </div>
        <form
          className="mt-3 flex max-w-md gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = categoryName.trim();
            if (!trimmed) return;
            const id = slugify(trimmed);
            patch((m) => {
              const next = modelCategories(m);
              if (!next.includes(id) && !m.categories?.includes(id)) {
                m.categories = [...(m.categories ?? []), id];
              }
            });
            setCategory(id);
            setCategoryName("");
          }}
        >
          <Input
            placeholder="Add category"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
          />
          <Button type="submit" variant="outline">
            Add
          </Button>
        </form>
        <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Premium</TableHead>
                <TableHead className="text-right">Budgetary</TableHead>
                <TableHead className="text-right">On</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map(({ item, index }) => {
                const qty =
                  result.items.find((i) => i.id === item.id)?.qty ?? 0;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-40">
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          patch((m) => {
                            m.items[index].name = e.target.value;
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {categoryLabel(item.category)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {qty}
                    </TableCell>
                    <TableCell className="w-28">
                      <NumberInput
                        value={item.premiumUnit}
                        min={0}
                        onChange={(v) =>
                          patch((m) => {
                            m.items[index].premiumUnit = v;
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="w-28">
                      <NumberInput
                        value={item.budgetUnit}
                        min={0}
                        onChange={(v) =>
                          patch((m) => {
                            m.items[index].budgetUnit = v;
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={item.enabled}
                        onCheckedChange={(checked) =>
                          patch((m) => {
                            m.items[index].enabled = Boolean(checked);
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          patch((m) => {
                            m.items = m.items.filter((_, i) => i !== index);
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl">Departments</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a department to see formulas and kit tied to its beds.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {model.departments.map((dept, index) => {
            const beds =
              result.departments.find((d) => d.id === dept.id)?.beds ?? 0;
            return (
              <div
                key={dept.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-stone-200"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setOpenDeptId(dept.id)}
                >
                  <p className="font-medium hover:text-teal-800">{dept.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatInt(beds)} beds
                    {dept.furniture ? " · furniture" : ""}
                  </p>
                </button>
                <Switch
                  size="sm"
                  checked={dept.furniture}
                  onCheckedChange={(checked) =>
                    patch((m) => {
                      m.departments[index].furniture = Boolean(checked);
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
              </div>
            );
          })}
        </div>
        <form
          className="mt-4 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
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
            onChange={(e) => setDeptName(e.target.value)}
          />
          <Button type="submit" variant="outline">
            Add
          </Button>
        </form>
      </section>

      <section>
        <div>
          <h2 className="font-heading text-2xl">Specialties</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Service lines. Off drops Cath Lab, L&amp;D rooms, and kit that
            depends on them.
          </p>
        </div>
        <ul className="mt-4 divide-y rounded-xl bg-white ring-1 ring-stone-200">
          {model.specialties.map((spec, index) => (
            <li
              key={spec.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setOpenSpecId(spec.id)}
              >
                <p className="text-sm font-medium hover:text-teal-800">
                  {spec.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Open to assign equipment
                </p>
              </button>
              <div className="flex items-center gap-2">
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
              </div>
            </li>
          ))}
        </ul>
        <form
          className="mt-4 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
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
            onChange={(e) => setSpecName(e.target.value)}
          />
          <Button type="submit" variant="outline">
            Add
          </Button>
        </form>
      </section>

      {openDeptId ? (
        <DepartmentPanel
          deptId={openDeptId}
          model={model}
          result={result}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add catalog item</DialogTitle>
            <DialogDescription>
              Connect how quantity is calculated in the Formulas tab.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  if (value) setCategory(value);
                }}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                const trimmed = name.trim();
                if (!trimmed) return;
                patch((m) => {
                  m.items.push({
                    id: newId(slugify(trimmed)),
                    name: trimmed,
                    category,
                    premiumUnit: 0,
                    budgetUnit: 0,
                    enabled: true,
                    contributions: [],
                  });
                });
                setOpen(false);
              }}
            >
              Add item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
