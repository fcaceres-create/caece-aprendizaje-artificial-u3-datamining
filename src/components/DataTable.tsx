import { useEffect, useState } from 'react';
import type { DatasetState } from '../state/useDataset';
import { fmtAuto, inferColumns, parseNumber, type Cell } from '../stats';

function CellInput({
  value,
  numeric,
  onCommit,
  label,
}: {
  value: Cell;
  numeric: boolean;
  onCommit(v: Cell): void;
  label: string;
}) {
  const display = value === null ? '' : typeof value === 'number' ? fmtAuto(value, 6).replace(/\./g, '') : value;
  const [draft, setDraft] = useState(display);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(display);
  }, [display, focused]);

  const parsed = numeric ? (draft.trim() === '' ? null : parseNumber(draft)) : draft.trim() === '' ? null : draft.trim();
  const invalid = numeric && parsed !== null && !Number.isFinite(parsed as number);

  const commit = () => {
    setFocused(false);
    if (invalid) return;
    if (parsed !== value) onCommit(parsed);
  };

  return (
    <input
      aria-label={label}
      className={`cell-input ${numeric ? '' : 'text'} ${invalid ? 'invalid' : ''}`}
      value={draft}
      onFocus={() => setFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(display);
          setFocused(false);
        }
      }}
    />
  );
}

/**
 * Tabla de datos editable: permite modificar celdas, agregar y borrar filas, y
 * marcar cuáles entran al modelo.
 */
export function DataTable({
  state,
  rowClass,
  rowNote,
  disabledRows,
}: {
  state: DatasetState;
  rowClass?(i: number): string;
  rowNote?(i: number): string | undefined;
  /** Filas que no se pueden incluir por otra regla (p. ej. "usar primeras N filas"). */
  disabledRows?(i: number): boolean;
}) {
  const { data, included } = state;
  const info = inferColumns(data);
  const numericCols = new Set(info.filter((c) => c.type === 'numerica').map((c) => c.name));
  const nIncluded = included.filter(Boolean).length;

  return (
    <div>
      <div className="row no-print" style={{ marginBottom: 8 }}>
        <button onClick={state.addRow}>+ Agregar fila</button>
        <button onClick={() => state.setIncluded(data.rows.map(() => true))}>Incluir todas</button>
        <button onClick={state.reset} disabled={!state.isModified}>
          Restaurar datos originales
        </button>
        <small>
          {nIncluded} de {data.rows.length} filas incluidas. Editá cualquier celda; los resultados se recalculan al salir de ella.
        </small>
      </div>
      <div className="table-wrap scroll">
        <table>
          <thead>
            <tr>
              <th className="center">Incluir</th>
              <th>#</th>
              {data.columns.map((c) => (
                <th key={c} className={numericCols.has(c) ? '' : 'left'}>
                  {c}
                </th>
              ))}
              <th className="left">Nota</th>
              <th className="no-print" />
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => {
              const off = !included[i] || disabledRows?.(i);
              return (
                <tr key={i} className={`${off ? 'excluded' : ''} ${rowClass?.(i) ?? ''}`}>
                  <td className="center keep">
                    <input
                      type="checkbox"
                      checked={included[i]}
                      onChange={() => state.toggleRow(i)}
                      aria-label={`Incluir fila ${i + 1}`}
                    />
                  </td>
                  <td>{i + 1}</td>
                  {data.columns.map((c) => (
                    <td key={c} className="keep">
                      <CellInput
                        label={`${c}, fila ${i + 1}`}
                        value={row[c]}
                        numeric={numericCols.has(c) || data.rows.every((r) => r[c] === null)}
                        onCommit={(v) => state.setCell(i, c, v)}
                      />
                    </td>
                  ))}
                  <td className="left keep">
                    <small>{rowNote?.(i)}</small>
                  </td>
                  <td className="no-print keep">
                    <button className="ghost" onClick={() => state.deleteRow(i)} aria-label={`Borrar fila ${i + 1}`} title="Borrar fila">
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
