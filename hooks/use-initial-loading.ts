import { useState, useEffect } from 'react'

export function useInitialLoading() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simular un tiempo mínimo de carga para mostrar el loader
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000) // 2 segundos mínimo

    return () => clearTimeout(timer)
  }, [])

  return isLoading
}
