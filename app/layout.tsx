import type { Metadata } from 'next';
import './globals.css';
import './game.css';
export const metadata: Metadata = {
  title: 'FurEver · Companions & Adventures',
  description:
    'Raise your companion, explore a magical world, and grow together.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
