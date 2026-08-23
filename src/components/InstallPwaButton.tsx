'use client'

import { useState, useEffect } from 'react'
import { Download, Share, PlusSquare, X } from 'lucide-react'

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsStandalone(true)
      return
    }

    // Android prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check iOS
    const ua = window.navigator.userAgent
    const webkit = !!ua.match(/WebKit/i)
    const isIOSDevice = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i)
    if (isIOSDevice && webkit && !ua.match(/CriOS/i)) {
      setIsIOS(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  if (isStandalone) return null
  if (!deferredPrompt && !isIOS) return null

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSPrompt(true)
    } else if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    }
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-rosa-50 text-rosa-600 rounded-full text-xs font-semibold hover:bg-rosa-100 transition-colors border border-rosa-200"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">App</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full relative animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-rosa-100 text-rosa-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Share className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-gray-900 mb-1">Instalar no iPhone</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Para instalar o <strong>Leilão GC</strong>, clique no ícone de compartilhar na barra do Safari.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white shadow-sm rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <p className="text-xs text-gray-600 font-medium">1. Toque em Compartilhar na barra inferior</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white shadow-sm rounded-lg flex items-center justify-center text-gray-700 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <p className="text-xs text-gray-600 font-medium">2. Role para baixo e escolha "Adicionar à Tela de Início"</p>
              </div>
            </div>
            
            <div className="mt-5 relative h-8 flex justify-center animate-bounce">
              <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[16px] border-l-transparent border-r-transparent border-t-rosa-500"></div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
