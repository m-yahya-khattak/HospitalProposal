export type AccessLevel = "none" | "read" | "write";

export const GUEST_MODULES = [
  "hospitalSize",
  "departments",
  "specialties",
  "theatre",
  "categories",
  "items",
  "formulas",
  "quotes",
  "quotePrices",
  "capexBands",
  "capexRates",
  "capexCatalog",
] as const;

export type GuestModule = (typeof GUEST_MODULES)[number];

export type GuestPermissions = Record<GuestModule, AccessLevel>;

export const GUEST_MODULE_LABELS: Record<GuestModule, string> = {
  hospitalSize: "Hospital size (beds & area)",
  departments: "Departments",
  specialties: "Specialties",
  theatre: "Theatre rules",
  categories: "Item categories",
  items: "Items & prices",
  formulas: "Quantity matrix",
  quotes: "Quote library",
  quotePrices: "Quote prices",
  capexBands: "CAPEX area bands",
  capexRates: "CAPEX construction rates",
  capexCatalog: "CAPEX catalog includes",
};

export function defaultGuestPermissions(
  canScaleBeds = true,
): GuestPermissions {
  return {
    hospitalSize: canScaleBeds ? "write" : "read",
    departments: "read",
    specialties: "read",
    theatre: "read",
    categories: "read",
    items: "read",
    formulas: "read",
    quotes: "read",
    quotePrices: "read",
    capexBands: "read",
    capexRates: "read",
    capexCatalog: "read",
  };
}

export function ownerPermissions(): GuestPermissions {
  return Object.fromEntries(
    GUEST_MODULES.map((m) => [m, "write"]),
  ) as GuestPermissions;
}

export function normalizeGuestPermissions(
  raw: unknown,
  fallbackScaleBeds = true,
): GuestPermissions {
  const base = defaultGuestPermissions(fallbackScaleBeds);
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  for (const key of GUEST_MODULES) {
    const value = obj[key];
    if (value === "none" || value === "read" || value === "write") {
      base[key] = value;
    }
  }
  // Quote prices are visibility only — write means read.
  if (base.quotePrices === "write") base.quotePrices = "read";
  // Writing quotes requires seeing prices.
  if (base.quotes === "write" && base.quotePrices === "none") {
    base.quotePrices = "read";
  }
  return base;
}

export function canRead(perms: GuestPermissions, module: GuestModule) {
  return perms[module] === "read" || perms[module] === "write";
}

export function canWrite(perms: GuestPermissions, module: GuestModule) {
  return perms[module] === "write";
}

export function anyWrite(perms: GuestPermissions) {
  return GUEST_MODULES.some((m) => perms[m] === "write");
}

export type VisitorClaims = {
  role: "visitor";
  projectId: string;
  projectSlug: string;
  guestId: string;
  expiresAt: string;
  permissions: GuestPermissions;
};

export type ProjectAccess =
  | { kind: "owner"; projectId: string; permissions: GuestPermissions }
  | {
      kind: "visitor";
      projectId: string;
      guestId?: string;
      expiresAt: string;
      permissions: GuestPermissions;
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
  const scale =
    meta.can_scale_beds !== false && meta.can_scale_beds !== "false";
  return {
    role: "visitor",
    projectId,
    projectSlug,
    guestId: asString(meta.guest_id),
    expiresAt,
    permissions: normalizeGuestPermissions(meta.permissions, scale),
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

/** Placeholder amounts when quote prices are hidden from the visitor. */
export function blurredPriceSeed(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return 1000 + (hash % 9000);
}
