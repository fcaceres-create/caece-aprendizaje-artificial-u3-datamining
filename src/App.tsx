import { useEffect, useState } from 'react';
import { GasTab } from './tabs/GasTab';
import { LibreTab } from './tabs/LibreTab';
import { SeguroTab } from './tabs/SeguroTab';
import { SueldosTab } from './tabs/SueldosTab';

const TABS = [
  { key: 'gas', label: '1. Demanda de gas', title: 'Ejercicio 1 — Demanda de gas (regresión lineal)', Component: GasTab },
  { key: 'sueldos', label: '2. Sueldos', title: 'Ejercicio 2 — Sueldos (regresión lineal con valor atípico)', Component: SueldosTab },
  { key: 'seguro', label: '3. Seguro', title: 'Ejercicio 3 — Seguro (regresión logística)', Component: SeguroTab },
  { key: 'libre', label: '4. Modo libre', title: 'Modo libre / didáctico', Component: LibreTab },
] as const;

type Theme = 'auto' | 'light' | 'dark';

function readStored<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [tab, setTab] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    return TABS.some((t) => t.key === hash) ? hash : readStored('tab', 'gas');
  });
  const [theme, setTheme] = useState<Theme>(() => readStored<Theme>('theme', 'auto'));

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* sin almacenamiento */
    }
  }, [theme]);

  useEffect(() => {
    history.replaceState(null, '', `#${tab}`);
    try {
      localStorage.setItem('tab', tab);
    } catch {
      /* sin almacenamiento */
    }
  }, [tab]);

  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  const nextTheme: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
  const themeLabel: Record<Theme, string> = { auto: '◐ Automático', light: '☀ Claro', dark: '☾ Oscuro' };

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <h1>
            Regresión lineal y logística
            <span className="subtitle">Metodologías de Data Mining — Unidad 3</span>
          </h1>
          <button onClick={() => setTheme(nextTheme[theme])} title="Cambiar tema">
            {themeLabel[theme]}
          </button>
          <button className="primary" onClick={() => window.print()} title="Imprimir o guardar como PDF">
            Exportar informe
          </button>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" className="tab" aria-selected={t.key === current.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      {TABS.map(({ key, title, Component }) => (
        <main key={key} hidden={key !== current.key} role="tabpanel">
          <div className="only-print">
            <h2>{title}</h2>
            <p className="muted">Informe generado el {new Date().toLocaleString('es-AR')}</p>
          </div>
          <Component />
        </main>
      ))}
    </>
  );
}
