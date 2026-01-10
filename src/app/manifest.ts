import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Team4Job',
    short_name: 'Team4Job',
    description: 'Connecting Job Givers with skilled professionals.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F0F2F5',
    theme_color: '#B0B6C4',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}