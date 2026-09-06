"use client";

import { useMemo, useState } from "react";
import { CellEditor } from "@/components/control/cell-editor";
import { parseContributions, setContributionCell } from "@/lib/formula-matrix";
import { sourceOptions, type SourceOption } from "@/lib/formula-label";
import { categoryLabel, formatInt } from "@/lib/format";
import type { CatalogItem, Evaluation, Formula, PlanningModel } from "@/lib/types";

type Props = {
  model: PlanningModel;
  result: Evaluation;
  filter: string;
  onPatchItem: (itemId: string, contributions: Formula[]) => void;
  onOpenItem: (itemId: string) => void;
};

export function FormulaMatrix({
  model,
  result,
  filter,
  onPatchItem,
  onOpenItem,
}: Props) {
  const sources = sourceOptions(model);
  const groups = useMemo(() => {
    const map = new Map<string, SourceOption[]>();
    for (const source of sources) {
      const list = map.get(source.group) ?? [];
      list.push(source);
      map.set(source.group, list);
    }
    return [...map.entries()];
  }, [sources]);
  const sourceOrder = sources.map((s) => s.id);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const rows = model.items.filter(
    (item) => filter === "all" || item.category === filter,
  );

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">
      <div className="max-h-[70vh] overflow-auto">
        <table className="min-w-max border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-white">
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 z-30 w-44 min-w-44 max-w-44 border-b border-r bg-white px-3 py-2 text-left font-medium"
              >
                Item
              </th>
              <th
                rowSpan={2}
                className="sticky left-44 z-30 w-16 min-w-16 border-b border-r bg-white px-2 py-2 text-right font-medium"
              >
                Qty
              </th>
              {groups.map(([group, cols]) => (
                <th
                  key={group}
                  colSpan={cols.length}
                  className="border-b border-l px-2 py-1.5 text-center text-[11px] font-medium text-muted-foreground"
                >
                  {group}
                </th>
              ))}
            </tr>
            <tr>
              {sources.map((source) => (
                <th
                  key={source.id}
                  className="min-w-16 border-b border-l px-1 py-1.5 text-center text-[11px] font-medium text-stone-500"
                  title={source.label}
                >
                  {source.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const qty =
                result.items.find((row) => row.id === item.id)?.qty ?? 0;
              const rule = parseContributions(item.contributions);
              return (
                <tr key={item.id} className="hover:bg-stone-50/80">
                  <td className="sticky left-0 z-10 w-44 min-w-44 max-w-44 border-b border-r bg-white px-3 py-1.5">
                    <button
                      type="button"
                      className="line-clamp-2 text-left font-medium hover:text-teal-800"
                      onClick={() => onOpenItem(item.id)}
                    >
                      {item.name}
                    </button>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {categoryLabel(item.category)}
                    </p>
                  </td>
                  <td className="sticky left-44 z-10 w-16 min-w-16 border-b border-r bg-white px-2 py-1.5 text-right font-mono text-xs tabular-nums text-teal-800">
                    {formatInt(qty)}
                  </td>
                  {sources.map((source) => {
                    const key = `${item.id}:${source.id}`;
                    return (
                      <td key={source.id} className="border-b border-l p-0.5">
                        <CellEditor
                          source={source}
                          cell={rule.cells[source.id] ?? null}
                          open={openKey === key}
                          onOpenChange={(open) =>
                            setOpenKey(open ? key : null)
                          }
                          onChange={(cell) =>
                            onPatchItem(
                              item.id,
                              setContributionCell(
                                item.contributions,
                                source.id,
                                cell,
                                sourceOrder,
                              ),
                            )
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}