import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmt, fmtAuto } from '../stats';

export type PointState = 'normal' | 'excluded' | 'outlier' | 'highlight';

export interface ChartPoint {
  x: number;
  y: number;
  /** Índice de fila en el dataset (para clicks). */
  idx?: number;
  state?: PointState;
  /** Renglones del tooltip. */
  tip?: string[];
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  dashed?: boolean;
}

const tick = (v: number) => fmtAuto(v, 2);
const axisProps = {
  tick: { fontSize: 12 },
  tickFormatter: tick,
  stroke: 'var(--axis)',
};

function TipBox({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) {
  if (!active || !payload?.length) return null;
  const pt = payload.map((p) => p.payload as ChartPoint | undefined).find((p) => p?.tip);
  if (!pt?.tip) return null;
  return (
    <div className="tooltip">
      {pt.tip.map((t, i) => (
        <div key={i} style={i === 0 ? { fontWeight: 600 } : undefined}>
          {t}
        </div>
      ))}
    </div>
  );
}

function makeDot(clickable: boolean) {
  return function Dot(props: unknown) {
    const { cx, cy, payload } = props as { cx: number; cy: number; payload: ChartPoint };
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return <g />;
    const state = payload.state ?? 'normal';
    const fill =
      state === 'outlier' ? 'var(--critical)' : state === 'excluded' ? 'none' : state === 'highlight' ? 'var(--series-2)' : 'var(--series-1)';
    const stroke = state === 'excluded' ? 'var(--muted)' : 'var(--surface)';
    return (
      <g style={{ cursor: clickable ? 'pointer' : 'default' }}>
        {clickable && <circle cx={cx} cy={cy} r={11} fill="transparent" />}
        <circle cx={cx} cy={cy} r={state === 'highlight' ? 7 : 5} fill={fill} stroke={stroke} strokeWidth={state === 'excluded' ? 1.5 : 2} />
      </g>
    );
  };
}

export function Legend({ items }: { items: { label: string; color: string; kind?: 'dot' | 'line' | 'hollow' }[] }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.label}>
          <span
            className={`sw ${it.kind === 'line' ? 'line' : ''}`}
            style={
              it.kind === 'hollow'
                ? { border: `1.5px solid ${it.color}`, background: 'none' }
                : { background: it.color }
            }
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

export function ScatterFitChart({
  points,
  segments = [],
  xLabel,
  yLabel,
  onPointClick,
  zeroLine,
  height = 280,
  legend,
  caption,
}: {
  points: ChartPoint[];
  segments?: Segment[];
  xLabel: string;
  yLabel: string;
  onPointClick?(idx: number): void;
  zeroLine?: boolean;
  height?: number;
  legend?: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <figure style={{ margin: 0 }}>
      {legend}
      <div className="chart" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 28, left: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              type="number"
              dataKey="x"
              name={xLabel}
              domain={['auto', 'auto']}
              {...axisProps}
              label={{ value: xLabel, position: 'insideBottom', offset: -16, fontSize: 12, fill: 'var(--text-2)' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yLabel}
              domain={['auto', 'auto']}
              width={62}
              {...axisProps}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--text-2)', style: { textAnchor: 'middle' } }}
            />
            <Tooltip content={TipBox} cursor={false} isAnimationActive={false} />
            {zeroLine && <ReferenceLine y={0} stroke="var(--axis)" strokeWidth={1.5} />}
            {segments.map((s, i) => (
              <ReferenceLine
                key={i}
                segment={[
                  { x: s.x1, y: s.y1 },
                  { x: s.x2, y: s.y2 },
                ]}
                stroke={s.color ?? 'var(--series-2)'}
                strokeWidth={2}
                strokeDasharray={s.dashed ? '5 4' : undefined}
                ifOverflow="extendDomain"
              />
            ))}
            <Scatter
              data={points}
              isAnimationActive={false}
              shape={makeDot(!!onPointClick)}
              onClick={
                onPointClick
                  ? (d: unknown) => {
                      const p = (d as { payload?: ChartPoint })?.payload ?? (d as ChartPoint);
                      if (p?.idx !== undefined) onPointClick(p.idx);
                    }
                  : undefined
              }
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {caption && <figcaption className="chart-caption">{caption}</figcaption>}
    </figure>
  );
}

export function HistogramChart({
  bins,
  xLabel,
  height = 280,
}: {
  bins: { from: number; to: number; count: number }[];
  xLabel: string;
  height?: number;
}) {
  const data = bins.map((b) => ({ ...b, label: `${fmt(b.from, 0)} a ${fmt(b.to, 0)}` }));
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 28, left: 8 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            stroke="var(--axis)"
            interval={0}
            angle={-20}
            textAnchor="end"
            height={40}
            label={{ value: xLabel, position: 'insideBottom', offset: -22, fontSize: 12, fill: 'var(--text-2)' }}
          />
          <YAxis allowDecimals={false} width={40} tick={{ fontSize: 12 }} stroke="var(--axis)" />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            isAnimationActive={false}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="tooltip">
                  <div style={{ fontWeight: 600 }}>{(payload[0].payload as { label: string }).label}</div>
                  <div>Frecuencia: {(payload[0].payload as { count: number }).count}</div>
                </div>
              ) : null
            }
          />
          <Bar dataKey="count" fill="var(--series-1)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Curva continua (sigmoide, ROC) + puntos. */
export function CurveChart({
  curve,
  points = [],
  marker,
  xLabel,
  yLabel,
  xDomain,
  yDomain = [0, 1],
  yTicks,
  hLine,
  diagonal,
  height = 300,
  legend,
}: {
  curve: { x: number; y: number }[];
  points?: ChartPoint[];
  marker?: { x: number; y: number; label: string };
  xLabel: string;
  yLabel: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  yTicks?: number[];
  hLine?: { y: number; label: string };
  diagonal?: boolean;
  height?: number;
  legend?: ReactNode;
}) {
  const curvePts = curve.map((p) => ({ ...p }));
  return (
    <figure style={{ margin: 0 }}>
      {legend}
      <div className="chart" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 28, left: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              type="number"
              dataKey="x"
              domain={xDomain ?? ['auto', 'auto']}
              allowDataOverflow={!!xDomain}
              {...axisProps}
              label={{ value: xLabel, position: 'insideBottom', offset: -16, fontSize: 12, fill: 'var(--text-2)' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={yDomain}
              ticks={yTicks}
              width={50}
              {...axisProps}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 12, fill: 'var(--text-2)', style: { textAnchor: 'middle' } }}
            />
            <Tooltip content={TipBox} cursor={false} isAnimationActive={false} />
            {diagonal && (
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  { x: 1, y: 1 },
                ]}
                stroke="var(--axis)"
                strokeDasharray="5 4"
              />
            )}
            {hLine && (
              <ReferenceLine
                y={hLine.y}
                stroke="var(--muted)"
                strokeDasharray="5 4"
                label={{ value: hLine.label, position: 'insideTopLeft', fontSize: 11, fill: 'var(--text-2)' }}
              />
            )}
            <Scatter
              data={curvePts}
              line={{ stroke: 'var(--series-2)', strokeWidth: 2 }}
              shape={() => <g />}
              isAnimationActive={false}
              legendType="none"
            />
            <Scatter data={points} shape={makeDot(false)} isAnimationActive={false} />
            {marker && (
              <ReferenceDot
                x={marker.x}
                y={marker.y}
                r={8}
                fill="var(--series-3)"
                stroke="var(--surface)"
                strokeWidth={2}
                ifOverflow="extendDomain"
                label={{ value: marker.label, position: 'top', fontSize: 12, fill: 'var(--text)' }}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
