'use client';

import { motion, AnimatePresence } from 'framer-motion';

const G = '#00ff88';

export type PredictionResult = {
  ticker: string;
  latest_close: number;
  estimated_next_day_return_pct: number;
  one_week_action_signal: 'BUY' | 'HOLD/SELL';
  execution_date: string;
};

function Skeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[120, 160].map((h, i) => (
        <div
          key={i}
          className="rounded-xl animate-pulse"
          style={{
            height: h,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex-1 rounded-xl flex flex-col items-center justify-center text-center p-8 min-h-[260px]"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="text-5xl mb-4 opacity-20" style={{ color: G }}>◈</div>
      <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Search a ticker to
        <br />
        run model inference
      </p>
    </div>
  );
}

export default function PredictionPanel({
  prediction,
  loading,
  error,
  hasSearched,
}: {
  prediction: PredictionResult | null;
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
}) {
  if (!hasSearched) return <EmptyState />;
  if (loading) return <Skeleton />;

  if (error || !prediction) {
    return (
      <div
        className="rounded-xl p-5 font-mono text-sm"
        style={{
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#f87171',
        }}
      >
        ⚠ {error ?? 'No data available.'}
      </div>
    );
  }

  const pos = prediction.estimated_next_day_return_pct >= 0;
  const isBuy = prediction.one_week_action_signal === 'BUY';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={prediction.ticker}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 h-full"
      >
        {/* ── Regressor Card ── */}
        <div
          className="rounded-xl p-6"
          style={{
            background: pos ? 'rgba(0,255,136,0.04)' : 'rgba(239,68,68,0.04)',
            border: pos
              ? `1px solid ${G}30`
              : '1px solid rgba(239,68,68,0.25)',
          }}
        >
          <div
            className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            Regressor · Next-Day Δ
          </div>

          <div
            className={`font-black font-mono tracking-tighter leading-none mb-2 ${pos ? 'glitch-anim' : ''}`}
            style={{
              fontSize: '2.6rem',
              color: pos ? G : '#f87171',
              textShadow: pos
                ? `0 0 16px ${G}90, 0 0 36px ${G}40`
                : '0 0 16px rgba(239,68,68,0.6)',
            }}
          >
            {pos ? '+' : ''}
            {prediction.estimated_next_day_return_pct.toFixed(3)}%
          </div>

          <span
            className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider"
            style={{
              background: pos ? `${G}12` : 'rgba(239,68,68,0.1)',
              color: pos ? G : '#f87171',
            }}
          >
            {pos ? '▲ POSITIVE ALPHA' : '▼ NEGATIVE ALPHA'}
          </span>
        </div>

        {/* ── Classifier Card ── */}
        <div
          className="rounded-xl p-6 flex-1 flex flex-col"
          style={{
            background: isBuy ? `${G}05` : 'rgba(251,146,60,0.04)',
            border: isBuy
              ? `1px solid ${G}28`
              : '1px solid rgba(251,146,60,0.22)',
          }}
        >
          <div
            className="font-mono text-[10px] uppercase tracking-widest mb-3"
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            Classifier · 1-Week Signal
          </div>

          {/* BUY / HOLD badge */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.08 }}
            className="mb-3"
          >
            <span
              className={`font-black tracking-tighter leading-none block ${isBuy ? 'ring-pulse' : ''}`}
              style={{
                fontSize: isBuy ? '3.5rem' : '2.4rem',
                color: isBuy ? G : '#fb923c',
                textShadow: isBuy
                  ? `0 0 24px ${G}, 0 0 50px ${G}60`
                  : '0 0 20px rgba(251,146,60,0.7)',
                display: 'inline-block',
                borderRadius: '0.25rem',
              }}
            >
              {prediction.one_week_action_signal}
            </span>
          </motion.div>

          <span
            className="inline-flex w-fit items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider mb-auto"
            style={{
              background: isBuy ? `${G}15` : 'rgba(251,146,60,0.12)',
              color: isBuy ? G : '#fb923c',
            }}
          >
            {isBuy ? 'LOGIT ≥ 0 → BUY' : 'LOGIT < 0 → HOLD/SELL'}
          </span>

          <div
            className="mt-4 pt-4 font-mono text-[10px]"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.18)',
            }}
          >
            <div>Ticker: {prediction.ticker}</div>
            <div>Executed: {prediction.execution_date}</div>
            <div>Weights: AAPL-trained</div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
