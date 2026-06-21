'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import TickerSearch from './TickerSearch';
import TimeframeToggle, { type Timeframe } from './TimeframeToggle';
import StockChart from './StockChart';
import FutureChart from './FutureChart';
import PredictionPanel, { type PredictionResult } from './PredictionPanel';

const G = '#00ff88';

const META_MAP: Record<string, { name: string; cap: string; vol: string; sector: string }> = {
  AAPL:  { name: 'Apple Inc.',             cap: '$3.04T', vol: '55.2M',  sector: 'Technology'     },
  NVDA:  { name: 'NVIDIA Corp.',           cap: '$2.89T', vol: '148.3M', sector: 'Semiconductors'  },
  MSFT:  { name: 'Microsoft Corp.',        cap: '$2.91T', vol: '19.8M',  sector: 'Technology'     },
  TSLA:  { name: 'Tesla Inc.',             cap: '$793B',  vol: '82.1M',  sector: 'Automotive'     },
  AMZN:  { name: 'Amazon.com Inc.',        cap: '$1.97T', vol: '35.4M',  sector: 'Consumer'       },
  GOOGL: { name: 'Alphabet Inc.',          cap: '$2.06T', vol: '22.7M',  sector: 'Technology'     },
  META:  { name: 'Meta Platforms',         cap: '$1.36T', vol: '16.9M',  sector: 'Technology'     },
  AMD:   { name: 'Advanced Micro Devices', cap: '$268B',  vol: '43.2M',  sector: 'Semiconductors' },
  QQQ:   { name: 'Invesco QQQ ETF',        cap: '$286B',  vol: '42.8M',  sector: 'ETF'            },
  SPY:   { name: 'SPDR S&P 500 ETF',       cap: '$537B',  vol: '81.4M',  sector: 'ETF'            },
  NFLX:  { name: 'Netflix Inc.',           cap: '$298B',  vol: '5.1M',   sector: 'Streaming'      },
  INTC:  { name: 'Intel Corp.',            cap: '$89B',   vol: '38.5M',  sector: 'Semiconductors' },
  TSM:   { name: 'TSMC',                   cap: '$820B',  vol: '10.2M',  sector: 'Semiconductors' },
  BABA:  { name: 'Alibaba Group',          cap: '$220B',  vol: '12.8M',  sector: 'Consumer'       },
  COIN:  { name: 'Coinbase Global',        cap: '$48B',   vol: '9.3M',   sector: 'Crypto'         },
};

export default function Dashboard() {
  const [ticker,       setTicker]       = useState('AAPL');
  const [timeframe,    setTimeframe]    = useState<Timeframe>('1M');
  const [prediction,   setPrediction]   = useState<PredictionResult | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [hasSearched,  setHasSearched]  = useState(false);

  const runInference = useCallback(async (sym: string) => {
    setTicker(sym);
    setLoading(true);
    setError(null);
    setPrediction(null);
    setHasSearched(true);

    try {
      const res  = await fetch(`/api/predict/${sym}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? 'Prediction failed.');
      } else {
        setPrediction(data as PredictionResult);
      }
    } catch {
      setError('Cannot reach prediction server. Is FastAPI running on :8000?');
    } finally {
      setLoading(false);
    }
  }, []);

  const meta      = META_MAP[ticker];
  const basePrice = prediction?.latest_close ?? 180;

  const metaCards = [
    { label: 'Company',     value: meta?.name ?? ticker,                                   sub: meta?.sector,    mono: false, highlight: false },
    { label: 'Market Cap',  value: meta?.cap  ?? '—',                                     sub: 'Est.',          mono: true,  highlight: false },
    { label: 'Avg Volume',  value: meta?.vol  ?? '—',                                     sub: 'shares / day',  mono: true,  highlight: false },
    { label: 'Close Price', value: prediction  ? `$${prediction.latest_close.toFixed(2)}` : '—', sub: ticker,   mono: true,  highlight: true  },
  ];

  return (
    <section id="sandbox" className="relative py-20 px-6" style={{ background: '#050505' }}>
      {/* Grid */}
      <div className="absolute inset-0 cyber-grid opacity-50 pointer-events-none" />
      {/* Top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ width: 900, height: 280, background: `radial-gradient(ellipse at top, ${G}05 0%, transparent 70%)` }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* ── Section header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
        >
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] mb-2" style={{ color: `${G}60` }}>
              [ Quant Sandbox ]
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Inference Terminal
            </h2>
          </div>
          <TickerSearch onSubmit={runInference} loading={loading} />
        </motion.div>

        {/* ── Metadata cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {metaCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="cyber-card rounded-xl p-4"
            >
              <div className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {card.label}
              </div>
              {loading && card.highlight ? (
                <div className="h-5 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
              ) : (
                <div
                  className={`text-sm font-semibold truncate ${card.mono ? 'font-mono' : ''}`}
                  style={{ color: card.highlight ? G : 'rgba(255,255,255,0.82)' }}
                >
                  {card.value}
                </div>
              )}
              {card.sub && (
                <div className="font-mono text-[10px] mt-1 truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {card.sub}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Charts + Prediction grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: stacked past + future charts */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Past history card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="cyber-card rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      Price History
                    </p>
                    <span className="font-mono font-bold text-white text-sm">{ticker}</span>
                  </div>
                  {prediction && (
                    <span
                      className="font-mono text-xs font-semibold"
                      style={{ color: prediction.estimated_next_day_return_pct >= 0 ? G : '#f87171' }}
                    >
                      {prediction.estimated_next_day_return_pct >= 0 ? '+' : ''}
                      {prediction.estimated_next_day_return_pct.toFixed(3)}% est.
                    </span>
                  )}
                </div>
                <TimeframeToggle active={timeframe} onChange={setTimeframe} />
              </div>
              <StockChart ticker={ticker} timeframe={timeframe} basePrice={basePrice} />
            </motion.div>

            {/* AI Forecast card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="cyber-card rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    AI Forecast
                  </p>
                  <span className="font-mono font-bold text-white text-sm">Next 5 Trading Days</span>
                </div>
                {prediction && (
                  <span
                    className="font-mono text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-semibold"
                    style={{
                      background: prediction.one_week_action_signal === 'BUY' ? `${G}12` : 'rgba(251,146,60,0.1)',
                      color: prediction.one_week_action_signal === 'BUY' ? G : '#fb923c',
                      border: `1px solid ${prediction.one_week_action_signal === 'BUY' ? `${G}25` : 'rgba(251,146,60,0.2)'}`,
                    }}
                  >
                    {prediction.one_week_action_signal} signal
                  </span>
                )}
              </div>
              <FutureChart prediction={prediction} />
              <p className="font-mono text-[9px] mt-3" style={{ color: 'rgba(255,255,255,0.12)' }}>
                Day 1 = model regressor output · Days 2–5 = directional continuation + ±σ√t uncertainty cone
              </p>
            </motion.div>
          </div>

          {/* Right: prediction panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="lg:col-span-1 flex flex-col"
          >
            <PredictionPanel
              prediction={prediction}
              loading={loading}
              error={error}
              hasSearched={hasSearched}
            />
          </motion.div>
        </div>

        {/* ── Footer with logo ── */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 pt-8 flex flex-col items-center gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Image
            src="/market-autopsy-logo.png"
            alt="MarketAutopsy"
            height={40}
            width={180}
            style={{ objectFit: 'contain', opacity: 0.6 }}
          />
          <p className="font-mono text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.15)' }}>
            NOT FINANCIAL ADVICE · AAPL-trained weights (2016–2026) · 8 engineered features · PyTorch inference
          </p>
        </motion.footer>
      </div>
    </section>
  );
}
