"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CurrencyProvider, useMoney } from "@/components/currency-provider";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePlanningModel } from "@/hooks/use-planning-model";
import { departmentKit } from "@/lib/department-kit";
import { categoryLabel, formatInt, formatPercent } from "@/lib/format";
import type { Evaluation, PlanningModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const TEAL = "#0f766e";
const STONE = "#a8a29e";
const TEAL_SOFT = "#5eead4";

const SLIDES = [
  { id: "title", label: "Title" },
  { id: "snapshot", label: "Snapshot" },
  { id: "mix", label: "Departments" },
  { id: "theatres", label: "Theatres" },
  { id: "inventory", label: "Inventory" },
  { id: "kit", label: "Dept kit" },
  { id: "capex", label: "CAPEX" },
  { id: "close", label: "Summary" },
] as const;

function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatValue?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-md ring-1 ring-stone-200">
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}:{" "}
          {typeof p.value === "number"
            ? (formatValue ?? formatInt)(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
}

function SlideChrome({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col px-5 py-6 sm:px-8 lg:px-12 lg:py-8",
        className,
      )}
    >
      <div className="shrink-0">
        <p className="text-[11px] font-medium tracking-[0.2em] text-teal-800 uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 font-heading text-3xl tracking-tight text-stone-900 sm:text-4xl">
          {title}
        </h2>
      </div>
      <div className="mt-5 min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-4 shadow-sm ring-1",
        accent
          ? "bg-gradient-to-br from-teal-800 to-teal-700 text-white shadow-[0_8px_24px_rgba(15,118,110,0.28)] ring-teal-900/20"
          : "bg-white ring-stone-200",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-medium tracking-[0.14em] uppercase",
          accent ? "text-teal-100/90" : "text-stone-500",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-heading text-2xl leading-none tracking-tight tabular-nums sm:text-3xl",
          accent ? "text-white" : "text-stone-900",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p
          className={cn(
            "mt-2 text-xs",
            accent ? "text-teal-100/80" : "text-stone-500",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ProposalDeck({
  model,
  result,
  live,
}: {
  model: PlanningModel;
  result: Evaluation;
  live: boolean;
}) {
  const money = useMoney();
  const shown = (usd: number) =>
    Math.round(usd * (money.missing ? 1 : money.rate));

  const [index, setIndex] = useState(0);
  const [ptr, setPtr] = useState({ x: 0.5, y: 0.5 });
  const activeDepts = useMemo(
    () => result.departments.filter((d) => d.enabled !== false && d.beds > 0),
    [result.departments],
  );
  const [deptId, setDeptId] = useState<string>("");

  useEffect(() => {
    if (!deptId && activeDepts[0]) setDeptId(activeDepts[0].id);
  }, [activeDepts, deptId]);

  const go = (next: number) => {
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        go(index + 1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        go(0);
      } else if (event.key === "End") {
        event.preventDefault();
        go(SLIDES.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index]);

  const parallaxX = (ptr.x - 0.5) * 28;
  const parallaxY = (ptr.y - 0.5) * 20;
  const slideShift = (index / Math.max(1, SLIDES.length - 1)) * 24;

  const mix = result.departments.map((d) => ({
    name: d.name,
    beds: d.enabled === false ? 0 : d.beds,
    share: d.sharePercent,
    on: d.enabled !== false,
  }));
  const pie = mix.filter((d) => d.beds > 0);

  const equipment = result.items.filter(
    (i) =>
      i.enabled &&
      (i.category === "ward-equipment" || i.category === "theatre-equipment"),
  );
  const costChart = equipment
    .filter((i) => i.premiumCost > 0)
    .sort((a, b) => b.premiumCost - a.premiumCost)
    .slice(0, 8)
    .map((i) => ({
      name: i.name,
      Premium: shown(i.premiumCost),
      Budgetary: shown(i.budgetCost),
    }));

  const capexChart = result.capex.lines.map((l) => ({
    name: l.name,
    Premium: shown(l.premium),
    Budgetary: shown(l.budget),
  }));

  const kitLines = deptId ? departmentKit(model, result, deptId) : [];
  const kitDept = result.departments.find((d) => d.id === deptId);
  const kitFromDept = kitLines.reduce((s, line) => s + line.fromThisDept, 0);

  const specialtiesOn = model.specialties.filter((s) => s.enabled);

  const slide = SLIDES[index];

  return (
    <div
      className="relative flex h-dvh flex-col overflow-hidden bg-[#f7f6f3] text-stone-900"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        setPtr({
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
        });
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -left-[12%] top-[8%] h-[42vmin] w-[42vmin] will-change-transform"
          style={{
            transform: `translate3d(${parallaxX}px, ${parallaxY + slideShift * 0.3}px, 0)`,
          }}
        >
          <div className="display-glow-a h-full w-full rounded-full bg-teal-600/20 blur-3xl" />
        </div>
        <div
          className="absolute -right-[8%] top-[28%] h-[48vmin] w-[48vmin] will-change-transform"
          style={{
            transform: `translate3d(${-parallaxX * 0.7}px, ${-parallaxY * 0.6 - slideShift * 0.4}px, 0)`,
          }}
        >
          <div className="display-glow-b h-full w-full rounded-full bg-teal-800/14 blur-3xl" />
        </div>
        <div
          className="absolute bottom-[-10%] left-[28%] h-[38vmin] w-[50vmin] will-change-transform"
          style={{
            transform: `translate3d(${parallaxX * 0.45}px, ${parallaxY * 0.35 + slideShift * 0.25}px, 0)`,
          }}
        >
          <div className="display-glow-c h-full w-full rounded-full bg-teal-500/12 blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_transparent_40%,_#f7f6f3_78%)]" />
      </div>

      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 bg-white/80 px-4 py-2.5 backdrop-blur-sm sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-medium tracking-[0.18em] text-teal-800 uppercase">
            Display · {index + 1}/{SLIDES.length}
          </p>
          <p className="truncate font-heading text-lg tracking-tight">
            {model.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CurrencySwitcher />
          {live ? (
            <Badge className="bg-teal-700 text-white">Live</Badge>
          ) : (
            <Badge variant="outline">Connecting</Badge>
          )}
          <Link
            href="/control"
            className="text-xs text-stone-500 hover:text-teal-800"
          >
            Studio
          </Link>
        </div>
      </header>

      <div className="relative z-10 min-h-0 flex-1">
        {slide.id === "title" ? (
          <div className="flex h-full flex-col justify-center px-6 sm:px-12 lg:px-20">
            <p className="text-[11px] font-medium tracking-[0.22em] text-teal-800 uppercase">
              Project planning
            </p>
            <h1 className="mt-4 max-w-4xl font-heading text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              {model.title}
            </h1>
            <p className="mt-5 max-w-xl text-base text-stone-600 sm:text-lg">
              Beds, theatres, inventory and capital cost — one live model. Use
              the arrows to walk through the plan.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <KpiTile
                label="Beds"
                value={formatInt(result.totalBeds)}
                accent
              />
              <KpiTile
                label="Premium CAPEX"
                value={money.format(result.capex.totalPremium)}
                accent
              />
              <KpiTile
                label="Area"
                value={`${formatInt(result.areaSqft)} sq.ft`}
              />
            </div>
          </div>
        ) : null}

        {slide.id === "snapshot" ? (
          <SlideChrome eyebrow="Overview" title="Plan snapshot">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <KpiTile label="Planned beds" value={formatInt(result.totalBeds)} accent />
              <KpiTile
                label="Theatres / procedure"
                value={formatInt(result.theatres.totalRooms)}
                hint={`${formatInt(result.theatres.ot)} OT · ${formatInt(result.theatres.minorOt)} minor · ${formatInt(result.theatres.cathLab)} cath · ${formatInt(result.theatres.labourDelivery)} L&D`}
              />
              <KpiTile
                label="Indicative area"
                value={formatInt(result.areaSqft)}
                hint="sq.ft"
              />
              <KpiTile
                label="Premium CAPEX"
                value={money.format(result.capex.totalPremium)}
                accent
              />
              <KpiTile
                label="Budgetary CAPEX"
                value={money.format(result.capex.totalBudget)}
              />
              <KpiTile
                label="Inventory units"
                value={formatInt(
                  result.categoryRollup.reduce((s, r) => s + r.qty, 0),
                )}
                hint={`${result.categoryRollup.length} categories`}
              />
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
                <p className="text-xs tracking-wide text-stone-500 uppercase">
                  Premium path
                </p>
                <p className="mt-2 font-heading text-3xl tabular-nums">
                  {money.format(result.capex.totalPremium)}
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  Catalog {money.format(result.capex.catalogPremium)} ·
                  construction {money.format(result.capex.constructionPremium)}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
                <p className="text-xs tracking-wide text-stone-500 uppercase">
                  Budgetary path
                </p>
                <p className="mt-2 font-heading text-3xl tabular-nums">
                  {money.format(result.capex.totalBudget)}
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  Catalog {money.format(result.capex.catalogBudget)} ·
                  construction {money.format(result.capex.constructionBudget)}
                </p>
              </div>
            </div>
          </SlideChrome>
        ) : null}

        {slide.id === "mix" ? (
          <SlideChrome eyebrow="Department mix" title="Beds by department">
            <div className="grid h-full min-h-[22rem] gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="flex min-h-[16rem] flex-col rounded-2xl bg-white p-3 ring-1 ring-stone-200 sm:p-4">
                <div className="min-h-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mix.filter((d) => d.on)}
                      layout="vertical"
                      margin={{ left: 8, right: 12, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid stroke="#e7e5e4" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: "#78716c", fontSize: 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fill: "#44403c", fontSize: 11 }}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="beds"
                        name="Beds"
                        fill={TEAL}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex min-h-0 flex-col gap-3">
                <div className="h-40 shrink-0 rounded-2xl bg-white p-3 ring-1 ring-stone-200 sm:h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pie}
                        dataKey="beds"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={1}
                      >
                        {pie.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={i % 2 === 0 ? TEAL : TEAL_SOFT}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white ring-1 ring-stone-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-stone-50 hover:bg-stone-50">
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Share</TableHead>
                        <TableHead className="text-right">Beds</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.departments.map((d) => (
                        <TableRow
                          key={d.id}
                          className={d.enabled === false ? "opacity-50" : undefined}
                        >
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell className="text-right tabular-nums text-stone-500">
                            {formatPercent(d.sharePercent, 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatInt(d.beds)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {d.enabled === false ? "Off" : "On"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </SlideChrome>
        ) : null}

        {slide.id === "theatres" ? (
          <SlideChrome eyebrow="Clinical platform" title="Theatres & specialties">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["Operation theatre", result.theatres.ot],
                  ["Minor theatre", result.theatres.minorOt],
                  ["Cath lab", result.theatres.cathLab],
                  ["Labour & delivery", result.theatres.labourDelivery],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-white p-5 ring-1 ring-stone-200"
                >
                  <p className="text-xs tracking-wide text-stone-500 uppercase">
                    {label}
                  </p>
                  <p className="mt-2 font-heading text-4xl tabular-nums text-teal-900">
                    {formatInt(value)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
              <p className="text-sm font-medium text-stone-900">
                Specialties on
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {specialtiesOn.length} of {model.specialties.length} enabled
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {specialtiesOn.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-full bg-teal-800 px-3 py-1.5 text-sm text-white"
                  >
                    {s.name}
                  </li>
                ))}
                {specialtiesOn.length === 0 ? (
                  <li className="text-sm text-stone-500">None selected</li>
                ) : null}
              </ul>
            </div>
          </SlideChrome>
        ) : null}

        {slide.id === "inventory" ? (
          <SlideChrome eyebrow="Inventory management" title="Catalog by category">
            <div className="grid h-full min-h-[22rem] gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="min-h-[14rem] rounded-2xl bg-white p-3 ring-1 ring-stone-200 sm:p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={costChart}
                    margin={{ left: 4, right: 8, top: 8, bottom: 8 }}
                  >
                    <CartesianGrid stroke="#e7e5e4" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#78716c", fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={64}
                    />
                    <YAxis tick={{ fill: "#78716c", fontSize: 11 }} />
                    <Tooltip
                      content={
                        <ChartTooltip formatValue={money.formatShown} />
                      }
                    />
                    <Bar dataKey="Premium" fill={TEAL} radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="Budgetary"
                      fill={STONE}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="min-h-0 overflow-auto rounded-2xl bg-white ring-1 ring-stone-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-stone-50 hover:bg-stone-50">
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Premium</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.categoryRollup.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {categoryLabel(row.id, model.categoryLabels)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatInt(row.qty)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-teal-800">
                          {money.format(row.premium)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-stone-500">
                          {money.format(row.budget)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-stone-50 font-medium">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatInt(
                          result.categoryRollup.reduce((s, r) => s + r.qty, 0),
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money.format(result.bomPremium)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money.format(result.bomBudget)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <div className="border-t border-stone-100 px-4 py-3">
                  <p className="mb-2 text-xs font-medium tracking-wide text-stone-500 uppercase">
                    Top equipment lines
                  </p>
                  <Table>
                    <TableBody>
                      {equipment.slice(0, 10).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatInt(item.qty)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-teal-800">
                            {item.premiumCost
                              ? money.format(item.premiumCost)
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </SlideChrome>
        ) : null}

        {slide.id === "kit" ? (
          <SlideChrome
            eyebrow="Department kit"
            title={kitDept ? `${kitDept.name} equipment` : "Pick a department"}
          >
            <div className="mb-4 flex flex-wrap gap-2">
              {activeDepts.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDeptId(d.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm transition",
                    deptId === d.id
                      ? "bg-teal-800 text-white shadow-sm"
                      : "bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-teal-800/30",
                  )}
                >
                  {d.name}
                  <span className="ml-1.5 tabular-nums opacity-70">
                    {formatInt(d.beds)}
                  </span>
                </button>
              ))}
            </div>
            <div className="mb-3 flex flex-wrap gap-4 text-sm text-stone-600">
              <p>
                <span className="font-medium text-stone-900">
                  {formatInt(kitLines.length)}
                </span>{" "}
                rules
              </p>
              <p>
                From this department ≈{" "}
                <span className="font-medium tabular-nums text-teal-800">
                  {formatInt(Math.round(kitFromDept))}
                </span>{" "}
                units
              </p>
            </div>
            <div className="max-h-[min(52vh,28rem)] overflow-auto rounded-2xl bg-white ring-1 ring-stone-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50 hover:bg-stone-50">
                    <TableHead>Item</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead className="text-right">From dept</TableHead>
                    <TableHead className="text-right">Item total</TableHead>
                    <TableHead className="text-right">Premium</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kitLines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-stone-500"
                      >
                        No inventory rules use this department yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    kitLines.map((line) => {
                      const itemResult = result.items.find(
                        (i) => i.id === line.item.id,
                      );
                      const share =
                        line.itemQty > 0
                          ? line.fromThisDept / line.itemQty
                          : 0;
                      const premiumShare =
                        (itemResult?.premiumCost ?? 0) * share;
                      return (
                        <TableRow
                          key={`${line.item.id}-${line.formulaIndex}`}
                        >
                          <TableCell>
                            <p className="font-medium">{line.item.name}</p>
                            <p className="text-xs text-stone-500">
                              {categoryLabel(
                                line.item.category,
                                model.categoryLabels,
                              )}
                            </p>
                          </TableCell>
                          <TableCell className="max-w-[14rem] text-stone-600">
                            {line.formulaLabel}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatInt(Math.ceil(line.fromThisDept - 1e-10))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-stone-500">
                            {formatInt(line.itemQty)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-teal-800">
                            {premiumShare
                              ? money.format(premiumShare)
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </SlideChrome>
        ) : null}

        {slide.id === "capex" ? (
          <SlideChrome eyebrow="Capital" title="Indicative CAPEX">
            <div className="grid h-full min-h-[22rem] gap-4 xl:grid-cols-2">
              <div className="min-h-[14rem] rounded-2xl bg-white p-3 ring-1 ring-stone-200 sm:p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={capexChart}
                    layout="vertical"
                    margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#e7e5e4" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "#78716c", fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fill: "#44403c", fontSize: 11 }}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip formatValue={money.formatShown} />
                      }
                    />
                    <Bar
                      dataKey="Premium"
                      fill={TEAL}
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="Budgetary"
                      fill={STONE}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex min-h-0 flex-col gap-3">
                <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white ring-1 ring-stone-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-stone-50 hover:bg-stone-50">
                        <TableHead>Line</TableHead>
                        <TableHead>Kind</TableHead>
                        <TableHead className="text-right">Premium</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.capex.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">
                            {line.name}
                          </TableCell>
                          <TableCell className="capitalize text-stone-500">
                            {line.kind}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-teal-800">
                            {money.format(line.premium)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-stone-500">
                            {money.format(line.budget)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <KpiTile
                    label="Total premium"
                    value={money.format(result.capex.totalPremium)}
                    accent
                    hint={
                      model.capex.landExcluded ? "Land excluded" : undefined
                    }
                  />
                  <KpiTile
                    label="Total budgetary"
                    value={money.format(result.capex.totalBudget)}
                  />
                </div>
              </div>
            </div>
          </SlideChrome>
        ) : null}

        {slide.id === "close" ? (
          <SlideChrome eyebrow="Summary" title="Premium versus budgetary">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-gradient-to-br from-teal-800 to-teal-700 p-8 text-white shadow-[0_12px_40px_rgba(15,118,110,0.3)]">
                <p className="text-[11px] font-medium tracking-[0.14em] text-teal-100/90 uppercase">
                  Premium
                </p>
                <p className="mt-3 font-heading text-4xl tabular-nums tracking-tight sm:text-5xl">
                  {money.format(result.capex.totalPremium)}
                </p>
                <p className="mt-4 text-sm text-teal-100/85">
                  {formatInt(result.totalBeds)} beds ·{" "}
                  {formatInt(result.theatres.totalRooms)} theatres ·{" "}
                  {formatInt(result.areaSqft)} sq.ft
                </p>
              </div>
              <div className="rounded-2xl bg-white p-8 ring-1 ring-stone-200">
                <p className="text-[11px] font-medium tracking-[0.14em] text-stone-500 uppercase">
                  Budgetary
                </p>
                <p className="mt-3 font-heading text-4xl tabular-nums tracking-tight text-stone-900 sm:text-5xl">
                  {money.format(result.capex.totalBudget)}
                </p>
                <p className="mt-4 text-sm text-stone-500">
                  Figures update live from the control studio.
                </p>
              </div>
            </div>
            <div className="mt-8 overflow-auto rounded-2xl bg-white ring-1 ring-stone-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50 hover:bg-stone-50">
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Premium</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.categoryRollup.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {categoryLabel(row.id, model.categoryLabels)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money.format(row.premium)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-stone-500">
                        {money.format(row.budget)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SlideChrome>
        ) : null}
      </div>

      <footer className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-stone-200/80 bg-white/80 px-4 py-2.5 backdrop-blur-sm sm:px-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={s.label}
              title={s.label}
              onClick={() => go(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index
                  ? "w-6 bg-teal-800"
                  : "w-2 bg-stone-300 hover:bg-stone-400",
              )}
            />
          ))}
          <span className="ml-2 hidden text-xs text-stone-500 sm:inline">
            {SLIDES[index].label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={index === 0}
            onClick={() => go(index - 1)}
          >
            <ChevronLeft data-icon="inline-start" />
            Back
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={index === SLIDES.length - 1}
            onClick={() => go(index + 1)}
          >
            Next
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

export function Proposal({ slug }: { slug: string }) {
  const { result, live, model, hydrated, notFound } = usePlanningModel(slug);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7f6f3] px-6 py-24 text-stone-500">
        Loading project…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f7f6f3] px-6 py-24">
        <div className="max-w-md text-center">
          <h1 className="font-heading text-3xl">Project not found</h1>
          <p className="mt-2 text-stone-500">
            This display URL is missing or no longer public.
          </p>
          <p className="mt-6">
            <Link href="/" className="text-teal-800 hover:underline">
              All public projects
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <CurrencyProvider fx={model.fx}>
      <ProposalDeck model={model} result={result} live={live} />
    </CurrencyProvider>
  );
}
