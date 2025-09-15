'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/shared/atom/alert'
import { WifiOff, Wifi } from 'lucide-react'

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)

      if (!online) {
        setShowOfflineMessage(true)
      } else if (showOfflineMessage) {
        // Mostrar brevemente el mensaje de reconexión
        setTimeout(() => setShowOfflineMessage(false), 3000)
      }
    }

    // Verificar estado inicial
    updateOnlineStatus()

    // Escuchar cambios de conectividad
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [showOfflineMessage])

  if (!showOfflineMessage) {
    return null
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Alert
        className={`${
          isOnline
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-orange-200 bg-orange-50 text-orange-800'
        } shadow-lg`}
      >
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <AlertDescription className="font-medium">
          {isOnline ? (
            '✅ Conexión restaurada'
          ) : (
            '⚠️ Sin conexión - Modo offline activado'
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}