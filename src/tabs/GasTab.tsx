import { useMemo, useState } from 'react';
import { AssumptionsPanel } from '../components/Assumptions';
import { DataTable } from '../components/DataTable';
import { Equation, LinearCoefTable, LinearSummary } from '../components/LinearResults';
import { LinearDiagnosticCharts, PredictorScatter } from '../components/LinearCharts';
import { Alert, Card, SliderField } from '../components/ui';
import { ejercicio1 } from '../data/ejercicio1';
import { caseVector, columnRange, runLinear } from '../model';
import { useDataset } from '../state/useDataset';
import { allSubsets, fmt, fmtP, predictLinear, vif, type DummyConfig } from '../stats';

const TARGET = 'Demanda';
const LABELS: Record<string, string> = { TempMax: 'Temp. máxima', TempMin: 'Temp. mínima', Dia: 'Tipo de día', Mes: 'Mes' };

export function GasTab() {
  const ds = useDataset(ejercicio1);
  const [cols, setCols] = useState<string[]>(['TempMax', 'TempMin']);
  const [withMes, setWithMes] = useState(false);
  const [dummies, setDummies] = useState<DummyConfig>({ Dia: { positive: 'Laborable' }, Mes: { positive: 'Agosto' } });
  const [sim, setSim] = useState<Record<string, number | string>>({ TempMax: 12, TempMin: 3, Dia: 'Laborable', Mes: 'Julio' });

  const candidates = withMes ? ['TempMax', 'TempMin', 'Dia', 'Mes'] : ['TempMax', 'TempMin', 'Dia'];
  const activeCols = cols.filter((c) => candidates.includes(c));
  const spec = { data: ds.data, included: ds.included, target: TARGET, dummies };
  const res = useMemo(() => runLinear({ ...spec, columns: activeCols }), [ds.data, ds.included, dummies, activeCols.join()]); // eslint-disable-line

  const combos = useMemo(
    () =>
      allSubsets(candidates)
        .map((c) => ({ cols: c, res: runLinear({ ...spec, columns: c }) }))
        .filter((c) => c.res.ok)
        .sort((a, b) => (b.res.ok && a.res.ok ? b.res.fit.adjR2 - a.res.fit.adjR2 : 0)),
    [ds.data, ds.included, dummies, withMes], // eslint-disable-line
  );

  const toggle = (c: string) => setCols((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  const [tmaxMin, tmaxMax] = columnRange(ds.data, 'TempMax');
  const [tminMin, tminMax] = columnRange(ds.data, 'TempMin');

  const prediction = res.ok ? predictLinear(res.fit, caseVector(res.predictors, sim)) : null;
  const catOptions = (col: string) => [...new Set(ds.data.rows.map((r) => String(r[col] ?? '')).filter(Boolean))];

  return (
    <>
      <div className="grid-2">
        <Card title="Modelo de regresión lineal: demanda de gas">
          <div className="row" style={{ marginBottom: 10 }}>
            <b>Predictores:</b>
            {['TempMax', 'TempMin', 'Dia'].map((c) => (
              <label className="check" key={c}>
                <input type="checkbox" checked={cols.includes(c)} onChange={() => toggle(c)} />
                {c === 'Dia' ? `Laborable (Dia=${dummies.Dia?.positive})` : c}
              </label>
            ))}
            <label className="check">
              <input
                type="checkbox"
                checked={withMes && cols.includes('Mes')}
                onChange={(e) => {
                  setWithMes(e.target.checked || withMes);
                  if (e.target.checked) setCols((cur) => [...new Set([...cur, 'Mes'])]);
                  else setCols((cur) => cur.filter((x) => x !== 'Mes'));
                }}
              />
              Mes (opcional)
            </label>
          </div>
          <div className="row no-print" style={{ marginBottom: 10 }}>
            <label className="field">
              <span>Dia: categoría que vale 1</span>
              <select value={dummies.Dia?.positive} onChange={(e) => setDummies({ ...dummies, Dia: { positive: e.target.value } })}>
                {catOptions('Dia').map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Mes: categoría que vale 1</span>
              <select value={dummies.Mes?.positive} onChange={(e) => setDummies({ ...dummies, Mes: { positive: e.target.value } })}>
                {catOptions('Mes').map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={withMes} onChange={(e) => setWithMes(e.target.checked)} />
              Incluir Mes en la comparación de combinaciones
            </label>
          </div>
          {!res.ok ? (
            <Alert kind="error">{res.error}</Alert>
          ) : (
            <>
              <Equation fit={res.fit} lhs={TARGET} />
              <div style={{ height: 10 }} />
              <LinearSummary fit={res.fit} />
              <div style={{ height: 10 }} />
              <LinearCoefTable fit={res.fit} vifs={vif(res.design.X, res.design.names).map((v) => v.vif)} />
            </>
          )}
        </Card>

        <Card title="Simulador de demanda">
          <div style={{ display: 'grid', gap: 12 }}>
            <SliderField
              label="Temperatura máxima"
              unit=" °C"
              value={Number(sim.TempMax)}
              min={Math.floor(tmaxMin - 5)}
              max={Math.ceil(tmaxMax + 5)}
              step={0.1}
              onChange={(v) => setSim({ ...sim, TempMax: v })}
              disabled={!activeCols.includes('TempMax')}
            />
            <SliderField
              label="Temperatura mínima"
              unit=" °C"
              value={Number(sim.TempMin)}
              min={Math.floor(tminMin - 5)}
              max={Math.ceil(tminMax + 5)}
              step={0.1}
              onChange={(v) => setSim({ ...sim, TempMin: v })}
              disabled={!activeCols.includes('TempMin')}
            />
            <div className="row">
              <label className="field">
                <span>Tipo de día</span>
                <select value={String(sim.Dia)} onChange={(e) => setSim({ ...sim, Dia: e.target.value })} disabled={!activeCols.includes('Dia')}>
                  {catOptions('Dia').map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Mes</span>
                <select value={String(sim.Mes)} onChange={(e) => setSim({ ...sim, Mes: e.target.value })} disabled={!activeCols.includes('Mes')}>
                  {catOptions('Mes').map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            {prediction && res.ok ? (
              <div>
                <span className="muted">Demanda pronosticada</span>
                <div className="hero">{fmt(prediction.value, 1)}</div>
                <small>
                  Intervalo de predicción del 95 %: {fmt(prediction.piLow, 1)} a {fmt(prediction.piHigh, 1)}
                </small>
                {activeCols.length < 4 && (
                  <p className="chart-caption">Los controles grisados no forman parte del modelo actual y no afectan el pronóstico.</p>
                )}
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card title="Comparación de todas las combinaciones de predictores">
        <p className="muted">Ordenadas por R² ajustado. Hacé click en una fila para usar ese modelo. El mejor está resaltado.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="left">Predictores</th>
                <th>k</th>
                <th>R²</th>
                <th>R² ajustado</th>
                <th>Error est.</th>
                <th>F</th>
                <th>p del modelo</th>
                <th>MAE</th>
                <th className="left">Predictores no significativos (p ≥ 0,05)</th>
              </tr>
            </thead>
            <tbody>
              {combos.map(({ cols: c, res: r }, i) =>
                r.ok ? (
                  <tr
                    key={c.join()}
                    className={`clickable ${i === 0 ? 'best' : ''} ${c.join() === [...activeCols].sort((a, b) => candidates.indexOf(a) - candidates.indexOf(b)).join() ? 'selected' : ''}`}
                    onClick={() => setCols(c)}
                  >
                    <td className="left">
                      {i === 0 ? '★ ' : ''}
                      {c.map((x) => LABELS[x] ?? x).join(' + ')}
                    </td>
                    <td>{r.fit.k}</td>
                    <td>{fmt(r.fit.r2, 3)}</td>
                    <td>{fmt(r.fit.adjR2, 3)}</td>
                    <td>{fmt(r.fit.stdErrEst, 2)}</td>
                    <td>{fmt(r.fit.F, 1)}</td>
                    <td>{fmtP(r.fit.pF)}</td>
                    <td>{fmt(r.fit.mae, 2)}</td>
                    <td className="left">
                      {r.fit.coefficients
                        .slice(1)
                        .filter((co) => co.p >= 0.05)
                        .map((co) => `${co.name} (p = ${fmtP(co.p)})`)
                        .join(', ') || '—'}
                    </td>
                  </tr>
                ) : null,
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {res.ok && (
        <>
          <div className="grid-2">
            <Card title={`Dispersión de cada predictor contra la ${TARGET.toLowerCase()}`}>
              <PredictorScatter design={res.design} target={TARGET} />
            </Card>
            <Card title="Supuestos del modelo">
              <AssumptionsPanel fit={res.fit} X={res.design.X} />
            </Card>
          </div>
          <LinearDiagnosticCharts fit={res.fit} design={res.design} target={TARGET} />
        </>
      )}

      <Card title="Datos (62 días de julio y agosto)">
        <DataTable state={ds} />
      </Card>
    </>
  );
}
