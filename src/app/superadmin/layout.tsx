'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Heart, LayoutDashboard, LogOut, Menu, Shield
} from 'lucide-react'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      router.push('/admin/login')
      return
    }
    setUser(user)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <span className="font-display font-bold text-gray-800">Super Admin</span>
            <span className="text-xs text-gray-400 ml-2">Dêu Lance</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-rosa-600 hover:bg-rosa-50 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="p-4 lg:p-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}
