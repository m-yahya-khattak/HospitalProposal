"use client";

import { useMoney } from "@/components/currency-provider";
import { categoryLabel, formatInt } from "@/lib/format";
import type { Evaluation } from "@/lib/types";

type Props = {
  result: Evaluation;
  labels?: Record<string, string>;
  onSelectCategory?: (id: string) => void;
  onSelectTheatres?: () => void;
};

function SizeCell({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-heading text-xl leading-none tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </>
  );
  if (!onClick) return <div className="min-w-0">{inner}</div>;
  return (
    <button
      type="button"
      className="min-w-0 rounded-lg text-left hover:text-teal-800"
      onClick={onClick}
    >
      {inner}
    </button>
  );
}

export function KpiStrip({
  result,
  labels,
  onSelectCategory,
  onSelectTheatres,
}: Props) {
  const money = useMoney();
  const theatres = result.theatres;
  const theatreHint = [
    `${theatres.ot} OT`,
    `${theatres.minorOt} minor`,
    `${theatres.cathLab} cath`,
    `${theatres.labourDelivery} L&D`,
  ].join(" · ");

  return (
    <div className="grid gap-4 border-y bg-white px-4 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:px-6">
      <div className="grid grid-cols-3 gap-4">
        <SizeCell label="Beds" value={formatInt(result.totalBeds)} />
        <SizeCell
          label="Theatres"
          value={formatInt(theatres.totalRooms)}
          hint={theatreHint}
          onClick={onSelectTheatres}
        />
        <SizeCell
          label="Area"
          value={formatInt(result.areaSqft)}
          hint="sq.ft"
        />
      </div>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        {result.categoryRollup.map((row) => (
          <button
            key={row.id}
            type="button"
            className="min-w-0 text-left hover:text-teal-800"
            onClick={() => onSelectCategory?.(row.id)}
          >
            <p className="text-[11px] font-medium text-muted-foreground">
              {categoryLabel(row.id, labels)}
            </p>
            <p className="mt-0.5 text-sm tabular-nums">
              {formatInt(row.qty)}
              <span className="ml-1 text-xs text-muted-foreground">
                {money.format(row.premium, true)}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              budget {money.format(row.budget, true)}
            </p>
          </button>
        ))}
        <div className="min-w-0 border-l border-stone-200 pl-5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Total CAPEX
          </p>
          <p className="mt-0.5 font-heading text-xl leading-none tabular-nums">
            {money.format(result.capex.totalPremium)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            budget {money.format(result.capex.totalBudget)}
          </p>
        </div>
      </div>
    </div>
  );
}
