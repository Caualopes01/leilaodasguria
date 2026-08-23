import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Leilão GC',
    short_name: 'Leilão GC',
    description: 'Leilão online - Dê seu lance e garanta o seu!',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/favicon.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: '/favicon.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  }
}
