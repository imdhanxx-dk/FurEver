import type { Metadata } from 'next';
import './globals.css';
import './game.css';
import './furever-theme.css';
import './furever-hub.css';
import './furever-menus.css';
import './furever-profile.css';
import './asset-furever.css';
import './beta.css';
import './beta-release.css';
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
