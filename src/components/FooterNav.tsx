'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ShoppingBag, Bell } from 'lucide-react'

export default function FooterNav() {
  const pathname = usePathname()
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    function syncNotif() {
      const count = parseInt(localStorage.getItem('leilao_notif_count') || '0', 10)
      setNotifCount(count)
    }
    syncNotif()
    // Sincroniza quando volta para a aba
    window.addEventListener('focus', syncNotif)
    // Escuta evento customizado disparado pela página do leilão
    window.addEventListener('leilao_notif_update', syncNotif)
    return () => {
      window.removeEventListener('focus', syncNotif)
      window.removeEventListener('leilao_notif_update', syncNotif)
    }
  }, [])

  const tabs = [
    {
      href: '/leiloes',
      label: 'Explorar',
      icon: ShoppingBag,
      active: pathname === '/leiloes' || pathname.startsWith('/leilao'),
    },
    {
      href: '/meus-lances',
      label: 'Meus Lances',
      icon: Bell,
      active: pathname === '/meus-lances',
      badge: notifCount > 0 ? notifCount : null,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-rosa-100 flex items-stretch max-w-lg mx-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-colors ${
              tab.active ? 'text-rosa-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {tab.badge && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rosa-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium">{tab.label}</span>
            {tab.active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-rosa-600 rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
