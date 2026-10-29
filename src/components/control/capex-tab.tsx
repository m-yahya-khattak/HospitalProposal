"use client";

import { NumberInput } from "@/components/control/number-input";
import { useMoney } from "@/components/currency-provider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  canRead,
  canWrite,
  type GuestPermissions,
} from "@/lib/access";
import { bedsFromArea, scaleHospitalBeds } from "@/lib/engine";
import { BASE_CURRENCY } from "@/lib/currency";
import { categoryLabel, formatInt, modelCategories } from "@/lib/format";
import type { Evaluation, PlanningModel } from "@/lib/types";

type Props = {
  model: PlanningModel;
  result: Evaluation;
  onChange: (next: PlanningModel) => void;
  onLocalChange?: (next: PlanningModel) => void;
  permissions: GuestPermissions;
};

export function CapexTab({
  model,
  result,
  onChange,
  onLocalChange,
  permissions,
}: Props) {
  const money = useMoney();
  const sizeWrite = canWrite(permissions, "hospitalSize");
  const sizeRead = canRead(permissions, "hospitalSize");
  const bandsWrite = canWrite(permissions, "capexBands");
  const bandsRead = canRead(permissions, "capexBands");
  const ratesWrite = canWrite(permissions, "capexRates");
  const ratesRead = canRead(permissions, "capexRates");
  const catalogWrite = canWrite(permissions, "capexCatalog");
  const catalogRead = canRead(permissions, "capexCatalog");

  const patch = (fn: (m: PlanningModel) => void, persist = true) => {
    const next = structuredClone(model);
    fn(next);
    if (persist) onChange(next);
    else onLocalChange?.(next);
  };
  const excluded = new Set(model.capex.excludedCategories ?? []);
  const categories = modelCategories(model);
  const construction = result.capex.lines.filter((line) => line.kind === "construction");
  const catalog = result.capex.lines.filter((line) => line.kind === "catalog");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-medium tracking-tight">Area & rates</h2>
        </div>

        {bandsRead ? (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beds</TableHead>
                <TableHead>Sq.ft / bed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {model.capex.areaBands.map((band, index) => (
                <TableRow key={`${band.beds}-${index}`}>
                  <TableCell>
                    <NumberInput
                      value={band.beds}
                      min={1}
                      disabled={!bandsWrite}
                      onChange={(v) =>
                        patch((m) => {
                          m.capex.areaBands[index].beds = v;
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <NumberInput
                      value={band.sqftPerBed}
                      min={1}
                      disabled={!bandsWrite}
                      onChange={(v) =>
                        patch((m) => {
                          m.capex.areaBands[index].sqftPerBed = v;
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        ) : null}

        {ratesRead ? (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line</TableHead>
                <TableHead>{BASE_CURRENCY} / sq.ft</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {model.capex.lines.map((line, index) => (
                <TableRow key={line.id}>
                  <TableCell>{line.name}</TableCell>
                  <TableCell>
                    <NumberInput
                      value={line.ratePerSqft}
                      min={0}
                      suffix={BASE_CURRENCY}
                      disabled={!ratesWrite}
                      onChange={(v) =>
                        patch((m) => {
                          m.capex.lines[index].ratePerSqft = v;
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        ) : null}

        {catalogRead ? (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medical Tech</TableHead>
                <TableHead className="text-right">On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((id) => (
                <TableRow key={id}>
                  <TableCell>{categoryLabel(id, model.categoryLabels)}</TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={!excluded.has(id)}
                      onCheckedChange={(checked) =>
                        patch(
                          (m) => {
                            const next = new Set(m.capex.excludedCategories ?? []);
                            if (checked) next.delete(id);
                            else next.add(id);
                            m.capex.excludedCategories = [...next];
                          },
                          catalogWrite,
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        ) : null}
      </section>

      <section>
        <h2 className="text-xl font-medium tracking-tight">Live CAPEX</h2>
        {sizeRead ? (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Area</Label>
            <NumberInput
              className="mt-1 w-40"
              value={Math.round(result.areaSqft)}
              min={1}
              suffix="sq.ft"
              disabled={!sizeWrite}
              onChange={(area) => {
                const beds = bedsFromArea(area, model.capex.areaBands);
                patch((m) => {
                  scaleHospitalBeds(m, beds);
                });
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Beds</Label>
            <NumberInput
              className="mt-1 w-32"
              value={model.totalBeds}
              min={10}
              max={2000}
              suffix="beds"
              disabled={!sizeWrite}
              onChange={(total) => {
                patch((m) => {
                  scaleHospitalBeds(m, total);
                });
              }}
            />
          </div>
          <p className="mb-2 text-sm text-muted-foreground">
            {formatInt(result.sqftPerBed)} sq.ft/bed
            {model.capex.landExcluded ? " · land excluded" : ""} ·{" "}
            {money.currency}
          </p>
        </div>
        ) : null}
        <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Head</TableHead>
                <TableHead className="text-right">Premium</TableHead>
                <TableHead className="text-right">Budget</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-stone-50 hover:bg-stone-50">
                <TableCell
                  colSpan={3}
                  className="text-[11px] font-medium tracking-[0.14em] text-teal-800 uppercase"
                >
                  Construction
                </TableCell>
              </TableRow>
              {construction.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.name}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {money.format(line.premium)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {money.format(line.budget)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t border-stone-200 bg-stone-50/80 font-medium hover:bg-stone-50/80">
                <TableCell>Construction total</TableCell>
                <TableCell className="text-right font-mono">
                  {money.format(result.capex.constructionPremium)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {money.format(result.capex.constructionBudget)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-stone-50 hover:bg-stone-50">
                <TableCell
                  colSpan={3}
                  className="text-[11px] font-medium tracking-[0.14em] text-teal-800 uppercase"
                >
                  Medical Tech
                </TableCell>
              </TableRow>
              {catalog.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.name}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {money.format(line.premium)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {money.format(line.budget)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t border-stone-200 bg-stone-50/80 font-medium hover:bg-stone-50/80">
                <TableCell>Medical Tech total</TableCell>
                <TableCell className="text-right font-mono">
                  {money.format(result.capex.catalogPremium)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {money.format(result.capex.catalogBudget)}
                </TableCell>
              </TableRow>
              <TableRow className="border-t-2 border-teal-800/20 bg-teal-50/50 font-medium hover:bg-teal-50/50">
                <TableCell>Grand total</TableCell>
                <TableCell className="text-right font-mono text-teal-900">
                  {money.format(result.capex.totalPremium)}
                </TableCell>
                <TableCell className="text-right font-mono text-teal-900">
                  {money.format(result.capex.totalBudget)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
