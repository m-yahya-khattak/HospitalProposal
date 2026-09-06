"use client";

import { useCallback, useEffect, useState } from "react";
import { cloneSeed } from "@/data/seed-model";
import { normalizePlanningModel } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/id";
import { parsePlanningModel } from "@/lib/sync";
import { mapProject, type ProjectRow } from "@/lib/projects";
import type { PlanningModel, PlanningProject } from "@/lib/types";

const LIST_COLUMNS =
  "id, slug, name, owner_id, is_public, created_at, updated_at, model";

async function insertProject(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  source?: PlanningModel,
) {
  const base = slugify(name);
  const model = normalizePlanningModel(
    source ? structuredClone(source) : cloneSeed(),
  );
  model.title = name;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("planning_projects")
      .insert({
        slug,
        name,
        owner_id: userId,
        model,
        is_public: true,
      })
      .select("slug")
      .single();

    if (!error && data?.slug) return data.slug;
    if (error?.code !== "23505") {
      throw new Error(error?.message ?? "Could not create project");
    }
  }

  throw new Error("Could not create a unique project URL. Try another name.");
}

export function useProjects() {
  const [projects, setProjects] = useState<PlanningProject[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.",
      );
      setHydrated(true);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserEmail(user?.email ?? null);

    if (!user) {
      setProjects([]);
      setHydrated(true);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("planning_projects")
      .select(LIST_COLUMNS)
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setProjects([]);
    } else {
      setError(null);
      setProjects(((data ?? []) as ProjectRow[]).map(mapProject));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createProject = useCallback(async (name: string) => {
    const supabase = createClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in to create a project.");
    const slug = await insertProject(supabase, user.id, name.trim());
    await reload();
    return slug;
  }, [reload]);

  const deleteProject = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error: deleteError } = await supabase
        .from("planning_projects")
        .delete()
        .eq("id", id);
      if (deleteError) throw new Error(deleteError.message);
      await reload();
    },
    [reload],
  );

  const duplicateProject = useCallback(
    async (id: string, name: string) => {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase is not configured.");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to duplicate a project.");
      const { data, error: loadError } = await supabase
        .from("planning_projects")
        .select("model")
        .eq("id", id)
        .eq("owner_id", user.id)
        .single();
      if (loadError) throw new Error(loadError.message);
      const source = parsePlanningModel(data?.model);
      if (!source) {
        throw new Error("That project has no planning data to copy.");
      }
      const slug = await insertProject(
        supabase,
        user.id,
        name.trim(),
        source,
      );
      await reload();
      return slug;
    },
    [reload],
  );

  return {
    projects,
    userEmail,
    hydrated,
    error,
    createProject,
    deleteProject,
    duplicateProject,
    reload,
  };
}

export function usePublicProjects() {
  const [projects, setProjects] = useState<PlanningProject[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setHydrated(true);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { data, error: queryError } = await supabase
        .from("planning_projects")
        .select(LIST_COLUMNS)
        .eq("is_public", true)
        .order("updated_at", { ascending: false });

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setProjects([]);
      } else {
        setError(null);
        setProjects(((data ?? []) as ProjectRow[]).map(mapProject));
      }
      setHydrated(true);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { projects, hydrated, error };
}