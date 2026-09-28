import {
  buildDesign,
  expandPredictors,
  fitLinear,
  fitLogistic,
  inferColumns,
  type ColumnInfo,
  type Dataset,
  type DesignMatrix,
  type DummyConfig,
  type LinearFit,
  type LogisticFit,
  type Predictor,
} from './stats';

export type Result<F> =
  | { ok: true; fit: F; design: DesignMatrix; predictors: Predictor[]; info: ColumnInfo[] }
  | { ok: false; error: string };

export interface ModelSpec {
  data: Dataset;
  included: boolean[];
  target: string;
  columns: string[];
  dummies: DummyConfig;
  /** Para logística con variable dependiente categórica: categoría que vale 1. */
  targetPositive?: string;
}

function prepare(spec: ModelSpec) {
  const info = inferColumns(spec.data);
  const predictors = expandPredictors(spec.columns, info, spec.dummies);
  const design = buildDesign(spec.data, spec.target, predictors, {
    included: spec.included,
    targetPositive: spec.targetPositive,
  });
  return { info, predictors, design };
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function runLinear(spec: ModelSpec): Result<LinearFit> {
  try {
    const { info, predictors, design } = prepare(spec);
    if (!predictors.length) return { ok: false, error: 'Elegí al menos una variable independiente.' };
    return { ok: true, fit: fitLinear(design.X, design.y, design.names), design, predictors, info };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export function runLogistic(spec: ModelSpec): Result<LogisticFit> {
  try {
    const { info, predictors, design } = prepare(spec);
    if (!predictors.length) return { ok: false, error: 'Elegí al menos una variable independiente.' };
    return { ok: true, fit: fitLogistic(design.X, design.y, design.names), design, predictors, info };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/**
 * Arma el vector x de un caso a partir de valores por columna
 * (números para numéricas, categoría elegida para categóricas).
 */
export function caseVector(predictors: Predictor[], values: Record<string, number | string>): number[] {
  return predictors.map((p) =>
    p.category !== undefined ? (String(values[p.column]) === p.category ? 1 : 0) : Number(values[p.column]),
  );
}

/** Rango (mín, máx) de una columna numérica en las filas dadas. */
export function columnRange(ds: Dataset, column: string): [number, number] {
  const v = ds.rows.map((r) => r[column]).filter((x): x is number => typeof x === 'number');
  return v.length ? [Math.min(...v), Math.max(...v)] : [0, 1];
}
