"use client";

import Link from "next/link";
import { usePublicProjects } from "@/hooks/use-projects";
import { formatInt } from "@/lib/format";

function formatUpdated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export function ProjectIndex() {
  const { projects, hydrated, error } = usePublicProjects();

  return (
    <div className="min-h-dvh bg-[#f7f6f3] text-stone-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-[11px] font-medium tracking-[0.22em] text-teal-800 uppercase">
          Project planning
        </p>
        <h1 className="mt-3 font-heading text-4xl tracking-tight md:text-5xl">
          St Mary's Hospital
        </h1>
        <p className="mt-3 max-w-xl text-stone-600">
          Open a public project display. Operators sign in to create and edit
          their own plans.
        </p>

        {error ? (
          <p className="mt-8 text-sm text-destructive">{error}</p>
        ) : null}

        {!hydrated ? (
          <p className="mt-10 text-sm text-stone-500">Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className="mt-10 text-sm text-stone-500">
            No public projects yet.{" "}
            <Link href="/login" className="text-teal-800 hover:underline">
              Sign in
            </Link>{" "}
            to create one.
          </p>
        ) : (
          <ul className="mt-10 grid gap-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/p/${project.slug}`}
                  className="block rounded-2xl bg-white px-5 py-4 ring-1 ring-stone-200 transition hover:ring-teal-700"
                >
                  <p className="font-heading text-xl tracking-tight">
                    {project.name}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    {formatInt(project.totalBeds)} beds
                    {project.updatedAt
                      ? ` · Updated ${formatUpdated(project.updatedAt)}`
                      : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-sm text-stone-500">
          <Link href="/login" className="text-teal-800 hover:underline">
            Control studio
          </Link>
        </p>
      </div>
    </div>
  );
}
