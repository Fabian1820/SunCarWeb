"use client"

import { useState, useCallback, useEffect } from "react"
import { AsistenciaService } from "@/lib/api-services"
import type { TrabajadorEnOficina, TrabajadorReporte, ResumenReporte } from "@/lib/types/asistencia-types"

function hoyISO(): string {
  return new Date().toISOString().split("T")[0]
}

export function useAsistencia() {
  const [presentes, setPresentes] = useState<TrabajadorEnOficina[]>([])
  const [totalPresentes, setTotalPresentes] = useState(0)
  const [reporte, setReporte] = useState<TrabajadorReporte[]>([])
  const [resumen, setResumen] = useState<ResumenReporte | null>(null)
  const [fechaReporte, setFechaReporte] = useState(hoyISO())
  const [loadingPresentes, setLoadingPresentes] = useState(false)
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPresentes = useCallback(async () => {
    setLoadingPresentes(true)
    setError(null)
    try {
      const res = await AsistenciaService.getQuienEstaAhora()
      if (res.success && res.data) {
        setPresentes(res.data.trabajadores)
        setTotalPresentes(res.data.total)
      } else {
        setPresentes([])
        setTotalPresentes(0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar")
    } finally {
      setLoadingPresentes(false)
    }
  }, [])

  const loadReporte = useCallback(async (fecha?: string) => {
    setLoadingReporte(true)
    setError(null)
    try {
      const res = await AsistenciaService.getReporteDiario(fecha)
      if (res.success && res.data) {
        setReporte(res.data.trabajadores)
        setResumen(res.data.resumen)
      } else {
        setReporte([])
        setResumen(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar reporte")
    } finally {
      setLoadingReporte(false)
    }
  }, [])

  const marcarAsistencia = useCallback(async (ci: string, comentarios?: string): Promise<{ ok: boolean; tipo?: string; message?: string }> => {
    try {
      const res = await AsistenciaService.marcarAsistencia(ci, comentarios)
      if (res.success) {
        await loadPresentes()
        return { ok: true, tipo: res.tipo_marcaje, message: res.message }
      }
      return { ok: false, message: res.message }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : "Error al marcar" }
    }
  }, [loadPresentes])

  useEffect(() => {
    loadPresentes()
  }, [loadPresentes])

  return {
    presentes,
    totalPresentes,
    reporte,
    resumen,
    fechaReporte,
    setFechaReporte,
    loadingPresentes,
    loadingReporte,
    error,
    clearError: () => setError(null),
    loadPresentes,
    loadReporte,
    marcarAsistencia,
  }
}
