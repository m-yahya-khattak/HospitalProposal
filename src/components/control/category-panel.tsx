"use client";

import { useState } from "react";
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
import { slugify } from "@/lib/id";
import { categoryLabel, modelCategories } from "@/lib/format";
import type { PlanningModel } from "@/lib/types";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { Trash2 } from "lucide-react";

type Props = {
  categoryId: string;
  model: PlanningModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: PlanningModel) => void;
  onDeleted?: () => void;
};

export function CategoryPanel({
  categoryId,
  model,
  open,
  onOpenChange,
  onChange,
  onDeleted,
}: Props) {
  const categories = modelCategories(model);
  const labels = model.categoryLabels;
  const others = categories.filter((id) => id !== categoryId);
  const items = model.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.category === categoryId);
  const [moveTo, setMoveTo] = useState(others[0] ?? "");
  const canDelete = others.length > 0;

  const patch = (fn: (m: PlanningModel) => void) => {
    const next = structuredClone(model);
    fn(next);
    onChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="min-w-0">
            <p className="text-xs font-medium text-teal-800">Category</p>
            <SheetTitle>{categoryLabel(categoryId, labels)}</SheetTitle>
            <SheetDescription>
              {items.length} item{items.length === 1 ? "" : "s"}
            </SheetDescription>
          </div>
          <SheetCloseButton />
        </SheetHeader>
        <SheetBody className="space-y-6">
          <div>
            <Label>Name</Label>
            <Input
              className="mt-1"
              value={categoryLabel(categoryId, labels)}
              onChange={(event) => {
                const name = event.target.value;
                patch((m) => {
                  m.categoryLabels = {
                    ...(m.categoryLabels ?? {}),
                    [categoryId]: name,
                  };
                });
              }}
            />
          </div>

          <div>
            <p className="text-sm font-medium">Items</p>
            {items.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Nothing in this category yet.
              </p>
            ) : (
              <ul className="mt-2 divide-y rounded-xl ring-1 ring-stone-200">
                {items.map(({ item, index }) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <p className="min-w-0 truncate text-sm">{item.name}</p>
                    <Select
                      value={item.category}
                      onValueChange={(value) => {
                        if (!value) return;
                        patch((m) => {
                          m.items[index].category = value;
                        });
                      }}
                    >
                      <SelectTrigger className="w-40">
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
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canDelete ? (
            <div className="rounded-xl bg-stone-50 p-3">
              <p className="text-sm font-medium">Move all and delete</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Remaining items go to the category you pick, then this one is
                removed.
              </p>
              <div className="mt-3 flex gap-2">
                <Select
                  value={moveTo}
                  onValueChange={(value) => {
                    if (value) setMoveTo(value);
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Move items to" />
                  </SelectTrigger>
                  <SelectContent>
                    {others.map((id) => (
                      <SelectItem key={id} value={id}>
                        {categoryLabel(id, labels)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  disabled={!moveTo}
                  onClick={() => {
                    if (!moveTo) return;
                    patch((m) => {
                      for (const item of m.items) {
                        if (item.category === categoryId) {
                          item.category = moveTo;
                        }
                      }
                      m.categories = (m.categories ?? []).filter(
                        (id) => id !== categoryId,
                      );
                      if (
                        (DEFAULT_CATEGORIES as readonly string[]).includes(
                          categoryId,
                        )
                      ) {
                        m.hiddenCategories = [
                          ...new Set([
                            ...(m.hiddenCategories ?? []),
                            categoryId,
                          ]),
                        ];
                      }
                      if (m.categoryLabels) {
                        delete m.categoryLabels[categoryId];
                      }
                    });
                    onDeleted?.();
                    onOpenChange(false);
                  }}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Keep at least one category.
            </p>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function addCategoryToModel(model: PlanningModel, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const id = slugify(trimmed);
  const hidden = new Set(model.hiddenCategories ?? []);
  if (hidden.has(id)) {
    model.hiddenCategories = (model.hiddenCategories ?? []).filter(
      (row) => row !== id,
    );
  }
  const existing = modelCategories(model);
  if (!existing.includes(id) && !model.categories?.includes(id)) {
    model.categories = [...(model.categories ?? []), id];
  }
  model.categoryLabels = {
    ...(model.categoryLabels ?? {}),
    [id]: trimmed,
  };
  return id;
}
