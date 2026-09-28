/**
 * Detección de separación (completa o cuasi-completa) en regresión logística
 * mediante programación lineal (idea de Konis, 2007):
 *
 *   max Σᵢ sᵢ·xᵢᵀβ   s.a.  sᵢ·xᵢᵀβ ≥ 0 ∀i,  −1 ≤ βⱼ ≤ 1,   con sᵢ = 2yᵢ − 1.
 *
 * Si el óptimo es > 0 existe una dirección β que clasifica sin errores a todos
 * los casos (con al menos uno estrictamente) y, por lo tanto, el estimador de
 * máxima verosimilitud no existe (los coeficientes divergen).
 */

export interface SeparationResult {
  separated: boolean;
  /** Índices de los casos perfectamente separados por la dirección hallada. */
  separatedCases: number[];
  /** Dirección de separación hallada (incluye la constante en la posición 0). */
  direction: number[];
}

/**
 * Simplex (regla de Bland) para max cᵀx s.a. Ax ≤ b, x ≥ 0 con b ≥ 0.
 * Devuelve la solución óptima (asume problema acotado).
 */
export function simplexMax(c: number[], A: number[][], b: number[], maxIter = 10000): { x: number[]; value: number } {
  const m = A.length;
  const nv = c.length;
  const width = nv + m + 1;
  const T: number[][] = A.map((row, i) => {
    const r = new Array(width).fill(0);
    for (let j = 0; j < nv; j++) r[j] = row[j];
    r[nv + i] = 1;
    r[width - 1] = b[i];
    return r;
  });
  const z = new Array(width).fill(0);
  for (let j = 0; j < nv; j++) z[j] = -c[j];
  const basis = Array.from({ length: m }, (_, i) => nv + i);
  const eps = 1e-12;

  for (let iter = 0; iter < maxIter; iter++) {
    let enter = -1;
    for (let j = 0; j < width - 1; j++)
      if (z[j] < -1e-10) {
        enter = j;
        break;
      }
    if (enter < 0) break;
    let leave = -1;
    let best = Infinity;
    for (let i = 0; i < m; i++) {
      const a = T[i][enter];
      if (a > eps) {
        const ratio = T[i][width - 1] / a;
        if (ratio < best - 1e-14 || (Math.abs(ratio - best) <= 1e-14 && basis[i] < basis[leave])) {
          best = ratio;
          leave = i;
        }
      }
    }
    if (leave < 0) throw new Error('Problema lineal no acotado.');
    const piv = T[leave][enter];
    for (let j = 0; j < width; j++) T[leave][j] /= piv;
    for (let i = 0; i < m; i++) {
      if (i === leave) continue;
      const f = T[i][enter];
      if (f !== 0) for (let j = 0; j < width; j++) T[i][j] -= f * T[leave][j];
    }
    const fz = z[enter];
    if (fz !== 0) for (let j = 0; j < width; j++) z[j] -= fz * T[leave][j];
    basis[leave] = enter;
  }

  const x = new Array(nv).fill(0);
  basis.forEach((bv, i) => {
    if (bv < nv) x[bv] = T[i][width - 1];
  });
  return { x, value: z[width - 1] };
}

/**
 * @param design filas CON la columna de unos.
 * @param y valores 0/1.
 */
export function detectSeparation(design: number[][], y: number[]): SeparationResult {
  const p = design[0]?.length ?? 0;
  const n = design.length;
  if (!n || !p) return { separated: false, separatedCases: [], direction: [] };

  // Escalar columnas para que el criterio de tolerancia no dependa de las unidades.
  const scale = Array.from({ length: p }, (_, j) => Math.max(1e-12, ...design.map((r) => Math.abs(r[j]))));
  const Z = design.map((row, i) => row.map((v, j) => ((2 * y[i] - 1) * v) / scale[j]));

  // Variables: u (p) y v (p), β = u − v, 0 ≤ u, v ≤ 1.
  const c = new Array(2 * p).fill(0);
  for (const zi of Z)
    for (let j = 0; j < p; j++) {
      c[j] += zi[j];
      c[p + j] -= zi[j];
    }
  const A: number[][] = [];
  const b: number[] = [];
  for (const zi of Z) {
    A.push([...zi.map((v) => -v), ...zi]);
    b.push(0);
  }
  for (let j = 0; j < 2 * p; j++) {
    const row = new Array(2 * p).fill(0);
    row[j] = 1;
    A.push(row);
    b.push(1);
  }
  const { x, value } = simplexMax(c, A, b);
  const beta = Array.from({ length: p }, (_, j) => x[j] - x[p + j]);
  const margins = Z.map((zi) => zi.reduce((s, v, j) => s + v * beta[j], 0));
  const tol = 1e-7;
  const separated = value > tol;
  return {
    separated,
    separatedCases: separated ? margins.map((m, i) => (m > tol ? i : -1)).filter((i) => i >= 0) : [],
    direction: beta.map((v, j) => v / scale[j]),
  };
}
