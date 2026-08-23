'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
      {showIOSPrompt && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4"
          onClick={() => setShowIOSPrompt(false)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-[2rem] sm:rounded-3xl p-6 pt-4 w-full max-w-sm relative animate-in slide-in-from-bottom-full duration-300 shadow-2xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-6"
          >
            {/* Drag handle pill */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5"></div>
            
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100/80 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-6 mt-2">
              <div className="w-14 h-14 bg-rosa-50 text-rosa-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rosa-100">
                <Share className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-xl text-gray-900 mb-1.5">Instalar no iPhone</h3>
              <p className="text-sm text-gray-600 leading-relaxed px-2">
                Para instalar o <strong>Leilão GC</strong>, clique no ícone de compartilhar na barra do Safari.
              </p>
            </div>
            
            <div className="bg-gray-50/80 rounded-2xl border border-gray-100 p-4 space-y-4 mb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 bg-white shadow-sm rounded-xl flex items-center justify-center text-blue-500 shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <p className="text-xs text-gray-700 font-medium leading-tight">1. Toque em <strong>Compartilhar</strong> na barra inferior do Safari</p>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 bg-white shadow-sm rounded-xl flex items-center justify-center text-gray-700 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <p className="text-xs text-gray-700 font-medium leading-tight">2. Role para baixo e escolha <strong>"Adicionar à Tela de Início"</strong></p>
              </div>
            </div>
            
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors"
            >
              Entendi, Fechar
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
