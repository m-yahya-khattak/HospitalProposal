"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useMoney } from "@/components/currency-provider";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { COMMON_CURRENCIES } from "@/lib/currency";
import {
  formatQuoteOriginal,
  mergeQuotes,
  parseQuoteWorkbook,
  pricedQuote,
  quoteCurrency,
  usdFromOriginal,
} from "@/lib/quotes";
import type { PlanningModel, QuoteProduct } from "@/lib/types";
import { Plus, Search, Upload } from "lucide-react";

const PAGE = 40;

type Props = {
  model: PlanningModel;
  onChange: (next: PlanningModel) => void;
};

export function QuotesTab({ model, onChange }: Props) {
  const money = useMoney();
  const live = useExchangeRates();
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const quotes = model.quotes ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter((quote) => {
      const blob = `${quote.name} ${quote.supplier} ${quote.model ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [quotes, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);

  const patchQuotes = (next: QuoteProduct[]) => {
    const copy = structuredClone(model);
    copy.quotes = next;
    onChange(copy);
  };

  const onUpload = async (file: File) => {
    setBusy(true);
    setNotice(null);
    try {
      const drafts = await parseQuoteWorkbook(await file.arrayBuffer());
      if (!drafts.length) {
        setNotice("No product rows found. Need a header with Product/Translation and Price.");
        return;
      }
      const merged = mergeQuotes(quotes, drafts, live.table);
      patchQuotes(merged.quotes);
      setNotice(`Imported ${merged.added} new · ${merged.updated} updated`);
      setPage(0);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not read that file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-medium tracking-tight">Quotes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {quotes.length} products
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onUpload(file);
            }}
          />
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            {busy ? "Importing…" : "Upload Excel"}
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" />
            Add quote
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 pl-8"
          placeholder="Search name, brand, model"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
      </div>

      {notice ? (
        <p className="text-sm text-teal-800">{notice}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">
        <div className="hidden gap-3 border-b px-4 py-2 text-[11px] font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_80px]">
          <span>Product</span>
          <span>Supplier</span>
          <span className="text-right">Quoted</span>
          <span className="text-right">{money.currency}</span>
          <span />
        </div>
        {slice.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            No quotes yet. Upload the supplier workbook or add one.
          </p>
        ) : (
          <ul className="divide-y">
            {slice.map((quote) => (
              <li key={quote.id}>
                <button
                  type="button"
                  className="grid w-full items-center gap-1 px-4 py-3 text-left hover:bg-stone-50 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_80px] md:gap-3"
                  onClick={() => setEditId(quote.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{quote.name}</span>
                    {quote.model ? (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {quote.model}
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {quote.supplier || "—"}
                  </span>
                  <span className="font-mono text-sm tabular-nums md:text-right">
                    {formatQuoteOriginal(quote)}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-teal-800 md:text-right">
                    {money.format(quote.usdUnit)}
                  </span>
                  <span className="text-[11px] text-muted-foreground md:text-right">
                    {quote.source === "manual" ? "Manual" : "Upload"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {filtered.length > PAGE ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            {safePage * PAGE + 1}–{Math.min(filtered.length, (safePage + 1) * PAGE)} of{" "}
            {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={safePage === 0}
              onClick={() => setPage((n) => Math.max(0, n - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={safePage >= pages - 1}
              onClick={() => setPage((n) => n + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <QuoteSheet
        open={creating || Boolean(editId)}
        quote={editId ? quotes.find((quote) => quote.id === editId) : undefined}
        rates={live.table?.rates}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditId(null);
          }
        }}
        onSave={(draft, id) => {
          if (id) {
            patchQuotes(
              quotes.map((quote) =>
                quote.id === id ? pricedQuote(draft, live.table, id) : quote,
              ),
            );
          } else {
            patchQuotes([...quotes, pricedQuote(draft, live.table)]);
          }
          setCreating(false);
          setEditId(null);
        }}
        onDelete={
          editId
            ? () => {
                patchQuotes(quotes.filter((quote) => quote.id !== editId));
                setEditId(null);
              }
            : undefined
        }
      />
    </div>
  );
}

function QuoteSheet({
  open,
  quote,
  rates,
  onOpenChange,
  onSave,
  onDelete,
}: {
  open: boolean;
  quote?: QuoteProduct;
  rates?: Record<string, number>;
  onOpenChange: (open: boolean) => void;
  onSave: (
    draft: {
      name: string;
      supplier: string;
      model?: string;
      currency: string;
      originalPrice: number;
      source: QuoteProduct["source"];
      externalId?: string;
    },
    id?: string,
  ) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(quote?.name ?? "");
  const [supplier, setSupplier] = useState(quote?.supplier ?? "");
  const [model, setModel] = useState(quote?.model ?? "");
  const [currency, setCurrency] = useState(quote?.currency ?? "CNY");
  const [price, setPrice] = useState(quote?.originalPrice ?? 0);

  useEffect(() => {
    if (!open) return;
    setName(quote?.name ?? "");
    setSupplier(quote?.supplier ?? "");
    setModel(quote?.model ?? "");
    setCurrency(quote?.currency ?? "CNY");
    setPrice(quote?.originalPrice ?? 0);
  }, [open, quote?.id]);

  const money = useMoney();
  const usd = usdFromOriginal(price, currency, rates);
  const codes = COMMON_CURRENCIES.includes(currency as (typeof COMMON_CURRENCIES)[number])
    ? COMMON_CURRENCIES
    : ([currency, ...COMMON_CURRENCIES] as const);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="min-w-0">
            <SheetTitle>{quote ? "Edit quote" : "Add quote"}</SheetTitle>
            <SheetDescription>
              Quoted amount stays in its currency. Display follows the header.
            </SheetDescription>
          </div>
          <SheetCloseButton />
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Supplier</Label>
            <Input
              className="mt-1"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>
          <div>
            <Label>Model</Label>
            <Input className="mt-1" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Currency</Label>
              <Select
                value={currency}
                onValueChange={(value) => {
                  if (value) setCurrency(quoteCurrency(value));
                }}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {codes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quoted price</Label>
              <NumberInput
                className="mt-1"
                value={price}
                min={0}
                suffix={currency}
                onChange={setPrice}
              />
            </div>
          </div>
          <p className="rounded-xl bg-stone-50 px-3 py-2 text-sm">
            {money.format(usd)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!name.trim()}
              onClick={() =>
                onSave(
                  {
                    name,
                    supplier,
                    model,
                    currency,
                    originalPrice: price,
                    source: quote?.source ?? "manual",
                    externalId: quote?.externalId,
                  },
                  quote?.id,
                )
              }
            >
              Save
            </Button>
            {onDelete ? (
              <Button variant="destructive" onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
