"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CapacityTab } from "@/components/control/capacity-tab";
import { CapexTab } from "@/components/control/capex-tab";
import { GuestsPanel } from "@/components/control/guests-panel";
import { ItemsTab } from "@/components/control/items-tab";
import { QuotesTab } from "@/components/control/quotes-tab";
import { KpiStrip } from "@/components/control/kpi-strip";
import { ProjectPanel } from "@/components/control/project-panel";
import { CurrencyProvider } from "@/components/currency-provider";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlanningModel } from "@/hooks/use-planning-model";
import {
  canRead,
  canWrite,
  formatAccessUntil,
  ownerPermissions,
} from "@/lib/access";
import { bedsFromArea, scaleHospitalBeds } from "@/lib/engine";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, ExternalLink, FolderOpen, LogOut, RotateCcw, UserPlus } from "lucide-react";

export function Studio({
  slug,
  panelOpen: initialPanelOpen = false,
}: {
  slug?: string;
  panelOpen?: boolean;
}) {
  const hasProject = Boolean(slug);
  const planning = usePlanningModel(slug ?? "");
  const {
    model,
    result,
    setModel,
    setLocalModel,
    reset,
    live,
    userEmail,
    persistError,
    projectName,
    projectId,
    access,
    hydrated,
    notFound,
  } = planning;
  const [tab, setTab] = useState("capacity");
  const [itemFilter, setItemFilter] = useState("all");
  const [panelOpen, setPanelOpen] = useState(initialPanelOpen || !slug);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const router = useRouter();
  const visitor = access.kind === "visitor";
  const owner = access.kind === "owner";
  const permissions =
    access.kind === "none" ? ownerPermissions() : access.permissions;

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

  const studio = (
    <div className="min-h-dvh bg-[#f7f6f3] text-stone-900">
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-sm">
        <div className="flex min-h-[3.75rem] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div>
            <p className="text-xs font-medium text-teal-800">
              {access.kind === "visitor"
                ? `Visitor · until ${formatAccessUntil(access.expiresAt)}`
                : "Project planning"}
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
            {visitor ? (
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-muted-foreground">
                {userEmail}
              </span>
            ) : (
              <Button variant="outline" onClick={() => setPanelOpen(true)}>
                <FolderOpen data-icon="inline-start" />
                {userEmail ?? "Projects"}
                <ChevronDown data-icon="inline-end" />
              </Button>
            )}
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
                <CurrencySwitcher />
                {owner ? (
                  <>
                    <Button variant="outline" onClick={() => setGuestsOpen(true)}>
                      <UserPlus data-icon="inline-start" />
                      Visitors
                    </Button>
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
                  </>
                ) : null}
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
            Could not save: {persistError}
          </p>
        ) : null}
      </header>

      {hasProject && !missing ? (
        <KpiStrip
          result={result}
          labels={model.categoryLabels}
          sizeVisible={canRead(permissions, "hospitalSize")}
          sizeWrite={canWrite(permissions, "hospitalSize")}
          onChangeBeds={(total) => {
            if (!canWrite(permissions, "hospitalSize")) return;
            setModel((prev) => {
              const next = structuredClone(prev);
              scaleHospitalBeds(next, total);
              return next;
            });
          }}
          onChangeArea={(area) => {
            if (!canWrite(permissions, "hospitalSize")) return;
            setModel((prev) => {
              const next = structuredClone(prev);
              scaleHospitalBeds(
                next,
                bedsFromArea(area, next.capex.areaBands),
              );
              return next;
            });
          }}
          onSelectTheatres={() => setTab("capacity")}
          onSelectCategory={(id) => {
            setItemFilter(id);
            setTab("items");
          }}
        />
      ) : null}

      <main className="px-4 py-6 lg:px-6">
        {missing ? (
          <p className="text-sm text-muted-foreground">
            This project does not exist or you do not have access. Open
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
              <div className="sticky top-[3.75rem] z-10 -mx-4 border-b border-stone-200/80 bg-[#f7f6f3]/95 px-4 pt-1 pb-0.5 backdrop-blur-md lg:-mx-6 lg:px-6">
                <TabsList
                  variant="line"
                  className="h-10 w-full justify-start"
                >
                  <TabsTrigger value="capacity">Department Mix</TabsTrigger>
                  <TabsTrigger value="items">Inventory Management</TabsTrigger>
                  {canRead(permissions, "quotes") ? (
                    <TabsTrigger value="quotes">Vendors Catalog</TabsTrigger>
                  ) : null}
                  <TabsTrigger value="capex">CAPEX</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="capacity" className="pt-6">
                <CapacityTab
                  model={model}
                  result={result}
                  onChange={setModel}
                  onLocalChange={setLocalModel}
                  permissions={permissions}
                  canDelete={owner}
                />
              </TabsContent>
              <TabsContent value="items" className="pt-6">
                <ItemsTab
                  model={model}
                  result={result}
                  onChange={setModel}
                  onLocalChange={setLocalModel}
                  filter={itemFilter}
                  onFilterChange={setItemFilter}
                  permissions={permissions}
                  canDelete={owner}
                />
              </TabsContent>
              {canRead(permissions, "quotes") ? (
                <TabsContent value="quotes" className="pt-6">
                  <QuotesTab
                    model={model}
                    onChange={setModel}
                    permissions={permissions}
                  />
                </TabsContent>
              ) : null}
              <TabsContent value="capex" className="pt-6">
                <CapexTab
                  model={model}
                  result={result}
                  onChange={setModel}
                  onLocalChange={setLocalModel}
                  permissions={permissions}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {visitor ? null : (
        <ProjectPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          currentSlug={slug}
        />
      )}
      {owner && projectId ? (
        <GuestsPanel
          projectId={projectId}
          open={guestsOpen}
          onOpenChange={setGuestsOpen}
        />
      ) : null}
    </div>
  );

  return (
    <CurrencyProvider
      fx={model.fx}
      onFxChange={
        hasProject && !missing && owner
          ? (fx) => setModel((current) => ({ ...current, fx }))
          : undefined
      }
    >
      {studio}
    </CurrencyProvider>
  );
}
