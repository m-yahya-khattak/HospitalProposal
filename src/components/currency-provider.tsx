"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import {
  BASE_CURRENCY,
  currencyOptions,
  defaultFx,
  formatCurrencyAmount,
  formatMoney,
  formatRate,
  normalizeCurrencyCode,
  normalizeFx,
  resolveRate,
} from "@/lib/currency";
import type { FxSettings } from "@/lib/types";

type MoneyContextValue = {
  currency: string;
  rate: number;
  source: FxSettings["source"];
  asOf?: string;
  missing: boolean;
  liveLoading: boolean;
  liveError: string | null;
  currencies: string[];
  persist: boolean;
  format: (usd: number, compact?: boolean) => string;
  formatShown: (amount: number, compact?: boolean) => string;
  quote: string;
  setCurrency: (code: string) => void;
  pin: () => void;
  useLive: () => void;
  setOverride: (rate: number) => void;
};

const MoneyContext = createContext<MoneyContextValue | null>(null);

export function CurrencyProvider({
  fx,
  onFxChange,
  children,
}: {
  fx?: FxSettings;
  onFxChange?: (next: FxSettings) => void;
  children: React.ReactNode;
}) {
  const saved = normalizeFx(fx ?? defaultFx());
  const persist = Boolean(onFxChange);
  const live = useExchangeRates();
  const [localCurrency, setLocalCurrency] = useState(saved.displayCurrency);

  useEffect(() => {
    setLocalCurrency(saved.displayCurrency);
  }, [saved.displayCurrency]);

  const currency = persist ? saved.displayCurrency : localCurrency;
  const resolved = resolveRate(currency, saved, live.table);

  const value = useMemo<MoneyContextValue>(() => {
    const liveRate = live.table?.rates[currency];
    return {
      currency,
      rate: resolved.rate,
      source: resolved.source,
      asOf: resolved.asOf,
      missing: resolved.missing,
      liveLoading: live.loading,
      liveError: live.error,
      currencies: currencyOptions(Object.keys(live.table?.rates ?? {})),
      persist,
      format: (usd: number, compact = false) =>
        formatMoney(
          usd,
          resolved.missing ? BASE_CURRENCY : currency,
          resolved.missing ? 1 : resolved.rate,
          compact,
        ),
      formatShown: (amount: number, compact = false) =>
        formatCurrencyAmount(
          amount,
          resolved.missing ? BASE_CURRENCY : currency,
          compact,
        ),
      quote: formatRate(
        resolved.missing ? BASE_CURRENCY : currency,
        resolved.missing ? 1 : resolved.rate,
      ),
      setCurrency: (code: string) => {
        const next = normalizeCurrencyCode(code);
        if (persist && onFxChange) {
          onFxChange({
            displayCurrency: next,
            source: "live",
          });
          return;
        }
        setLocalCurrency(next);
      },
      pin: () => {
        if (!onFxChange || currency === BASE_CURRENCY) return;
        if (typeof liveRate !== "number" || liveRate <= 0) return;
        onFxChange({
          displayCurrency: currency,
          source: "pinned",
          rate: liveRate,
          asOf: live.table?.asOf,
        });
      },
      useLive: () => {
        if (!onFxChange) return;
        onFxChange({
          displayCurrency: currency,
          source: "live",
        });
      },
      setOverride: (rate: number) => {
        if (!onFxChange || currency === BASE_CURRENCY) return;
        if (!Number.isFinite(rate) || rate <= 0) return;
        onFxChange({
          displayCurrency: currency,
          source: "override",
          rate,
          asOf: new Date().toISOString(),
        });
      },
    };
  }, [
    currency,
    live.error,
    live.loading,
    live.table,
    onFxChange,
    persist,
    resolved.asOf,
    resolved.missing,
    resolved.rate,
    resolved.source,
  ]);

  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
}

export function useMoney() {
  const ctx = useContext(MoneyContext);
  if (!ctx) {
    throw new Error("useMoney must be used within CurrencyProvider");
  }
  return ctx;
}
