"use client";

import { NumberInput } from "@/components/control/number-input";
import { useMoney } from "@/components/currency-provider";
import { Button } from "@/components/ui/button";
import { categoryLabel, formatInt } from "@/lib/format";
import type { Evaluation } from "@/lib/types";
import { Minus, Plus } from "lucide-react";

type Props = {
  result: Evaluation;
  labels?: Record<string, string>;
  onSelectCategory?: (id: string) => void;
  onSelectTheatres?: () => void;
  /** Hospital size — beds editable in header when write is allowed. */
  sizeVisible?: boolean;
  sizeWrite?: boolean;
  onChangeBeds?: (total: number) => void;
  onChangeArea?: (area: number) => void;
};

export function KpiStrip({
  result,
  labels,
  onSelectCategory,
  onSelectTheatres,
  sizeVisible = true,
  sizeWrite = false,
  onChangeBeds,
  onChangeArea,
}: Props) {
  const money = useMoney();
  const theatres = result.theatres;
  const theatreHint = [
    `${theatres.ot} OT`,
    `${theatres.minorOt} minor`,
    `${theatres.cathLab} cath`,
    `${theatres.labourDelivery} L&D`,
  ].join(" · ");

  const beds = result.totalBeds;
  const area = Math.round(result.areaSqft);

  return (
    <div className="border-t bg-[#f7f6f3]/80 px-4 py-3 lg:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {sizeVisible ? (
          <div className="relative shrink-0 overflow-hidden rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(15,118,110,0.12)] ring-1 ring-teal-800/10 sm:p-4 lg:min-w-[22rem]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-700 via-teal-500 to-teal-700/40"
            />
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-[0.14em] text-teal-800 uppercase">
                  Beds
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="shrink-0 border-stone-200 bg-stone-50 shadow-sm"
                    disabled={!sizeWrite}
                    aria-label="Decrease beds"
                    onClick={() => onChangeBeds?.(Math.max(10, beds - 10))}
                  >
                    <Minus />
                  </Button>
                  <NumberInput
                    className="min-w-0 flex-1 [&_input]:h-10 [&_input]:border-stone-200 [&_input]:bg-stone-50/80 [&_input]:font-heading [&_input]:text-xl [&_input]:font-medium [&_input]:shadow-inner [&_input]:tracking-tight"
                    value={beds}
                    min={10}
                    max={2000}
                    suffix="beds"
                    disabled={!sizeWrite}
                    onChange={(value) => onChangeBeds?.(value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="shrink-0 border-stone-200 bg-stone-50 shadow-sm"
                    disabled={!sizeWrite}
                    aria-label="Increase beds"
                    onClick={() => onChangeBeds?.(Math.min(2000, beds + 10))}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
              <div className="min-w-0 border-l border-stone-200/80 pl-3 sm:pl-4">
                <p className="text-[11px] font-medium tracking-[0.14em] text-teal-800 uppercase">
                  Area
                </p>
                <NumberInput
                  className="mt-2 [&_input]:h-10 [&_input]:border-stone-200 [&_input]:bg-stone-50/80 [&_input]:font-heading [&_input]:text-xl [&_input]:font-medium [&_input]:shadow-inner [&_input]:tracking-tight"
                  value={area}
                  min={1}
                  suffix="sq.ft"
                  disabled={!sizeWrite}
                  onChange={(value) => onChangeArea?.(value)}
                />
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onSelectTheatres}
          className="shrink-0 rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-stone-200/80 transition hover:ring-teal-800/25 hover:shadow-md lg:w-40"
        >
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Theatres
          </p>
          <p className="mt-1 font-heading text-3xl leading-none tracking-tight tabular-nums text-stone-900">
            {formatInt(theatres.totalRooms)}
          </p>
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            {theatreHint}
          </p>
        </button>

        <div className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-stone-200/80 sm:px-4">
          <div className="flex flex-wrap items-end gap-x-1 gap-y-3">
            {result.categoryRollup.map((row) => (
              <button
                key={row.id}
                type="button"
                className="min-w-[6.5rem] flex-1 rounded-xl px-2.5 py-2 text-left transition hover:bg-teal-50/70"
                onClick={() => onSelectCategory?.(row.id)}
              >
                <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground">
                  {categoryLabel(row.id, labels)}
                </p>
                <p className="mt-1 font-heading text-lg leading-none tracking-tight tabular-nums text-stone-900">
                  {formatInt(row.qty)}
                </p>
                <p className="mt-1.5 text-xs tabular-nums text-teal-800">
                  {money.format(row.premium, true)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  budget {money.format(row.budget, true)}
                </p>
              </button>
            ))}
            <div className="min-w-[9rem] flex-1 rounded-xl bg-gradient-to-br from-teal-800 to-teal-700 px-3 py-2.5 text-white shadow-[0_6px_20px_rgba(15,118,110,0.28)] sm:min-w-[10rem]">
              <p className="text-[11px] font-medium tracking-[0.14em] text-teal-100/90 uppercase">
                Total CAPEX
              </p>
              <p className="mt-1 font-heading text-xl leading-none tracking-tight tabular-nums sm:text-2xl">
                {money.format(result.capex.totalPremium)}
              </p>
              <p className="mt-2 text-[11px] text-teal-100/80">
                budget {money.format(result.capex.totalBudget)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
