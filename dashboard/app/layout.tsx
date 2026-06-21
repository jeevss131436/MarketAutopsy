import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'MarketAutopsy — Architecting Alpha',
  description: 'PyTorch dual-model inference engine for quantitative trading signals',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-cyber-black">
      <body className={`${nunito.className} bg-[#050505] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
