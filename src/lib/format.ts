import { DEFAULT_CATEGORIES } from "@/lib/types";

export function formatInt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(n),
  );
}

export function formatNumber(n: number, digits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(n: number, digits = 1) {
  return `${formatNumber(n, digits)}%`;
}

export function formatTsh(n: number) {
  return `TSH ${formatInt(n)}`;
}

export function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatCompact(n: number) {
  if (Math.abs(n) >= 1_000_000_000) {
    return `${formatNumber(n / 1_000_000_000, 2)}B`;
  }
  if (Math.abs(n) >= 1_000_000) {
    return `${formatNumber(n / 1_000_000, 2)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${formatNumber(n / 1_000, 1)}k`;
  }
  return formatInt(n);
}

export function categoryLabel(category: string) {
  switch (category) {
    case "furniture":
      return "Furniture";
    case "ward-equipment":
      return "Wards / ICU";
    case "theatre-equipment":
      return "Theatres";
    case "diagnostic":
      return "Radiology";
    case "laboratory":
      return "Laboratory";
    default:
      return category
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function isCustomCategory(id: string) {
  return !(DEFAULT_CATEGORIES as readonly string[]).includes(id);
}

export function modelCategories(model: { categories?: string[]; items: { category: string }[] }) {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const id of [
    ...DEFAULT_CATEGORIES,
    ...(model.categories ?? []),
    ...model.items.map((item) => item.category),
  ]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    list.push(id);
  }
  return list;
}
