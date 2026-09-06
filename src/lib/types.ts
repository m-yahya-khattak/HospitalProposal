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

export type ItemCategory =
  | "furniture"
  | "ward-equipment"
  | "theatre-equipment"
  | "diagnostic"
  | "laboratory";

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
  fromBom?: boolean;
};

export type CapexConfig = {
  fxRate: number;
  areaBands: AreaBand[];
  lines: CapexLine[];
  landExcluded: boolean;
};

export type PlanningModel = {
  version: 1;
  title: string;
  totalBeds: number;
  rounding: "ceil";
  departments: Department[];
  specialties: Specialty[];
  theatre: TheatreRules;
  items: CatalogItem[];
  capex: CapexConfig;
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
  fromBom: boolean;
  tshPremium: number;
  tshBudget: number;
  usdPremium: number;
  usdBudget: number;
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
  bomPremium: number;
  bomBudget: number;
  sqftPerBed: number;
  areaSqft: number;
  capex: {
    lines: CapexLineResult[];
    totalTshPremium: number;
    totalTshBudget: number;
    totalUsdPremium: number;
    totalUsdBudget: number;
  };
};
