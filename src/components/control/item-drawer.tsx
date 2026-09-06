"use client";

import { useMemo, useState } from "react";
import { CellEditor } from "@/components/control/cell-editor";
import { NumberInput } from "@/components/control/number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetCloseButton,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { sourceOptions, type SourceOption } from "@/lib/formula-label";
import {
  formulaSentence,
  parseContributions,
  setContributionCell,
  setFixedQty,
  toContributions,
} from "@/lib/formula-matrix";
import { categoryLabel, formatInt, modelCategories } from "@/lib/format";
import type { Evaluation, Formula, PlanningModel } from "@/lib/types";

type Props = {
  itemId: string;
  model: PlanningModel;
  result: Evaluation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: PlanningModel) => void;
  onDelete: () => void;
};

export function ItemDrawer({
  itemId,
  model,
  result,
  open,
  onOpenChange,
  onChange,
  onDelete,
}: Props) {
  const itemIndex = model.items.findIndex((row) => row.id === itemId);
  const item = model.items[itemIndex];
  const qty = result.items.find((row) => row.id === itemId);
  const sources = sourceOptions(model);
  const sourceOrder = sources.map((s) => s.id);
  const categories = modelCategories(model);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, SourceOption[]>();
    for (const source of sources) {
      const list = map.get(source.group) ?? [];
      list.push(source);
      map.set(source.group, list);
    }
    return [...map.entries()];
  }, [sources]);

  if (!item) return null;

  const patch = (fn: (m: PlanningModel) => void) => {
    const next = structuredClone(model);
    fn(next);
    onChange(next);
  };

  const setContributions = (contributions: Formula[]) => {
    patch((m) => {
      m.items[itemIndex].contributions = contributions;
    });
  };

  const rule = parseContributions(item.contributions);
  const followsHospital = rule.kind === "hospital";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="min-w-0">
            <p className="text-xs font-medium text-teal-800">
              {categoryLabel(item.category, model.categoryLabels)}
            </p>
            <SheetTitle>{item.name}</SheetTitle>
            <SheetDescription>
              {formatInt(qty?.qty ?? 0)} units
              {qty && qty.qtyRaw !== qty.qty
                ? ` · raw ${qty.qtyRaw.toFixed(2)}`
                : ""}
            </SheetDescription>
          </div>
          <SheetCloseButton />
        </SheetHeader>
        <SheetBody className="space-y-6">
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                className="mt-1"
                value={item.name}
                onChange={(event) =>
                  patch((m) => {
                    m.items[itemIndex].name = event.target.value;
                  })
                }
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={item.category}
                onValueChange={(value) => {
                  if (!value) return;
                  patch((m) => {
                    m.items[itemIndex].category = value;
                  });
                }}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {categoryLabel(category, model.categoryLabels)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Premium</Label>
                <NumberInput
                  className="mt-1"
                  value={item.premiumUnit}
                  min={0}
                  onChange={(value) =>
                    patch((m) => {
                      m.items[itemIndex].premiumUnit = value;
                    })
                  }
                />
              </div>
              <div>
                <Label>Budgetary</Label>
                <NumberInput
                  className="mt-1"
                  value={item.budgetUnit}
                  min={0}
                  onChange={(value) =>
                    patch((m) => {
                      m.items[itemIndex].budgetUnit = value;
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
              <Label htmlFor="item-enabled" className="font-normal">
                Include in plan
              </Label>
              <Switch
                id="item-enabled"
                checked={item.enabled}
                onCheckedChange={(checked) =>
                  patch((m) => {
                    m.items[itemIndex].enabled = Boolean(checked);
                  })
                }
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">How many</p>
            <div className="mt-2 flex gap-1">
              <Button
                size="sm"
                variant={followsHospital ? "default" : "outline"}
                onClick={() => {
                  const next = parseContributions(item.contributions);
                  next.kind = "hospital";
                  next.constant = 0;
                  setContributions(toContributions(next, sourceOrder));
                }}
              >
                Follows the hospital
              </Button>
              <Button
                size="sm"
                variant={!followsHospital ? "default" : "outline"}
                onClick={() =>
                  setContributions(setFixedQty(rule.constant || 1))
                }
              >
                Always this many
              </Button>
            </div>
            <p className="mt-3 text-sm text-stone-600">
              {formulaSentence(item.contributions, sources, qty?.qty)}
            </p>
          </div>

          {followsHospital ? (
            <div className="space-y-5">
              {groups.map(([group, cols]) => (
                <section key={group}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {group}
                  </p>
                  <div className="grid grid-cols-[1fr_72px] gap-1">
                    {cols.map((source) => (
                      <div
                        key={source.id}
                        className="contents"
                      >
                        <p className="flex items-center px-1 text-sm">
                          {source.label}
                        </p>
                        <CellEditor
                          source={source}
                          cell={rule.cells[source.id] ?? null}
                          open={openKey === source.id}
                          onOpenChange={(nextOpen) =>
                            setOpenKey(nextOpen ? source.id : null)
                          }
                          onChange={(cell) =>
                            setContributions(
                              setContributionCell(
                                item.contributions,
                                source.id,
                                cell,
                                sourceOrder,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div>
              <Label>Fixed quantity</Label>
              <NumberInput
                className="mt-1 max-w-32"
                value={rule.constant}
                min={0}
                onChange={(value) => setContributions(setFixedQty(value))}
              />
            </div>
          )}

          <Button variant="destructive" onClick={onDelete}>
            Delete item
          </Button>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
