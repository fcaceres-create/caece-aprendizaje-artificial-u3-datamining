import { describe, expect, test } from 'vitest';
import { confusionMatrix, rocCurve } from './classification';
import { pearson } from './descriptive';
import { allSubsets, buildDesign, expandPredictors, inferColumns, toNumber } from './design';
import { jarqueBera, shapiroWilk, vif } from './diagnostics';
import { fmt, fmtP, parseNumber } from './format';
import { cholesky, choleskyInverse, householderQR, matMul, transpose } from './linalg';
import { detectInfluential, fitLinear } from './linear';
import { fitLogistic } from './logistic';
import { detectSeparation } from './separation';

describe('álgebra lineal', () => {
  test('QR reproduce R con RᵀR = XᵀX', () => {
    const X = [
      [1, 2],
      [1, 3],
      [1, 5],
      [1, 8],
    ];
    const { R, rank } = householderQR(X);
    expect(rank).toBe(2);
    const RtR = matMul(transpose(R), R);
    const XtX = matMul(transpose(X), X);
    RtR.forEach((row, i) => row.forEach((v, j) => expect(v).toBeCloseTo(XtX[i][j], 10)));
  });

  test('Cholesky invierte una matriz definida positiva', () => {
    const A = [
      [4, 2],
      [2, 3],
    ];
    const inv = choleskyInverse(cholesky(A));
    const I = matMul(A, inv);
    expect(I[0][0]).toBeCloseTo(1, 12);
    expect(I[0][1]).toBeCloseTo(0, 12);
    expect(I[1][1]).toBeCloseTo(1, 12);
  });
});

describe('regresión lineal', () => {
  test('ajuste exacto de una recta', () => {
    const x = [1, 2, 3, 4, 5];
    const y = x.map((v) => 3 + 2 * v + (v % 2 ? 0.1 : -0.1));
    const fit = fitLinear(
      x.map((v) => [v]),
      y,
      ['x'],
    );
    expect(fit.coefficients[1].b).toBeCloseTo(2, 1);
    expect(fit.r2).toBeGreaterThan(0.99);
    expect(fit.leverage.reduce((a, b) => a + b, 0)).toBeCloseTo(2, 10);
  });

  test('colinealidad perfecta lanza error', () => {
    const X = [
      [1, 2],
      [2, 4],
      [3, 6],
      [4, 8],
    ];
    expect(() => fitLinear(X, [1, 2, 3, 5], ['a', 'b'])).toThrow(/colinealidad/);
  });

  test('un punto con x extremo se detecta como influyente', () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8, 30];
    const y = [2, 4, 6, 8, 10, 12, 14, 16, 5];
    const fit = fitLinear(
      x.map((v) => [v]),
      y,
      ['x'],
    );
    const flagged = detectInfluential(fit).map((f) => f.index);
    expect(flagged).toContain(8);
  });
});

describe('logística y separación', () => {
  test('separación completa en una variable', () => {
    const X = [[1], [2], [3], [4], [5], [6]];
    const y = [0, 0, 0, 1, 1, 1];
    expect(detectSeparation([...X.map((r) => [1, ...r])], y).separated).toBe(true);
    const fit = fitLogistic(X, y, ['x']);
    expect(fit.separation.detected).toBe(true);
    expect(fit.separation.kind).toBe('completa');
  });

  test('sin separación cuando las clases se superponen', () => {
    const X = [[1], [2], [3], [4], [5], [6]];
    const y = [0, 1, 0, 1, 0, 1];
    expect(detectSeparation(X.map((r) => [1, ...r]), y).separated).toBe(false);
    expect(fitLogistic(X, y, ['x']).converged).toBe(true);
  });

  test('separación cuasi-completa', () => {
    const X = [[1], [2], [3], [3], [4], [5]];
    const y = [0, 0, 0, 1, 1, 1];
    const fit = fitLogistic(X, y, ['x']);
    expect(fit.separation.detected).toBe(true);
    expect(fit.separation.kind).toBe('cuasicompleta');
  });
});

describe('clasificación', () => {
  test('matriz de confusión y métricas', () => {
    const y = [1, 1, 0, 0, 1, 0];
    const p = [0.9, 0.4, 0.6, 0.1, 0.7, 0.3];
    const cm = confusionMatrix(y, p, 0.5);
    expect(cm).toMatchObject({ tp: 2, fn: 1, fp: 1, tn: 2 });
    expect(cm.precision).toBeCloseTo(2 / 3);
    expect(cm.recall).toBeCloseTo(2 / 3);
    expect(cm.accuracy).toBeCloseTo(4 / 6);
  });

  test('AUC perfecta y aleatoria', () => {
    expect(rocCurve([0, 0, 1, 1], [0.1, 0.2, 0.8, 0.9]).auc).toBeCloseTo(1);
    expect(rocCurve([0, 1, 0, 1], [0.5, 0.5, 0.5, 0.5]).auc).toBeCloseTo(0.5);
  });
});

describe('diagnósticos', () => {
  test('Shapiro-Wilk: ejemplo clásico de pesos (W ≈ 0,79, p < 0,01)', () => {
    const r = shapiroWilk([148, 154, 158, 160, 161, 162, 166, 170, 182, 195, 236]);
    expect(r.statistic).toBeCloseTo(0.79, 2);
    expect(r.p).toBeLessThan(0.01);
  });

  test('Jarque-Bera de datos simétricos da asimetría 0', () => {
    expect(jarqueBera([1, 2, 3, 4, 5, 6, 7]).skewness).toBeCloseTo(0, 12);
  });

  test('Pearson y VIF', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    const X = [
      [1, 2],
      [2, 1],
      [3, 4],
      [4, 3],
      [5, 6],
    ];
    const v = vif(X, ['a', 'b']);
    const r = pearson(
      X.map((r) => r[0]),
      X.map((r) => r[1]),
    );
    expect(v[0].vif).toBeCloseTo(1 / (1 - r * r), 10);
  });
});

describe('datos y formato', () => {
  test('ficticias con categoría elegida', () => {
    const ds = { columns: ['y', 'g'], rows: [{ y: 1, g: 'A' }, { y: 2, g: 'B' }, { y: 3, g: 'A' }] };
    const info = inferColumns(ds);
    expect(info[1]).toMatchObject({ type: 'categorica', categories: ['A', 'B'] });
    const preds = expandPredictors(['g'], info, { g: { positive: 'B' } });
    expect(buildDesign(ds, 'y', preds).X).toEqual([[0], [1], [0]]);
  });

  test('categórica de 3 niveles genera 2 ficticias', () => {
    const ds = { columns: ['g'], rows: [{ g: 'a' }, { g: 'b' }, { g: 'c' }] };
    expect(expandPredictors(['g'], inferColumns(ds)).map((p) => p.name)).toEqual(['g=b', 'g=c']);
  });

  test('subconjuntos', () => {
    expect(allSubsets([1, 2, 3])).toHaveLength(7);
  });

  test('formato argentino', () => {
    expect(fmt(2105.1234, 2)).toBe('2.105,12');
    expect(fmt(-0.0001, 2)).toBe('0,00');
    expect(fmtP(0.0001)).toBe('< 0,001');
    expect(parseNumber('1.234,5')).toBe(1234.5);
    expect(parseNumber('3.5')).toBe(3.5);
    expect(toNumber('2,5')).toBe(2.5);
  });
});
