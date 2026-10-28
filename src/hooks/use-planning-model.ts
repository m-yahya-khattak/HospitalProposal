"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cloneSeed, seedModel } from "@/data/seed-model";
import {
  anyWrite,
  normalizeGuestPermissions,
  ownerPermissions,
  type ProjectAccess,
  visitorClaims,
  visitorExpired,
} from "@/lib/access";
import { normalizePlanningModel } from "@/lib/currency";
import { evaluate } from "@/lib/engine";
import { createClient } from "@/lib/supabase/client";
import { parsePlanningModel } from "@/lib/sync";
import type { PlanningModel } from "@/lib/types";

export function usePlanningModel(slug: string) {
  const [model, setModelState] = useState<PlanningModel>(seedModel);
  const [projectName, setProjectName] = useState(slug);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [live, setLive] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [access, setAccess] = useState<ProjectAccess>({ kind: "none" });
  const writingRef = useRef(false);
  const persistTimer = useRef<number | undefined>(undefined);
  const supabaseRef = useRef<ReturnType<typeof createClient>>(null);
  const projectIdRef = useRef<string | null>(null);
  const accessKindRef = useRef<ProjectAccess["kind"]>("none");
  const canPersistRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;
    setHydrated(false);
    setNotFound(false);
    setLive(false);
    setAccess({ kind: "none" });
    projectIdRef.current = null;
    accessKindRef.current = "none";
    canPersistRef.current = false;

    if (!supabase) {
      setPersistError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.",
      );
      setHydrated(true);
      return;
    }

    if (!slug) {
      void supabase.auth.getUser().then(({ data: { user } }) => {
        setUserEmail(user?.email ?? null);
        setHydrated(true);
      });
      return;
    }

    let cancelled = false;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserEmail(user?.email ?? null);
      if (!user) {
        setNotFound(true);
        setHydrated(true);
        return;
      }

      const claims = visitorClaims(user);
      if (claims && !visitorExpired(claims.expiresAt)) {
        const { data, error } = await supabase.rpc("get_guest_project", {
          p_slug: slug,
        });
        if (cancelled) return;
        if (error) {
          setPersistError(error.message);
          setNotFound(true);
          setHydrated(true);
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        const parsed = parsePlanningModel(row?.model);
        if (!row?.project_id || !parsed) {
          setNotFound(true);
          setHydrated(true);
          return;
        }
        const permissions = normalizeGuestPermissions(
          row.permissions,
          true,
        );
        const nextAccess: ProjectAccess = {
          kind: "visitor",
          projectId: row.project_id,
          guestId: row.guest_id,
          expiresAt: row.expires_at,
          permissions,
        };
        projectIdRef.current = row.project_id;
        accessKindRef.current = "visitor";
        canPersistRef.current = anyWrite(permissions);
        setAccess(nextAccess);
        setProjectName(row.name);
        setModelState(parsed);
        setPersistError(null);
        setLive(true);
        setHydrated(true);
        return;
      }

      const { data, error } = await supabase
        .from("planning_projects")
        .select("id, name, owner_id, model")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setPersistError(error.message);
        setHydrated(true);
        return;
      }

      const parsed = parsePlanningModel(data?.model);
      if (!data || !parsed || data.owner_id !== user.id) {
        setNotFound(true);
        setHydrated(true);
        return;
      }

      const nextAccess: ProjectAccess = {
        kind: "owner",
        projectId: data.id,
        permissions: ownerPermissions(),
      };
      projectIdRef.current = data.id;
      accessKindRef.current = "owner";
      canPersistRef.current = true;
      setAccess(nextAccess);
      setProjectName(data.name);
      setModelState(parsed);
      setPersistError(null);
      setHydrated(true);
    };

    void load();

    const channel = supabase
      .channel(`planning-project-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "planning_projects",
          filter: `slug=eq.${slug}`,
        },
        (payload) => {
          // Visitors must not take raw model from realtime (quote prices).
          if (accessKindRef.current === "visitor") return;
          if (writingRef.current) return;
          const next = payload.new as { model?: unknown; name?: string } | null;
          if (next?.name) setProjectName(next.name);
          const parsed = parsePlanningModel(next?.model);
          if (parsed) {
            setModelState(parsed);
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
  }, [slug]);

  const persist = useCallback((next: PlanningModel) => {
    const supabase = supabaseRef.current;
    const id = projectIdRef.current;
    if (!supabase || !id || !canPersistRef.current) return;
    if (persistTimer.current) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      writingRef.current = true;
      if (accessKindRef.current === "visitor") {
        void supabase
          .rpc("apply_guest_patch", { p_project_id: id, p_model: next })
          .then(({ data, error }) => {
            writingRef.current = false;
            if (error) {
              setPersistError(error.message);
              return;
            }
            setPersistError(null);
            const parsed = parsePlanningModel(data);
            if (parsed) setModelState(parsed);
          });
        return;
      }
      void supabase
        .from("planning_projects")
        .update({ model: next })
        .eq("id", id)
        .then(({ error }) => {
          writingRef.current = false;
          setPersistError(error ? error.message : null);
        });
    }, 300);
  }, []);

  const setModel = useCallback(
    (next: PlanningModel | ((prev: PlanningModel) => PlanningModel)) => {
      setModelState((prev) => {
        const resolved = normalizePlanningModel(
          typeof next === "function" ? next(prev) : next,
        );
        persist(resolved);
        return resolved;
      });
    },
    [persist],
  );

  /** Local-only updates (visitor read toggles / previews). Never saved. */
  const setLocalModel = useCallback(
    (next: PlanningModel | ((prev: PlanningModel) => PlanningModel)) => {
      setModelState((prev) =>
        normalizePlanningModel(
          typeof next === "function" ? next(prev) : next,
        ),
      );
    },
    [],
  );

  const reset = useCallback(() => {
    if (accessKindRef.current !== "owner") return;
    const quotes = model.quotes ?? [];
    const next = cloneSeed();
    next.title = projectName;
    next.quotes = structuredClone(quotes);
    setModel(next);
  }, [model.quotes, projectName, setModel]);

  const result = useMemo(() => evaluate(model), [model]);

  return {
    model,
    result,
    setModel,
    setLocalModel,
    reset,
    hydrated,
    notFound,
    live,
    userEmail,
    persistError,
    projectName,
    projectId: access.kind === "none" ? null : access.projectId,
    access,
    slug,
  };
}
