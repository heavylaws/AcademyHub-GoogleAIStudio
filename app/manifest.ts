import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AcademyHub Sports Performance Platform',
    short_name: 'AcademyHub',
    description: 'Unified athletic performance, biomechanical tracking, coach scheduling, and athlete management platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020817',
    theme_color: '#22d3ee',
    orientation: 'any',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
