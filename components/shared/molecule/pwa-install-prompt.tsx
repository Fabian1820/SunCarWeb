'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/shared/atom/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/molecule/card'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Verificar si ya está instalada
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = (window.navigator as any).standalone

    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true)
      return
    }

    // Escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    // Escuchar cuando se instala la app
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      console.log('🎉 PWA installed successfully!')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('✅ User accepted PWA installation')
      } else {
        console.log('❌ User dismissed PWA installation')
      }

      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('❌ Error during PWA installation:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // Recordar que el usuario rechazó la instalación por esta sesión
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  // No mostrar si ya está instalada o si el usuario ya rechazó
  if (isInstalled || !showInstallPrompt || sessionStorage.getItem('pwa-install-dismissed')) {
    return null
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg border-amber-200 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Smartphone className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-gray-900">
                Instalar SUNCAR Admin
              </CardTitle>
              <CardDescription className="text-xs text-gray-600">
                Acceso rápido desde tu escritorio
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 mb-3">
          Instala la aplicación para acceder offline y recibir notificaciones.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Download className="h-3 w-3 mr-1" />
            Instalar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="px-3"
          >
            Después
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}