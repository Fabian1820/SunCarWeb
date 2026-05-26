"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, X, CheckCheck, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import {
  NotificacionService,
  type Notificacion,
} from "@/lib/services/feats/notificaciones/notificacion-service"

const POLLING_INTERVAL = 30_000 // 30 segundos

function fechaRelativa(fechaStr: string): string {
  try {
    const fecha = new Date(fechaStr)
    const ahora = new Date()
    const diffMs = ahora.getTime() - fecha.getTime()
    const diffMin = Math.floor(diffMs / 60_000)
    const diffHoras = Math.floor(diffMin / 60)
    const diffDias = Math.floor(diffHoras / 24)

    if (diffMin < 1) return "ahora mismo"
    if (diffMin < 60) return `hace ${diffMin} min`
    if (diffHoras < 24) return `hace ${diffHoras} h`
    if (diffDias === 1) return "ayer"
    if (diffDias < 30) return `hace ${diffDias} días`
    return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
  } catch {
    return ""
  }
}

export function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Polling del conteo (solo si hay usuario)
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function fetchConteo() {
      const { no_leidas } = await NotificacionService.getConteo()
      if (!cancelled) setNoLeidas(no_leidas)
    }

    fetchConteo()
    const intervalId = setInterval(fetchConteo, POLLING_INTERVAL)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [user])

  // Cargar lista completa al abrir
  useEffect(() => {
    if (!open || !user) return
    let cancelled = false

    async function fetchLista() {
      setLoading(true)
      const lista = await NotificacionService.getMisNotificaciones()
      if (!cancelled) {
        setNotificaciones(lista)
        setNoLeidas(lista.filter((n) => !n.leida).length)
        setLoading(false)
      }
    }

    fetchLista()
    return () => {
      cancelled = true
    }
  }, [open, user])

  // No renderizar si no hay usuario autenticado (DESPUÉS de todos los hooks)
  if (!user) return null

  async function handleMarcarLeida(notif: Notificacion) {
    if (notif.leida) return
    await NotificacionService.marcarLeida(notif.id)
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n))
    )
    setNoLeidas((prev) => Math.max(0, prev - 1))
  }

  async function handleEliminar(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    await NotificacionService.eliminar(id)
    setNotificaciones((prev) => prev.filter((n) => n.id !== id))
    setNoLeidas((prev) => {
      const eliminada = notificaciones.find((n) => n.id === id)
      return eliminada && !eliminada.leida ? Math.max(0, prev - 1) : prev
    })
  }

  async function handleVerCliente(e: React.MouseEvent, notif: Notificacion) {
    e.stopPropagation()
    if (!notif.leida) await NotificacionService.marcarLeida(notif.id)
    setOpen(false)
    router.push(`/clientes?buscar=${encodeURIComponent(notif.cliente_numero)}`)
  }

  async function handleMarcarTodasLeidas() {
    const noLeidasList = notificaciones.filter((n) => !n.leida)
    await Promise.all(noLeidasList.map((n) => NotificacionService.marcarLeida(n.id)))
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
    setNoLeidas(0)
  }

  return (
    <div className="relative">
      {/* Botón campanita */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-md border border-gray-200 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {open && (
        <div
          ref={panelRef}
          className="fixed right-4 top-14 z-50 w-80 max-h-[calc(100vh-4rem)] flex flex-col rounded-xl shadow-2xl border border-gray-200 bg-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-sm text-gray-800">Notificaciones</span>
              {noLeidas > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {noLeidas}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Botón marcar todas leídas */}
          {noLeidas > 0 && (
            <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
              <button
                onClick={handleMarcarTodasLeidas}
                className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas como leídas
              </button>
            </div>
          )}

          {/* Lista */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notificaciones.map((notif) => (
                  <li
                    key={notif.id}
                    onClick={() => handleMarcarLeida(notif)}
                    className={cn(
                      "relative flex gap-3 px-4 py-3 cursor-pointer transition-colors group",
                      notif.leida
                        ? "bg-white hover:bg-gray-50"
                        : "bg-orange-50 hover:bg-orange-100"
                    )}
                  >
                    {/* Punto indicador no leída */}
                    <div className="flex-shrink-0 mt-1">
                      {notif.leida ? (
                        <div className="w-2 h-2 rounded-full bg-transparent" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium leading-tight truncate",
                          notif.leida ? "text-gray-500" : "text-gray-800"
                        )}
                      >
                        {notif.titulo}
                      </p>
                      <p
                        className={cn(
                          "text-xs mt-0.5 line-clamp-2",
                          notif.leida ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        {notif.mensaje}
                      </p>
                      {notif.cliente_nombre && (
                        <p className="text-xs mt-0.5 text-orange-500 truncate">
                          {notif.cliente_nombre}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-gray-400">
                          {fechaRelativa(notif.fecha)}
                        </p>
                        {notif.link_cliente && notif.cliente_numero && (
                          <button
                            onClick={(e) => handleVerCliente(e, notif)}
                            className="flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 hover:underline transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ver cliente
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Botón eliminar */}
                    <button
                      onClick={(e) => handleEliminar(e, notif.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 hover:bg-red-50 rounded p-0.5"
                      aria-label="Eliminar notificación"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
