/**
 * Álgebra lineal mínima para regresión: QR de Householder y Cholesky.
 * Las matrices son arreglos de filas (row-major).
 */
export type Matrix = number[][];

export class SingularMatrixError extends Error {
  constructor(message = 'La matriz es singular (colinealidad perfecta entre predictores).') {
    super(message);
    this.name = 'SingularMatrixError';
  }
}

export function transpose(A: Matrix): Matrix {
  const n = A.length;
  const m = n ? A[0].length : 0;
  const T: Matrix = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) T[j][i] = A[i][j];
  return T;
}

export function matMul(A: Matrix, B: Matrix): Matrix {
  const n = A.length;
  const m = B[0].length;
  const k = B.length;
  const C: Matrix = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++)
    for (let l = 0; l < k; l++) {
      const a = A[i][l];
      if (a === 0) continue;
      for (let j = 0; j < m; j++) C[i][j] += a * B[l][j];
    }
  return C;
}

export function matVec(A: Matrix, x: number[]): number[] {
  return A.map((row) => dot(row, x));
}

export function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Resultado de la descomposición QR (Householder) de X (n×p, n ≥ p). */
export interface QRDecomposition {
  /** Factor triangular superior p×p. */
  R: Matrix;
  /** Aplica Qᵀ a un vector de longitud n. */
  applyQt(y: number[]): number[];
  /** Rango numérico de X. */
  rank: number;
}

export function householderQR(X: Matrix): QRDecomposition {
  const n = X.length;
  const p = n ? X[0].length : 0;
  if (n < p) throw new SingularMatrixError('Hay menos observaciones que parámetros a estimar.');
  const A = X.map((r) => r.slice());
  const vectors: { v: number[]; vnorm2: number; k: number }[] = [];

  for (let k = 0; k < p; k++) {
    let norm = 0;
    for (let i = k; i < n; i++) norm += A[i][k] * A[i][k];
    norm = Math.sqrt(norm);
    if (norm === 0) continue;
    const alpha = A[k][k] > 0 ? -norm : norm;
    const v = new Array(n).fill(0);
    v[k] = A[k][k] - alpha;
    for (let i = k + 1; i < n; i++) v[i] = A[i][k];
    let vnorm2 = 0;
    for (let i = k; i < n; i++) vnorm2 += v[i] * v[i];
    if (vnorm2 === 0) continue;
    for (let j = k; j < p; j++) {
      let s = 0;
      for (let i = k; i < n; i++) s += v[i] * A[i][j];
      const f = (2 * s) / vnorm2;
      for (let i = k; i < n; i++) A[i][j] -= f * v[i];
    }
    vectors.push({ v, vnorm2, k });
  }

  const R: Matrix = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => (j >= i ? A[i][j] : 0)),
  );

  const maxDiag = Math.max(0, ...R.map((r, i) => Math.abs(r[i])));
  const tol = Math.max(n, p) * Number.EPSILON * maxDiag * 1e3;
  const rank = R.reduce((acc, r, i) => acc + (Math.abs(r[i]) > tol ? 1 : 0), 0);

  return {
    R,
    rank,
    applyQt(y: number[]): number[] {
      const b = y.slice();
      for (const { v, vnorm2, k } of vectors) {
        let s = 0;
        for (let i = k; i < n; i++) s += v[i] * b[i];
        const f = (2 * s) / vnorm2;
        for (let i = k; i < n; i++) b[i] -= f * v[i];
      }
      return b;
    },
  };
}

/** Resuelve R x = b con R triangular superior. */
export function backSubstitution(R: Matrix, b: number[]): number[] {
  const p = R.length;
  const x = new Array(p).fill(0);
  for (let i = p - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < p; j++) s -= R[i][j] * x[j];
    x[i] = s / R[i][i];
  }
  return x;
}

/** Inversa de una matriz triangular superior. */
export function invertUpperTriangular(R: Matrix): Matrix {
  const p = R.length;
  const inv: Matrix = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let j = 0; j < p; j++) {
    const e = new Array(p).fill(0);
    e[j] = 1;
    const col = backSubstitution(R, e);
    for (let i = 0; i < p; i++) inv[i][j] = col[i];
  }
  return inv;
}

/** Descomposición de Cholesky A = L Lᵀ (A simétrica definida positiva). */
export function cholesky(A: Matrix): Matrix {
  const p = A.length;
  const L: Matrix = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) {
        if (!(s > 0) || !Number.isFinite(s)) throw new SingularMatrixError();
        L[i][i] = Math.sqrt(s);
      } else {
        L[i][j] = s / L[j][j];
      }
    }
  }
  return L;
}

/** Resuelve A x = b dado L (Cholesky de A). */
export function choleskySolve(L: Matrix, b: number[]): number[] {
  const p = L.length;
  const z = new Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) s -= L[i][k] * z[k];
    z[i] = s / L[i][i];
  }
  const x = new Array(p).fill(0);
  for (let i = p - 1; i >= 0; i--) {
    let s = z[i];
    for (let k = i + 1; k < p; k++) s -= L[k][i] * x[k];
    x[i] = s / L[i][i];
  }
  return x;
}

/** Inversa de A a partir de su factor de Cholesky L. */
export function choleskyInverse(L: Matrix): Matrix {
  const p = L.length;
  const inv: Matrix = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let j = 0; j < p; j++) {
    const e = new Array(p).fill(0);
    e[j] = 1;
    const col = choleskySolve(L, e);
    for (let i = 0; i < p; i++) inv[i][j] = col[i];
  }
  return inv;
}
