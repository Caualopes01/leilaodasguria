'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Heart, LayoutDashboard, Package, LogOut, Menu, X, ChevronRight, Store, ExternalLink, Gavel, Users
} from 'lucide-react'

export default function TenantAdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [tenantNome, setTenantNome] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const tenantSlug = params.tenant as string
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user && pathname !== `/loja/${tenantSlug}/admin/login`) {
      router.push(`/loja/${tenantSlug}/admin/login`)
      return
    }
    setUser(user)

    // Buscar nome do tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('nome')
      .eq('slug', tenantSlug)
      .single()
    
    if (tenant) setTenantNome(tenant.nome)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push(`/loja/${tenantSlug}/admin/login`)
  }

  if (pathname === `/loja/${tenantSlug}/admin/login`) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-rosa-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const basePath = `/loja/${tenantSlug}/admin`

  const navItems = [
    { href: basePath, icon: LayoutDashboard, label: 'Dashboard' },
    { href: `${basePath}/produtos`, icon: Package, label: 'Produtos' },
    { href: `${basePath}/lances`, icon: Gavel, label: 'Lances' },
    { href: `${basePath}/clientes`, icon: Users, label: 'Clientes' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-50
        flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:flex
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-rosa-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rosa-100 flex items-center justify-center">
              <Heart className="w-5 h-5 text-rosa-600" fill="currentColor" />
            </div>
            <div>
              <h1 className="font-display font-bold text-rosa-700 leading-tight">{tenantNome || 'Minha'}</h1>
              <p className="font-display font-bold text-rosa-700 leading-tight">Loja</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-4 space-y-1">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? 'bg-rosa-600 text-white shadow-sm shadow-rosa-200'
                    : 'text-gray-600 hover:bg-rosa-50 hover:text-rosa-700'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            )
          })}
          
          {/* Link para Loja Pública */}
          <div className="pt-4 mt-2 border-t border-gray-100">
            <Link
              href={`/loja/${tenantSlug}/leiloes`}
              target="_blank"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rosa-600 hover:bg-rosa-50 transition-all border border-rosa-100 bg-rosa-50/50"
            >
              <Store className="w-5 h-5" />
              Ver Loja Pública
              <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
            </Link>
          </div>
        </nav>

        {/* User info */}
        <div className="mt-auto p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-rosa-100 flex items-center justify-center text-rosa-600 text-xs font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{user?.email}</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:text-rosa-600 hover:bg-rosa-50 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-rosa-50 text-gray-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rosa-600" fill="currentColor" />
            <span className="font-display font-bold text-rosa-700">{tenantNome || 'Admin'}</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
