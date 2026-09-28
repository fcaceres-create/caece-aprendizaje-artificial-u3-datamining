import { chiSqUpperP, normalInv } from './distributions';
import { cholesky, choleskyInverse, choleskySolve, SingularMatrixError } from './linalg';
import { detectSeparation } from './separation';

export interface LogisticCoefficient {
  name: string;
  b: number;
  se: number;
  wald: number;
  df: number;
  p: number;
  oddsRatio: number;
  orLow: number;
  orHigh: number;
}

export interface LogisticFit {
  kind: 'logistic';
  names: string[];
  n: number;
  k: number;
  coefficients: LogisticCoefficient[];
  logLik: number;
  logLik0: number;
  /** −2 log-verosimilitud del modelo. */
  minus2LL: number;
  /** −2 log-verosimilitud del modelo nulo (solo constante). */
  minus2LL0: number;
  /** χ² de razón de verosimilitud (ómnibus). */
  chiSq: number;
  dfChi: number;
  pChi: number;
  coxSnell: number;
  nagelkerke: number;
  iterations: number;
  converged: boolean;
  separation: {
    detected: boolean;
    kind: 'completa' | 'cuasicompleta' | null;
    cases: number[];
  };
  y: number[];
  probabilities: number[];
  covariance: number[][];
}

const sigmoid = (t: number) => (t >= 0 ? 1 / (1 + Math.exp(-t)) : Math.exp(t) / (1 + Math.exp(t)));
/** log(1 + eᵗ) estable. */
const softplus = (t: number) => (t > 0 ? t + Math.log1p(Math.exp(-t)) : Math.log1p(Math.exp(t)));

function logLikelihood(design: number[][], y: number[], beta: number[]): number {
  let ll = 0;
  for (let i = 0; i < y.length; i++) {
    const eta = design[i].reduce((s, v, j) => s + v * beta[j], 0);
    ll += y[i] * eta - softplus(eta);
  }
  return ll;
}

export interface LogisticOptions {
  maxIter?: number;
  tol?: number;
}

/**
 * Regresión logística binaria por máxima verosimilitud (Newton-Raphson / IRLS)
 * con reducción del paso a la mitad cuando la verosimilitud no mejora.
 * @param X predictores SIN la columna de unos.
 * @param y valores 0/1.
 */
export function fitLogistic(X: number[][], y: number[], names: string[], opts: LogisticOptions = {}): LogisticFit {
  const maxIter = opts.maxIter ?? 100;
  const tol = opts.tol ?? 1e-10;
  const n = y.length;
  const k = names.length;
  const p = k + 1;
  if (y.some((v) => v !== 0 && v !== 1)) throw new Error('La variable dependiente debe tomar solo valores 0 y 1.');
  const ones = y.reduce((a, b) => a + b, 0);
  if (ones === 0 || ones === n) throw new Error('La variable dependiente tiene un solo valor: no se puede estimar el modelo.');
  if (n <= p) throw new SingularMatrixError(`Se necesitan más de ${p} observaciones para estimar ${p} parámetros.`);

  const design = X.map((row) => [1, ...row]);
  const ybar = ones / n;
  const logLik0 = ones * Math.log(ybar) + (n - ones) * Math.log(1 - ybar);

  let beta = new Array(p).fill(0);
  beta[0] = Math.log(ybar / (1 - ybar));
  let ll = logLikelihood(design, y, beta);
  let converged = false;
  let iterations = 0;

  for (let iter = 1; iter <= maxIter; iter++) {
    iterations = iter;
    const g = new Array(p).fill(0);
    const H = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      const xi = design[i];
      const pi = sigmoid(xi.reduce((s, v, j) => s + v * beta[j], 0));
      const w = pi * (1 - pi);
      const r = y[i] - pi;
      for (let a = 0; a < p; a++) {
        g[a] += xi[a] * r;
        for (let b = 0; b <= a; b++) H[a][b] += w * xi[a] * xi[b];
      }
    }
    for (let a = 0; a < p; a++) for (let b = a + 1; b < p; b++) H[a][b] = H[b][a];

    let delta: number[];
    try {
      delta = choleskySolve(cholesky(H), g);
    } catch {
      break;
    }
    let step = 1;
    let candidate = beta.map((v, j) => v + delta[j]);
    let llNew = logLikelihood(design, y, candidate);
    for (let h = 0; h < 30 && !(llNew >= ll - 1e-12); h++) {
      step /= 2;
      candidate = beta.map((v, j) => v + step * delta[j]);
      llNew = logLikelihood(design, y, candidate);
    }
    const change = Math.abs(llNew - ll);
    const maxDelta = Math.max(...delta.map((d) => Math.abs(step * d)));
    beta = candidate;
    ll = llNew;
    if (change < tol * (Math.abs(ll) + 1) && maxDelta < 1e-6 * (1 + Math.max(...beta.map(Math.abs)))) {
      converged = true;
      break;
    }
  }

  const probabilities = design.map((xi) => sigmoid(xi.reduce((s, v, j) => s + v * beta[j], 0)));

  // Covarianza: inversa de la información de Fisher en el estimador final.
  let covariance: number[][];
  try {
    const H = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      const w = probabilities[i] * (1 - probabilities[i]);
      for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) H[a][b] += w * design[i][a] * design[i][b];
    }
    covariance = choleskyInverse(cholesky(H));
  } catch {
    covariance = Array.from({ length: p }, () => new Array(p).fill(NaN));
  }

  const sep = detectSeparation(design, y);
  const complete = sep.separated && probabilities.every((pi, i) => Math.abs(y[i] - pi) < 1e-3);
  if (sep.separated) converged = false;

  const z = normalInv(0.975);
  const coefficients: LogisticCoefficient[] = beta.map((b, j) => {
    const se = Math.sqrt(covariance[j][j]);
    const wald = (b / se) ** 2;
    return {
      name: j === 0 ? '(Constante)' : names[j - 1],
      b,
      se,
      wald,
      df: 1,
      p: chiSqUpperP(wald, 1),
      oddsRatio: Math.exp(b),
      orLow: Math.exp(b - z * se),
      orHigh: Math.exp(b + z * se),
    };
  });

  const minus2LL = -2 * ll;
  const minus2LL0 = -2 * logLik0;
  const chiSq = minus2LL0 - minus2LL;
  const coxSnell = 1 - Math.exp((2 / n) * (logLik0 - ll));
  const maxCS = 1 - Math.exp((2 / n) * logLik0);

  return {
    kind: 'logistic',
    names,
    n,
    k,
    coefficients,
    logLik: ll,
    logLik0,
    minus2LL,
    minus2LL0,
    chiSq,
    dfChi: k,
    pChi: chiSqUpperP(chiSq, k),
    coxSnell,
    nagelkerke: coxSnell / maxCS,
    iterations,
    converged,
    separation: {
      detected: sep.separated,
      kind: sep.separated ? (complete ? 'completa' : 'cuasicompleta') : null,
      cases: sep.separatedCases,
    },
    y: y.slice(),
    probabilities,
    covariance,
  };
}

/** Probabilidad estimada para un caso (x sin la constante). */
export function predictLogistic(fit: LogisticFit, x: number[]): { logit: number; probability: number } {
  const logit = [1, ...x].reduce((s, v, j) => s + v * fit.coefficients[j].b, 0);
  return { logit, probability: sigmoid(logit) };
}

export { sigmoid };
