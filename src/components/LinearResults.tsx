import { fmt, fmtP, type LinearFit } from '../stats';
import { Stat } from './ui';

export function LinearSummary({ fit }: { fit: LinearFit }) {
  return (
    <div className="stats">
      <Stat label="n" value={fit.n} />
      <Stat label="R" value={fmt(fit.r, 3)} title="Correlación múltiple" />
      <Stat label="R²" value={fmt(fit.r2, 3)} title="Proporción de la variabilidad explicada" />
      <Stat label="R² ajustado" value={fmt(fit.adjR2, 3)} title="R² penalizado por la cantidad de predictores" />
      <Stat label="Error est. de la estimación" value={fmt(fit.stdErrEst, 2)} title="√(SC residual / (n − k − 1))" />
      <Stat label={`F (${fit.dfModel}; ${fit.dfResid})`} value={fmt(fit.F, 2)} />
      <Stat label="p del modelo" value={fmtP(fit.pF)} />
      <Stat label="MSE" value={fmt(fit.mse, 2)} title="Error cuadrático medio: SC residual / n" />
      <Stat label="RMSE" value={fmt(fit.rmse, 2)} />
      <Stat label="MAE" value={fmt(fit.mae, 2)} title="Error absoluto medio" />
    </div>
  );
}

export function LinearCoefTable({ fit, vifs }: { fit: LinearFit; vifs?: number[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="left">Variable</th>
            <th>B</th>
            <th>Error est.</th>
            <th>Beta</th>
            <th>t</th>
            <th>p-valor</th>
            <th>IC 95 % inf.</th>
            <th>IC 95 % sup.</th>
            {vifs && <th>VIF</th>}
          </tr>
        </thead>
        <tbody>
          {fit.coefficients.map((c, j) => (
            <tr key={c.name}>
              <td className="left">{c.name}</td>
              <td>{fmt(c.b, 4)}</td>
              <td>{fmt(c.se, 4)}</td>
              <td>{j === 0 ? '' : fmt(c.beta, 3)}</td>
              <td>{fmt(c.t, 3)}</td>
              <td className={c.p < 0.05 ? 'sig' : ''}>{fmtP(c.p)}</td>
              <td>{fmt(c.ciLow, 3)}</td>
              <td>{fmt(c.ciHigh, 3)}</td>
              {vifs && <td>{j === 0 ? '' : fmt(vifs[j - 1], 2)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="chart-caption">En verde, los coeficientes significativos al 5 %.</p>
    </div>
  );
}

/** Ecuación estimada: "Demanda = 2.105,12 − 35,03·TempMax − …". */
export function equationText(fit: { coefficients: { name: string; b: number }[] }, lhs: string, decimals = 2): string {
  const [b0, ...rest] = fit.coefficients;
  let s = `${lhs} = ${fmt(b0.b, decimals)}`;
  for (const c of rest) s += ` ${c.b < 0 ? '−' : '+'} ${fmt(Math.abs(c.b), decimals)}·${c.name}`;
  return s;
}

export function Equation({ fit, lhs, decimals = 2 }: { fit: { coefficients: { name: string; b: number }[] }; lhs: string; decimals?: number }) {
  return <div className="equation">{equationText(fit, lhs, decimals)}</div>;
}
