import { fmt, fmtP, fmtPct, type ConfusionMatrix, type LogisticFit } from '../stats';
import { Alert, Stat } from './ui';

export function LogisticSummary({ fit }: { fit: LogisticFit }) {
  return (
    <div className="stats">
      <Stat label="n" value={fit.n} />
      <Stat label="−2LL" value={fmt(fit.minus2LL, 3)} title="−2 × log-verosimilitud del modelo" />
      <Stat label="−2LL (modelo nulo)" value={fmt(fit.minus2LL0, 3)} />
      <Stat label={`χ² RV (${fit.dfChi} gl)`} value={fmt(fit.chiSq, 3)} title="Mejora de −2LL respecto del modelo solo con constante" />
      <Stat label="p del modelo" value={fmtP(fit.pChi)} />
      <Stat label="R² Cox-Snell" value={fmt(fit.coxSnell, 3)} />
      <Stat label="R² Nagelkerke" value={fmt(fit.nagelkerke, 3)} />
      <Stat label="Iteraciones" value={fit.iterations} />
    </div>
  );
}

export function SeparationAlert({ fit }: { fit: LogisticFit }) {
  if (!fit.separation.detected) return null;
  return (
    <Alert kind="error">
      <b>El modelo no converge: hay separación {fit.separation.kind === 'completa' ? 'perfecta (completa)' : 'cuasi-completa'}.</b>
      <br />
      Existe una combinación de los predictores que clasifica {fit.separation.kind === 'completa' ? 'a todos los casos' : 'a los casos'} sin
      error, así que la verosimilitud crece sin límite y los coeficientes tienden a ±∞ (−2LL ={' '}
      {fmt(fit.minus2LL, 4)} tras {fit.iterations} iteraciones). Los coeficientes, errores estándar y p-valores que se muestran{' '}
      <b>no son válidos</b>. Soluciones: agregar más casos, quitar el predictor que separa o usar regresión penalizada (Firth).
    </Alert>
  );
}

export function LogisticCoefTable({
  fit,
  interpret,
}: {
  fit: LogisticFit;
  interpret?(name: string, oddsRatio: number): string;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="left">Variable</th>
            <th>B</th>
            <th>Error est.</th>
            <th>Wald</th>
            <th>gl</th>
            <th>p-valor</th>
            <th>Exp(B) = OR</th>
            <th>IC 95 % OR</th>
          </tr>
        </thead>
        <tbody>
          {fit.coefficients.map((c) => (
            <tr key={c.name}>
              <td className="left">{c.name}</td>
              <td>{fmt(c.b, 4)}</td>
              <td>{fmt(c.se, 4)}</td>
              <td>{fmt(c.wald, 3)}</td>
              <td>{c.df}</td>
              <td className={c.p < 0.05 ? 'sig' : ''}>{fmtP(c.p)}</td>
              <td>{fmt(c.oddsRatio, 3)}</td>
              <td>
                {fmt(c.orLow, 3)} – {fmt(c.orHigh, 3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {interpret && (
        <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
          {fit.coefficients.slice(1).map((c) => (
            <li key={c.name}>{interpret(c.name, c.oddsRatio)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Interpretación genérica de un odds ratio. */
export function describeOddsRatio(subject: string, oddsRatio: number, event: string): string {
  if (!Number.isFinite(oddsRatio)) return `${subject}: el odds ratio no está definido.`;
  const pct = (oddsRatio - 1) * 100;
  const change =
    Math.abs(pct) < 0.05 ? 'no las modifica' : pct > 0 ? `(las aumenta un ${fmt(pct, 1)} %)` : `(las reduce un ${fmt(-pct, 1)} %)`;
  return `${subject} multiplica las chances de ${event} por ${fmt(oddsRatio, 2)} ${change}.`;
}

export function ConfusionView({ cm, positive = '1', negative = '0' }: { cm: ConfusionMatrix; positive?: string; negative?: string }) {
  return (
    <div>
      <div className="confusion" role="table" aria-label="Matriz de confusión">
        <div className="h" />
        <div className="h">Pronóstico: {positive}</div>
        <div className="h">Pronóstico: {negative}</div>
        <div className="h" style={{ textAlign: 'right' }}>
          Real: {positive}
        </div>
        <div className="c ok">
          {cm.tp}
          <small>VP</small>
        </div>
        <div className="c bad">
          {cm.fn}
          <small>FN</small>
        </div>
        <div className="h" style={{ textAlign: 'right' }}>
          Real: {negative}
        </div>
        <div className="c bad">
          {cm.fp}
          <small>FP</small>
        </div>
        <div className="c ok">
          {cm.tn}
          <small>VN</small>
        </div>
      </div>
      <div className="stats" style={{ marginTop: 12 }}>
        <Stat label="Accuracy" value={fmtPct(cm.accuracy)} title="(VP + VN) / total" />
        <Stat label="Precision" value={fmtPct(cm.precision)} title="VP / (VP + FP)" />
        <Stat label="Recall (sensibilidad)" value={fmtPct(cm.recall)} title="VP / (VP + FN)" />
        <Stat label="Especificidad" value={fmtPct(cm.specificity)} title="VN / (VN + FP)" />
        <Stat label="F-measure" value={fmt(cm.fMeasure, 3)} title="Media armónica de precision y recall" />
      </div>
    </div>
  );
}
