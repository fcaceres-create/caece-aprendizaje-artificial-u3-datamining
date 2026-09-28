# Regresión lineal y logística interactiva

Web educativa para practicar **regresión lineal y regresión logística**, de la materia
Metodologías de Data Mining (Unidad 3). Todo el cálculo se hace en el navegador, con
TypeScript puro: no hace falta backend ni Python.

## Requisitos

- Node.js 20 o superior (probado con Node 24).

## Instalación y uso

```bash
npm install      # instala las dependencias
npm run dev      # levanta la app en http://localhost:5180 (se abre solo en el navegador)
npm test         # corre los tests de Vitest (incluye la validación contra los resultados de la cátedra)
npm run build    # genera la versión estática en dist/
npm run preview  # sirve la versión de dist/
```

Para abrir directamente una pestaña, agregá `#gas`, `#sueldos`, `#seguro` o `#libre` a la URL.

## Notebooks de Python (Google Colab)

En [`notebooks/`](notebooks/) hay un notebook por ejercicio que resuelve lo mismo que la web con
pandas y statsmodels, y comprueba cada resultado contra los valores de la cátedra (líneas ✔ / ✘).
Corren en la nube de Google, así que no hace falta instalar Python.

| Ejercicio | Abrir |
|---|---|
| 1. Demanda de gas: regresión lineal múltiple, combinaciones de predictores y supuestos | [![Abrir en Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/fcaceres-create/caece-aprendizaje-artificial-u3-datamining/blob/main/notebooks/01_demanda_gas_regresion_lineal.ipynb) |
| 2. Sueldos: valores atípicos, leverage y distancia de Cook | [![Abrir en Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/fcaceres-create/caece-aprendizaje-artificial-u3-datamining/blob/main/notebooks/02_sueldos_valores_atipicos.ipynb) |
| 3. Seguro: regresión logística, matriz de confusión, ROC y separación perfecta | [![Abrir en Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/fcaceres-create/caece-aprendizaje-artificial-u3-datamining/blob/main/notebooks/03_seguro_regresion_logistica.ipynb) |

Los notebooks leen los datos de [`notebooks/datos/`](notebooks/datos/), que también incluye
`EjerciciosRegresion.xlsx` con las tres hojas. Para guardar tus cambios en Colab usá
**Archivo → Guardar una copia en Drive**.

## Publicar en un hosting

`npm run build` genera la carpeta `dist/`, que es un sitio estático: no necesita servidor ni base
de datos. La forma más simple es entrar a https://app.netlify.com/drop y arrastrar la carpeta
`dist/`. También sirven GitHub Pages, Cloudflare Pages o Vercel (comando de build `npm run build`,
carpeta de salida `dist`). Como las rutas son relativas, funciona también dentro de una subcarpeta.

## Qué incluye

| Pestaña | Contenido |
|---|---|
| **1. Demanda de gas** | Selección de predictores (TempMax, TempMin, Laborable y Mes), comparación de todas las combinaciones ordenadas por R² ajustado, gráficos de dispersión, real vs. estimado, residuos e histograma, semáforo de supuestos y simulador de demanda. |
| **2. Sueldos** | Click en los puntos para excluirlos o incluirlos, detección automática de atípicos (residuo estudentizado, leverage, distancia de Cook), comparación "con todos" vs. "sin atípicos" y calculadora con la ecuación paso a paso. |
| **3. Seguro** | Logística con odds ratio interpretados, sigmoide con los casos reales y el solicitante, veredicto, umbral de corte con matriz de confusión y métricas en vivo, curva ROC con AUC, y selector "primeras N filas" para ver la separación perfecta. |
| **4. Modo libre** | Carga de cualquier .xlsx o .csv, elección de Y, de las X y del tipo de modelo, panel "¿Qué significa esto?" y semáforo de supuestos. |

En todas las pestañas los datos son editables: se pueden modificar celdas, agregar o borrar
filas, excluir filas del modelo y restaurar los datos originales. El botón **Exportar informe**
abre el diálogo de impresión del navegador; eligiendo "Guardar como PDF" se obtiene el informe
de la pestaña actual.

## Estructura

```
src/
  stats/         Módulo de cálculo (funciones puras, testeadas)
    linalg.ts          QR de Householder y Cholesky
    linear.ts          MCO: coeficientes, t, p, R², F, MSE/RMSE/MAE, leverage, Cook
    logistic.ts        Máxima verosimilitud por Newton-Raphson/IRLS, Wald, OR, −2LL, pseudo-R²
    separation.ts      Detección de separación completa o cuasi-completa por programación lineal
    classification.ts  Matriz de confusión, métricas y curva ROC/AUC
    diagnostics.ts     Shapiro-Wilk, Jarque-Bera, VIF, Breusch-Pagan, RESET y semáforo de supuestos
    design.ts          Variables ficticias, matriz de diseño y combinaciones
    format.ts          Formato argentino (coma decimal, punto de miles)
    *.test.ts          Tests (validation.test.ts reproduce los resultados de la cátedra)
  data/          Datos precargados de EjerciciosRegresion.xlsx
  components/    Tablas, gráficos (Recharts) y paneles reutilizables
  tabs/          Una pantalla por ejercicio más el modo libre
```

## Notas de cálculo

- **MSE** = SC residual / n (error de predicción). El **error estándar de la estimación** usa n − k − 1.
- Las variables categóricas de dos niveles generan una ficticia 0/1 y se puede elegir qué categoría
  vale 1. Las de más de dos niveles generan k − 1 ficticias con una categoría de referencia.
- En la logística se predice 1 cuando p ≥ umbral.
- Criterios de atípicos: |residuo estudentizado eliminado| > 2, leverage > 2p/n y Cook > 4/n. En el
  gráfico se marcan en rojo los casos con Cook > 4/n.
- Los p-valores de las distribuciones t, F y χ² se calculan con [`jstat`](https://github.com/jstat/jstat).
