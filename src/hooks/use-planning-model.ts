"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cloneSeed, seedModel } from "@/data/seed-model";
import { evaluate } from "@/lib/engine";
import { createClient } from "@/lib/supabase/client";
import { isPlanningModel } from "@/lib/sync";
import type { PlanningModel } from "@/lib/types";

const ROW_ID = "default";

export function usePlanningModel() {
  const [model, setModelState] = useState<PlanningModel>(seedModel);
  const [hydrated, setHydrated] = useState(false);
  const [live, setLive] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const writingRef = useRef(false);
  const persistTimer = useRef<number | undefined>(undefined);
  const supabaseRef = useRef<ReturnType<typeof createClient>>(null);

  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;
    if (!supabase) {
      setPersistError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.",
      );
      setHydrated(true);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserEmail(user?.email ?? null);

      const { data, error } = await supabase
        .from("planning_models")
        .select("model")
        .eq("id", ROW_ID)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setPersistError(error.message);
      } else if (data?.model && isPlanningModel(data.model)) {
        setModelState(data.model);
        setPersistError(null);
      } else if (user) {
        const { error: insertError } = await supabase
          .from("planning_models")
          .upsert({ id: ROW_ID, model: seedModel });
        if (insertError) setPersistError(insertError.message);
      }
      setHydrated(true);
    };

    void load();

    const channel = supabase
      .channel("planning-default")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planning_models",
          filter: `id=eq.${ROW_ID}`,
        },
        (payload) => {
          if (writingRef.current) return;
          const next = (payload.new as { model?: unknown } | null)?.model;
          if (isPlanningModel(next)) {
            setModelState(next);
            setLive(true);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLive(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      cancelled = true;
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      void supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, []);

  const persist = useCallback((next: PlanningModel) => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      writingRef.current = true;
      void supabase
        .from("planning_models")
        .update({ model: next })
        .eq("id", ROW_ID)
        .then(({ error }) => {
          writingRef.current = false;
          setPersistError(error ? error.message : null);
        });
    }, 300);
  }, []);

  const setModel = useCallback(
    (next: PlanningModel | ((prev: PlanningModel) => PlanningModel)) => {
      setModelState((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        persist(resolved);
        return resolved;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    setModel(cloneSeed());
  }, [setModel]);

  const result = useMemo(() => evaluate(model), [model]);

  return {
    model,
    result,
    setModel,
    reset,
    hydrated,
    live,
    userEmail,
    persistError,
  };
}
