const LINEAL: [string, string][] = [
  ['R²', 'Proporción de la variabilidad de Y que explica el modelo (0 a 1). R² = 0,88 significa que el modelo explica el 88 % de la variación.'],
  ['R² ajustado', 'Corrige el R² por la cantidad de predictores: solo sube si la variable nueva aporta más de lo que aportaría el azar. Sirve para comparar modelos con distinto número de X.'],
  ['Error estándar de la estimación', 'Desvío típico de los residuos, en las unidades de Y: cuánto se equivoca el modelo "en promedio".'],
  ['Coeficiente B', 'Cambio esperado en Y cuando esa X aumenta en una unidad y las demás quedan fijas.'],
  ['t y p-valor', 'El p-valor es la probabilidad de observar un coeficiente tan lejos de 0 si en realidad fuera 0. Con p < 0,05 decimos que la variable es significativa.'],
  ['F del modelo', 'Contrasta si al menos un coeficiente es distinto de 0. Un p pequeño indica que el modelo, en conjunto, sirve.'],
  ['MSE, RMSE y MAE', 'Errores de predicción: cuadrático medio, su raíz (en unidades de Y) y el absoluto medio (menos sensible a los atípicos).'],
  ['VIF', 'Factor de inflación de la varianza: cuánto se agranda la varianza de un coeficiente por su correlación con los otros predictores. Mayor a 5–10 indica multicolinealidad.'],
  ['Leverage y distancia de Cook', 'El leverage mide qué tan extremo es un caso en las X; la distancia de Cook, cuánto cambiarían los coeficientes si se lo sacara.'],
];

const LOGISTICA: [string, string][] = [
  ['Odds (chances)', 'p / (1 − p). Con p = 0,2 las chances son 0,25: "1 a 4".'],
  ['Odds ratio = Exp(B)', 'Por cuánto se multiplican las chances cuando la X aumenta una unidad. OR > 1 aumenta el riesgo, OR < 1 lo reduce, OR = 1 no lo modifica.'],
  ['Wald', '(B / error estándar)². Se compara con una χ² de 1 grado de libertad para obtener el p-valor.'],
  ['−2LL y χ² de razón de verosimilitud', 'El −2LL mide el desajuste (cuanto menor, mejor). La diferencia con el modelo solo con constante es una χ² que contrasta si el modelo sirve.'],
  ['R² de Cox-Snell y Nagelkerke', 'Pseudo-R² que imitan al R² lineal. El de Nagelkerke se reescala para poder llegar a 1.'],
  ['Separación perfecta', 'Cuando una combinación de las X separa sin error los 0 de los 1, los coeficientes se van a infinito y el modelo no converge.'],
  ['Umbral de corte', 'Probabilidad a partir de la cual se pronostica 1. Subirlo hace al modelo más exigente: baja el recall y suele subir la precision.'],
  ['Accuracy', 'Proporción de casos bien clasificados.'],
  ['Precision', 'De los que el modelo marcó como 1, qué proporción realmente lo es.'],
  ['Recall (sensibilidad)', 'De los que realmente son 1, qué proporción detectó el modelo.'],
  ['F-measure', 'Media armónica entre precision y recall: resume ambas en un número.'],
  ['Curva ROC y AUC', 'La ROC muestra sensibilidad contra 1 − especificidad para todos los umbrales. El AUC es el área bajo la curva: 0,5 es azar y 1 es perfecto.'],
];

const SUPUESTOS: [string, string][] = [
  ['Linealidad', 'La relación entre las X y la Y es lineal. Se revisa en el gráfico de residuos vs. estimado y con el test RESET.'],
  ['Normalidad de los residuos', 'Los residuos se distribuyen normalmente. Se revisa con el histograma y el test de Shapiro-Wilk.'],
  ['Homocedasticidad', 'La varianza de los residuos es constante. Se revisa con el gráfico de residuos y el test de Breusch-Pagan.'],
  ['No multicolinealidad', 'Las X no están muy correlacionadas entre sí. Se revisa con el VIF.'],
  ['Independencia', 'Los residuos no están correlacionados entre sí (importante en series de tiempo; se mide con Durbin-Watson).'],
];

function List({ items }: { items: [string, string][] }) {
  return (
    <dl className="help">
      {items.map(([t, d]) => (
        <div key={t}>
          <dt>{t}</dt>
          <dd>{d}</dd>
        </div>
      ))}
    </dl>
  );
}

export function HelpPanel({ kind }: { kind: 'lineal' | 'logistica' | 'ambos' }) {
  return (
    <details className="card" open>
      <summary>¿Qué significa esto?</summary>
      <div className="grid-2">
        {kind !== 'logistica' && (
          <div>
            <h3>Regresión lineal</h3>
            <List items={LINEAL} />
            <h3 style={{ marginTop: 12 }}>Supuestos de la regresión lineal</h3>
            <List items={SUPUESTOS} />
          </div>
        )}
        {kind !== 'lineal' && (
          <div>
            <h3>Regresión logística y clasificación</h3>
            <List items={LOGISTICA} />
          </div>
        )}
      </div>
    </details>
  );
}
