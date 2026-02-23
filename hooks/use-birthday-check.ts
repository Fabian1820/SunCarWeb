import { useState, useEffect, useCallback } from 'react'
import { TrabajadorService } from '@/lib/api-services'
import type { TrabajadorBirthdayInfo, BirthdayCheckStorage } from '@/lib/types/feats/trabajador/birthday-types'

const STORAGE_KEY = 'birthday_check_storage'

/**
 * Hook personalizado para verificar cumpleaños de trabajadores
 * Solo verifica una vez al día y muestra notificación si hay cumpleaños
 */
export function useBirthdayCheck() {
  const [birthdays, setBirthdays] = useState<TrabajadorBirthdayInfo[]>([])
  const [shouldShow, setShouldShow] = useState(false)
  const [loading, setLoading] = useState(false)

  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD
   */
  const getTodayDate = (): string => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  /**
   * Obtiene el estado guardado del localStorage
   */
  const getStoredState = (): BirthdayCheckStorage | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      return JSON.parse(stored) as BirthdayCheckStorage
    } catch (error) {
      console.error('Error leyendo birthday storage:', error)
      return null
    }
  }

  /**
   * Guarda el estado en localStorage
   */
  const saveStoredState = (state: BirthdayCheckStorage) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Error guardando birthday storage:', error)
    }
  }

  /**
   * Verifica si debe consultar el backend hoy
   */
  const shouldCheckToday = (): boolean => {
    const stored = getStoredState()
    const today = getTodayDate()

    if (!stored) {
      // Primera vez - debe verificar
      return true
    }

    if (stored.lastCheckedDate !== today) {
      // Es un día diferente - debe verificar
      return true
    }

    if (stored.hasShownToday) {
      // Ya se mostró hoy - no verificar
      return false
    }

    // Mismo día pero no se ha mostrado - verificar
    return true
  }

  /**
   * Marca como mostrado hoy
   */
  const markAsShown = useCallback(() => {
    const today = getTodayDate()
    saveStoredState({
      lastCheckedDate: today,
      hasShownToday: true
    })
    setShouldShow(false)
  }, [])

  /**
   * Verifica cumpleaños con el backend
   */
  const checkBirthdays = useCallback(async () => {
    if (!shouldCheckToday()) {
      console.log('🎂 Ya se verificó cumpleaños hoy')
      return
    }

    setLoading(true)
    try {
      console.log('🎂 Verificando cumpleaños de hoy...')
      const response = await TrabajadorService.getCumpleanosHoy()

      if (response.success && response.data.length > 0) {
        console.log(`🎉 ¡${response.data.length} cumpleaños hoy!`, response.data)
        setBirthdays(response.data)
        setShouldShow(true)

        // Guardar que se verificó hoy pero aún no se mostró
        const today = getTodayDate()
        saveStoredState({
          lastCheckedDate: today,
          hasShownToday: false
        })
      } else {
        console.log('🎂 No hay cumpleaños hoy')

        // Guardar que se verificó y no hay cumpleaños
        const today = getTodayDate()
        saveStoredState({
          lastCheckedDate: today,
          hasShownToday: true // Marcar como mostrado para no volver a verificar
        })
      }
    } catch (error) {
      console.error('Error verificando cumpleaños:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Verifica cumpleaños al montar el componente
   */
  useEffect(() => {
    checkBirthdays()
  }, [checkBirthdays])

  return {
    birthdays,
    shouldShow,
    loading,
    markAsShown,
    recheckBirthdays: checkBirthdays
  }
}
