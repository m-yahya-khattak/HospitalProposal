import { formulaPreview, type SourceOption } from "@/lib/formula-label";
import type { Formula } from "@/lib/types";

export type CellMode = "per" | "every" | "ifOn";

export type MatrixCell = {
  mode: CellMode;
  n: number;
};

export type ItemQtyRule = {
  kind: "fixed" | "hospital";
  constant: number;
  cells: Record<string, MatrixCell>;
  leftover: Formula[];
};

export function formulaToCell(formula: Formula): MatrixCell | null {
  if (formula.type === "timesSource") {
    return { mode: "per", n: formula.n };
  }
  if (formula.type === "perSource") {
    return { mode: "every", n: formula.n };
  }
  if (formula.type === "oneIfExists") {
    return { mode: "ifOn", n: formula.n };
  }
  return null;
}

export function cellToFormula(source: string, cell: MatrixCell): Formula {
  if (cell.mode === "every") {
    return { type: "perSource", source, n: cell.n };
  }
  if (cell.mode === "ifOn") {
    return { type: "oneIfExists", source, n: cell.n };
  }
  return { type: "timesSource", source, n: cell.n };
}

export function cellLabel(cell: MatrixCell): string {
  if (cell.mode === "every") return `1/${cell.n}`;
  if (cell.mode === "ifOn") return cell.n === 1 ? "if" : `if ${cell.n}`;
  return String(cell.n);
}

export function parseContributions(contributions: Formula[]): ItemQtyRule {
  const cells: Record<string, MatrixCell> = {};
  const leftover: Formula[] = [];
  let constant = 0;

  for (const formula of contributions) {
    if (formula.type === "constant") {
      constant += formula.value;
      continue;
    }
    if (formula.type === "sum") {
      leftover.push(formula);
      continue;
    }
    const cell = formulaToCell(formula);
    if (!cell) {
      leftover.push(formula);
      continue;
    }
    cells[formula.source] = cell;
  }

  const hasCells = Object.keys(cells).length > 0;
  return {
    kind: hasCells || leftover.length > 0 ? "hospital" : "fixed",
    constant,
    cells,
    leftover,
  };
}

export function toContributions(
  rule: ItemQtyRule,
  sourceOrder: string[],
): Formula[] {
  const next: Formula[] = [...rule.leftover];
  if (rule.kind === "fixed" || rule.constant) {
    next.push({ type: "constant", value: rule.constant });
  }
  if (rule.kind === "hospital") {
    const seen = new Set<string>();
    for (const source of sourceOrder) {
      const cell = rule.cells[source];
      if (!cell) continue;
      seen.add(source);
      next.push(cellToFormula(source, cell));
    }
    for (const [source, cell] of Object.entries(rule.cells)) {
      if (seen.has(source)) continue;
      next.push(cellToFormula(source, cell));
    }
  }
  return next;
}

export function setContributionCell(
  contributions: Formula[],
  source: string,
  cell: MatrixCell | null,
  sourceOrder: string[],
): Formula[] {
  const rule = parseContributions(contributions);
  if (cell) rule.cells[source] = cell;
  else delete rule.cells[source];
  if (Object.keys(rule.cells).length > 0 || rule.leftover.length > 0) {
    rule.kind = "hospital";
  }
  return toContributions(rule, sourceOrder);
}

export function setFixedQty(value: number): Formula[] {
  return [{ type: "constant", value }];
}

export function formulaSentence(
  contributions: Formula[],
  sources: SourceOption[],
  qty?: number,
): string {
  const visible = contributions.filter((f) => f.type !== "sum");
  if (visible.length === 0) {
    return qty === undefined ? "No quantity rule" : `No rule · ${qty} units`;
  }
  const body = visible.map((f) => formulaPreview(f, sources)).join(" + ");
  if (qty === undefined) return body;
  return `${body} = ${qty}`;
}
