import { datasetFromText } from './parse';

/** Ejercicio 3: accidentes de asegurados según edad, kilómetros (miles) y accidentes previos. */
export const ejercicio3 = datasetFromText(
  ['Edad', 'MilesKm', 'AccAnterior', 'AccEsteAño'],
  `
23,22.3,1,1
32,35.3,0,1
28,43.1,1,1
45,38.8,0,0
56,18.2,0,0
35,43.2,1,1
52,12.4,0,0
49,16.7,0,0
55,12.5,0,0
42,24.5,1,0
45,21.4,1,0
60,26.2,1,0
56,27.1,0,0
22,9.8,0,0
22,12.5,0,0
35,15.6,0,0
38,17.5,0,0
42,15.9,1,0
26,11.7,0,0
31,38.9,1,0
34,41.5,1,0
48,15.3,0,1
28,33.5,1,1
47,18.9,0,0
39,44.5,1,1
`,
);
