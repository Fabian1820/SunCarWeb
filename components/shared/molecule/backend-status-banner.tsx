"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { API_BASE_URL } from "@/lib/api-config"
import { Wrench } from "lucide-react"

// Cuántos errores de red consecutivos antes de mostrar el banner
const FAILURE_THRESHOLD = 2
// Con qué frecuencia sondear el backend mientras está caído (ms)
const RECOVERY_POLL_MS = 12000

export function BackendStatusBanner() {
  const [isDown, setIsDown] = useState(false)
  const failureCountRef = useRef(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isDownRef = useRef(false)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const checkRecovery = useCallback(async () => {
    try {
      // La raíz del backend sin /api - cualquier respuesta HTTP = está vivo
      const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "")
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)
      await fetch(baseUrl, {
        signal: controller.signal,
        mode: "cors",
        credentials: "omit",
      })
      clearTimeout(timeout)
      // Llegó respuesta: el backend volvió
      failureCountRef.current = 0
      isDownRef.current = false
      setIsDown(false)
      stopPolling()
    } catch {
      // Sigue caído, seguimos esperando
    }
  }, [stopPolling])

  const startPolling = useCallback(() => {
    if (pollRef.current) return
    // Primer chequeo inmediato, luego cada RECOVERY_POLL_MS
    checkRecovery()
    pollRef.current = setInterval(checkRecovery, RECOVERY_POLL_MS)
  }, [checkRecovery])

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const { online } = (event as CustomEvent<{ online: boolean }>).detail

      if (online) {
        failureCountRef.current = 0
        if (isDownRef.current) {
          isDownRef.current = false
          setIsDown(false)
          stopPolling()
        }
      } else {
        failureCountRef.current++
        if (failureCountRef.current >= FAILURE_THRESHOLD && !isDownRef.current) {
          isDownRef.current = true
          setIsDown(true)
          startPolling()
        }
      }
    }

    window.addEventListener("backend-status", handleStatus)
    return () => {
      window.removeEventListener("backend-status", handleStatus)
      stopPolling()
    }
  }, [startPolling, stopPolling])

  if (!isDown) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 bg-amber-500 px-4 py-3 text-white shadow-lg"
      style={{ backdropFilter: "none" }}
    >
      <Wrench className="h-4 w-4 shrink-0 animate-pulse" />
      <span className="text-sm font-semibold tracking-wide">
        Estamos realizando cambios en el sistema — tardará muy poco en restablecerse.
      </span>
      <span className="ml-1 inline-flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/80 animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  )
}
