import { chiSqUpperP, fUpperP, normalCdf, normalInv } from './distributions';
import { mean } from './descriptive';
import { fitLinear, type LinearFit } from './linear';

export interface NormalityTest {
  statistic: number;
  p: number;
}

/**
 * Test de Shapiro-Wilk (algoritmo de Royston, 1995 — AS R94), válido para 3 ≤ n ≤ 5000.
 */
export function shapiroWilk(values: number[]): NormalityTest {
  const x = values.slice().sort((a, b) => a - b);
  const n = x.length;
  if (n < 3) return { statistic: NaN, p: NaN };
  const range = x[n - 1] - x[0];
  if (range === 0) return { statistic: NaN, p: NaN };

  const m = Array.from({ length: n }, (_, i) => normalInv((i + 1 - 0.375) / (n + 0.25)));
  const mm = m.reduce((s, v) => s + v * v, 0);
  const a = new Array(n).fill(0);

  if (n === 3) {
    a[0] = -Math.SQRT1_2;
    a[2] = Math.SQRT1_2;
  } else {
    const u = 1 / Math.sqrt(n);
    const poly = (c: number[], t: number) => c.reduce((s, ci, i) => s + ci * t ** i, 0);
    const an = poly([0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056], u) + m[n - 1] / Math.sqrt(mm);
    if (n > 5) {
      const an1 = poly([0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633], u) + m[n - 2] / Math.sqrt(mm);
      const phi = (mm - 2 * m[n - 1] ** 2 - 2 * m[n - 2] ** 2) / (1 - 2 * an ** 2 - 2 * an1 ** 2);
      for (let i = 2; i < n - 2; i++) a[i] = m[i] / Math.sqrt(phi);
      a[n - 1] = an;
      a[0] = -an;
      a[n - 2] = an1;
      a[1] = -an1;
    } else {
      const phi = (mm - 2 * m[n - 1] ** 2) / (1 - 2 * an ** 2);
      for (let i = 1; i < n - 1; i++) a[i] = m[i] / Math.sqrt(phi);
      a[n - 1] = an;
      a[0] = -an;
    }
  }

  const mx = mean(x);
  const ss = x.reduce((s, v) => s + (v - mx) ** 2, 0);
  const num = a.reduce((s, ai, i) => s + ai * x[i], 0) ** 2;
  const W = Math.min(1, num / ss);

  let p: number;
  if (n === 3) {
    p = Math.max(0, Math.min(1, (6 / Math.PI) * (Math.asin(Math.sqrt(W)) - Math.asin(Math.sqrt(0.75)))));
  } else if (n <= 11) {
    const gamma = 0.459 * n - 2.273;
    const w1 = -Math.log(gamma - Math.log(1 - W));
    const mu = 0.544 - 0.39978 * n + 0.025054 * n ** 2 - 0.0006714 * n ** 3;
    const sigma = Math.exp(1.3822 - 0.77857 * n + 0.062767 * n ** 2 - 0.0020322 * n ** 3);
    p = 1 - normalCdf((w1 - mu) / sigma);
  } else {
    const ln = Math.log(n);
    const w1 = Math.log(1 - W);
    const mu = -1.5861 - 0.31082 * ln - 0.083751 * ln ** 2 + 0.0038915 * ln ** 3;
    const sigma = Math.exp(-0.4803 - 0.082676 * ln + 0.0030302 * ln ** 2);
    p = 1 - normalCdf((w1 - mu) / sigma);
  }
  return { statistic: W, p };
}

/** Test de Jarque-Bera de normalidad (asintótico, χ² con 2 gl). */
export function jarqueBera(values: number[]): NormalityTest & { skewness: number; kurtosis: number } {
  const n = values.length;
  const m = mean(values);
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const v of values) {
    const d = v - m;
    m2 += d * d;
    m3 += d * d * d;
    m4 += d * d * d * d;
  }
  m2 /= n;
  m3 /= n;
  m4 /= n;
  const skewness = m3 / m2 ** 1.5;
  const kurtosis = m4 / (m2 * m2);
  const JB = (n / 6) * (skewness ** 2 + (kurtosis - 3) ** 2 / 4);
  return { statistic: JB, p: chiSqUpperP(JB, 2), skewness, kurtosis };
}

/** Factor de inflación de la varianza de cada predictor (columnas de X). */
export function vif(X: number[][], names: string[]): { name: string; vif: number; tolerance: number }[] {
  const k = names.length;
  return names.map((name, j) => {
    if (k < 2) return { name, vif: 1, tolerance: 1 };
    const yj = X.map((r) => r[j]);
    const others = X.map((r) => r.filter((_, c) => c !== j));
    try {
      const r2 = fitLinear(others, yj, names.filter((_, c) => c !== j)).r2;
      return { name, vif: 1 / (1 - r2), tolerance: 1 - r2 };
    } catch {
      return { name, vif: Infinity, tolerance: 0 };
    }
  });
}

/** Test de Breusch-Pagan (versión studentizada de Koenker) de homocedasticidad. */
export function breuschPagan(fit: LinearFit, X: number[][]): NormalityTest {
  if (fit.k === 0) return { statistic: NaN, p: NaN };
  const e2 = fit.residuals.map((e) => e * e);
  try {
    const aux = fitLinear(X, e2, fit.names);
    const LM = fit.n * aux.r2;
    return { statistic: LM, p: chiSqUpperP(LM, fit.k) };
  } catch {
    return { statistic: NaN, p: NaN };
  }
}

/** Test RESET de Ramsey (linealidad): agrega ŷ² y ŷ³ y compara con F. */
export function resetTest(fit: LinearFit, X: number[][]): NormalityTest {
  if (fit.k === 0) return { statistic: NaN, p: NaN };
  // Se estandariza ŷ para evitar problemas numéricos con potencias grandes.
  const my = mean(fit.fitted);
  const sy = Math.sqrt(fit.fitted.reduce((s, v) => s + (v - my) ** 2, 0) / fit.n) || 1;
  const z = fit.fitted.map((v) => (v - my) / sy);
  const Xa = X.map((r, i) => [...r, z[i] ** 2, z[i] ** 3]);
  try {
    const aug = fitLinear(Xa, fit.y, [...fit.names, 'ŷ²', 'ŷ³']);
    const q = 2;
    const F = (fit.ssResid - aug.ssResid) / q / (aug.ssResid / aug.dfResid);
    return { statistic: F, p: fUpperP(F, q, aug.dfResid) };
  } catch {
    return { statistic: NaN, p: NaN };
  }
}

/** Estadístico de Durbin-Watson (independencia de residuos en orden de filas). */
export function durbinWatson(residuals: number[]): number {
  let num = 0;
  for (let i = 1; i < residuals.length; i++) num += (residuals[i] - residuals[i - 1]) ** 2;
  return num / residuals.reduce((s, e) => s + e * e, 0);
}

export type Light = 'verde' | 'amarillo' | 'rojo' | 'gris';

export interface AssumptionCheck {
  key: 'linealidad' | 'normalidad' | 'homocedasticidad' | 'multicolinealidad';
  title: string;
  light: Light;
  detail: string;
  statistic: number;
  p: number;
}

const lightFromP = (p: number): Light => (!Number.isFinite(p) ? 'gris' : p >= 0.05 ? 'verde' : p >= 0.01 ? 'amarillo' : 'rojo');

/** Evalúa los supuestos de la regresión lineal y devuelve un semáforo para cada uno. */
export function checkAssumptions(fit: LinearFit, X: number[][]): AssumptionCheck[] {
  const reset = resetTest(fit, X);
  const sw = shapiroWilk(fit.residuals);
  const bp = breuschPagan(fit, X);
  const v = vif(X, fit.names);
  const maxVif = v.length ? Math.max(...v.map((d) => d.vif)) : NaN;
  const vifLight: Light = !Number.isFinite(maxVif) ? (fit.k < 2 ? 'gris' : 'rojo') : maxVif < 5 ? 'verde' : maxVif < 10 ? 'amarillo' : 'rojo';
  return [
    { key: 'linealidad', title: 'Linealidad', light: lightFromP(reset.p), statistic: reset.statistic, p: reset.p, detail: 'Test RESET de Ramsey' },
    { key: 'normalidad', title: 'Normalidad de residuos', light: lightFromP(sw.p), statistic: sw.statistic, p: sw.p, detail: 'Test de Shapiro-Wilk' },
    { key: 'homocedasticidad', title: 'Homocedasticidad', light: lightFromP(bp.p), statistic: bp.statistic, p: bp.p, detail: 'Test de Breusch-Pagan' },
    {
      key: 'multicolinealidad',
      title: 'No multicolinealidad',
      light: fit.k < 2 ? 'gris' : vifLight,
      statistic: maxVif,
      p: NaN,
      detail: 'VIF máximo (< 5 bien, 5–10 moderado, > 10 grave)',
    },
  ];
}
