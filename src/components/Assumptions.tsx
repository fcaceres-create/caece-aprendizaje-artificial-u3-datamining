import { checkAssumptions, fmt, fmtP, type LinearFit } from '../stats';
import { Light, LIGHT_LABEL } from './ui';

const EXPLAIN: Record<string, string> = {
  linealidad: 'La relación entre cada X y la Y es una recta. Si el RESET es significativo, falta curvatura (p. ej. un término al cuadrado).',
  normalidad: 'Los residuos siguen una distribución normal; es necesario para que los p-valores de t y F sean exactos.',
  homocedasticidad: 'La varianza de los residuos es la misma para cualquier valor estimado (sin forma de embudo).',
  multicolinealidad: 'Los predictores no están fuertemente correlacionados entre sí; si lo están, los coeficientes se vuelven inestables.',
};

export function AssumptionsPanel({ fit, X }: { fit: LinearFit; X: number[][] }) {
  const checks = checkAssumptions(fit, X);
  return (
    <div>
      {checks.map((c) => (
        <div className="assumption" key={c.key}>
          <Light color={c.light} />
          <div>
            <b>{c.title}</b> — <span>{LIGHT_LABEL[c.light]}</span>
            <br />
            <small>
              {c.detail}:{' '}
              {c.key === 'multicolinealidad'
                ? fit.k < 2
                  ? 'con un solo predictor no aplica.'
                  : `VIF máx. = ${fmt(c.statistic, 2)}`
                : `estadístico = ${fmt(c.statistic, 3)}, p = ${fmtP(c.p)}`}
            </small>
            <br />
            <small className="muted">{EXPLAIN[c.key]}</small>
          </div>
        </div>
      ))}
      <p className="chart-caption">
        Semáforo: verde si p ≥ 0,05 (no hay evidencia contra el supuesto), amarillo si 0,01 ≤ p &lt; 0,05, rojo si p &lt; 0,01.
      </p>
    </div>
  );
}
