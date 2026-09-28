/**
 * Preparación de datos: tipos de columnas, variables ficticias y armado de la matriz de diseño.
 */
export type Cell = number | string | null;
export type Row = Record<string, Cell>;

export interface Dataset {
  columns: string[];
  rows: Row[];
}

export type ColumnType = 'numerica' | 'categorica';

export interface ColumnInfo {
  name: string;
  type: ColumnType;
  /** Categorías distintas (solo para categóricas), en orden de aparición. */
  categories: string[];
}

export function toNumber(v: Cell): number {
  if (v === null || v === '') return NaN;
  if (typeof v === 'number') return v;
  const s = v.trim();
  // Acepta "1.234,5" (formato argentino) y "1234.5".
  const normalized = /,\d+$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

export function inferColumns(ds: Dataset): ColumnInfo[] {
  return ds.columns.map((name) => {
    const values = ds.rows.map((r) => r[name]).filter((v) => v !== null && v !== '');
    const numeric = values.length > 0 && values.every((v) => Number.isFinite(toNumber(v)));
    const categories = numeric ? [] : [...new Set(values.map((v) => String(v).trim()))];
    return { name, type: numeric ? 'numerica' : 'categorica', categories };
  });
}

/**
 * Configuración de ficticias: para cada variable categórica, la categoría que vale 1
 * (en variables de dos categorías) o la categoría de referencia que vale 0 en todas
 * las ficticias (variables con más de dos categorías).
 */
export interface DummyConfig {
  [column: string]: { positive?: string; reference?: string };
}

export interface Predictor {
  /** Nombre visible del término (p. ej. "Dia=Laborable"). */
  name: string;
  column: string;
  /** Si es ficticia, la categoría que codifica con 1. */
  category?: string;
}

/** Expande las columnas elegidas en términos del modelo (numéricas o ficticias 0/1). */
export function expandPredictors(columns: string[], info: ColumnInfo[], dummies: DummyConfig = {}): Predictor[] {
  const out: Predictor[] = [];
  for (const col of columns) {
    const ci = info.find((c) => c.name === col);
    if (!ci) continue;
    if (ci.type === 'numerica') {
      out.push({ name: col, column: col });
      continue;
    }
    const cats = ci.categories;
    if (cats.length < 2) continue;
    if (cats.length === 2) {
      const pos = dummies[col]?.positive && cats.includes(dummies[col].positive!) ? dummies[col].positive! : cats[0];
      out.push({ name: `${col}=${pos}`, column: col, category: pos });
    } else {
      const ref = dummies[col]?.reference && cats.includes(dummies[col].reference!) ? dummies[col].reference! : cats[0];
      for (const c of cats) if (c !== ref) out.push({ name: `${col}=${c}`, column: col, category: c });
    }
  }
  return out;
}

export function encodeValue(row: Row, pred: Predictor): number {
  const v = row[pred.column];
  if (pred.category !== undefined) {
    if (v === null || v === '') return NaN;
    return String(v).trim() === pred.category ? 1 : 0;
  }
  return toNumber(v);
}

export interface DesignMatrix {
  X: number[][];
  y: number[];
  names: string[];
  /** Índices (en el dataset original) de las filas usadas. */
  rowIndex: number[];
}

/**
 * Arma X e y. Descarta filas excluidas por el usuario o con valores faltantes.
 * @param target columna dependiente; si es categórica se codifica 1 para `targetPositive`.
 */
export function buildDesign(
  ds: Dataset,
  target: string,
  predictors: Predictor[],
  opts: { included?: boolean[]; targetPositive?: string } = {},
): DesignMatrix {
  const X: number[][] = [];
  const y: number[] = [];
  const rowIndex: number[] = [];
  ds.rows.forEach((row, i) => {
    if (opts.included && opts.included[i] === false) return;
    const rawY = row[target];
    const yi =
      opts.targetPositive !== undefined
        ? rawY === null || rawY === ''
          ? NaN
          : String(rawY).trim() === opts.targetPositive
            ? 1
            : 0
        : toNumber(rawY);
    const xi = predictors.map((p) => encodeValue(row, p));
    if (!Number.isFinite(yi) || xi.some((v) => !Number.isFinite(v))) return;
    X.push(xi);
    y.push(yi);
    rowIndex.push(i);
  });
  return { X, y, names: predictors.map((p) => p.name), rowIndex };
}

/** Todos los subconjuntos no vacíos de una lista. */
export function allSubsets<T>(items: T[]): T[][] {
  const out: T[][] = [];
  const total = 1 << items.length;
  for (let mask = 1; mask < total; mask++) out.push(items.filter((_, i) => mask & (1 << i)));
  return out;
}
