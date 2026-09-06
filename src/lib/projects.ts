import type { PlanningProject } from "@/lib/types";
import { isPlanningModel } from "@/lib/sync";

export type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  model?: unknown;
};

export function mapProject(row: ProjectRow): PlanningProject {
  const model = isPlanningModel(row.model) ? row.model : null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    ownerId: row.owner_id,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalBeds: model?.totalBeds ?? 0,
  };
}
