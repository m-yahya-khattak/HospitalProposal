"use client";

import { useMemo, useState } from "react";
import { FormulaMatrix } from "@/components/control/formula-matrix";
import { ItemDrawer } from "@/components/control/item-drawer";
import { CategoryPanel, addCategoryToModel } from "@/components/control/category-panel";
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
import { newId, slugify } from "@/lib/id";
import { sourceOptions } from "@/lib/formula-label";
import { formulaSentence } from "@/lib/formula-matrix";
import { categoryLabel, formatInt, modelCategories } from "@/lib/format";
import type { Evaluation, Formula, PlanningModel } from "@/lib/types";
import { LayoutGrid, List, Pencil, Plus, Trash2 } from "lucide-react";

type Props = {
  model: PlanningModel;
  result: Evaluation;
  onChange: (next: PlanningModel) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
};

function ItemRow({
  item,
  index,
  qty,
  sources,
  onOpen,
  onPatch,
  onDelete,
}: {
  item: PlanningModel["items"][number];
  index: number;
  qty: number;
  sources: ReturnType<typeof sourceOptions>;
  onOpen: () => void;
  onPatch: (fn: (m: PlanningModel) => void) => void;
  onDelete: () => void;
}) {
  return (
    <li className="grid items-center gap-3 px-4 py-3 md:grid-cols-6">
      <button type="button" className="min-w-0 text-left" onClick={onOpen}>
        <p className="font-medium hover:text-teal-800">{item.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formulaSentence(item.contributions, sources, qty)}
        </p>
      </button>
      <p className="font-mono text-sm tabular-nums text-teal-800">
        {formatInt(qty)}
      </p>
      <NumberInput
        value={item.premiumUnit}
        min={0}
        onChange={(value) =>
          onPatch((m) => {
            m.items[index].premiumUnit = value;
          })
        }
      />
      <NumberInput
        value={item.budgetUnit}
        min={0}
        onChange={(value) =>
          onPatch((m) => {
            m.items[index].budgetUnit = value;
          })
        }
      />
      <Switch
        checked={item.enabled}
        onCheckedChange={(checked) =>
          onPatch((m) => {
            m.items[index].enabled = Boolean(checked);
          })
        }
      />
      <Button variant="ghost" size="icon-sm" onClick={onDelete}>
        <Trash2 />
      </Button>
    </li>
  );
}

export function ItemsTab({
  model,
  result,
  onChange,
  filter,
  onFilterChange,
}: Props) {
  const [view, setView] = useState<"list" | "matrix">("list");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("ward-equipment");
  const [categoryName, setCategoryName] = useState("");
  const [itemId, setItemId] = useState<string | null>(null);
  const [manageId, setManageId] = useState<string | null>(null);
  const sources = sourceOptions(model);
  const categories = modelCategories(model);
  const labels = model.categoryLabels;

  const patch = (fn: (m: PlanningModel) => void) => {
    const next = structuredClone(model);
    fn(next);
    onChange(next);
  };

  const grouped = useMemo(() => {
    const visible = model.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => filter === "all" || item.category === filter);
    const map = new Map<string, typeof visible>();
    for (const row of visible) {
      const list = map.get(row.item.category) ?? [];
      list.push(row);
      map.set(row.item.category, list);
    }
    const order = filter === "all" ? categories : [filter];
    return order
      .map((id) => ({ id, rows: map.get(id) ?? [] }))
      .filter((group) => group.rows.length > 0);
  }, [model.items, filter, categories]);

  const patchItem = (id: string, contributions: Formula[]) => {
    patch((m) => {
      const item = m.items.find((row) => row.id === id);
      if (item) item.contributions = contributions;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight">Items</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set prices and how quantity follows beds, theatres, and specialties.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg bg-stone-100 p-0.5">
            <Button
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              onClick={() => setView("list")}
            >
              <List data-icon="inline-start" />
              List
            </Button>
            <Button
              size="sm"
              variant={view === "matrix" ? "default" : "ghost"}
              onClick={() => setView("matrix")}
            >
              <LayoutGrid data-icon="inline-start" />
              Matrix
            </Button>
          </div>
          <Button
            onClick={() => {
              setName("");
              setCategory(filter === "all" ? "ward-equipment" : filter);
              setOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Add item
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...categories] as const).map((id) => (
          <div key={id} className="flex items-center">
            <Button
              size="sm"
              variant={filter === id ? "default" : "outline"}
              className={id === "all" ? undefined : "rounded-r-none"}
              onClick={() => onFilterChange(id)}
            >
              {id === "all" ? "All" : categoryLabel(id, labels)}
            </Button>
            {id !== "all" ? (
              <Button
                size="sm"
                variant={filter === id ? "default" : "outline"}
                className="rounded-l-none border-l-0 px-1.5"
                aria-label={`Edit ${categoryLabel(id, labels)}`}
                onClick={() => setManageId(id)}
              >
                <Pencil />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      <form
        className="flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = categoryName.trim();
          if (!trimmed) return;
          let created: string | null = null;
          patch((m) => {
            created = addCategoryToModel(m, trimmed);
          });
          if (created) {
            onFilterChange(created);
            setCategory(created);
          }
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

      {view === "matrix" ? (
        <FormulaMatrix
          model={model}
          result={result}
          filter={filter}
          onPatchItem={patchItem}
          onOpenItem={setItemId}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section
              key={group.id}
              className="overflow-hidden rounded-xl bg-white ring-1 ring-stone-200"
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h3 className="text-sm font-medium">
                  {categoryLabel(group.id, labels)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {group.rows.length} items
                </p>
              </div>
              <div className="hidden items-center gap-3 border-b px-4 py-2 text-[11px] font-medium text-muted-foreground md:grid md:grid-cols-6">
                <span>Item</span>
                <span>Qty</span>
                <span>Premium</span>
                <span>Budget</span>
                <span>On</span>
                <span className="sr-only">Actions</span>
              </div>
              <ul className="divide-y">
                {group.rows.map(({ item, index }) => {
                  const qty =
                    result.items.find((row) => row.id === item.id)?.qty ?? 0;
                  return (
                    <ItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      qty={qty}
                      sources={sources}
                      onOpen={() => setItemId(item.id)}
                      onPatch={patch}
                      onDelete={() =>
                        patch((m) => {
                          m.items = m.items.filter((_, i) => i !== index);
                        })
                      }
                    />
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {manageId ? (
        <CategoryPanel
          categoryId={manageId}
          model={model}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setManageId(null);
          }}
          onChange={onChange}
          onDeleted={() => {
            if (filter === manageId) onFilterChange("all");
            setManageId(null);
          }}
        />
      ) : null}

      {itemId ? (
        <ItemDrawer
          itemId={itemId}
          model={model}
          result={result}
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setItemId(null);
          }}
          onChange={onChange}
          onDelete={() => {
            patch((m) => {
              m.items = m.items.filter((row) => row.id !== itemId);
            });
            setItemId(null);
          }}
        />
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add item</DialogTitle>
            <DialogDescription>
              Set prices and quantity after it appears in the list.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                className="mt-1"
                value={name}
                onChange={(event) => setName(event.target.value)}
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
                  {categories.map((id) => (
                    <SelectItem key={id} value={id}>
                      {categoryLabel(id, labels)}
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
                const id = newId(slugify(trimmed));
                patch((m) => {
                  m.items.push({
                    id,
                    name: trimmed,
                    category,
                    premiumUnit: 0,
                    budgetUnit: 0,
                    enabled: true,
                    contributions: [],
                  });
                });
                setOpen(false);
                setItemId(id);
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
