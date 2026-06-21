'use client';

import { motion } from 'framer-motion';

export type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'MAX';

const FRAMES: Timeframe[] = ['1D', '1W', '1M', '1Y', 'MAX'];

export default function TimeframeToggle({
  active,
  onChange,
}: {
  active: Timeframe;
  onChange: (t: Timeframe) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5 p-1 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {FRAMES.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className="relative px-4 py-1.5 rounded-lg font-mono text-xs font-semibold transition-colors select-none"
        >
          {active === f && (
            <motion.div
              layoutId="tf-pill"
              className="absolute inset-0 rounded-lg"
              style={{
                background: 'rgba(0,255,136,0.12)',
                border: '1px solid rgba(0,255,136,0.28)',
                boxShadow: '0 0 12px rgba(0,255,136,0.1)',
              }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            />
          )}
          <span
            className="relative z-10 transition-colors"
            style={{ color: active === f ? '#00ff88' : 'rgba(255,255,255,0.28)' }}
          >
            {f}
          </span>
        </button>
      ))}
    </div>
  );
}
