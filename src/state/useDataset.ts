import { useCallback, useState } from 'react';
import type { Cell, Dataset } from '../stats';

export interface DatasetState {
  data: Dataset;
  /** Filas marcadas para entrar al modelo. */
  included: boolean[];
  setCell(row: number, column: string, value: Cell): void;
  addRow(): void;
  deleteRow(row: number): void;
  toggleRow(row: number): void;
  setIncluded(included: boolean[]): void;
  /** Vuelve a los datos originales (los precargados o los del último archivo subido). */
  reset(): void;
  /** Reemplaza los datos originales (p. ej. al subir un archivo). */
  load(ds: Dataset): void;
  isModified: boolean;
}

export function useDataset(initial: Dataset): DatasetState {
  const [original, setOriginal] = useState(initial);
  const [data, setData] = useState(initial);
  const [included, setIncludedState] = useState<boolean[]>(() => initial.rows.map(() => true));
  const [isModified, setModified] = useState(false);

  const setCell = useCallback((row: number, column: string, value: Cell) => {
    setData((d) => ({ ...d, rows: d.rows.map((r, i) => (i === row ? { ...r, [column]: value } : r)) }));
    setModified(true);
  }, []);

  const addRow = useCallback(() => {
    setData((d) => ({ ...d, rows: [...d.rows, Object.fromEntries(d.columns.map((c) => [c, null]))] }));
    setIncludedState((inc) => [...inc, true]);
    setModified(true);
  }, []);

  const deleteRow = useCallback((row: number) => {
    setData((d) => ({ ...d, rows: d.rows.filter((_, i) => i !== row) }));
    setIncludedState((inc) => inc.filter((_, i) => i !== row));
    setModified(true);
  }, []);

  const toggleRow = useCallback((row: number) => {
    setIncludedState((inc) => inc.map((v, i) => (i === row ? !v : v)));
    setModified(true);
  }, []);

  const setIncluded = useCallback((inc: boolean[]) => {
    setIncludedState(inc);
    setModified(true);
  }, []);

  const reset = useCallback(() => {
    setData(original);
    setIncludedState(original.rows.map(() => true));
    setModified(false);
  }, [original]);

  const load = useCallback((ds: Dataset) => {
    setOriginal(ds);
    setData(ds);
    setIncludedState(ds.rows.map(() => true));
    setModified(false);
  }, []);

  return { data, included, setCell, addRow, deleteRow, toggleRow, setIncluded, reset, load, isModified };
}
