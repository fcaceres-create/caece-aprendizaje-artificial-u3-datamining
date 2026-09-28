import { tInv, tTwoTailedP, fUpperP } from './distributions';
import { mean, sd } from './descriptive';
import { backSubstitution, householderQR, invertUpperTriangular, matMul, transpose, SingularMatrixError, type Matrix } from './linalg';

export interface LinearCoefficient {
  name: string;
  b: number;
  se: number;
  t: number;
  p: number;
  ciLow: number;
  ciHigh: number;
  /** Coeficiente estandarizado (beta); NaN para la constante. */
  beta: number;
}

export interface LinearFit {
  kind: 'linear';
  names: string[];
  n: number;
  /** Número de predictores (sin contar la constante). */
  k: number;
  dfModel: number;
  dfResid: number;
  coefficients: LinearCoefficient[];
  r: number;
  r2: number;
  adjR2: number;
  /** Error estándar de la estimación: √(SCE / (n − k − 1)). */
  stdErrEst: number;
  F: number;
  pF: number;
  ssModel: number;
  ssResid: number;
  ssTotal: number;
  /** Error cuadrático medio de predicción: SCE / n. */
  mse: number;
  rmse: number;
  mae: number;
  y: number[];
  fitted: number[];
  residuals: number[];
  leverage: number[];
  /** Residuos estudentizados internamente. */
  studentized: number[];
  /** Residuos estudentizados externamente (eliminados). */
  studentizedDeleted: number[];
  cooksDistance: number[];
  /** (XᵀX)⁻¹, incluida la constante en la posición 0. */
  xtxInv: Matrix;
}

/**
 * Regresión lineal múltiple por mínimos cuadrados ordinarios usando QR (Householder).
 * @param X filas de predictores SIN la columna de unos (se agrega la constante).
 * @param y variable dependiente.
 * @param names nombres de los predictores.
 */
export function fitLinear(X: number[][], y: number[], names: string[]): LinearFit {
  const n = y.length;
  const k = names.length;
  const p = k + 1;
  if (X.length !== n) throw new Error('X e y tienen distinta cantidad de filas.');
  if (n <= p) throw new SingularMatrixError(`Se necesitan más de ${p} observaciones para estimar ${p} parámetros.`);

  const design: Matrix = X.map((row) => [1, ...row]);
  const qr = householderQR(design);
  if (qr.rank < p) throw new SingularMatrixError();

  const qty = qr.applyQt(y);
  const b = backSubstitution(qr.R, qty.slice(0, p));
  const Rinv = invertUpperTriangular(qr.R);
  const xtxInv = matMul(Rinv, transpose(Rinv));
  const XRinv = matMul(design, Rinv);

  const fitted = design.map((row) => row.reduce((s, v, j) => s + v * b[j], 0));
  const residuals = y.map((v, i) => v - fitted[i]);
  const my = mean(y);
  const ssTotal = y.reduce((s, v) => s + (v - my) ** 2, 0);
  const ssResid = residuals.reduce((s, e) => s + e * e, 0);
  const ssModel = ssTotal - ssResid;
  const dfResid = n - p;
  const dfModel = k;
  const s2 = ssResid / dfResid;
  const s = Math.sqrt(s2);
  const r2 = ssTotal > 0 ? 1 - ssResid / ssTotal : NaN;
  const adjR2 = 1 - (1 - r2) * ((n - 1) / dfResid);
  const F = k > 0 ? ssModel / dfModel / s2 : NaN;
  const pF = k > 0 ? fUpperP(F, dfModel, dfResid) : NaN;
  const tCrit = tInv(0.975, dfResid);
  const sdY = sd(y);

  const coefficients: LinearCoefficient[] = b.map((bj, j) => {
    const se = s * Math.sqrt(xtxInv[j][j]);
    const t = bj / se;
    const sdX = j === 0 ? NaN : sd(X.map((r) => r[j - 1]));
    return {
      name: j === 0 ? '(Constante)' : names[j - 1],
      b: bj,
      se,
      t,
      p: tTwoTailedP(t, dfResid),
      ciLow: bj - tCrit * se,
      ciHigh: bj + tCrit * se,
      beta: j === 0 ? NaN : (bj * sdX) / sdY,
    };
  });

  const leverage = XRinv.map((row) => row.reduce((acc, v) => acc + v * v, 0));
  const studentized = residuals.map((e, i) => e / (s * Math.sqrt(1 - leverage[i])));
  const studentizedDeleted = studentized.map((r) => {
    const denom = dfResid - r * r;
    return denom > 0 ? r * Math.sqrt((dfResid - 1) / denom) : Number.POSITIVE_INFINITY * Math.sign(r);
  });
  const cooksDistance = studentized.map((r, i) => ((r * r) / p) * (leverage[i] / (1 - leverage[i])));

  return {
    kind: 'linear',
    names,
    n,
    k,
    dfModel,
    dfResid,
    coefficients,
    r: Math.sqrt(Math.max(0, r2)),
    r2,
    adjR2,
    stdErrEst: s,
    F,
    pF,
    ssModel,
    ssResid,
    ssTotal,
    mse: ssResid / n,
    rmse: Math.sqrt(ssResid / n),
    mae: residuals.reduce((acc, e) => acc + Math.abs(e), 0) / n,
    y: y.slice(),
    fitted,
    residuals,
    leverage,
    studentized,
    studentizedDeleted,
    cooksDistance,
    xtxInv,
  };
}

export interface LinearPrediction {
  value: number;
  /** Error estándar de la media estimada. */
  seMean: number;
  /** Intervalo de predicción del 95 % para un caso individual. */
  piLow: number;
  piHigh: number;
}

/** Predicción puntual con intervalo de predicción del 95 %. `x` sin la constante. */
export function predictLinear(fit: LinearFit, x: number[]): LinearPrediction {
  const x0 = [1, ...x];
  const value = x0.reduce((acc, v, j) => acc + v * fit.coefficients[j].b, 0);
  let q = 0;
  for (let i = 0; i < x0.length; i++) for (let j = 0; j < x0.length; j++) q += x0[i] * fit.xtxInv[i][j] * x0[j];
  const s = fit.stdErrEst;
  const tCrit = tInv(0.975, fit.dfResid);
  const sePred = s * Math.sqrt(1 + q);
  return { value, seMean: s * Math.sqrt(q), piLow: value - tCrit * sePred, piHigh: value + tCrit * sePred };
}

export type InfluenceFlag = 'residuo' | 'leverage' | 'cook';

export interface InfluenceReport {
  index: number;
  flags: InfluenceFlag[];
}

/**
 * Criterios habituales para señalar casos atípicos o influyentes:
 *  - |residuo estudentizado eliminado| > 2
 *  - leverage > 2p/n
 *  - distancia de Cook > 4/n
 */
export function influenceThresholds(fit: LinearFit) {
  const p = fit.k + 1;
  return { residual: 2, leverage: (2 * p) / fit.n, cook: 4 / fit.n };
}

export function detectInfluential(fit: LinearFit): InfluenceReport[] {
  const th = influenceThresholds(fit);
  const out: InfluenceReport[] = [];
  for (let i = 0; i < fit.n; i++) {
    const flags: InfluenceFlag[] = [];
    if (Math.abs(fit.studentizedDeleted[i]) > th.residual) flags.push('residuo');
    if (fit.leverage[i] > th.leverage) flags.push('leverage');
    if (fit.cooksDistance[i] > th.cook) flags.push('cook');
    if (flags.length) out.push({ index: i, flags });
  }
  return out;
}
