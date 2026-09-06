"use client";

import { NumberInput } from "@/components/control/number-input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cellLabel, type CellMode, type MatrixCell } from "@/lib/formula-matrix";
import type { SourceOption } from "@/lib/formula-label";
import { cn } from "@/lib/utils";

const MODES: { id: CellMode; label: string }[] = [
  { id: "per", label: "Per" },
  { id: "every", label: "1 every n" },
  { id: "ifOn", label: "If on" },
];

export function CellEditor({
  source,
  cell,
  open,
  onOpenChange,
  onChange,
}: {
  source: SourceOption;
  cell: MatrixCell | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (cell: MatrixCell | null) => void;
}) {
  const draft: MatrixCell = cell ?? { mode: "per", n: 1 };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        className={cn(
          "flex h-8 w-full min-w-14 items-center justify-center rounded-lg text-xs tabular-nums transition-colors",
          cell
            ? "bg-teal-50 font-medium text-teal-900 ring-1 ring-teal-100 hover:bg-teal-100"
            : "text-stone-300 hover:bg-stone-50 hover:text-stone-500",
        )}
      >
        {cell ? cellLabel(cell) : "·"}
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <p className="text-xs font-medium text-muted-foreground">{source.label}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {MODES.map((mode) => (
            <Button
              key={mode.id}
              size="xs"
              variant={draft.mode === mode.id && cell ? "default" : "outline"}
              onClick={() => onChange({ mode: mode.id, n: draft.n || 1 })}
            >
              {mode.label}
            </Button>
          ))}
        </div>
        <div className="mt-3">
          <NumberInput
            value={draft.n}
            min={0.5}
            step={0.5}
            onChange={(n) =>
              onChange({ mode: draft.mode, n: Math.max(0.5, n) })
            }
          />
        </div>
        {cell ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              onChange(null);
              onOpenChange(false);
            }}
          >
            Clear
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
