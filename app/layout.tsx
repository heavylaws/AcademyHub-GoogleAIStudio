import type {Metadata} from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'AcademyHub - Athletic Biomechanics & Performance Platform',
  description: 'Unified athletic performance, biomechanical tracking, coach scheduling, and athlete management platform.',
  openGraph: {
    title: 'AcademyHub Sports Performance',
    description: 'Unified athletic performance, biomechanical tracking, coach scheduling, and athlete management platform.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AcademyHub Sports Performance',
    description: 'Unified athletic performance, biomechanical tracking, coach scheduling, and athlete management platform.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased transition-colors duration-200" suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

