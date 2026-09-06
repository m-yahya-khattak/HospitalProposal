"use client";

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
import { usePlanningModel } from "@/hooks/use-planning-model";
import { formatInt, formatPercent } from "@/lib/format";
import type { Evaluation } from "@/lib/types";
import Link from "next/link";

const TEAL = "#0f766e";
const STONE = "#a8a29e";
const TEAL_SOFT = "#99f6e4";

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-stone-200 py-14">
      {eyebrow ? (
        <p className="text-[11px] font-medium tracking-[0.2em] text-teal-800 uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 font-heading text-3xl tracking-tight text-stone-900">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Kpi({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden border-t border-teal-800/20 pt-4 pr-4">
      <p className="text-xs tracking-wide text-stone-500 uppercase">{label}</p>
      <p className="mt-2 font-heading text-2xl leading-tight tracking-tight text-stone-900 tabular-nums sm:text-3xl">
        {value}
        {unit ? (
          <span className="ml-1 text-base font-sans text-stone-500">{unit}</span>
        ) : null}
      </p>
      {hint ? (
        <p className="mt-2 text-xs text-stone-500">{hint}</p>
      ) : null}
    </div>
  );
}

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
    <div className="rounded-lg bg-white px-3 py-2 text-xs ring-1 ring-stone-200">
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

function ProposalBody({
  result,
  live,
  title,
  specialtyNames,
  landExcluded,
}: {
  result: Evaluation;
  live: boolean;
  title: string;
  specialtyNames: string[];
  landExcluded: boolean;
}) {
  const money = useMoney();
  const shown = (usd: number) =>
    Math.round(usd * (money.missing ? 1 : money.rate));
  const mix = result.departments.map((d) => ({
    name: d.name,
    beds: d.beds,
    share: d.sharePercent,
  }));
  const equipment = result.items.filter(
    (i) =>
      i.enabled &&
      (i.category === "ward-equipment" || i.category === "theatre-equipment"),
  );
  const furniture = result.items.filter(
    (i) => i.enabled && i.category === "furniture",
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
  const diagnostics = result.items.filter(
    (i) => i.category === "diagnostic" || i.category === "laboratory",
  );
  const selectedDiag = diagnostics.filter((i) => i.enabled);
  const pie = mix.filter((d) => d.beds > 0);

  return (
    <div className="min-h-dvh bg-[#f7f6f3] text-stone-900">
      <div className="w-full px-6 py-10 lg:px-12 lg:py-14">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.22em] text-teal-800 uppercase">
              Project planning
            </p>
            <h1 className="mt-3 font-heading text-5xl leading-[1.05] tracking-tight md:text-6xl">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-stone-600">
              Beds, theatres, equipment and capital cost are one model. Change
              the census and every schedule recalculates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CurrencySwitcher />
            <Link
              href="/"
              className="text-xs text-stone-500 hover:text-teal-800"
            >
              All projects
            </Link>
            {live ? (
              <Badge className="bg-teal-700 text-white">Live</Badge>
            ) : (
              <Badge variant="outline">Connecting</Badge>
            )}
          </div>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Kpi label="Planned beds" value={formatInt(result.totalBeds)} />
          <Kpi
            label="Theatres / procedure"
            value={formatInt(result.theatres.totalRooms)}
            hint={`${formatInt(result.theatres.ot)} OT · ${formatInt(result.theatres.minorOt)} minor · ${formatInt(result.theatres.cathLab)} cath · ${formatInt(result.theatres.labourDelivery)} L&D`}
          />
          <Kpi
            label="Indicative area"
            value={formatInt(result.areaSqft)}
            unit="sq.ft"
          />
          <Kpi
            label="Premium CAPEX"
            value={money.format(result.capex.totalPremium)}
          />
          <Kpi
            label="Budgetary CAPEX"
            value={money.format(result.capex.totalBudget)}
          />
        </div>

        <Section eyebrow="Cost scenario" title="Premium versus budgetary">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-8 ring-1 ring-stone-200">
              <p className="text-xs tracking-wide text-stone-500 uppercase">
                Premium equipment + CAPEX
              </p>
              <p className="mt-3 font-heading text-3xl tabular-nums tracking-tight sm:text-4xl">
                {money.format(result.capex.totalPremium)}
              </p>
              <p className="mt-2 text-sm text-stone-500">
                Catalog {money.format(result.capex.catalogPremium)}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-8 ring-1 ring-stone-200">
              <p className="text-xs tracking-wide text-stone-500 uppercase">
                Budgetary equipment + CAPEX
              </p>
              <p className="mt-3 font-heading text-3xl tabular-nums tracking-tight sm:text-4xl">
                {money.format(result.capex.totalBudget)}
              </p>
              <p className="mt-2 text-sm text-stone-500">
                Catalog {money.format(result.capex.catalogBudget)}
              </p>
            </div>
          </div>
        </Section>

        <Section eyebrow="Capacity" title="Bed mix by department">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-80 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mix} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid stroke="#e7e5e4" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#78716c", fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fill: "#44403c", fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="beds" name="Beds" fill={TEAL} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pie}
                      dataKey="beds"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={72}
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
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {mix.map((d) => (
                    <tr key={d.name} className="border-t border-stone-100">
                      <td className="py-1.5 pr-2">{d.name}</td>
                      <td className="py-1.5 text-right tabular-nums text-stone-500">
                        {formatPercent(d.share, 0)}
                      </td>
                      <td className="py-1.5 text-right font-medium tabular-nums">
                        {d.beds}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-stone-200 font-medium">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatPercent(
                        mix.reduce((s, d) => s + d.share, 0),
                        1,
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {mix.reduce((s, d) => s + d.beds, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        <Section eyebrow="Clinical platform" title="Theatres and furniture">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 ring-1 ring-stone-200">
              <p className="text-xs text-stone-500 uppercase">Operation theatre</p>
              <p className="mt-2 font-heading text-4xl tabular-nums">
                {result.theatres.ot}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 ring-1 ring-stone-200">
              <p className="text-xs text-stone-500 uppercase">Minor theatre</p>
              <p className="mt-2 font-heading text-4xl tabular-nums">
                {result.theatres.minorOt}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 ring-1 ring-stone-200">
              <p className="text-xs text-stone-500 uppercase">Cath lab</p>
              <p className="mt-2 font-heading text-4xl tabular-nums">
                {result.theatres.cathLab}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-6 ring-1 ring-stone-200">
              <p className="text-xs text-stone-500 uppercase">Labour & delivery</p>
              <p className="mt-2 font-heading text-4xl tabular-nums">
                {result.theatres.labourDelivery}
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {furniture.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <p className="text-xs text-stone-500">{item.name}</p>
                <p className="font-heading text-2xl tabular-nums">{item.qty}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section eyebrow="Bill of quantities" title="Major medical equipment">
          <div className="h-80 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costChart} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#78716c", fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                <YAxis tick={{ fill: "#78716c", fontSize: 11 }} />
                <Tooltip
                  content={<ChartTooltip formatValue={money.formatShown} />}
                />
                <Bar dataKey="Premium" fill={TEAL} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Budgetary" fill={STONE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs tracking-wide text-stone-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Equipment</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Premium</th>
                  <th className="px-4 py-3 text-right font-medium">Budgetary</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => (
                  <tr key={item.id} className="border-t border-stone-100">
                    <td className="px-4 py-2.5">{item.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{item.qty}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {item.premiumCost ? money.format(item.premiumCost) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {item.budgetCost ? money.format(item.budgetCost) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-stone-500">
            Quantities round up to whole units. Premium and budgetary are unit
            price × quantity — the link the planning sheet was missing.
          </p>
        </Section>

        <Section eyebrow="Capital" title="Indicative CAPEX">
          <div className="h-96 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={capexChart}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid stroke="#e7e5e4" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#78716c", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fill: "#44403c", fontSize: 11 }}
                />
                <Tooltip
                  content={<ChartTooltip formatValue={money.formatShown} />}
                />
                <Bar dataKey="Premium" fill={TEAL} radius={[0, 4, 4, 0]} />
                <Bar dataKey="Budgetary" fill={STONE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-sm text-stone-500">
            Construction {money.format(result.capex.constructionPremium)} ·
            catalog {money.format(result.capex.catalogPremium)} · total{" "}
            {money.format(result.capex.totalPremium)} premium /{" "}
            {money.format(result.capex.totalBudget)} budgetary.
            {landExcluded ? " Land excluded." : ""}
          </p>
        </Section>

        <Section eyebrow="Supporting units" title="Specialties and diagnostics">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-stone-500">
                Client checklist
              </h3>
              <SpecialtyList names={specialtyNames} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-500">
                Radiology & laboratory
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                {selectedDiag.length} of {diagnostics.length} selected
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {selectedDiag.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-stone-200"
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <footer className="mt-8 flex items-center justify-between border-t border-stone-200 pt-6 text-xs text-stone-400">
          <p>Hospital project planning · figures update with the control studio</p>
          <Link href="/control" className="hover:text-teal-800">
            Studio
          </Link>
        </footer>
      </div>
    </div>
  );
}

function SpecialtyList({ names }: { names: string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {names.map((name) => (
        <li
          key={name}
          className="rounded-full bg-teal-800 px-3 py-1 text-sm text-white"
        >
          {name}
        </li>
      ))}
      {names.length === 0 ? (
        <li className="text-sm text-stone-500">No specialty units selected</li>
      ) : null}
    </ul>
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
      <ProposalBody
        result={result}
        live={live}
        title={model.title}
        specialtyNames={model.specialties.filter((s) => s.enabled).map((s) => s.name)}
        landExcluded={model.capex.landExcluded}
      />
    </CurrencyProvider>
  );
}
