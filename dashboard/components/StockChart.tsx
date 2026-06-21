'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Timeframe } from './TimeframeToggle';

type DataPoint = { t: string; price: number };

// Mulberry32 — fast, high-quality seeded RNG
function mkRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POINT_COUNTS: Record<Timeframe, number> = {
  '1D': 78,
  '1W': 35,
  '1M': 22,
  '1Y': 52,
  MAX: 120,
};

function getLabel(i: number, total: number, tf: Timeframe): string {
  switch (tf) {
    case '1D': {
      if (i % 13 !== 0) return '';
      const mins = Math.round((i / total) * 390);
      const h = 9 + Math.floor((mins + 30) / 60);
      const m = (mins + 30) % 60;
      return `${h}:${String(m).padStart(2, '0')}`;
    }
    case '1W': {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      return i % 7 === 0 ? (days[Math.floor(i / 7)] ?? '') : '';
    }
    case '1M':
      return i % 4 === 0 ? `W${Math.floor(i / 4) + 1}` : '';
    case '1Y': {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return i % 4 === 0 ? (months[(Math.floor(i / 4)) % 12] ?? '') : '';
    }
    case 'MAX':
      return i % 24 === 0 ? String(2024 - Math.floor((total - i) / 24)) : '';
  }
}

function generateData(ticker: string, tf: Timeframe, basePrice: number): DataPoint[] {
  const seed = ticker.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
  const rng = mkRng(seed ^ (tf.length * 997));
  const n = POINT_COUNTS[tf];

  // Slight directional drift seeded per ticker+timeframe
  const trend = (rng() - 0.46) * 0.004;
  let price = basePrice / Math.exp(trend * n);

  const raw: number[] = [];
  for (let i = 0; i < n; i++) {
    const noise = (rng() - 0.5) * 0.032;
    price *= 1 + trend + noise;
    raw.push(price);
  }

  // Normalize so last point always lands on basePrice
  const scale = basePrice / raw[raw.length - 1];
  return raw.map((p, i) => ({
    t: getLabel(i, n, tf),
    price: Math.round(p * scale * 100) / 100,
  }));
}

interface TooltipEntry {
  value: number;
}

function CyberTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg font-mono text-sm font-bold"
      style={{
        background: 'rgba(10,10,10,0.95)',
        border: '1px solid rgba(0,255,136,0.25)',
        color: '#00ff88',
        boxShadow: '0 0 16px rgba(0,255,136,0.12)',
        backdropFilter: 'blur(8px)',
      }}
    >
      ${payload[0].value.toFixed(2)}
    </div>
  );
}

export default function StockChart({
  ticker,
  timeframe,
  basePrice,
}: {
  ticker: string;
  timeframe: Timeframe;
  basePrice: number;
}) {
  const data = useMemo(
    () => generateData(ticker, timeframe, Math.max(basePrice, 1)),
    [ticker, timeframe, basePrice]
  );

  const prices = data.map((d) => d.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const pad = Math.max((hi - lo) * 0.12, 0.5);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="neonGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff88" stopOpacity={0.28} />
              <stop offset="85%" stopColor="#00ff88" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="t"
            interval={0}
            tick={{ fill: 'rgba(255,255,255,0.18)', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
            tickLine={false}
          />
          <YAxis
            domain={[lo - pad, hi + pad]}
            tick={{ fill: 'rgba(255,255,255,0.18)', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={54}
          />
          <Tooltip
            content={(props) => (
              <CyberTooltip
                active={props.active}
                payload={props.payload as TooltipEntry[] | undefined}
              />
            )}
            cursor={{ stroke: 'rgba(0,255,136,0.18)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#00ff88"
            strokeWidth={1.5}
            fill="url(#neonGradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: '#00ff88',
              stroke: '#050505',
              strokeWidth: 2,
              style: { filter: 'drop-shadow(0 0 6px #00ff88)' },
            }}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
