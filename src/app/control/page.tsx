"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Studio } from "@/components/control/studio";
import { useProjects } from "@/hooks/use-projects";

export default function ControlPage() {
  const { projects, hydrated } = useProjects();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (projects[0]) router.replace(`/control/${projects[0].slug}`);
  }, [hydrated, projects, router]);

  if (hydrated && projects[0]) return null;
  return <Studio panelOpen />;
}
