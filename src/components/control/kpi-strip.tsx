"use client";

import { formatCompact, formatInt, formatTsh, formatUsd } from "@/lib/format";
import type { Evaluation } from "@/lib/types";

function Cell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 font-heading text-xl leading-none text-foreground tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function KpiStrip({ result }: { result: Evaluation }) {
  return (
    <div className="grid grid-cols-2 gap-4 border-y bg-teal-50/40 px-4 py-3 md:grid-cols-3 lg:grid-cols-6 lg:px-6">
      <Cell label="Beds" value={formatInt(result.totalBeds)} />
      <Cell
        label="Theatres"
        value={formatInt(result.theatres.totalRooms)}
        hint={`${result.theatres.ot} OT · ${result.theatres.minorOt} minor`}
      />
      <Cell label="Equipment" value={formatInt(result.equipmentUnits)} hint="units" />
      <Cell
        label="Area"
        value={formatInt(result.areaSqft)}
        hint="sq.ft"
      />
      <Cell
        label="Premium"
        value={formatTsh(result.bomPremium).replace("TSH ", "")}
        hint={`${formatUsd(result.capex.totalUsdPremium)} CAPEX`}
      />
      <Cell
        label="Budgetary"
        value={formatCompact(result.bomBudget)}
        hint={`${formatUsd(result.capex.totalUsdBudget)} CAPEX`}
      />
    </div>
  );
}
