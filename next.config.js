/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080],
    imageSizes: [32, 128, 256],
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/',
          has: [
            {
              type: 'host',
              value: '(?<host>.*deulance.*)', // regex matches anything containing deulance
            },
          ],
          destination: '/vendas/index.html',
        }
      ]
    }
  },
  async redirects() {
    return [
      {
        source: '/admin/:path*',
        destination: '/loja/leilaodasgurias/admin/:path*',
        permanent: true,
      },
      {
        source: '/leiloes',
        destination: '/loja/leilaodasgurias/leiloes',
        permanent: true,
      },
      {
        source: '/leilao/:slug',
        destination: '/loja/leilaodasgurias/leilao/:slug',
        permanent: true,
      }
    ]
  }
}

module.exports = nextConfig
