import { jStat } from 'jstat';

const clamp01 = (p: number) => (Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : NaN);

/** p-valor bilateral de un estadístico t con `df` grados de libertad. */
export function tTwoTailedP(t: number, df: number): number {
  if (!Number.isFinite(t) || df <= 0) return NaN;
  return clamp01(2 * (1 - jStat.studentt.cdf(Math.abs(t), df)));
}

/** Cuantil de la t de Student. */
export function tInv(p: number, df: number): number {
  return jStat.studentt.inv(p, df);
}

/** p-valor (cola superior) de un estadístico F. */
export function fUpperP(F: number, df1: number, df2: number): number {
  if (!Number.isFinite(F) || df1 <= 0 || df2 <= 0) return NaN;
  if (F <= 0) return 1;
  return clamp01(1 - jStat.centralF.cdf(F, df1, df2));
}

/** p-valor (cola superior) de un estadístico chi-cuadrado. */
export function chiSqUpperP(x: number, df: number): number {
  if (!Number.isFinite(x) || df <= 0) return NaN;
  if (x <= 0) return 1;
  return clamp01(1 - jStat.chisquare.cdf(x, df));
}

export function normalCdf(z: number): number {
  return jStat.normal.cdf(z, 0, 1);
}

export function normalInv(p: number): number {
  return jStat.normal.inv(p, 0, 1);
}
