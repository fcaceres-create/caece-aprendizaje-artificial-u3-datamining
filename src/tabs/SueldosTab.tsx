import { useMemo, useState } from 'react';
import { Legend, ScatterFitChart, type ChartPoint, type Segment } from '../components/charts';
import { DataTable } from '../components/DataTable';
import { Equation, LinearSummary } from '../components/LinearResults';
import { LinearDiagnosticCharts } from '../components/LinearCharts';
import { Alert, Card, NumberField } from '../components/ui';
import { ejercicio2 } from '../data/ejercicio2';
import { caseVector, runLinear, type Result } from '../model';
import { useDataset } from '../state/useDataset';
import { detectInfluential, fitLinear, fmt, fmtP, influenceThresholds, predictLinear, type DummyConfig, type LinearFit } from '../stats';

const TARGET = 'Sueldo';

function simpleLine(fit: LinearFit | null, xs: number[]): Segment[] {
  if (!fit || !xs.length) return [];
  const [b0, b1] = fit.coefficients.map((c) => c.b);
  const lo = Math.min(...xs);
  const hi = Math.max(...xs);
  return [{ x1: lo, y1: b0 + b1 * lo, x2: hi, y2: b0 + b1 * hi }];
}

function ModelColumn({ title, res }: { title: string; res: Result<LinearFit> }) {
  return (
    <Card title={title}>
      {!res.ok ? (
        <Alert kind="error">{res.error}</Alert>
      ) : (
        <>
          <Equation fit={res.fit} lhs={TARGET} />
          <div style={{ height: 10 }} />
          <LinearSummary fit={res.fit} />
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th className="left">Variable</th>
                  <th>B</th>
                  <th>Error est.</th>
                  <th>t</th>
                  <th>p-valor</th>
                </tr>
              </thead>
              <tbody>
                {res.fit.coefficients.map((c) => (
                  <tr key={c.name}>
                    <td className="left">{c.name}</td>
                    <td>{fmt(c.b, 2)}</td>
                    <td>{fmt(c.se, 2)}</td>
                    <td>{fmt(c.t, 3)}</td>
                    <td className={c.p < 0.05 ? 'sig' : ''}>{fmtP(c.p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

export function SueldosTab() {
  const ds = useDataset(ejercicio2);
  const [cols, setCols] = useState(['Experiencia', 'Estudios', 'Sexo']);
  const [dummies, setDummies] = useState<DummyConfig>({ Sexo: { positive: 'M' } });
  const [calc, setCalc] = useState<Record<string, number | string>>({ Experiencia: 4, Estudios: 5, Sexo: 'M' });

  const allIncluded = ds.data.rows.map(() => true);
  const base = { data: ds.data, target: TARGET, columns: cols, dummies };
  const resAll = useMemo(() => runLinear({ ...base, included: allIncluded }), [ds.data, cols, dummies]); // eslint-disable-line
  const resCur = useMemo(() => runLinear({ ...base, included: ds.included }), [ds.data, ds.included, cols, dummies]); // eslint-disable-line

  // Atípicos detectados en el modelo con todos los datos.
  const influence = resAll.ok ? detectInfluential(resAll.fit) : [];
  const th = resAll.ok ? influenceThresholds(resAll.fit) : null;
  const outlierRows = new Set(
    resAll.ok ? influence.filter((f) => f.flags.includes('cook')).map((f) => resAll.design.rowIndex[f.index]) : [],
  );
  const mostInfluential = resAll.ok
    ? resAll.design.rowIndex[resAll.fit.cooksDistance.indexOf(Math.max(...resAll.fit.cooksDistance))]
    : -1;

  const nExcluded = ds.included.filter((v) => !v).length;

  // Dispersión experiencia vs. sueldo.
  const expRows = ds.data.rows
    .map((r, i) => ({ x: r.Experiencia, y: r.Sueldo, i }))
    .filter((p): p is { x: number; y: number; i: number } => typeof p.x === 'number' && typeof p.y === 'number');
  const points: ChartPoint[] = expRows.map((p) => ({
    x: p.x,
    y: p.y,
    idx: p.i,
    state: !ds.included[p.i] ? 'excluded' : outlierRows.has(p.i) ? 'outlier' : 'normal',
    tip: [
      `Fila ${p.i + 1}${outlierRows.has(p.i) ? ' — atípico' : ''}`,
      `Experiencia: ${fmt(p.x, 1)} años`,
      `Sueldo: ${fmt(p.y, 0)}`,
      ds.included[p.i] ? 'Click para excluir' : 'Excluida — click para incluir',
    ],
  }));
  const simple = (rows: typeof expRows) => {
    try {
      return fitLinear(
        rows.map((r) => [r.x]),
        rows.map((r) => r.y),
        ['Experiencia'],
      );
    } catch {
      return null;
    }
  };
  const lineAll = simpleLine(simple(expRows), expRows.map((r) => r.x)).map((s) => ({ ...s, color: 'var(--muted)', dashed: true }));
  const incRows = expRows.filter((r) => ds.included[r.i]);
  const lineCur = simpleLine(simple(incRows), expRows.map((r) => r.x));

  // Calculadora paso a paso.
  const calcFit = resCur.ok ? resCur : null;
  const x = calcFit ? caseVector(calcFit.predictors, calc) : [];
  const pred = calcFit ? predictLinear(calcFit.fit, x) : null;
  const predAll = resAll.ok ? predictLinear(resAll.fit, caseVector(resAll.predictors, calc)) : null;

  return (
    <>
      <Card
        title="Sueldos: el efecto de un valor atípico"
        actions={
          <>
            <button onClick={() => ds.setIncluded(ds.data.rows.map((_, i) => i !== mostInfluential))} disabled={mostInfluential < 0}>
              Excluir el caso más influyente (fila {mostInfluential + 1})
            </button>
            <button onClick={() => ds.setIncluded(ds.data.rows.map((_, i) => !outlierRows.has(i)))} disabled={!outlierRows.size}>
              Excluir todos los atípicos detectados
            </button>
            <button onClick={() => ds.setIncluded(allIncluded)} disabled={!nExcluded}>
              Incluir todos
            </button>
          </>
        }
      >
        <div className="row" style={{ marginBottom: 8 }}>
          <b>Predictores:</b>
          {['Experiencia', 'Estudios', 'Sexo'].map((c) => (
            <label className="check" key={c}>
              <input
                type="checkbox"
                checked={cols.includes(c)}
                onChange={() => setCols((cur) => (cur.includes(c) ? cur.filter((v) => v !== c) : [...cur, c]))}
              />
              {c === 'Sexo' ? `Sexo (${dummies.Sexo?.positive} = 1)` : c}
            </label>
          ))}
          <label className="field no-print" style={{ gridAutoFlow: 'column', alignItems: 'center' }}>
            <span>Sexo: categoría que vale 1</span>
            <select value={dummies.Sexo?.positive} onChange={(e) => setDummies({ Sexo: { positive: e.target.value } })}>
              <option>M</option>
              <option>F</option>
            </select>
          </label>
        </div>
        <div className="grid-2">
          <ScatterFitChart
            points={points}
            segments={[...lineAll, ...lineCur]}
            xLabel="Experiencia (años)"
            yLabel="Sueldo (miles)"
            onPointClick={(i) => ds.toggleRow(i)}
            height={320}
            legend={
              <Legend
                items={[
                  { label: 'Incluido', color: 'var(--series-1)' },
                  { label: 'Atípico (Cook > 4/n)', color: 'var(--critical)' },
                  { label: 'Excluido', color: 'var(--muted)', kind: 'hollow' },
                  { label: 'Recta con todos', color: 'var(--muted)', kind: 'line' },
                  { label: 'Recta sin excluidos', color: 'var(--series-2)', kind: 'line' },
                ]}
              />
            }
            caption="Hacé click en un punto para excluirlo o volver a incluirlo. Las rectas son regresiones simples Sueldo ~ Experiencia."
          />
          <div>
            <h3>Detección automática de atípicos (modelo con todos los datos)</h3>
            {th && (
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Criterios: |residuo estudentizado| &gt; {fmt(th.residual, 0)}, leverage &gt; 2p/n = {fmt(th.leverage, 3)}, Cook &gt; 4/n ={' '}
                {fmt(th.cook, 3)}. En negrita, los valores que superan el criterio.
              </p>
            )}
            {resAll.ok && th && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>Exp.</th>
                      <th>Sueldo</th>
                      <th>Residuo</th>
                      <th>Res. estud.</th>
                      <th>Leverage</th>
                      <th>Cook</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resAll.fit.residuals.map((e, k) => {
                      const i = resAll.design.rowIndex[k];
                      const t = resAll.fit.studentizedDeleted[k];
                      const h = resAll.fit.leverage[k];
                      const d = resAll.fit.cooksDistance[k];
                      return (
                        <tr key={i} className={`clickable ${outlierRows.has(i) ? 'outlier' : ''} ${ds.included[i] ? '' : 'excluded'}`} onClick={() => ds.toggleRow(i)}>
                          <td>{i + 1}</td>
                          <td>{fmt(Number(ds.data.rows[i].Experiencia), 1)}</td>
                          <td>{fmt(resAll.fit.y[k], 0)}</td>
                          <td>{fmt(e, 1)}</td>
                          <td style={{ fontWeight: Math.abs(t) > th.residual ? 700 : 400 }}>{fmt(t, 2)}</td>
                          <td style={{ fontWeight: h > th.leverage ? 700 : 400 }}>{fmt(h, 3)}</td>
                          <td style={{ fontWeight: d > th.cook ? 700 : 400 }}>{fmt(d, 3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid-2">
        <ModelColumn title={`Con todos los datos (n = ${ds.data.rows.length})`} res={resAll} />
        <ModelColumn title={`Sin los atípicos: sin las filas excluidas (n = ${resCur.ok ? resCur.fit.n : '—'})`} res={resCur} />
      </div>
      {!nExcluded && <Alert>Todavía no excluiste ninguna fila: las dos columnas muestran el mismo modelo. Hacé click en un punto del gráfico o usá los botones de arriba.</Alert>}

      <Card title="Calculadora de sueldo (modelo sin las filas excluidas)">
        <div className="grid-2">
          <div className="row" style={{ alignItems: 'end' }}>
            <NumberField label="Experiencia (años)" value={Number(calc.Experiencia)} step={0.5} onChange={(v) => setCalc({ ...calc, Experiencia: v })} />
            <NumberField label="Estudios (años)" value={Number(calc.Estudios)} step={0.5} onChange={(v) => setCalc({ ...calc, Estudios: v })} />
            <label className="field">
              <span>Sexo</span>
              <select value={String(calc.Sexo)} onChange={(e) => setCalc({ ...calc, Sexo: e.target.value })}>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </label>
          </div>
          {calcFit && pred && (
            <div>
              <span className="muted">Sueldo estimado (miles)</span>
              <div className="hero">{fmt(pred.value, 1)}</div>
              <small>
                IC de predicción 95 %: {fmt(pred.piLow, 1)} a {fmt(pred.piHigh, 1)}
                {predAll && nExcluded > 0 && <> · con todos los datos sería {fmt(predAll.value, 1)}</>}
              </small>
            </div>
          )}
        </div>
        {calcFit && pred && (
          <div className="equation" style={{ marginTop: 12, whiteSpace: 'normal', lineHeight: 1.8 }}>
            <div>
              {TARGET} = {fmt(calcFit.fit.coefficients[0].b, 2)}
              {calcFit.fit.coefficients.slice(1).map((c) => ` ${c.b < 0 ? '−' : '+'} ${fmt(Math.abs(c.b), 2)}·${c.name}`)}
            </div>
            <div>
              {TARGET} = {fmt(calcFit.fit.coefficients[0].b, 2)}
              {calcFit.fit.coefficients.slice(1).map((c, j) => ` ${c.b < 0 ? '−' : '+'} ${fmt(Math.abs(c.b), 2)}·${fmt(x[j], 1)}`)}
            </div>
            <div>
              {TARGET} = {fmt(calcFit.fit.coefficients[0].b, 2)}
              {calcFit.fit.coefficients.slice(1).map((c, j) => {
                const t = c.b * x[j];
                return ` ${t < 0 ? '−' : '+'} ${fmt(Math.abs(t), 2)}`;
              })}
            </div>
            <div>
              <b>
                {TARGET} = {fmt(pred.value, 2)}
              </b>
            </div>
            {calcFit.predictors.some((p) => p.category) && (
              <div className="muted" style={{ fontFamily: 'var(--font)', fontSize: '0.8rem' }}>
                {calcFit.predictors
                  .filter((p) => p.category)
                  .map((p) => `${p.name} vale 1 si ${p.column} es ${p.category} y 0 en otro caso.`)
                  .join(' ')}
              </div>
            )}
          </div>
        )}
      </Card>

      {resCur.ok && <LinearDiagnosticCharts fit={resCur.fit} design={resCur.design} target={TARGET} outliers={outlierRows} />}

      <Card title="Datos">
        <DataTable
          state={ds}
          rowClass={(i) => (outlierRows.has(i) ? 'outlier' : '')}
          rowNote={(i) => (outlierRows.has(i) ? 'Atípico influyente' : undefined)}
        />
      </Card>
    </>
  );
}
