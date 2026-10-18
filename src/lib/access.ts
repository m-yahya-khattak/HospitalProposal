export type VisitorClaims = {
  role: "visitor";
  projectId: string;
  projectSlug: string;
  guestId: string;
  expiresAt: string;
  canScaleBeds: boolean;
};

export type ProjectAccess =
  | { kind: "owner"; projectId: string }
  | {
      kind: "visitor";
      projectId: string;
      expiresAt: string;
      canScaleBeds: boolean;
    }
  | { kind: "none" };

type AuthUser = {
  id?: string;
  app_metadata?: Record<string, unknown>;
} | null;

function asString(value: unknown) {
  return typeof value === "string" && value ? value : "";
}

export function visitorClaims(user: AuthUser): VisitorClaims | null {
  const meta = user?.app_metadata;
  if (!meta || meta.role !== "visitor") return null;
  const projectSlug = asString(meta.project_slug);
  const projectId = asString(meta.project_id);
  const expiresAt = asString(meta.expires_at);
  if (!projectSlug || !projectId || !expiresAt) return null;
  return {
    role: "visitor",
    projectId,
    projectSlug,
    guestId: asString(meta.guest_id),
    expiresAt,
    canScaleBeds: meta.can_scale_beds !== false,
  };
}

export function visitorExpired(expiresAt: string) {
  const at = Date.parse(expiresAt);
  return Number.isNaN(at) || at <= Date.now();
}

export function visitorHomePath(user: AuthUser) {
  const claims = visitorClaims(user);
  if (!claims || visitorExpired(claims.expiresAt)) return null;
  return `/control/${claims.projectSlug}`;
}

export function formatAccessUntil(expiresAt: string) {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return expiresAt;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
