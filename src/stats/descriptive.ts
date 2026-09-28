export function sum(x: number[]): number {
  let s = 0;
  for (const v of x) s += v;
  return s;
}

export function mean(x: number[]): number {
  return x.length ? sum(x) / x.length : NaN;
}

/** Varianza muestral (divisor n − 1). */
export function variance(x: number[]): number {
  const n = x.length;
  if (n < 2) return NaN;
  const m = mean(x);
  let s = 0;
  for (const v of x) s += (v - m) ** 2;
  return s / (n - 1);
}

export function sd(x: number[]): number {
  return Math.sqrt(variance(x));
}

/** Coeficiente de correlación de Pearson. */
export function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n < 2) return NaN;
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
}

/** Matriz de correlaciones de Pearson entre columnas. */
export function correlationMatrix(columns: number[][]): number[][] {
  return columns.map((a, i) => columns.map((b, j) => (i === j ? 1 : pearson(a, b))));
}

/** Histograma con `bins` intervalos de igual ancho. */
export function histogram(x: number[], bins?: number): { from: number; to: number; count: number }[] {
  if (!x.length) return [];
  const k = bins ?? Math.max(4, Math.ceil(Math.log2(x.length) + 1));
  const min = Math.min(...x);
  const max = Math.max(...x);
  const width = (max - min) / k || 1;
  const out = Array.from({ length: k }, (_, i) => ({ from: min + i * width, to: min + (i + 1) * width, count: 0 }));
  for (const v of x) {
    const idx = Math.min(k - 1, Math.floor((v - min) / width));
    out[idx].count++;
  }
  return out;
}
