import type { Cell, Dataset } from '../stats/design';

/** Convierte texto CSV simple (separado por comas, punto decimal) en un Dataset. */
export function datasetFromText(columns: string[], text: string): Dataset {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const parts = line.split(',');
      const row: Record<string, Cell> = {};
      columns.forEach((c, i) => {
        const raw = (parts[i] ?? '').trim();
        const n = Number(raw);
        row[c] = raw === '' ? null : Number.isFinite(n) ? n : raw;
      });
      return row;
    });
  return { columns, rows };
}
