"use client";

import { useEffect, useState } from "react";
import { useMoney } from "@/components/currency-provider";
import { categoryLabel, formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Evaluation } from "@/lib/types";

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

function formatGrouped(n: number) {
  return formatInt(n);
}

function parseGrouped(raw: string) {
  const n = Number(raw.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function SizeTile({
  label,
  value,
  suffix,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max?: number;
  disabled?: boolean;
  onChange?: (value: number) => void;
}) {
  const [text, setText] = useState(formatGrouped(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatGrouped(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    let next = parseGrouped(raw);
    if (!Number.isFinite(next)) {
      setText(formatGrouped(value));
      return;
    }
    next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    next = Math.round(next);
    onChange?.(next);
    setText(formatGrouped(next));
  };

  return (
    <label
      className={cn(
        "relative block min-w-0 flex-1 overflow-hidden rounded-xl bg-gradient-to-br from-teal-800 to-teal-700 px-3 py-2.5 text-white shadow-[0_8px_24px_rgba(15,118,110,0.32)] ring-1 ring-teal-900/20",
        disabled && "opacity-80",
      )}
    >
      <p className="text-[11px] font-medium tracking-[0.14em] text-teal-100/90 uppercase">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={text}
          aria-label={label}
          className="min-w-0 w-full bg-transparent font-heading text-2xl leading-none tracking-tight tabular-nums text-white outline-none placeholder:text-teal-100/50 disabled:cursor-default sm:text-[1.65rem]"
          onFocus={(event) => {
            setFocused(true);
            event.target.select();
          }}
          onBlur={() => {
            setFocused(false);
            commit(text);
          }}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === "" || /^[\d,]*\.?\d*$/.test(raw)) setText(raw);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <span className="shrink-0 text-[11px] font-medium text-teal-100/75">
          {suffix}
        </span>
      </div>
    </label>
  );
}

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
    <div className="border-b bg-[#f7f6f3]/80 px-4 py-2.5 lg:px-6">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start">
        {sizeVisible ? (
          <div className="flex w-full flex-col gap-2.5 lg:w-auto lg:min-w-[20rem] lg:max-w-md lg:flex-row">
            <SizeTile
              label="Beds"
              value={beds}
              suffix="beds"
              min={10}
              max={2000}
              disabled={!sizeWrite}
              onChange={onChangeBeds}
            />
            <SizeTile
              label="Area"
              value={area}
              suffix="sq.ft"
              min={1}
              disabled={!sizeWrite}
              onChange={onChangeArea}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={onSelectTheatres}
          className="shrink-0 rounded-xl bg-white px-3.5 py-2.5 text-left shadow-sm ring-1 ring-stone-200/80 transition hover:ring-teal-800/25 hover:shadow-md lg:w-36"
        >
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Theatres
          </p>
          <p className="mt-1 font-heading text-2xl leading-none tracking-tight tabular-nums text-stone-900 sm:text-3xl">
            {formatInt(theatres.totalRooms)}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            {theatreHint}
          </p>
        </button>

        <div className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-stone-200/80 sm:px-4">
          <div className="flex flex-wrap items-end gap-x-1 gap-y-2">
            {result.categoryRollup.map((row) => (
              <button
                key={row.id}
                type="button"
                className="min-w-[6.5rem] flex-1 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-teal-50/70"
                onClick={() => onSelectCategory?.(row.id)}
              >
                <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground">
                  {categoryLabel(row.id, labels)}
                </p>
                <p className="mt-1 font-heading text-lg leading-none tracking-tight tabular-nums text-stone-900">
                  {formatInt(row.qty)}
                </p>
                <p className="mt-1 text-xs tabular-nums text-teal-800">
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
