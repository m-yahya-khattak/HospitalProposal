"use client";

import { NumberInput } from "@/components/control/number-input";
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
import { formatInt, formatTsh, formatUsd } from "@/lib/format";
import type { Evaluation, PlanningModel } from "@/lib/types";

type Props = {
  model: PlanningModel;
  result: Evaluation;
  onChange: (next: PlanningModel) => void;
};

export function CapexTab({ model, result, onChange }: Props) {
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
            Square feet per bed interpolates between these bands. Construction
            is rate × area. Medical equipment uses catalog totals, not a flat
            sq.ft rate.
          </p>
        </div>

        <div className="max-w-xs">
          <Label>USD conversion (TSH per USD)</Label>
          <NumberInput
            className="mt-1"
            value={model.capex.fxRate}
            min={1}
            onChange={(v) =>
              patch((m) => {
                m.capex.fxRate = v;
              })
            }
          />
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
                <TableRow key={band.beds}>
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
                <TableHead>TSH / sq.ft</TableHead>
                <TableHead>From BOM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {model.capex.lines.map((line, index) => (
                <TableRow key={line.id}>
                  <TableCell>{line.name}</TableCell>
                  <TableCell>
                    {line.fromBom ? (
                      <span className="text-xs text-muted-foreground">
                        Linked to equipment totals
                      </span>
                    ) : (
                      <NumberInput
                        value={line.ratePerSqft}
                        min={0}
                        onChange={(v) =>
                          patch((m) => {
                            m.capex.lines[index].ratePerSqft = v;
                          })
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={Boolean(line.fromBom)}
                      onCheckedChange={(checked) =>
                        patch((m) => {
                          m.capex.lines[index].fromBom = Boolean(checked);
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium tracking-tight">Live CAPEX</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatInt(result.areaSqft)} sq.ft · {formatInt(result.sqftPerBed)}{" "}
          sq.ft/bed
          {model.capex.landExcluded ? " · land excluded" : ""}
        </p>
        <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Head</TableHead>
                <TableHead className="text-right">Premium TSH</TableHead>
                <TableHead className="text-right">Budget TSH</TableHead>
                <TableHead className="text-right">Premium USD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.capex.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {line.name}
                    {line.fromBom ? (
                      <span className="ml-2 text-xs text-teal-800">BOM</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatTsh(line.tshPremium)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatTsh(line.tshBudget)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatUsd(line.usdPremium)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-medium">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono">
                  {formatTsh(result.capex.totalTshPremium)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatTsh(result.capex.totalTshBudget)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatUsd(result.capex.totalUsdPremium)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
