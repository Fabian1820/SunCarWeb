"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  CI_SORPRESA,
  FECHA_REGRESO_DEFAULT,
  LS_KEY_COMPLETADA,
  LS_KEY_FECHA_REGRESO,
} from "@/lib/sorpresa-config"

export function useSorpresa() {
  const { user } = useAuth()

  const esUsuarioSorpresa = !!user && CI_SORPRESA.includes(user.ci)

  const [completada, setCompletada] = useState<boolean>(false)
  const [fechaRegreso, setFechaRegresoState] = useState<string>(FECHA_REGRESO_DEFAULT)
  const [hidratado, setHidratado] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const flag = localStorage.getItem(LS_KEY_COMPLETADA)
      setCompletada(flag === "true")
      const fecha = localStorage.getItem(LS_KEY_FECHA_REGRESO)
      if (fecha) setFechaRegresoState(fecha)
    } catch {
      // ignore
    } finally {
      setHidratado(true)
    }
  }, [])

  const marcarCompletada = useCallback(() => {
    try {
      localStorage.setItem(LS_KEY_COMPLETADA, "true")
    } catch {
      // ignore
    }
    setCompletada(true)
  }, [])

  const setFechaRegreso = useCallback((nueva: string) => {
    try {
      localStorage.setItem(LS_KEY_FECHA_REGRESO, nueva)
    } catch {
      // ignore
    }
    setFechaRegresoState(nueva)
  }, [])

  return {
    esUsuarioSorpresa,
    completada,
    hidratado,
    marcarCompletada,
    fechaRegreso,
    setFechaRegreso,
  }
}
