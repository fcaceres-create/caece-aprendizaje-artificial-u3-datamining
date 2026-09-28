import { useMemo, useState } from 'react';
import { AssumptionsPanel } from '../components/Assumptions';
import { CurveChart, Legend } from '../components/charts';
import { DataTable } from '../components/DataTable';
import { FileLoader } from '../components/FileLoader';
import { HelpPanel } from '../components/HelpPanel';
import { Equation, equationText, LinearCoefTable, LinearSummary } from '../components/LinearResults';
import { LinearDiagnosticCharts, PredictorScatter } from '../components/LinearCharts';
import { ConfusionView, describeOddsRatio, LogisticCoefTable, LogisticSummary, SeparationAlert } from '../components/LogisticResults';
import { Alert, Card, SliderField } from '../components/ui';
import { ejercicio1 } from '../data/ejercicio1';
import { ejercicio2 } from '../data/ejercicio2';
import { ejercicio3 } from '../data/ejercicio3';
import { runLinear, runLogistic } from '../model';
import { useDataset } from '../state/useDataset';
import { confusionMatrix, fmt, inferColumns, rocCurve, vif, type Dataset, type DummyConfig } from '../stats';

type Kind = 'lineal' | 'logistica';

const PRESETS: { key: string; label: string; data: Dataset; kind: Kind; target: string }[] = [
  { key: 'ej1', label: 'Ejercicio 1: demanda de gas', data: ejercicio1, kind: 'lineal', target: 'Demanda' },
  { key: 'ej2', label: 'Ejercicio 2: sueldos', data: ejercicio2, kind: 'lineal', target: 'Sueldo' },
  { key: 'ej3', label: 'Ejercicio 3: seguro', data: ejercicio3, kind: 'logistica', target: 'AccEsteAño' },
];

export function LibreTab() {
  const ds = useDataset(ejercicio1);
  const [source, setSource] = useState('ej1');
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>('lineal');
  const [target, setTarget] = useState('Demanda');
  const [cols, setCols] = useState<string[]>(['TempMax', 'TempMin']);
  const [dummies, setDummies] = useState<DummyConfig>({});
  const [targetPositive, setTargetPositive] = useState<string | undefined>(undefined);
  const [threshold, setThreshold] = useState(0.5);

  const info = inferColumns(ds.data);
  const targetInfo = info.find((c) => c.name === target);

  const applyDataset = (data: Dataset, k: Kind, t: string) => {
    ds.load(data);
    const inf = inferColumns(data);
    const tgt = data.columns.includes(t) ? t : ([...inf].reverse().find((c) => c.type === 'numerica')?.name ?? data.columns[0]);
    setKind(k);
    setTarget(tgt);
    setCols(data.columns.filter((c) => c !== tgt));
    setDummies({});
    setTargetPositive(inf.find((c) => c.name === tgt)?.categories[0]);
  };

  const spec = {
    data: ds.data,
    included: ds.included,
    target,
    columns: cols.filter((c) => c !== target),
    dummies,
    targetPositive: targetInfo?.type === 'categorica' ? (targetPositive ?? targetInfo.categories[0]) : undefined,
  };
  const deps = [ds.data, ds.included, target, cols.join(), dummies, spec.targetPositive]; // eslint-disable-line
  const lin = useMemo(() => (kind === 'lineal' ? runLinear(spec) : null), [kind, ...deps]); // eslint-disable-line
  const log = useMemo(() => (kind === 'logistica' ? runLogistic(spec) : null), [kind, ...deps]); // eslint-disable-line

  const catPredictors = info.filter((c) => c.type === 'categorica' && c.name !== target && cols.includes(c.name));

  return (
    <>
      <div className="grid-2">
        <Card title="Datos y modelo">
          <div style={{ display: 'grid', gap: 12 }}>
            <label className="field">
              <span>Conjunto de datos</span>
              <select
                value={source}
                onChange={(e) => {
                  const p = PRESETS.find((x) => x.key === e.target.value);
                  setSource(e.target.value);
                  if (p) applyDataset(p.data, p.kind, p.target);
                }}
              >
                {PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
                {uploadName && <option value="upload">Archivo: {uploadName}</option>}
              </select>
            </label>
            <FileLoader
              onLoad={(data, name) => {
                setUploadName(name);
                setSource('upload');
                applyDataset(data, kind, target);
              }}
            />
            <div className="row">
              <label className="field">
                <span>Tipo de regresión</span>
                <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                  <option value="lineal">Lineal</option>
                  <option value="logistica">Logística</option>
                </select>
              </label>
              <label className="field">
                <span>Variable dependiente (Y)</span>
                <select
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    setTargetPositive(info.find((c) => c.name === e.target.value)?.categories[0]);
                  }}
                >
                  {ds.data.columns.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              {kind === 'logistica' && targetInfo?.type === 'categorica' && (
                <label className="field">
                  <span>Categoría de Y que vale 1</span>
                  <select value={spec.targetPositive} onChange={(e) => setTargetPositive(e.target.value)}>
                    {targetInfo.categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div>
              <b>Variables independientes (X):</b>
              <div className="row" style={{ marginTop: 6 }}>
                {ds.data.columns
                  .filter((c) => c !== target)
                  .map((c) => (
                    <label className="check" key={c}>
                      <input
                        type="checkbox"
                        checked={cols.includes(c)}
                        onChange={() => setCols((cur) => (cur.includes(c) ? cur.filter((v) => v !== c) : [...cur, c]))}
                      />
                      {c}
                      {info.find((i) => i.name === c)?.type === 'categorica' && <small>(categórica)</small>}
                    </label>
                  ))}
              </div>
            </div>
            {catPredictors.length > 0 && (
              <div className="row">
                {catPredictors.map((c) =>
                  c.categories.length === 2 ? (
                    <label className="field" key={c.name}>
                      <span>{c.name}: categoría que vale 1</span>
                      <select
                        value={dummies[c.name]?.positive ?? c.categories[0]}
                        onChange={(e) => setDummies({ ...dummies, [c.name]: { positive: e.target.value } })}
                      >
                        {c.categories.map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="field" key={c.name}>
                      <span>{c.name}: categoría de referencia (todas las ficticias en 0)</span>
                      <select
                        value={dummies[c.name]?.reference ?? c.categories[0]}
                        onChange={(e) => setDummies({ ...dummies, [c.name]: { reference: e.target.value } })}
                      >
                        {c.categories.map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </label>
                  ),
                )}
              </div>
            )}
            {kind === 'lineal' && targetInfo?.type === 'categorica' && (
              <Alert kind="error">La variable dependiente es categórica: para una regresión lineal elegí una variable numérica, o cambiá a logística.</Alert>
            )}
          </div>
        </Card>

        <Card title="Resultados">
          {kind === 'lineal' && lin && (!lin.ok ? <Alert kind="error">{lin.error}</Alert> : (
            <>
              <Equation fit={lin.fit} lhs={target} />
              <div style={{ height: 10 }} />
              <LinearSummary fit={lin.fit} />
              <div style={{ height: 10 }} />
              <LinearCoefTable fit={lin.fit} vifs={vif(lin.design.X, lin.design.names).map((v) => v.vif)} />
            </>
          ))}
          {kind === 'logistica' && log && (!log.ok ? <Alert kind="error">{log.error}</Alert> : (
            <>
              <SeparationAlert fit={log.fit} />
              <div className="equation" style={{ margin: '10px 0' }}>
                {equationText(log.fit, 'logit(p)', 4)}
              </div>
              <LogisticSummary fit={log.fit} />
              <div style={{ height: 10 }} />
              <LogisticCoefTable
                fit={log.fit}
                interpret={(name, or) =>
                  describeOddsRatio(
                    log.predictors.find((p) => p.name === name)?.category !== undefined ? `Pertenecer a ${name}` : `Cada unidad adicional de ${name}`,
                    or,
                    `que ${target} valga 1`,
                  )
                }
              />
            </>
          ))}
        </Card>
      </div>

      {kind === 'lineal' && lin?.ok && (
        <>
          <div className="grid-2">
            <Card title="Supuestos de la regresión lineal">
              <AssumptionsPanel fit={lin.fit} X={lin.design.X} />
            </Card>
            <Card title="Dispersión de cada predictor">
              <PredictorScatter design={lin.design} target={target} />
            </Card>
          </div>
          <LinearDiagnosticCharts fit={lin.fit} design={lin.design} target={target} />
        </>
      )}

      {kind === 'logistica' && log?.ok && (() => {
        const cm = confusionMatrix(log.fit.y, log.fit.probabilities, threshold);
        const roc = rocCurve(log.fit.y, log.fit.probabilities);
        return (
          <div className="grid-2">
            <Card title="Clasificación">
              <SliderField label="Umbral de corte" value={threshold} min={0} max={1} step={0.01} decimals={2} onChange={setThreshold} />
              <div style={{ height: 12 }} />
              <ConfusionView cm={cm} />
            </Card>
            <Card title={`Curva ROC — AUC = ${fmt(roc.auc, 3)}`}>
              <CurveChart
                curve={roc.points.map((p) => ({ x: p.fpr, y: p.tpr }))}
                xLabel="1 − especificidad"
                yLabel="Sensibilidad"
                xDomain={[0, 1]}
                diagonal
                marker={{ x: 1 - cm.specificity, y: cm.recall, label: `Umbral ${fmt(threshold, 2)}` }}
                legend={<Legend items={[{ label: 'ROC', color: 'var(--series-2)', kind: 'line' }, { label: 'Umbral actual', color: 'var(--series-3)' }]} />}
              />
            </Card>
          </div>
        );
      })()}

      <HelpPanel kind="ambos" />

      <Card title="Datos (editables)">
        <DataTable state={ds} />
      </Card>
    </>
  );
}
