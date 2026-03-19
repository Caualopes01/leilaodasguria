'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ShoppingBag, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

export default function FooterNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    function syncNotif() {
      const count = parseInt(localStorage.getItem('leilao_notif_count') || '0', 10)
      setNotifCount(count)
    }
    syncNotif()

    window.addEventListener('focus', syncNotif)
    window.addEventListener('leilao_notif_update', syncNotif)

    // Escutador Global (para as badges ativarem onde quer que o user esteja)
    const supabase = createClient()
    const channel = supabase
      .channel('public-notificacoes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lances',
      }, (payload) => {
        const novoLance = payload.new as any
        const myWhats = localStorage.getItem('leilao_user_whats')
        
        // Se há whatsapp logado e NÃO fui eu que dei este lance alertado
        if (myWhats && novoLance.whatsapp !== myWhats) {
          // Checa se o lance está num produto que eu acompanho
          const participoStr = localStorage.getItem('leilao_produtos_ids')
          const participando = participoStr ? JSON.parse(participoStr) : []
          
          if (participando.includes(novoLance.produto_id)) {
            // Fui ultrapassado / Lote movimentou!
            const currentCount = parseInt(localStorage.getItem('leilao_notif_count') || '0', 10)
            localStorage.setItem('leilao_notif_count', (currentCount + 1).toString())
            syncNotif() // atualiza aba imediatamente
            
            toast('⚠️ Lote Movimentado!', {
              description: `Um lance de R$ ${novoLance.valor.toLocaleString('pt-br', {minimumFractionDigits: 2})} foi registrado em um leilão que você participa.`
            })
          }
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'produtos',
      }, (payload) => {
        const novoProduto = payload.new as any
        // Confirma se o produto não entrou pausado
        if (novoProduto.ativo && novoProduto.status !== 'encerrado') {
          // Conta na bolinha (Notification)
          const currentCount = parseInt(localStorage.getItem('leilao_notif_count') || '0', 10)
          localStorage.setItem('leilao_notif_count', (currentCount + 1).toString())
          syncNotif()

          // Pop-up visual customizado de 10seg
          toast.custom((t) => (
            <div className="bg-white rounded-2xl shadow-2xl border border-rosa-100 p-4 w-[340px] max-w-[90vw] flex flex-col gap-3 mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                  {novoProduto.imagens && novoProduto.imagens[0] ? (
                    <img src={novoProduto.imagens[0]} alt="" className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1 text-rosa-600 font-black text-[10px] uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-rosa-600 animate-pulse"></span>
                    Novo Leilão
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight">{novoProduto.titulo}</h4>
                </div>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t)
                  router.push(`/leilao/${novoProduto.slug}`)
                }}
                className="w-full py-2.5 bg-rosa-600 hover:bg-rosa-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> Ver Leilão
              </button>
            </div>
          ), { duration: 10000 })
        }
      })
      .subscribe()

    return () => {
      window.removeEventListener('focus', syncNotif)
      window.removeEventListener('leilao_notif_update', syncNotif)
      supabase.removeChannel(channel)
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
            <div className={`relative ${tab.label === 'Meus Lances' && tab.badge ? 'animate-shake-bell' : ''}`}>
              <Icon className="w-5 h-5" />
              {tab.badge && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rosa-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm shadow-rosa-300">
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
