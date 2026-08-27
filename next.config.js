/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
  }
}

module.exports = nextConfig
