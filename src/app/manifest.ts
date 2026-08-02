import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Team4Job',
    short_name: 'Team4Job',
    description: 'Connecting Clients with skilled professionals.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    categories: ['business', 'productivity', 'finance'],
    background_color: '#F0F2F5',
    theme_color: '#B0B6C4',
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'Go to your dashboard',
        url: '/dashboard',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      },
      {
        name: 'Post a Job',
        short_name: 'Post Job',
        description: 'Post a new job',
        url: '/wizard',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      }
    ],
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
