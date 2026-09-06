"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjects } from "@/hooks/use-projects";
import { formatInt } from "@/lib/format";
import { FolderPlus, Trash2, X } from "lucide-react";

function formatUpdated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export function ProjectPanel({
  open,
  onClose,
  currentSlug,
}: {
  open: boolean;
  onClose: () => void;
  currentSlug?: string;
}) {
  const { projects, hydrated, error, createProject, deleteProject } =
    useProjects();
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    setFormError(null);
    try {
      const slug = await createProject(trimmed);
      setName("");
      setCreating(false);
      onClose();
      router.push(`/control/${slug}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setPending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/20"
        aria-label="Close projects"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-teal-800 uppercase">
              Your workspace
            </p>
            <h2 className="font-heading text-2xl tracking-tight">Projects</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          ) : null}

          <Button className="w-full" onClick={() => setCreating(true)}>
            <FolderPlus data-icon="inline-start" />
            New project
          </Button>

          {creating ? (
            <form className="mt-4 grid gap-3 rounded-xl bg-stone-50 p-3" onSubmit={onCreate}>
              <div>
                <Label htmlFor="panel-project-name">Project name</Label>
                <Input
                  id="panel-project-name"
                  className="mt-1 h-10"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="St Mary's Hospital"
                  required
                  autoFocus
                />
              </div>
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Creating…" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreating(false);
                    setFormError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          {!hydrated ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No projects yet. Create one to start planning.
            </p>
          ) : (
            <ul className="mt-5 grid gap-2">
              {projects.map((project) => {
                const active = project.slug === currentSlug;
                return (
                  <li
                    key={project.id}
                    className={`rounded-xl px-3 py-3 ring-1 ${
                      active
                        ? "bg-teal-50 ring-teal-200"
                        : "bg-white ring-stone-200"
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        onClose();
                        router.push(`/control/${project.slug}`);
                      }}
                    >
                      <p className="font-heading text-base tracking-tight">
                        {project.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatInt(project.totalBeds)} beds ·{" "}
                        {formatUpdated(project.updatedAt)}
                      </p>
                    </button>
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Delete “${project.name}”? The public display URL will stop working.`,
                            )
                          ) {
                            return;
                          }
                          void deleteProject(project.id).then(() => {
                            if (active) router.push("/control");
                          });
                        }}
                      >
                        <Trash2 data-icon="inline-start" />
                        Delete
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
