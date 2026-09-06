"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CapacityTab } from "@/components/control/capacity-tab";
import { CapexTab } from "@/components/control/capex-tab";
import { ItemsTab } from "@/components/control/items-tab";
import { KpiStrip } from "@/components/control/kpi-strip";
import { ProjectPanel } from "@/components/control/project-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlanningModel } from "@/hooks/use-planning-model";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, ExternalLink, FolderOpen, LogOut, RotateCcw } from "lucide-react";

export function Studio({
  slug,
  panelOpen: initialPanelOpen = false,
}: {
  slug?: string;
  panelOpen?: boolean;
}) {
  const hasProject = Boolean(slug);
  const planning = usePlanningModel(slug ?? "", { requireOwner: true });
  const {
    model,
    result,
    setModel,
    reset,
    live,
    userEmail,
    persistError,
    projectName,
    hydrated,
    notFound,
  } = planning;
  const [tab, setTab] = useState("capacity");
  const [itemFilter, setItemFilter] = useState("all");
  const [panelOpen, setPanelOpen] = useState(initialPanelOpen || !slug);
  const router = useRouter();

  const openDisplay = () => {
    if (!slug) return;
    window.open(`/p/${slug}`, `hospital-display-${slug}`);
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const missing = hasProject && hydrated && notFound;

  return (
    <div className="min-h-dvh bg-[#f7f6f3] text-stone-900">
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div>
            <p className="text-xs font-medium text-teal-800">
              Project planning
            </p>
            <h1 className="font-heading text-2xl tracking-tight">
              {missing
                ? "Project not found"
                : hasProject && hydrated
                  ? projectName
                  : "Control studio"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setPanelOpen(true)}>
              <FolderOpen data-icon="inline-start" />
              {userEmail ?? "Projects"}
              <ChevronDown data-icon="inline-end" />
            </Button>
            {hasProject && !missing ? (
              <>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    live
                      ? "bg-teal-50 text-teal-800"
                      : "bg-stone-100 text-muted-foreground"
                  }`}
                >
                  {live ? "Live from database" : "Connecting…"}
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Restore the master planning sheet for this project? Saved edits on this project will be replaced.",
                      )
                    ) {
                      reset();
                    }
                  }}
                >
                  <RotateCcw data-icon="inline-start" />
                  Reset master
                </Button>
                <Button onClick={openDisplay}>
                  <ExternalLink data-icon="inline-start" />
                  Open display
                </Button>
              </>
            ) : null}
            <Button variant="outline" onClick={() => void signOut()}>
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        </div>
        {persistError && hasProject ? (
          <p className="border-t bg-red-50 px-4 py-2 text-sm text-destructive lg:px-6">
            Could not save to Supabase: {persistError}
          </p>
        ) : null}
        {hasProject && !missing ? (
          <KpiStrip
            result={result}
            onSelectTheatres={() => setTab("capacity")}
            onSelectCategory={(id) => {
              setItemFilter(id);
              setTab("items");
            }}
          />
        ) : null}
      </header>

      <main className="px-4 py-6 lg:px-6">
        {missing ? (
          <p className="text-sm text-muted-foreground">
            This project does not exist or belongs to another operator. Open
            Projects to pick another.
          </p>
        ) : !hasProject ? (
          <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-stone-200">
            <h2 className="font-heading text-xl">Select or create a project</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the Projects button next to your email in the header.
            </p>
            <Button className="mt-6" onClick={() => setPanelOpen(true)}>
              <FolderOpen data-icon="inline-start" />
              Open projects
            </Button>
          </div>
        ) : (
          <>
            {!hydrated ? (
              <p className="text-sm text-muted-foreground">Loading project…</p>
            ) : null}
            <Tabs
              value={tab}
              onValueChange={(value) => value && setTab(value)}
              className={hydrated ? undefined : "hidden"}
            >
              <TabsList variant="line" className="w-full justify-start">
                <TabsTrigger value="capacity">Capacity</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="capex">CAPEX</TabsTrigger>
              </TabsList>
              <TabsContent value="capacity" className="pt-6">
                <CapacityTab model={model} result={result} onChange={setModel} />
              </TabsContent>
              <TabsContent value="items" className="pt-6">
                <ItemsTab
                  model={model}
                  result={result}
                  onChange={setModel}
                  filter={itemFilter}
                  onFilterChange={setItemFilter}
                />
              </TabsContent>
              <TabsContent value="capex" className="pt-6">
                <CapexTab model={model} result={result} onChange={setModel} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      <ProjectPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        currentSlug={slug}
      />
    </div>
  );
}
