'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const G = '#00ff88';

type TickerEntry = { symbol: string; name: string };

const TICKERS: TickerEntry[] = [
  { symbol: 'AAPL',  name: 'Apple' },
  { symbol: 'NVDA',  name: 'NVIDIA' },
  { symbol: 'MSFT',  name: 'Microsoft' },
  { symbol: 'TSLA',  name: 'Tesla' },
  { symbol: 'AMZN',  name: 'Amazon' },
  { symbol: 'GOOGL', name: 'Alphabet / Google' },
  { symbol: 'META',  name: 'Meta / Facebook' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices' },
  { symbol: 'QQQ',   name: 'Invesco QQQ ETF' },
  { symbol: 'SPY',   name: 'S&P 500 ETF' },
  { symbol: 'NFLX',  name: 'Netflix' },
  { symbol: 'INTC',  name: 'Intel' },
  { symbol: 'TSM',   name: 'TSMC' },
  { symbol: 'BABA',  name: 'Alibaba' },
  { symbol: 'COIN',  name: 'Coinbase' },
];

function matchesTicker(entry: TickerEntry, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return (
    entry.symbol.startsWith(q.toUpperCase()) ||
    entry.name.toLowerCase().includes(q.toLowerCase())
  );
}

export default function TickerSearch({
  onSubmit,
  loading,
}: {
  onSubmit: (ticker: string) => void;
  loading: boolean;
}) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen]             = useState(false);
  const [focused, setFocused]       = useState(false);
  const [activeIdx, setActiveIdx]   = useState(-1);
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = TICKERS.filter((t) => matchesTicker(t, inputValue));

  const handleSubmit = useCallback(
    (symbol: string) => {
      const t = symbol.trim().toUpperCase();
      if (!t) return;
      setInputValue(t);
      setOpen(false);
      setActiveIdx(-1);
      onSubmit(t);
    },
    [onSubmit],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const selected = filtered[activeIdx]?.symbol ?? inputValue;
      handleSubmit(selected);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input row */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200"
        style={{
          background: focused ? 'rgba(0,255,136,0.04)' : 'rgba(255,255,255,0.03)',
          border: focused ? `1px solid ${G}45` : '1px solid rgba(255,255,255,0.07)',
          boxShadow: focused ? `0 0 20px ${G}12` : 'none',
        }}
      >
        <span className="font-mono text-sm select-none" style={{ color: `${G}70` }}>$</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder="Ticker or company…"
          maxLength={40}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          className="bg-transparent text-sm w-44 placeholder:text-white/15 focus:outline-none text-white"
        />
        <button
          onMouseDown={() => handleSubmit(filtered[activeIdx]?.symbol ?? inputValue)}
          disabled={loading || !inputValue.trim()}
          className="ml-1 px-3.5 py-1 rounded-lg font-mono text-xs font-bold text-black transition-all disabled:opacity-35 disabled:cursor-not-allowed"
          style={{
            background: loading
              ? 'rgba(0,255,136,0.4)'
              : `linear-gradient(135deg, ${G}, #00cc6a)`,
            boxShadow: loading ? 'none' : `0 0 10px ${G}30`,
          }}
        >
          {loading ? (
            <span className="inline-flex gap-0.5 items-center">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1 h-1 rounded-full inline-block"
                  style={{ backgroundColor: 'black' }}
                />
              ))}
            </span>
          ) : (
            'RUN'
          )}
        </button>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-72 rounded-xl overflow-hidden z-50"
            style={{
              background: 'rgba(8,8,8,0.97)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(16px)',
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            {filtered.map((t, i) => (
              <button
                key={t.symbol}
                onMouseDown={() => handleSubmit(t.symbol)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                style={{
                  background: i === activeIdx ? `${G}10` : 'transparent',
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs" style={{ color: `${G}60` }}>$</span>
                  <span
                    className="font-mono text-sm font-bold"
                    style={{ color: i === activeIdx ? G : 'rgba(255,255,255,0.75)' }}
                  >
                    {t.symbol}
                  </span>
                </span>
                <span className="text-xs truncate ml-3 max-w-[140px]"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {t.name}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
