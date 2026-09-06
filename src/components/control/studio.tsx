"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CapacityTab } from "@/components/control/capacity-tab";
import { CapexTab } from "@/components/control/capex-tab";
import { CatalogTab } from "@/components/control/catalog-tab";
import { FormulasTab } from "@/components/control/formulas-tab";
import { KpiStrip } from "@/components/control/kpi-strip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlanningModel } from "@/hooks/use-planning-model";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ExternalLink, LogOut, RotateCcw } from "lucide-react";

export function Studio({ slug }: { slug: string }) {
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
  } = usePlanningModel(slug, { requireOwner: true });
  const [tab, setTab] = useState("capacity");
  const router = useRouter();

  const openDisplay = () => {
    window.open(`/p/${slug}`, `hospital-display-${slug}`);
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (hydrated && notFound) {
    return (
      <div className="flex min-h-full items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="font-heading text-2xl">Project not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This project does not exist or belongs to another operator.
          </p>
          <Button className="mt-6" onClick={() => router.push("/control")}>
            <ArrowLeft data-icon="inline-start" />
            Back to projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div>
            <Link
              href="/control"
              className="text-[11px] font-medium tracking-[0.18em] text-teal-800 uppercase hover:underline"
            >
              All projects
            </Link>
            <h1 className="font-heading text-2xl tracking-tight">
              {hydrated ? projectName : "Control studio"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {userEmail ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {userEmail}
              </span>
            ) : null}
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
            <Button variant="outline" onClick={() => void signOut()}>
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        </div>
        {persistError ? (
          <p className="border-t bg-red-50 px-4 py-2 text-sm text-destructive lg:px-6">
            Could not save to Supabase: {persistError}
          </p>
        ) : null}
        <KpiStrip result={result} />
      </header>

      <main className="px-4 py-6 lg:px-6">
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
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
            <TabsTrigger value="formulas">Formulas</TabsTrigger>
            <TabsTrigger value="capex">CAPEX</TabsTrigger>
          </TabsList>
          <TabsContent value="capacity" className="pt-6">
            <CapacityTab model={model} result={result} onChange={setModel} />
          </TabsContent>
          <TabsContent value="catalog" className="pt-6">
            <CatalogTab model={model} result={result} onChange={setModel} />
          </TabsContent>
          <TabsContent value="formulas" className="pt-6">
            <FormulasTab model={model} result={result} onChange={setModel} />
          </TabsContent>
          <TabsContent value="capex" className="pt-6">
            <CapexTab model={model} result={result} onChange={setModel} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
