import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MacroTrack — tu diario de comidas',
  description: 'Estima y registra los macronutrientes de tus comidas desde una foto.',
  applicationName: 'MacroTrack',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
