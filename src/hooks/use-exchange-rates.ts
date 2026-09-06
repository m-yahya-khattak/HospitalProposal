"use client";

import { useEffect, useState } from "react";
import type { FxTable } from "@/lib/currency";

type State = {
  table: FxTable | null;
  error: string | null;
  loading: boolean;
};

export function useExchangeRates() {
  const [state, setState] = useState<State>({
    table: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/fx");
        const json = (await res.json()) as FxTable & { error?: string };
        if (cancelled) return;
        if (!res.ok || !json.rates) {
          setState({
            table: null,
            error: json.error ?? "Rates unavailable",
            loading: false,
          });
          return;
        }
        setState({ table: json, error: null, loading: false });
      } catch {
        if (!cancelled) {
          setState({
            table: null,
            error: "Rates unavailable",
            loading: false,
          });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
