import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MacroTrack',
    short_name: 'MacroTrack',
    description: 'Tu diario de comidas y macronutrientes',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f8f5ed',
    theme_color: '#ff3d00',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
}
