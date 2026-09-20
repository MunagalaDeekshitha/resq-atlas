import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ResQ Atlas: live hazard map with plain-language safety briefs',
  description:
    'Earthquakes, floods, wildfires, volcanoes and storms on one live map, with hotspot detection, a priority ranking and an AI-written action checklist for each event.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
