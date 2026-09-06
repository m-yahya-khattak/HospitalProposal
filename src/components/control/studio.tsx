"use client";

import { useState } from "react";
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
import { ExternalLink, LogOut, RotateCcw } from "lucide-react";

export function Studio() {
  const { model, result, setModel, reset, live, userEmail, persistError } =
    usePlanningModel();
  const [tab, setTab] = useState("capacity");
  const router = useRouter();

  const openDisplay = () => {
    window.open("/", "hospital-display");
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-teal-800 uppercase">
              Project planning
            </p>
            <h1 className="font-heading text-2xl tracking-tight">Control studio</h1>
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
                    "Restore the master planning sheet? This replaces the shared plan in the database for everyone.",
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
        <Tabs value={tab} onValueChange={(value) => value && setTab(value)}>
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
