'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { PredictionResult } from './PredictionPanel';

const G = '#00ff88';

type ForecastPoint = {
  day: string;
  central: number;
  upper: number;
  lower: number;
};

function buildForecast(
  basePrice: number,
  nextDayReturnPct: number,
  signal: 'BUY' | 'HOLD/SELL',
): ForecastPoint[] {
  const isBuy = signal === 'BUY';
  // After day 1, apply mild directional continuation from the classifier signal
  const continuationDrift = isBuy ? 0.0022 : -0.0013;
  // Uncertainty widens like sqrt(t) — classic Brownian motion cone
  const dailySigmaBase = basePrice * 0.009;

  const points: ForecastPoint[] = [
    { day: 'Today', central: basePrice, upper: basePrice, lower: basePrice },
  ];

  let price = basePrice;
  for (let i = 1; i <= 5; i++) {
    const ret = i === 1 ? nextDayReturnPct / 100 : continuationDrift;
    price = price * (1 + ret);
    const cone = dailySigmaBase * Math.sqrt(i);
    points.push({
      day: `D+${i}`,
      central: Math.round(price * 100) / 100,
      upper:   Math.round((price + cone) * 100) / 100,
      lower:   Math.round((price - cone) * 100) / 100,
    });
  }
  return points;
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function ForecastTooltip({
  active,
  payload,
  label,
  isBuy,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  isBuy: boolean;
}) {
  if (!active || !payload?.length) return null;
  const central = payload.find((p) => p.name === 'central')?.value;
  const upper   = payload.find((p) => p.name === 'upper')?.value;
  const lower   = payload.find((p) => p.name === 'lower')?.value;

  return (
    <div
      className="px-3 py-2.5 rounded-lg text-xs"
      style={{
        background: 'rgba(8,8,8,0.96)',
        border: `1px solid ${isBuy ? `${G}30` : 'rgba(251,146,60,0.3)'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="font-bold font-mono mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {label}
      </div>
      {central !== undefined && (
        <div className="font-mono font-bold" style={{ color: isBuy ? G : '#fb923c' }}>
          ${central.toFixed(2)} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>central</span>
        </div>
      )}
      {upper !== undefined && lower !== undefined && (
        <div className="font-mono mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          ↑ ${upper.toFixed(2)} &nbsp;·&nbsp; ↓ ${lower.toFixed(2)}
        </div>
      )}
    </div>
  );
}

export default function FutureChart({
  prediction,
}: {
  prediction: PredictionResult | null;
}) {
  const isBuy = prediction?.one_week_action_signal === 'BUY';
  const lineColor = isBuy ? G : '#fb923c';
  const bandColor = isBuy ? `${G}12` : 'rgba(251,146,60,0.08)';
  const gradId    = isBuy ? 'futureGradGreen' : 'futureGradOrange';

  const data = useMemo(() => {
    if (!prediction) return null;
    return buildForecast(
      prediction.latest_close,
      prediction.estimated_next_day_return_pct,
      prediction.one_week_action_signal,
    );
  }, [prediction]);

  if (!data || !prediction) {
    return (
      <div
        className="h-44 flex items-center justify-center rounded-lg"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}
      >
        <p className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Run inference to generate forecast
        </p>
      </div>
    );
  }

  const allValues = data.flatMap((d) => [d.upper, d.lower, d.central]);
  const lo = Math.min(...allValues);
  const hi = Math.max(...allValues);
  const pad = Math.max((hi - lo) * 0.3, 0.5);

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={lineColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="day"
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
            tickLine={false}
          />
          <YAxis
            domain={[lo - pad, hi + pad]}
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={54}
          />
          <Tooltip
            content={(props) => (
              <ForecastTooltip
                active={props.active}
                payload={props.payload as TooltipPayload[] | undefined}
                label={props.label as string | undefined}
                isBuy={isBuy}
              />
            )}
            cursor={{ stroke: `${lineColor}30`, strokeWidth: 1, strokeDasharray: '4 3' }}
          />

          {/* Current-price reference line */}
          <ReferenceLine
            y={prediction.latest_close}
            stroke="rgba(255,255,255,0.1)"
            strokeDasharray="4 4"
            label={{ value: 'now', position: 'insideTopRight', fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontFamily: 'monospace' }}
          />

          {/* Confidence upper bound */}
          <Line
            type="monotone"
            dataKey="upper"
            name="upper"
            stroke={`${lineColor}35`}
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            activeDot={false}
          />
          {/* Confidence lower bound */}
          <Line
            type="monotone"
            dataKey="lower"
            name="lower"
            stroke={`${lineColor}35`}
            strokeWidth={1}
            strokeDasharray="3 3"
            dot={false}
            activeDot={false}
          />
          {/* Central prediction with gradient fill */}
          <Area
            type="monotone"
            dataKey="central"
            name="central"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 4, fill: lineColor, stroke: '#050505', strokeWidth: 2 }}
            isAnimationActive
            animationDuration={700}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
