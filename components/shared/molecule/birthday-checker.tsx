"use client"

import { useBirthdayCheck } from '@/hooks/use-birthday-check'
import { BirthdayNotification } from './birthday-notification'

/**
 * Componente que verifica automáticamente cumpleaños y muestra notificación
 * Debe ser incluido en el layout principal o dashboard
 */
export function BirthdayChecker() {
  const { birthdays, shouldShow, markAsShown } = useBirthdayCheck()

  if (!shouldShow || birthdays.length === 0) {
    return null
  }

  return (
    <BirthdayNotification
      birthdays={birthdays}
      onClose={markAsShown}
    />
  )
}
