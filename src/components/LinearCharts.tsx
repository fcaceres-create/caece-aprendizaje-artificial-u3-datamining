import { useMemo, useState } from 'react';
import { fitLinear, fmt, histogram, pearson, type DesignMatrix, type LinearFit } from '../stats';
import { HistogramChart, Legend, ScatterFitChart, type ChartPoint } from './charts';
import { Card } from './ui';

/** Dispersión de cada predictor contra la dependiente, con su recta de regresión simple. */
export function PredictorScatter({
  design,
  target,
  outliers,
}: {
  design: DesignMatrix;
  target: string;
  outliers?: Set<number>;
}) {
  const [sel, setSel] = useState(0);
  const j = Math.min(sel, design.names.length - 1);
  const name = design.names[j];
  const x = design.X.map((r) => r[j]);
  const simple = useMemo(() => {
    try {
      return fitLinear(
        x.map((v) => [v]),
        design.y,
        [name],
      );
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, j]);
  const r = pearson(x, design.y);
  const xmin = Math.min(...x);
  const xmax = Math.max(...x);
  const points: ChartPoint[] = x.map((v, i) => ({
    x: v,
    y: design.y[i],
    idx: design.rowIndex[i],
    state: outliers?.has(design.rowIndex[i]) ? 'outlier' : 'normal',
    tip: [`Fila ${design.rowIndex[i] + 1}`, `${name}: ${fmt(v, 2)}`, `${target}: ${fmt(design.y[i], 2)}`],
  }));
  const b0 = simple?.coefficients[0].b ?? NaN;
  const b1 = simple?.coefficients[1].b ?? NaN;

  return (
    <div>
      <div className="row no-print" style={{ marginBottom: 6 }}>
        {design.names.map((n, i) => (
          <button key={n} className={i === j ? 'primary' : ''} onClick={() => setSel(i)}>
            {n}
          </button>
        ))}
      </div>
      <ScatterFitChart
        points={points}
        segments={simple ? [{ x1: xmin, y1: b0 + b1 * xmin, x2: xmax, y2: b0 + b1 * xmax }] : []}
        xLabel={name}
        yLabel={target}
        legend={
          <Legend
            items={[
              { label: 'Observaciones', color: 'var(--series-1)' },
              { label: 'Recta de regresión simple', color: 'var(--series-2)', kind: 'line' },
            ]}
          />
        }
        caption={
          simple
            ? `${target} = ${fmt(b0, 2)} ${b1 < 0 ? '−' : '+'} ${fmt(Math.abs(b1), 2)}·${name}   ·   r de Pearson = ${fmt(r, 3)}   ·   R² = ${fmt(simple.r2, 3)}`
            : undefined
        }
      />
    </div>
  );
}

export function LinearDiagnosticCharts({
  fit,
  design,
  target,
  outliers,
}: {
  fit: LinearFit;
  design: DesignMatrix;
  target: string;
  outliers?: Set<number>;
}) {
  const stateOf = (i: number) => (outliers?.has(design.rowIndex[i]) ? 'outlier' : 'normal') as ChartPoint['state'];
  const avp: ChartPoint[] = fit.y.map((y, i) => ({
    x: fit.fitted[i],
    y,
    idx: design.rowIndex[i],
    state: stateOf(i),
    tip: [`Fila ${design.rowIndex[i] + 1}`, `Estimado: ${fmt(fit.fitted[i], 2)}`, `Real: ${fmt(y, 2)}`, `Residuo: ${fmt(fit.residuals[i], 2)}`],
  }));
  const rvf: ChartPoint[] = fit.residuals.map((e, i) => ({
    x: fit.fitted[i],
    y: e,
    idx: design.rowIndex[i],
    state: stateOf(i),
    tip: [`Fila ${design.rowIndex[i] + 1}`, `Estimado: ${fmt(fit.fitted[i], 2)}`, `Residuo: ${fmt(e, 2)}`],
  }));
  const lo = Math.min(...fit.y, ...fit.fitted);
  const hi = Math.max(...fit.y, ...fit.fitted);

  return (
    <div className="grid-2">
      <Card title={`${target} real vs. estimado`}>
        <ScatterFitChart
          points={avp}
          segments={[{ x1: lo, y1: lo, x2: hi, y2: hi, color: 'var(--series-2)', dashed: true }]}
          xLabel={`${target} estimado`}
          yLabel={`${target} real`}
          caption="Si el modelo fuera perfecto, todos los puntos caerían sobre la diagonal."
        />
      </Card>
      <Card title="Residuos vs. estimado">
        <ScatterFitChart
          points={rvf}
          zeroLine
          xLabel={`${target} estimado`}
          yLabel="Residuo"
          caption="Buscamos una nube sin forma alrededor de 0: una curva sugiere no linealidad y un embudo, heterocedasticidad."
        />
      </Card>
      <Card title="Histograma de residuos">
        <HistogramChart bins={histogram(fit.residuals)} xLabel="Residuo" />
        <p className="chart-caption">Si los residuos son normales, el histograma se parece a una campana centrada en 0.</p>
      </Card>
    </div>
  );
}
