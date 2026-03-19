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
  title: 'Leilão das Gurias',
  description: 'Leilão online - Dê seu lance e garanta o seu!',
  openGraph: {
    title: 'Leilão das Gurias',
    description: 'Leilão online - Dê seu lance e garanta o seu!',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${playfair.variable} ${dmSans.variable} font-body antialiased`}>
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
