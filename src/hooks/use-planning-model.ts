"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cloneSeed, seedModel } from "@/data/seed-model";
import { evaluate } from "@/lib/engine";
import {
  CHANNEL_NAME,
  STORAGE_KEY,
  loadModel,
  saveModel,
} from "@/lib/sync";
import type { PlanningModel } from "@/lib/types";

export function usePlanningModel() {
  const [model, setModelState] = useState<PlanningModel>(seedModel);
  const [hydrated, setHydrated] = useState(false);
  const [live, setLive] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const persistTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const stored = loadModel();
    if (stored) setModelState(stored);
    setHydrated(true);

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent) => {
      const data = event.data as
        | { type: "model"; model: PlanningModel }
        | { type: "hello" | "ack" }
        | undefined;
      if (!data) return;
      if (data.type === "model") {
        setModelState(data.model);
        setLive(true);
      }
      if (data.type === "hello") {
        setLive(true);
        channel.postMessage({ type: "ack" });
      }
      if (data.type === "ack") setLive(true);
    };
    channel.postMessage({ type: "hello" });

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as PlanningModel;
        setModelState(parsed);
        setLive(true);
      } catch {
        /* ignore corrupt payload */
      }
    };
    window.addEventListener("storage", onStorage);
    const ping = window.setInterval(() => {
      channel.postMessage({ type: "hello" });
    }, 4000);

    return () => {
      window.clearInterval(ping);
      window.removeEventListener("storage", onStorage);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const persist = useCallback((next: PlanningModel) => {
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      saveModel(next);
      channelRef.current?.postMessage({ type: "model", model: next });
    }, 100);
  }, []);

  const setModel = useCallback(
    (
      next: PlanningModel | ((prev: PlanningModel) => PlanningModel),
    ) => {
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

  return { model, result, setModel, reset, hydrated, live };
}
