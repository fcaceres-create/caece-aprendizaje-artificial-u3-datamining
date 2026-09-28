import { describe, expect, test } from 'vitest';
import { ejercicio1 } from '../data/ejercicio1';
import { ejercicio2 } from '../data/ejercicio2';
import { ejercicio3 } from '../data/ejercicio3';
import { confusionMatrix } from './classification';
import { buildDesign, expandPredictors, inferColumns, type Dataset, type DummyConfig } from './design';
import { fitLinear, predictLinear } from './linear';
import { fitLogistic, predictLogistic } from './logistic';

function design(ds: Dataset, target: string, cols: string[], dummies: DummyConfig = {}, included?: boolean[]) {
  const preds = expandPredictors(cols, inferColumns(ds), dummies);
  return buildDesign(ds, target, preds, { included });
}

describe('Ejercicio 1 — Demanda de gas', () => {
  test('hay 62 filas', () => {
    expect(ejercicio1.rows.length).toBe(62);
  });

  test('modelo TempMax + TempMin', () => {
    const d = design(ejercicio1, 'Demanda', ['TempMax', 'TempMin']);
    const fit = fitLinear(d.X, d.y, d.names);
    expect(fit.n).toBe(62);
    expect(fit.coefficients[0].b).toBeCloseTo(2105.12, 1);
    expect(fit.coefficients[1].b).toBeCloseTo(-35.03, 2);
    expect(fit.coefficients[2].b).toBeCloseTo(-34.17, 2);
    expect(fit.r2).toBeCloseTo(0.886, 3);
    expect(fit.adjR2).toBeCloseTo(0.882, 3);
    expect(fit.F).toBeCloseTo(229.9, 1);
  });

  test('modelo TempMax + TempMin + Laborable', () => {
    const d = design(ejercicio1, 'Demanda', ['TempMax', 'TempMin', 'Dia'], { Dia: { positive: 'Laborable' } });
    expect(d.names).toEqual(['TempMax', 'TempMin', 'Dia=Laborable']);
    const fit = fitLinear(d.X, d.y, d.names);
    expect(fit.coefficients[3].b).toBeCloseTo(-8.09, 2);
    expect(fit.coefficients[3].p).toBeCloseTo(0.636, 3);
  });
});

describe('Ejercicio 2 — Sueldos', () => {
  const dummies: DummyConfig = { Sexo: { positive: 'M' } };

  test('con los 14 casos', () => {
    const d = design(ejercicio2, 'Sueldo', ['Experiencia', 'Estudios', 'Sexo'], dummies);
    const fit = fitLinear(d.X, d.y, d.names);
    expect(fit.n).toBe(14);
    expect(fit.r2).toBeCloseTo(0.276, 3);
    expect(fit.pF).toBeCloseTo(0.338, 3);
  });

  test('sin la fila Experiencia = 32,5', () => {
    const included = ejercicio2.rows.map((r) => r.Experiencia !== 32.5);
    const d = design(ejercicio2, 'Sueldo', ['Experiencia', 'Estudios', 'Sexo'], dummies, included);
    const fit = fitLinear(d.X, d.y, d.names);
    expect(fit.n).toBe(13);
    expect(fit.coefficients.map((c) => c.b)).toEqual([
      expect.closeTo(2257.58, 2),
      expect.closeTo(42.66, 2),
      expect.closeTo(80.88, 2),
      expect.closeTo(5.92, 2),
    ]);
    expect(fit.r2).toBeCloseTo(0.672, 3);
    // Hombre (Sexo=M → 1), 4 años de experiencia, 5 de estudio.
    expect(predictLinear(fit, [4, 5, 1]).value).toBeCloseTo(2838.6, 1);
  });
});

describe('Ejercicio 3 — Seguro (logística)', () => {
  const cols = ['Edad', 'MilesKm', 'AccAnterior'];

  test('modelo con 25 filas', () => {
    const d = design(ejercicio3, 'AccEsteAño', cols);
    const fit = fitLogistic(d.X, d.y, d.names);
    expect(fit.converged).toBe(true);
    expect(fit.separation.detected).toBe(false);
    expect(fit.coefficients.map((c) => c.b)).toEqual([
      expect.closeTo(-0.5621, 4),
      expect.closeTo(-0.084, 4),
      expect.closeTo(0.0965, 4),
      expect.closeTo(0.1619, 4),
    ]);
    expect(fit.chiSq).toBeCloseTo(8.92, 2);
    expect(fit.pChi).toBeCloseTo(0.03, 3);
    expect(fit.nagelkerke).toBeCloseTo(0.432, 3);
    expect(predictLogistic(fit, [30, 22.7, 0]).probability).toBeCloseTo(0.291, 3);

    const cm = confusionMatrix(fit.y, fit.probabilities, 0.5);
    expect({ tp: cm.tp, fp: cm.fp, fn: cm.fn, tn: cm.tn }).toEqual({ tp: 5, fp: 2, fn: 2, tn: 16 });
  });

  test('primeras 19 filas: separación perfecta', () => {
    const included = ejercicio3.rows.map((_, i) => i < 19);
    const d = design(ejercicio3, 'AccEsteAño', cols, {}, included);
    const fit = fitLogistic(d.X, d.y, d.names);
    expect(fit.n).toBe(19);
    expect(fit.separation.detected).toBe(true);
    expect(fit.converged).toBe(false);
  });
});
