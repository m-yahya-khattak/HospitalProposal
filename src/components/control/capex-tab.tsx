"use client";

import { NumberInput } from "@/components/control/number-input";
import { useMoney } from "@/components/currency-provider";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BOM_CAPEX_LINE_ID, bedsFromArea, scaleHospitalBeds } from "@/lib/engine";
import { BASE_CURRENCY } from "@/lib/currency";
import { formatInt } from "@/lib/format";
import type { Evaluation, PlanningModel } from "@/lib/types";

type Props = {
  model: PlanningModel;
  result: Evaluation;
  onChange: (next: PlanningModel) => void;
};

export function CapexTab({ model, result, onChange }: Props) {
  const money = useMoney();
  const patch = (fn: (m: PlanningModel) => void) => {
    const next = structuredClone(model);
    fn(next);
    onChange(next);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-medium tracking-tight">Area & rates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Construction is rate × area ({BASE_CURRENCY}). Medical equipment
            follows the catalog.
          </p>
        </div>

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
                    {line.id === BOM_CAPEX_LINE_ID ? (
                      <span className="text-xs text-muted-foreground">
                        Catalog
                      </span>
                    ) : (
                      <NumberInput
                        value={line.ratePerSqft}
                        min={0}
                        suffix={BASE_CURRENCY}
                        onChange={(v) =>
                          patch((m) => {
                            m.capex.lines[index].ratePerSqft = v;
                          })
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium tracking-tight">Live CAPEX</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Area</Label>
            <NumberInput
              className="mt-1 w-40"
              value={Math.round(result.areaSqft)}
              min={1}
              suffix="sq.ft"
              onChange={(area) =>
                patch((m) => {
                  scaleHospitalBeds(m, bedsFromArea(area, m.capex.areaBands));
                })
              }
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
              onChange={(total) =>
                patch((m) => {
                  scaleHospitalBeds(m, total);
                })
              }
            />
          </div>
          <p className="mb-2 text-sm text-muted-foreground">
            {formatInt(result.sqftPerBed)} sq.ft/bed
            {model.capex.landExcluded ? " · land excluded" : ""} ·{" "}
            {money.currency}
          </p>
        </div>
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
              {result.capex.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {line.name}
                    {line.id === BOM_CAPEX_LINE_ID ? (
                      <span className="ml-2 text-xs text-teal-800">Catalog</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {money.format(line.premium)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {money.format(line.budget)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono">
                  {money.format(result.capex.totalPremium)}
                </TableCell>
                <TableCell className="text-right font-mono">
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
