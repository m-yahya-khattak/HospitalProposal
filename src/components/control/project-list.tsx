"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjects } from "@/hooks/use-projects";
import { createClient } from "@/lib/supabase/client";
import { formatInt } from "@/lib/format";
import { FolderPlus, LogOut, Trash2 } from "lucide-react";

function formatUpdated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export function ProjectList() {
  const { projects, userEmail, hydrated, error, createProject, deleteProject } =
    useProjects();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const signOut = async () => {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    setFormError(null);
    try {
      const slug = await createProject(trimmed);
      setOpen(false);
      setName("");
      router.push(`/control/${slug}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-teal-800 uppercase">
              Project planning
            </p>
            <h1 className="font-heading text-2xl tracking-tight">Your projects</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {userEmail ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {userEmail}
              </span>
            ) : null}
            <Button onClick={() => setOpen(true)}>
              <FolderPlus data-icon="inline-start" />
              New project
            </Button>
            <Button variant="outline" onClick={() => void signOut()}>
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {error ? (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!hydrated ? (
          <p className="text-sm text-muted-foreground">Loading projects…</p>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-stone-200">
            <h2 className="font-heading text-xl">No projects yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a project to save beds, equipment, formulas and CAPEX.
            </p>
            <Button className="mt-6" onClick={() => setOpen(true)}>
              <FolderPlus data-icon="inline-start" />
              New project
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 ring-1 ring-stone-200"
              >
                <div>
                  <Link
                    href={`/control/${project.slug}`}
                    className="font-heading text-lg tracking-tight hover:text-teal-800"
                  >
                    {project.name}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatInt(project.totalBeds)} beds · Updated{" "}
                    {formatUpdated(project.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => router.push(`/control/${project.slug}`)}>
                    Open
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete “${project.name}”? The public display URL will stop working.`,
                        )
                      ) {
                        void deleteProject(project.id);
                      }
                    }}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={onCreate}>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>
                Starts from the master planning sheet. You can change every tab
                after you create it.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                className="mt-1 h-10"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Dar es Salaam hospital"
                required
              />
              {formError ? (
                <p className="mt-2 text-sm text-destructive">{formError}</p>
              ) : null}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
