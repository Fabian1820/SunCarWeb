"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, X, CheckCheck, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import {
  NotificacionService,
  type Notificacion,
} from "@/lib/services/feats/notificaciones/notificacion-service"

const POLLING_INTERVAL = 30_000 // 30 segundos
const TOAST_DURATION = 10_000   // 10 segundos

// ── Sonido de notificación (Web Audio API, sin archivos externos) ─────────────
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Nota 1
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.type = "sine"
    osc1.frequency.setValueAtTime(880, ctx.currentTime)
    gain1.gain.setValueAtTime(0.25, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.3)

    // Nota 2 (ligeramente después)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.type = "sine"
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.18)
    gain2.gain.setValueAtTime(0, ctx.currentTime)
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.18)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55)
    osc2.start(ctx.currentTime + 0.18)
    osc2.stop(ctx.currentTime + 0.55)
  } catch {
    // Si el navegador bloquea el audio, ignorar silenciosamente
  }
}

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

// ── Toast de notificación entrante ───────────────────────────────────────────
interface ToastNotifProps {
  notif: Notificacion
  count: number  // cuántas nuevas llegaron
  onClose: () => void
  onVerCliente?: () => void
}

function ToastNotif({ notif, count, onClose, onVerCliente }: ToastNotifProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100)
      setProgress(pct)
      if (pct === 0) clearInterval(tick)
    }, 50)
    return () => clearInterval(tick)
  }, [])

  return (
    <div className="fixed bottom-24 right-4 z-[70] w-80 rounded-xl bg-white shadow-2xl border border-orange-200 overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300">
      {/* Barra de progreso */}
      <div
        className="h-1 bg-orange-500 transition-none"
        style={{ width: `${progress}%`, transition: "width 50ms linear" }}
      />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icono */}
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
            <Bell className="h-4 w-4 text-orange-600" />
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-orange-700 truncate">
                {count > 1 ? `${count} notificaciones nuevas` : notif.titulo}
              </p>
              <button
                onClick={onClose}
                className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
              {count > 1 ? `Tienes ${count} notificaciones nuevas sin leer.` : notif.mensaje}
            </p>

            {count === 1 && notif.link_cliente && notif.cliente_numero && onVerCliente && (
              <button
                onClick={onVerCliente}
                className="mt-2 flex items-center gap-1 text-[11px] font-medium text-orange-600 hover:text-orange-700 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Ver cliente
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [loading, setLoading] = useState(false)

  // Toast de notificación entrante
  const [toastNotif, setToastNotif] = useState<{ notif: Notificacion; count: number } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Referencia para detectar incrementos de conteo
  const prevNoLeidasRef = useRef<number | null>(null)

  // Referencia al panel para cerrar al hacer clic fuera
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Mostrar toast + sonido cuando llegan nuevas notificaciones
  const dispararToast = useCallback((nuevas: number, lista: Notificacion[]) => {
    playNotificationSound()

    // Tomar la primera no leída como representativa
    const representativa = lista.find((n) => !n.leida) ?? lista[0]
    if (!representativa) return

    setToastNotif({ notif: representativa, count: nuevas })

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastNotif(null), TOAST_DURATION)
  }, [])

  // Cerrar al hacer click fuera del panel
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

  // Polling del conteo — detecta nuevas notificaciones
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function fetchConteo() {
      try {
        const { no_leidas } = await NotificacionService.getConteo()
        if (cancelled) return

        setNoLeidas(no_leidas)

        // Si el conteo aumentó respecto al último valor conocido → hay nuevas
        if (
          prevNoLeidasRef.current !== null &&
          no_leidas > prevNoLeidasRef.current
        ) {
          const nuevas = no_leidas - prevNoLeidasRef.current
          // Traer lista completa para saber el contenido
          const lista = await NotificacionService.getMisNotificaciones()
          if (!cancelled) {
            setNotificaciones(lista)
            dispararToast(nuevas, lista)
          }
        }

        prevNoLeidasRef.current = no_leidas
      } catch {
        // silencioso
      }
    }

    fetchConteo()
    const id = setInterval(fetchConteo, POLLING_INTERVAL)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [user, dispararToast])

  // Cargar lista completa al abrir el panel
  useEffect(() => {
    if (!open || !user) return
    let cancelled = false

    async function fetchLista() {
      setLoading(true)
      try {
        const lista = await NotificacionService.getMisNotificaciones()
        if (!cancelled) {
          setNotificaciones(lista)
          const sinLeer = lista.filter((n) => !n.leida).length
          setNoLeidas(sinLeer)
          prevNoLeidasRef.current = sinLeer
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchLista()
    return () => { cancelled = true }
  }, [open, user])

  // Limpiar timer al desmontar
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  // NO renderizar si no hay usuario (después de todos los hooks)
  if (!user) return null

  // ── Handlers ────────────────────────────────────────────────────────────────
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
    const eliminada = notificaciones.find((n) => n.id === id)
    setNotificaciones((prev) => prev.filter((n) => n.id !== id))
    if (eliminada && !eliminada.leida)
      setNoLeidas((prev) => Math.max(0, prev - 1))
  }

  async function handleVerCliente(e: React.MouseEvent, notif: Notificacion) {
    e.stopPropagation()
    if (!notif.leida) await NotificacionService.marcarLeida(notif.id)
    setOpen(false)
    router.push(`/clientes?buscar=${encodeURIComponent(notif.cliente_numero)}`)
  }

  async function handleMarcarTodasLeidas() {
    const sinLeer = notificaciones.filter((n) => !n.leida)
    await Promise.all(sinLeer.map((n) => NotificacionService.marcarLeida(n.id)))
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
    setNoLeidas(0)
  }

  const tieneNoLeidas = noLeidas > 0

  return (
    <>
      {/* ── Botón flotante fijo ──────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[60]">
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setOpen((v) => !v)}
            aria-label="Notificaciones"
            className={cn(
              "relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2",
              tieneNoLeidas
                ? "bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 shadow-orange-300"
                : "bg-white hover:bg-gray-50 focus:ring-gray-300 border border-gray-200"
            )}
          >
            <Bell
              className={cn(
                "h-6 w-6 transition-colors duration-300",
                tieneNoLeidas ? "text-white" : "text-gray-500"
              )}
            />

            {/* Pulso animado cuando hay no leídas */}
            {tieneNoLeidas && (
              <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-40 pointer-events-none" />
            )}

            {/* Badge con número */}
            {tieneNoLeidas && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-sm z-10">
                {noLeidas > 99 ? "99+" : noLeidas}
              </span>
            )}
          </button>

          {/* ── Panel desplegable ─────────────────────────────────────────── */}
          {open && (
            <div
              ref={panelRef}
              className="absolute bottom-full right-0 mb-3 z-50 w-80 max-h-[calc(100vh-8rem)] flex flex-col rounded-xl shadow-2xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-500" />
                  <span className="font-semibold text-sm text-gray-800">Notificaciones</span>
                  {tieneNoLeidas && (
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

              {/* Marcar todas leídas */}
              {tieneNoLeidas && (
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
                        {/* Indicador */}
                        <div className="flex-shrink-0 mt-1">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              notif.leida ? "bg-transparent" : "bg-orange-500"
                            )}
                          />
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
      </div>

      {/* ── Toast de notificación nueva ───────────────────────────────────── */}
      {toastNotif && (
        <ToastNotif
          notif={toastNotif.notif}
          count={toastNotif.count}
          onClose={() => setToastNotif(null)}
          onVerCliente={
            toastNotif.notif.link_cliente && toastNotif.notif.cliente_numero
              ? () => {
                  setToastNotif(null)
                  router.push(
                    `/clientes?buscar=${encodeURIComponent(toastNotif.notif.cliente_numero)}`
                  )
                }
              : undefined
          }
        />
      )}
    </>
  )
}
