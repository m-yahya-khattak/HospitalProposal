export type FormulaType =
  | "perSource"
  | "timesSource"
  | "oneIfExists"
  | "constant";

export type Formula =
  | { type: "perSource"; source: string; n: number }
  | { type: "timesSource"; source: string; n: number }
  | { type: "oneIfExists"; source: string; n: number }
  | { type: "constant"; value: number }
  | { type: "sum"; itemIds: string[] };

export type ItemCategory = string;

export const DEFAULT_CATEGORIES = [
  "furniture",
  "ward-equipment",
  "theatre-equipment",
  "diagnostic",
  "laboratory",
] as const;

export type Department = {
  id: string;
  name: string;
  sharePercent: number;
  beds?: number;
  furniture: boolean;
  kpiCritical?: boolean;
  specialtyId?: string;
};

export type Specialty = {
  id: string;
  name: string;
  enabled: boolean;
};

export type CatalogItem = {
  id: string;
  name: string;
  category: ItemCategory;
  premiumUnit: number;
  budgetUnit: number;
  enabled: boolean;
  contributions: Formula[];
  premiumQuoteIds?: string[];
  budgetQuoteIds?: string[];
  premiumQuoteId?: string | null;
  budgetQuoteId?: string | null;
};

export type QuoteRole = "premium" | "budget" | "both";

export type QuoteProduct = {
  id: string;
  name: string;
  supplier: string;
  model?: string;
  currency: string;
  originalPrice: number;
  usdUnit: number;
  fxRate?: number;
  fxAsOf?: string;
  source: "upload" | "manual";
  externalId?: string;
};

export type TheatreRules = {
  otPerBeds: number;
  minorPerOt: number;
  ldPerBeds: number;
  cathLabCount: number;
  labourSpecialtyId: string;
  cathSpecialtyId: string;
};

export type AreaBand = {
  beds: number;
  sqftPerBed: number;
};

export type CapexLine = {
  id: string;
  name: string;
  ratePerSqft: number;
};

export type CapexConfig = {
  areaBands: AreaBand[];
  lines: CapexLine[];
  landExcluded: boolean;
  /** Category ids left out of CAPEX. Missing = all categories included. */
  excludedCategories?: string[];
};

/** Display FX only. Saved money is always USD. */
export type FxSource = "live" | "pinned" | "override";

export type FxSettings = {
  displayCurrency: string;
  source: FxSource;
  /** Units of displayCurrency per 1 USD, when pinned or overridden. */
  rate?: number;
  asOf?: string;
};

export type PlanningModel = {
  version: 1;
  title: string;
  totalBeds: number;
  rounding: "ceil";
  departments: Department[];
  specialties: Specialty[];
  categories?: string[];
  hiddenCategories?: string[];
  categoryLabels?: Record<string, string>;
  theatre: TheatreRules;
  items: CatalogItem[];
  quotes?: QuoteProduct[];
  capex: CapexConfig;
  fx?: FxSettings;
};

export type PlanningProject = {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  totalBeds: number;
};

export type DeptResult = {
  id: string;
  name: string;
  sharePercent: number;
  beds: number;
  furniture: boolean;
  kpiCritical: boolean;
};

export type ItemResult = {
  id: string;
  name: string;
  category: ItemCategory;
  enabled: boolean;
  qtyRaw: number;
  qty: number;
  premiumUnit: number;
  budgetUnit: number;
  premiumCost: number;
  budgetCost: number;
};

export type CapexLineResult = {
  id: string;
  name: string;
  kind: "construction" | "catalog";
  premium: number;
  budget: number;
};

export type CategoryRollup = {
  id: string;
  qty: number;
  premium: number;
  budget: number;
};

export type Evaluation = {
  totalBeds: number;
  shareTotal: number;
  departments: DeptResult[];
  furnitureBeds: number;
  criticalCareBeds: number;
  theatres: {
    otRaw: number;
    minorOtRaw: number;
    ot: number;
    minorOt: number;
    cathLab: number;
    labourDeliveryRaw: number;
    labourDelivery: number;
    totalRooms: number;
  };
  sources: Record<string, number>;
  items: ItemResult[];
  equipmentUnits: number;
  furnitureUnits: number;
  categoryRollup: CategoryRollup[];
  bomPremium: number;
  bomBudget: number;
  sqftPerBed: number;
  areaSqft: number;
    capex: {
      lines: CapexLineResult[];
      constructionPremium: number;
      constructionBudget: number;
      catalogPremium: number;
      catalogBudget: number;
      totalPremium: number;
      totalBudget: number;
    };
};
