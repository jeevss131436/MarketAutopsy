'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';

const G = '#00ff88'; // neon green token

const FEATURES = [
  {
    icon: '⬡',
    title: 'Dual-Track Neural Engine',
    desc: 'Concurrent regressor for next-day alpha estimation paired with a binary classifier for 1-week directional momentum signals.',
  },
  {
    icon: '◈',
    title: 'Real-Time Inference Layer',
    desc: 'FastAPI-powered edge scoring runs live feature extraction on any NYSE/NASDAQ ticker — weights locked on AAPL, generalised cross-asset.',
  },
  {
    icon: '◇',
    title: '8-Dimensional Feature Matrix',
    desc: 'RSI-14, multi-period returns, MA deviation ratios, realized volatility, and volume force — engineered for low-noise structural signal.',
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13 } },
};

const item = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const opacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#050505' }}
    >
      {/* Grid overlay */}
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      {/* Radial ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,255,136,0.07) 0%, transparent 65%)',
        }}
      />

      {/* Thin scan-line shimmer */}
      <div
        className="absolute left-0 right-0 h-px pointer-events-none opacity-20"
        style={{
          top: 0,
          background: `linear-gradient(90deg, transparent, ${G}, transparent)`,
          animation: 'scanLine 6s linear infinite',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center">
          <Image
            src="/market-autopsy-logo.png"
            alt="MarketAutopsy"
            height={36}
            width={160}
            style={{ objectFit: 'contain', objectPosition: 'left' }}
            priority
          />
        </div>

        <div className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.2)' }}>
          <span>PyTorch</span>
          <span>FastAPI</span>
          <span style={{ color: `${G}80` }}>v2.0</span>
        </div>
      </nav>

      {/* Hero body with parallax */}
      <motion.div
        style={{ y, opacity }}
        className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pb-40 pt-12"
      >
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          {/* Headline */}
          <motion.h1
            variants={item}
            className="font-black tracking-tight leading-[1.04] mb-6 max-w-5xl"
            style={{ fontSize: 'clamp(2.6rem, 6vw, 5.5rem)' }}
          >
            <span className="text-white">Architecting Alpha</span>
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: `linear-gradient(135deg, ${G} 0%, #00cc6a 55%, #00884a 100%)`,
              }}
            >
              through Deep Learning.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={item}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.38)' }}
          >
            A PyTorch dual-model pipeline extracting structured signals from 8 engineered
            market features. Point it at any ticker and receive directional conviction —
            instantly.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="flex items-center gap-4 flex-wrap justify-center">
            <a
              href="#sandbox"
              className="relative px-8 py-3.5 rounded-lg font-bold text-sm text-black transition-transform hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${G}, #00cc6a)`,
                boxShadow: `0 0 28px ${G}50`,
              }}
            >
              Enter Sandbox →
            </a>
            <button
              className="px-8 py-3.5 rounded-lg text-sm font-medium transition-all hover:text-white/80"
              style={{
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              View Architecture
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: 'rgba(255,255,255,0.15)' }}
          >
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-10"
            style={{ background: `linear-gradient(to bottom, ${G}50, transparent)` }}
          />
        </motion.div>
      </motion.div>

      {/* Feature cards — viewport-triggered stagger */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto w-full px-6 pb-24">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 44 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ borderColor: `${G}30`, transition: { duration: 0.2 } }}
            className="cyber-card rounded-xl p-6 cursor-default"
          >
            <span className="text-2xl mb-4 block" style={{ color: G }}>
              {f.icon}
            </span>
            <h3 className="font-semibold text-sm mb-2 text-white/90">{f.title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {f.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
