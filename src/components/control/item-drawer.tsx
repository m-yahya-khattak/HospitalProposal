"use client";

import { useMemo, useState } from "react";
import { CellEditor } from "@/components/control/cell-editor";
import { NumberInput } from "@/components/control/number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetCloseButton,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { sourceOptions, type SourceOption } from "@/lib/formula-label";
import {
  formulaSentence,
  parseContributions,
  setContributionCell,
  setFixedQty,
  toContributions,
} from "@/lib/formula-matrix";
import { categoryLabel, formatInt, modelCategories } from "@/lib/format";
import { assignQuote, formatQuoteOriginal, formatQuoteUsd, quoteById, quoteLabel, selectQuote, unassignQuote } from "@/lib/quotes";
import type { CatalogItem, Evaluation, Formula, PlanningModel, QuoteProduct, QuoteRole } from "@/lib/types";
import { Search, X } from "lucide-react";

type Props = {
  itemId: string;
  model: PlanningModel;
  result: Evaluation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: PlanningModel) => void;
  onDelete: () => void;
};

export function ItemDrawer({
  itemId,
  model,
  result,
  open,
  onOpenChange,
  onChange,
  onDelete,
}: Props) {
  const itemIndex = model.items.findIndex((row) => row.id === itemId);
  const item = model.items[itemIndex];
  const qty = result.items.find((row) => row.id === itemId);
  const sources = sourceOptions(model);
  const sourceOrder = sources.map((s) => s.id);
  const categories = modelCategories(model);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, SourceOption[]>();
    for (const source of sources) {
      const list = map.get(source.group) ?? [];
      list.push(source);
      map.set(source.group, list);
    }
    return [...map.entries()];
  }, [sources]);

  if (!item) return null;

  const premiumQuote = quoteById(model.quotes, item.premiumQuoteId);
  const budgetQuote = quoteById(model.quotes, item.budgetQuoteId);

  const patch = (fn: (m: PlanningModel) => void) => {
    const next = structuredClone(model);
    fn(next);
    onChange(next);
  };

  const setContributions = (contributions: Formula[]) => {
    patch((m) => {
      m.items[itemIndex].contributions = contributions;
    });
  };

  const rule = parseContributions(item.contributions);
  const followsHospital = rule.kind === "hospital";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="min-w-0">
            <p className="text-xs font-medium text-teal-800">
              {categoryLabel(item.category, model.categoryLabels)}
            </p>
            <SheetTitle>{item.name}</SheetTitle>
            <SheetDescription>
              {formatInt(qty?.qty ?? 0)} units
              {qty && qty.qtyRaw !== qty.qty
                ? ` · raw ${qty.qtyRaw.toFixed(2)}`
                : ""}
            </SheetDescription>
          </div>
          <SheetCloseButton />
        </SheetHeader>
        <SheetBody className="space-y-6">
          <div className="grid gap-3">
            <div>
              <Label>Name</Label>
              <Input
                className="mt-1"
                value={item.name}
                onChange={(event) =>
                  patch((m) => {
                    m.items[itemIndex].name = event.target.value;
                  })
                }
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={item.category}
                onValueChange={(value) => {
                  if (!value) return;
                  patch((m) => {
                    m.items[itemIndex].category = value;
                  });
                }}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {categoryLabel(category, model.categoryLabels)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Premium USD</Label>
                {premiumQuote ? (
                  <div className="mt-1 rounded-lg bg-stone-50 px-3 py-2">
                    <p className="font-mono text-sm tabular-nums">
                      {formatQuoteUsd(premiumQuote.usdUnit)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatQuoteOriginal(premiumQuote)}
                    </p>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="mt-1"
                      onClick={() =>
                        patch((m) => {
                          m.items[itemIndex].premiumQuoteId = null;
                        })
                      }
                    >
                      Type instead
                    </Button>
                  </div>
                ) : (
                  <NumberInput
                    className="mt-1"
                    value={item.premiumUnit}
                    min={0}
                    suffix="USD"
                    onChange={(value) =>
                      patch((m) => {
                        m.items[itemIndex].premiumUnit = value;
                        m.items[itemIndex].premiumQuoteId = null;
                      })
                    }
                  />
                )}
              </div>
              <div>
                <Label>Budgetary USD</Label>
                {budgetQuote ? (
                  <div className="mt-1 rounded-lg bg-stone-50 px-3 py-2">
                    <p className="font-mono text-sm tabular-nums">
                      {formatQuoteUsd(budgetQuote.usdUnit)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatQuoteOriginal(budgetQuote)}
                    </p>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="mt-1"
                      onClick={() =>
                        patch((m) => {
                          m.items[itemIndex].budgetQuoteId = null;
                        })
                      }
                    >
                      Type instead
                    </Button>
                  </div>
                ) : (
                  <NumberInput
                    className="mt-1"
                    value={item.budgetUnit}
                    min={0}
                    suffix="USD"
                    onChange={(value) =>
                      patch((m) => {
                        m.items[itemIndex].budgetUnit = value;
                        m.items[itemIndex].budgetQuoteId = null;
                      })
                    }
                  />
                )}
              </div>
            </div>
            <QuoteAssign
              item={item}
              quotes={model.quotes ?? []}
              onPatch={(fn) =>
                patch((m) => {
                  fn(m.items[itemIndex], m.quotes ?? []);
                })
              }
            />
            <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
              <Label htmlFor="item-enabled" className="font-normal">
                Include in plan
              </Label>
              <Switch
                id="item-enabled"
                checked={item.enabled}
                onCheckedChange={(checked) =>
                  patch((m) => {
                    m.items[itemIndex].enabled = Boolean(checked);
                  })
                }
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">How many</p>
            <div className="mt-2 flex gap-1">
              <Button
                size="sm"
                variant={followsHospital ? "default" : "outline"}
                onClick={() => {
                  const next = parseContributions(item.contributions);
                  next.kind = "hospital";
                  next.constant = 0;
                  setContributions(toContributions(next, sourceOrder));
                }}
              >
                Follows the hospital
              </Button>
              <Button
                size="sm"
                variant={!followsHospital ? "default" : "outline"}
                onClick={() =>
                  setContributions(setFixedQty(rule.constant || 1))
                }
              >
                Always this many
              </Button>
            </div>
            <p className="mt-3 text-sm text-stone-600">
              {formulaSentence(item.contributions, sources, qty?.qty)}
            </p>
          </div>

          {followsHospital ? (
            <div className="space-y-5">
              {groups.map(([group, cols]) => (
                <section key={group}>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {group}
                  </p>
                  <div className="grid grid-cols-[1fr_72px] gap-1">
                    {cols.map((source) => (
                      <div
                        key={source.id}
                        className="contents"
                      >
                        <p className="flex items-center px-1 text-sm">
                          {source.label}
                        </p>
                        <CellEditor
                          source={source}
                          cell={rule.cells[source.id] ?? null}
                          open={openKey === source.id}
                          onOpenChange={(nextOpen) =>
                            setOpenKey(nextOpen ? source.id : null)
                          }
                          onChange={(cell) =>
                            setContributions(
                              setContributionCell(
                                item.contributions,
                                source.id,
                                cell,
                                sourceOrder,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div>
              <Label>Fixed quantity</Label>
              <NumberInput
                className="mt-1 max-w-32"
                value={rule.constant}
                min={0}
                onChange={(value) => setContributions(setFixedQty(value))}
              />
            </div>
          )}

          <Button variant="destructive" onClick={onDelete}>
            Delete item
          </Button>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function QuoteAssign({
  item,
  quotes,
  onPatch,
}: {
  item: CatalogItem;
  quotes: QuoteProduct[];
  onPatch: (fn: (item: CatalogItem, quotes: QuoteProduct[]) => void) => void;
}) {
  const [query, setQuery] = useState("");
  const premiumIds = item.premiumQuoteIds ?? [];
  const budgetIds = item.budgetQuoteIds ?? [];

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? quotes.filter((quote) => {
          const blob = `${quote.name} ${quote.supplier} ${quote.model ?? ""}`.toLowerCase();
          return blob.includes(q);
        })
      : quotes;
    return list
      .filter((quote) => {
        const inPremium = premiumIds.includes(quote.id);
        const inBudget = budgetIds.includes(quote.id);
        return !(inPremium && inBudget);
      })
      .slice(0, 8);
  }, [quotes, query, premiumIds, budgetIds]);

  const premiumQuotes = premiumIds
    .map((id) => quoteById(quotes, id))
    .filter((quote): quote is QuoteProduct => Boolean(quote));
  const budgetQuotes = budgetIds
    .map((id) => quoteById(quotes, id))
    .filter((quote): quote is QuoteProduct => Boolean(quote));

  const assign = (quoteId: string, role: QuoteRole) => {
    onPatch((next, library) => {
      assignQuote(next, quoteId, role);
      if ((role === "premium" || role === "both") && !next.premiumQuoteId) {
        selectQuote(next, quoteId, "premium", library);
      }
      if ((role === "budget" || role === "both") && !next.budgetQuoteId) {
        selectQuote(next, quoteId, "budget", library);
      }
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Quotes</p>
      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add products in the Quotes tab first.
        </p>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8"
              placeholder="Search quotes"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {matches.length > 0 ? (
            <ul className="space-y-2">
              {matches.map((quote) => {
                const inPremium = premiumIds.includes(quote.id);
                const inBudget = budgetIds.includes(quote.id);
                return (
                  <li
                    key={quote.id}
                    className="flex min-w-0 items-start justify-between gap-2 rounded-lg bg-stone-50 px-2 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{quote.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {quoteLabel(quote)} · {formatQuoteOriginal(quote)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      {!inPremium ? (
                        <Button size="xs" variant="outline" onClick={() => assign(quote.id, "premium")}>
                          Premium
                        </Button>
                      ) : null}
                      {!inBudget ? (
                        <Button size="xs" variant="outline" onClick={() => assign(quote.id, "budget")}>
                          Budget
                        </Button>
                      ) : null}
                      {!inPremium && !inBudget ? (
                        <Button size="xs" variant="outline" onClick={() => assign(quote.id, "both")}>
                          Both
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              {query.trim() ? "No matching quotes." : "Assigned quotes appear below."}
            </p>
          )}
          <QuoteRoleList
            title="Premium quotes"
            quotes={premiumQuotes}
            selectedId={item.premiumQuoteId}
            onSelect={(id) =>
              onPatch((next, library) => selectQuote(next, id, "premium", library))
            }
            onRemove={(id) =>
              onPatch((next) => unassignQuote(next, id, "premium"))
            }
          />
          <QuoteRoleList
            title="Budget quotes"
            quotes={budgetQuotes}
            selectedId={item.budgetQuoteId}
            onSelect={(id) =>
              onPatch((next, library) => selectQuote(next, id, "budget", library))
            }
            onRemove={(id) =>
              onPatch((next) => unassignQuote(next, id, "budget"))
            }
          />
        </>
      )}
    </div>
  );
}

function QuoteRoleList({
  title,
  quotes,
  selectedId,
  onSelect,
  onRemove,
}: {
  title: string;
  quotes: QuoteProduct[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (quotes.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {quotes.map((quote) => {
          const selected = selectedId === quote.id;
          return (
            <li key={quote.id} className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left ${
                  selected
                    ? "bg-teal-50 ring-1 ring-teal-800/30"
                    : "hover:bg-stone-50"
                }`}
                onClick={() => onSelect(quote.id)}
              >
                <p className="truncate text-sm">{quote.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {quote.supplier || quote.model || formatQuoteOriginal(quote)}
                  {` · ${formatQuoteUsd(quote.usdUnit)}`}
                </p>
              </button>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => onRemove(quote.id)}
              >
                <X />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
