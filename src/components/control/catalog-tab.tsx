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
import { categoryLabel } from "@/lib/format";
import type { Evaluation, ItemCategory, PlanningModel } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

const CATEGORIES: ItemCategory[] = [
  "furniture",
  "ward-equipment",
  "theatre-equipment",
  "diagnostic",
  "laboratory",
];

type Props = {
  model: PlanningModel;
  result: Evaluation;
  onChange: (next: PlanningModel) => void;
};

export function CatalogTab({ model, result, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ItemCategory>("ward-equipment");
  const [deptName, setDeptName] = useState("");
  const [filter, setFilter] = useState<ItemCategory | "all">("all");

  const patch = (fn: (m: PlanningModel) => void) => {
    const next = structuredClone(model);
    fn(next);
    onChange(next);
  };

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
          {(["all", ...CATEGORIES] as const).map((c) => (
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
              New departments appear as formula sources immediately.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {model.departments.map((dept, index) => (
            <div
              key={dept.id}
              className="flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm ring-1 ring-teal-100"
            >
              <span>{dept.name}</span>
              <Switch
                size="sm"
                checked={dept.furniture}
                onCheckedChange={(checked) =>
                  patch((m) => {
                    m.departments[index].furniture = Boolean(checked);
                  })
                }
              />
              <span className="text-[11px] text-muted-foreground">furn.</span>
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
          ))}
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
                  if (value) setCategory(value as ItemCategory);
                }}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
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
