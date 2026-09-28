import { useState } from 'react';
import * as XLSX from 'xlsx';
import { toNumber, type Cell, type Dataset } from '../stats';
import { Alert } from './ui';

/** Convierte una hoja de SheetJS en Dataset (primera fila = encabezados). */
export function sheetToDataset(ws: XLSX.WorkSheet): Dataset {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true, blankrows: false });
  if (!matrix.length) throw new Error('La hoja está vacía.');
  const header = (matrix[0] as unknown[]).map((h, i) => (h === null || h === '' ? `Col${i + 1}` : String(h).trim()));
  const columns = header.map((h, i) => (header.indexOf(h) === i ? h : `${h}_${i + 1}`));
  const rows = matrix.slice(1).map((r) => {
    const row: Record<string, Cell> = {};
    columns.forEach((c, i) => {
      const v = (r as unknown[])[i];
      if (v === null || v === undefined || v === '') row[c] = null;
      else if (typeof v === 'number') row[c] = v;
      else if (typeof v === 'boolean') row[c] = v ? 1 : 0;
      else {
        const s = String(v).trim();
        const n = toNumber(s);
        row[c] = Number.isFinite(n) ? n : s;
      }
    });
    return row;
  });
  return { columns, rows: rows.filter((r) => Object.values(r).some((v) => v !== null)) };
}

export function FileLoader({ onLoad }: { onLoad(ds: Dataset, name: string): void }) {
  const [wb, setWb] = useState<{ book: XLSX.WorkBook; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const loadSheet = (book: XLSX.WorkBook, fileName: string, sheet: string) => {
    try {
      onLoad(sheetToDataset(book.Sheets[sheet]), book.SheetNames.length > 1 ? `${fileName} — ${sheet}` : fileName);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleFile = async (file: File) => {
    try {
      const isCsv = /\.(csv|txt)$/i.test(file.name);
      const book = isCsv
        ? XLSX.read(await file.text(), { type: 'string', raw: true })
        : XLSX.read(await file.arrayBuffer(), { type: 'array' });
      setWb({ book, name: file.name });
      loadSheet(book, file.name, book.SheetNames[0]);
    } catch (e) {
      setError(`No se pudo leer el archivo: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label
        className={`dropzone ${over ? 'over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <b>Subir un archivo .xlsx o .csv</b>
        <br />
        <small>Arrastralo acá o hacé click. La primera fila debe tener los nombres de las variables.</small>
      </label>
      {wb && wb.book.SheetNames.length > 1 && (
        <label className="field">
          <span>Hoja del libro</span>
          <select onChange={(e) => loadSheet(wb.book, wb.name, e.target.value)}>
            {wb.book.SheetNames.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      )}
      {error && <Alert kind="error">{error}</Alert>}
    </div>
  );
}
