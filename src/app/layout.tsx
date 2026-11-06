import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://guriaschiques.vercel.app'),
  title: 'Gurias Chiques | Catálogo & Loja',
  description: 'Catálogo de moda feminina e compras online - Gurias Chiques',
  applicationName: 'Gurias Chiques',
  appleWebApp: {
    title: 'Gurias Chiques',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.jpg',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Gurias Chiques | Catálogo & Loja',
    description: 'Catálogo de moda feminina e compras online - Gurias Chiques',
    type: 'website',
    images: [
      {
        url: '/icon.png',
        width: 1200,
        height: 1200,
        alt: 'Gurias Chiques',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Gurias Chiques | Catálogo & Loja',
    description: 'Catálogo de moda feminina e compras online - Gurias Chiques',
    images: ['/icon.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${playfair.variable} ${dmSans.variable} font-body antialiased overflow-x-hidden`}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#fff',
              border: '1px solid #ffc2d8',
              color: '#1a1a1a',
            },
          }}
        />
      </body>
    </html>
  )
}
