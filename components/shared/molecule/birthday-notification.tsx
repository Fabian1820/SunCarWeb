"use client"

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from '../atom/button'
import { X, Cake } from 'lucide-react'
import type { TrabajadorBirthdayInfo } from '@/lib/types/feats/trabajador/birthday-types'

interface BirthdayNotificationProps {
  birthdays: TrabajadorBirthdayInfo[]
  onClose: () => void
}

export function BirthdayNotification({ birthdays, onClose }: BirthdayNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Pequeño delay para la animación de entrada
    const showTimer = setTimeout(() => {
      setIsVisible(true)
    }, 100)

    // Lanzar confeti múltiples veces
    const confettiTimers: NodeJS.Timeout[] = []

    // Función para lanzar confeti
    const launchConfetti = () => {
      const count = 200
      const defaults = {
        origin: { y: 0.7 }
      }

      function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
          spread: 100,
          startVelocity: 30,
        })
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      })

      fire(0.2, {
        spread: 60,
      })

      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
      })

      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
      })

      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      })
    }

    // Lanzar confeti inmediatamente y después cada 3 segundos
    launchConfetti()
    confettiTimers.push(setTimeout(launchConfetti, 3000))
    confettiTimers.push(setTimeout(launchConfetti, 6000))

    return () => {
      clearTimeout(showTimer)
      confettiTimers.forEach(timer => clearTimeout(timer))
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Esperar a que termine la animación
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <Card
        className={`relative max-w-md w-full shadow-2xl border-4 border-yellow-400 bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 transform transition-all duration-300 ${
          isVisible ? 'scale-100 rotate-0' : 'scale-75 rotate-12'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 hover:bg-red-100"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Cake className="h-16 w-16 text-orange-500 animate-bounce" />
              <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1">
                <span className="text-2xl">🎉</span>
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-orange-600">
            🎂 ¡Feliz Cumpleaños! 🎂
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-center text-gray-700 font-semibold text-lg">
            {birthdays.length === 1 ? 'Hoy cumple años:' : 'Hoy cumplen años:'}
          </p>

          <div className="space-y-3">
            {birthdays.map((birthday, index) => (
              <div
                key={birthday.CI}
                className="bg-white p-4 rounded-lg shadow-md border-2 border-orange-200 hover:border-orange-400 transition-colors"
                style={{
                  animation: `slideIn 0.5s ease-out ${index * 0.2}s both`
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {birthday.nombre.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-lg">
                      {birthday.nombre}
                    </p>
                    <p className="text-sm text-gray-600">
                      {birthday.cargo}
                    </p>
                  </div>
                  <div className="text-3xl">🎈</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <p className="text-gray-600 italic">
              ¡Deséale un feliz cumpleaños! 🥳
            </p>
          </div>

          <Button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 text-lg shadow-lg"
          >
            ¡Entendido! 🎉
          </Button>
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
