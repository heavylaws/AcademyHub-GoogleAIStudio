import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/authContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020817' },
  ],
};

export const metadata: Metadata = {
  title: 'AcademyHub - Athletic Biomechanics & Performance Platform',
  description: 'Unified athletic performance, biomechanical tracking, coach scheduling, and athlete management platform.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AcademyHub',
  },
  formatDetection: {
    telephone: false,
  },
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-cyan-500 focus:text-slate-950 focus:font-bold focus:rounded-xl focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


