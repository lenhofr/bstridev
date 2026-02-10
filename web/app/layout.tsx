import type { Metadata } from 'next';
import { Inter, Permanent_Marker } from 'next/font/google';

import './globals.css';
import { TopNav } from './_components/TopNav';

const bodyFont = Inter({ subsets: ['latin'], variable: '--font-body' });
const headingFont = Permanent_Marker({ subsets: ['latin'], weight: '400', variable: '--font-heading' });

export const metadata: Metadata = {
  title: 'Bar Sports Triathlon',
  description: 'Bowling, pool, darts (and beer).'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <TopNav />
        <div className="shell">
          <div className="frame">
            <main className="panel">{children}</main>
          </div>
          <div className="footer">© Bar Sports Triathlon</div>
        </div>
      </body>
    </html>
  );
}
