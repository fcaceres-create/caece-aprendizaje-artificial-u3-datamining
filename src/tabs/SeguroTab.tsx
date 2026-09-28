import { useMemo, useState } from 'react';
import { CurveChart, Legend, type ChartPoint } from '../components/charts';
import { DataTable } from '../components/DataTable';
import { equationText } from '../components/LinearResults';
import { ConfusionView, describeOddsRatio, LogisticCoefTable, LogisticSummary, SeparationAlert } from '../components/LogisticResults';
import { Alert, Card, NumberField, SliderField } from '../components/ui';
import { ejercicio3 } from '../data/ejercicio3';
import { caseVector, runLogistic } from '../model';
import { useDataset } from '../state/useDataset';
import { confusionMatrix, fmt, fmtPct, predictLogistic, rocCurve, sigmoid } from '../stats';

const TARGET = 'AccEsteAño';
const SUBJECT: Record<string, string> = {
  Edad: 'Cada año adicional de edad',
  MilesKm: 'Cada mil km adicionales',
  AccAnterior: 'Haber tenido un accidente el año anterior',
};

export function SeguroTab() {
  const ds = useDataset(ejercicio3);
  const [cols, setCols] = useState(['Edad', 'MilesKm', 'AccAnterior']);
  const [firstN, setFirstN] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(0.5);
  const [app, setApp] = useState<Record<string, number>>({ Edad: 30, MilesKm: 22.7, AccAnterior: 0 });

  const total = ds.data.rows.length;
  const N = Math.min(firstN ?? total, total);
  const included = ds.included.map((v, i) => v && i < N);
  const res = useMemo(
    () => runLogistic({ data: ds.data, included, target: TARGET, columns: cols, dummies: {} }),
    [ds.data, included.join(), cols], // eslint-disable-line
  );

  const cm = res.ok ? confusionMatrix(res.fit.y, res.fit.probabilities, threshold) : null;
  const roc = res.ok ? rocCurve(res.fit.y, res.fit.probabilities) : null;
  const applicant = res.ok ? predictLogistic(res.fit, caseVector(res.predictors, app)) : null;
  const grants = applicant ? applicant.probability < threshold : false;

  // Curva sigmoide sobre el predictor lineal (logit).
  const logits = res.ok ? res.fit.probabilities.map((p) => Math.log(p / (1 - p))) : [];
  const finite = logits.filter(Number.isFinite);
  const lo = Math.floor(Math.min(-5, ...finite.map((v) => Math.max(v, -12)), applicant ? applicant.logit : 0) - 0.5);
  const hi = Math.ceil(Math.max(5, ...finite.map((v) => Math.min(v, 12)), applicant ? applicant.logit : 0) + 0.5);
  const curve = Array.from({ length: 121 }, (_, i) => {
    const x = lo + ((hi - lo) * i) / 120;
    return { x, y: sigmoid(x) };
  });
  const cases: ChartPoint[] = res.ok
    ? res.fit.y.map((y, k) => {
        const i = res.design.rowIndex[k];
        const logit = Math.max(-12, Math.min(12, logits[k]));
        return {
          x: logit,
          y,
          idx: i,
          state: (res.fit.probabilities[k] >= threshold ? 1 : 0) !== y ? 'outlier' : 'normal',
          tip: [
            `Fila ${i + 1}: ${y === 1 ? 'tuvo accidente' : 'sin accidente'}`,
            ...cols.map((c) => `${c}: ${fmt(Number(ds.data.rows[i][c]), 1)}`),
            `P estimada: ${fmt(res.fit.probabilities[k], 3)}`,
          ],
        };
      })
    : [];

  const rocPts = roc ? roc.points.map((p) => ({ x: p.fpr, y: p.tpr })) : [];
  const current = cm ? { x: 1 - cm.specificity, y: cm.recall } : null;

  return (
    <>
      <Card title="Seguro: regresión logística del riesgo de accidente">
        <div className="row" style={{ marginBottom: 10 }}>
          <b>Predictores:</b>
          {['Edad', 'MilesKm', 'AccAnterior'].map((c) => (
            <label className="check" key={c}>
              <input
                type="checkbox"
                checked={cols.includes(c)}
                onChange={() => setCols((cur) => (cur.includes(c) ? cur.filter((v) => v !== c) : [...cur, c]))}
              />
              {c}
            </label>
          ))}
        </div>
        <div style={{ maxWidth: 520 }}>
          <SliderField
            label="Usar las primeras N filas"
            value={N}
            min={6}
            max={total}
            step={1}
            decimals={0}
            unit={` de ${total}`}
            onChange={(v) => setFirstN(v)}
          />
          <div className="row no-print" style={{ marginTop: 6 }}>
            <button onClick={() => setFirstN(19)}>Probar con 19 filas</button>
            <button onClick={() => setFirstN(null)}>Usar las {total} filas</button>
          </div>
        </div>
      </Card>

      {!res.ok ? (
        <Alert kind="error">{res.error}</Alert>
      ) : (
        <>
          <SeparationAlert fit={res.fit} />
          <div className="grid-2">
            <Card title="Coeficientes">
              <div className="equation" style={{ marginBottom: 10 }}>
                {equationText(res.fit, 'logit(p)', 4)}
              </div>
              <LogisticCoefTable fit={res.fit} interpret={(name, or) => describeOddsRatio(SUBJECT[name] ?? `Cada unidad adicional de ${name}`, or, 'accidente')} />
            </Card>
            <Card title="Ajuste del modelo">
              <LogisticSummary fit={res.fit} />
              <p className="chart-caption" style={{ marginTop: 10 }}>
                p = 1 / (1 + e<sup>−logit</sup>). El χ² de razón de verosimilitud compara este modelo con el que solo tiene la constante.
              </p>
            </Card>
          </div>

          <div className="grid-2">
            <Card title="Solicitante">
              <div className="row" style={{ alignItems: 'end', marginBottom: 12 }}>
                <NumberField label="Edad (años)" value={app.Edad} onChange={(v) => setApp({ ...app, Edad: v })} />
                <NumberField label="Kilómetros anuales (miles)" value={app.MilesKm} step={0.1} onChange={(v) => setApp({ ...app, MilesKm: v })} />
                <NumberField label="Accidentes el año anterior" value={app.AccAnterior} min={0} onChange={(v) => setApp({ ...app, AccAnterior: v })} />
              </div>
              {applicant && (
                <>
                  <div className="equation" style={{ whiteSpace: 'normal' }}>
                    logit = {fmt(res.fit.coefficients[0].b, 4)}
                    {res.fit.coefficients.slice(1).map((c, j) => ` ${c.b < 0 ? '−' : '+'} ${fmt(Math.abs(c.b), 4)}·${fmt(caseVector(res.predictors, app)[j], 1)}`)} ={' '}
                    {fmt(applicant.logit, 4)}
                    <br />p = 1 / (1 + e<sup>{fmt(-applicant.logit, 4)}</sup>) = <b>{fmt(applicant.probability, 3)}</b>
                  </div>
                  <div style={{ margin: '12px 0 6px' }}>
                    <span className="muted">Probabilidad de accidente</span>
                    <div className="hero">{fmtPct(applicant.probability, 1)}</div>
                  </div>
                  <div className={`verdict ${grants ? 'ok' : 'no'}`}>
                    <span aria-hidden>{grants ? '✔' : '✖'}</span>
                    {grants ? 'Se otorga el seguro' : 'No se otorga el seguro'}
                  </div>
                  <p className="chart-caption">
                    Se rechaza cuando la probabilidad es mayor o igual que el umbral de corte ({fmt(threshold, 2)}).
                  </p>
                </>
              )}
            </Card>
            <Card title="Curva sigmoide">
              <CurveChart
                curve={curve}
                points={cases}
                marker={applicant ? { x: applicant.logit, y: applicant.probability, label: 'Solicitante' } : undefined}
                xLabel="Predictor lineal (logit)"
                yLabel="P(accidente)"
                xDomain={[lo, hi]}
                yDomain={[-0.05, 1.05]}
                yTicks={[0, 0.25, 0.5, 0.75, 1]}
                hLine={{ y: threshold, label: `Umbral ${fmt(threshold, 2)}` }}
                legend={
                  <Legend
                    items={[
                      { label: 'Casos bien clasificados', color: 'var(--series-1)' },
                      { label: 'Mal clasificados', color: 'var(--critical)' },
                      { label: 'Solicitante', color: 'var(--series-3)' },
                      { label: 'Sigmoide', color: 'var(--series-2)', kind: 'line' },
                    ]}
                  />
                }
              />
            </Card>
          </div>

          <div className="grid-2">
            <Card title="Clasificación según el umbral de corte">
              <SliderField label="Umbral de corte" value={threshold} min={0} max={1} step={0.01} decimals={2} onChange={setThreshold} />
              <div style={{ height: 12 }} />
              {cm && <ConfusionView cm={cm} positive="Accidente" negative="Sin accidente" />}
            </Card>
            <Card title={`Curva ROC — AUC = ${roc ? fmt(roc.auc, 3) : '—'}`}>
              <CurveChart
                curve={rocPts}
                xLabel="1 − especificidad (tasa de falsos positivos)"
                yLabel="Sensibilidad"
                xDomain={[0, 1]}
                diagonal
                marker={current ? { ...current, label: `Umbral ${fmt(threshold, 2)}` } : undefined}
                legend={
                  <Legend
                    items={[
                      { label: 'ROC del modelo', color: 'var(--series-2)', kind: 'line' },
                      { label: 'Umbral actual', color: 'var(--series-3)' },
                    ]}
                  />
                }
              />
              <p className="chart-caption">La diagonal punteada es un clasificador al azar (AUC = 0,5).</p>
            </Card>
          </div>
        </>
      )}

      <Card title="Datos">
        <DataTable
          state={ds}
          disabledRows={(i) => i >= N}
          rowNote={(i) => (i >= N ? `Fuera de las primeras ${N}` : undefined)}
        />
      </Card>
    </>
  );
}
