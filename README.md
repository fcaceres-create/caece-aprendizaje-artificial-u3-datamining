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
