"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, X, CheckCheck, ExternalLink, Trash2, Handshake, Hourglass, CheckCircle2, Wallet, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import {
  NotificacionService,
  type Notificacion,
} from "@/lib/services/feats/notificaciones/notificacion-service"

const POLLING_INTERVAL = 30_000
const TOAST_DURATION   = 10_000

// ── Sonido (Web Audio API) ────────────────────────────────────────────────────
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const play = (freq: number, start: number, dur: number, vol = 0.22) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(vol, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }
    play(880, 0, 0.3)
    play(1100, 0.18, 0.37)
  } catch { /* navegador bloquea audio */ }
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────
function fechaRelativa(fechaStr: string): string {
  try {
    const fecha = new Date(fechaStr)
    const ahora = new Date()
    const diffMs  = ahora.getTime() - fecha.getTime()
    const diffMin = Math.floor(diffMs / 60_000)
    const diffH   = Math.floor(diffMin / 60)
    const diffD   = Math.floor(diffH / 24)
    if (diffMin < 1)  return "ahora mismo"
    if (diffMin < 60) return `hace ${diffMin} min`
    if (diffH < 24)   return `hace ${diffH} h`
    if (diffD === 1)  return "ayer"
    if (diffD < 30)   return `hace ${diffD} días`
    return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
  } catch { return "" }
}

type Grupo = "Hoy" | "Ayer" | "Esta semana" | "Anteriores"

function getGrupoFecha(fechaStr: string): Grupo {
  try {
    const d    = new Date(fechaStr)
    const hoy  = new Date()
    const diff = Math.floor((hoy.getTime() - d.getTime()) / 86_400_000)
    if (diff === 0) return "Hoy"
    if (diff === 1) return "Ayer"
    if (diff <= 7)  return "Esta semana"
    return "Anteriores"
  } catch { return "Anteriores" }
}

const ORDEN_GRUPOS: Grupo[] = ["Hoy", "Ayer", "Esta semana", "Anteriores"]

// ── Pestañas por tipo ────────────────────────────────────────────────────────
type TabKey = "nuevos" | "atrasados" | "instaladas" | "reservas" | "facturas"

const TABS: { key: TabKey; label: string; tipo: string }[] = [
  { key: "nuevos",     label: "Nuevos",     tipo: "lead_convertido"        },
  { key: "atrasados",  label: "Atrasados",  tipo: "demora_instalacion"     },
  { key: "instaladas", label: "Instaladas", tipo: "instalacion_exitosa"    },
  { key: "reservas",   label: "Reservas",   tipo: "reserva_pendiente"     },
  { key: "facturas",   label: "Facturar",   tipo: "factura_multiple_ofertas" },
]

function tipoToTab(tipo: string): TabKey {
  const t = TABS.find((x) => x.tipo === tipo)
  return t?.key ?? "instaladas"
}

/** Destino del botón "Ver cliente" según el tipo de notificación. */
function linkParaNotificacion(notif: Notificacion): string {
  if (notif.tipo === "factura_multiple_ofertas") {
    return `/facturas/obras-terminadas?cliente=${encodeURIComponent(notif.cliente_numero)}`
  }
  return `/clientes?buscar=${encodeURIComponent(notif.cliente_numero)}`
}

// ── Estilos visuales por tipo de notificación ────────────────────────────────
type TipoVisual = {
  Icon: typeof Bell
  iconClass: string
  bgClass: string
  ringClass: string
}

function visualPorTipo(tipo: string): TipoVisual {
  switch (tipo) {
    case "lead_convertido":
      return {
        Icon: Handshake,
        iconClass: "text-emerald-600",
        bgClass: "bg-emerald-50",
        ringClass: "ring-emerald-100",
      }
    case "demora_instalacion":
      return {
        Icon: Hourglass,
        iconClass: "text-amber-600",
        bgClass: "bg-amber-50",
        ringClass: "ring-amber-100",
      }
    case "instalacion_exitosa":
      return {
        Icon: CheckCircle2,
        iconClass: "text-sky-600",
        bgClass: "bg-sky-50",
        ringClass: "ring-sky-100",
      }
    case "reserva_pendiente":
      return {
        Icon: Wallet,
        iconClass: "text-violet-600",
        bgClass: "bg-violet-50",
        ringClass: "ring-violet-100",
      }
    case "factura_multiple_ofertas":
      return {
        Icon: Receipt,
        iconClass: "text-rose-600",
        bgClass: "bg-rose-50",
        ringClass: "ring-rose-100",
      }
    default:
      return {
        Icon: Bell,
        iconClass: "text-gray-500",
        bgClass: "bg-gray-50",
        ringClass: "ring-gray-100",
      }
  }
}

/** Badge escalado por días de atraso. */
function badgeDiasAtraso(dias: number): { className: string; label: string } {
  if (dias >= 50) {
    return {
      className: "bg-red-100 text-red-700 ring-1 ring-red-200",
      label: `${dias} días`,
    }
  }
  if (dias >= 40) {
    return {
      className: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
      label: `${dias} días`,
    }
  }
  return {
    className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    label: `${dias} días`,
  }
}

/** Ordena y agrupa las notificaciones para el panel. */
function agruparNotificaciones(lista: Notificacion[]) {
  // Orden base: demora → por dias_alerta desc; resto → por fecha desc
  const sorted = [...lista].sort((a, b) => {
    if (a.tipo === "demora_instalacion" && b.tipo === "demora_instalacion") {
      return (b.dias_alerta ?? 0) - (a.dias_alerta ?? 0)
    }
    return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  })

  const grupos: Record<Grupo, Notificacion[]> = {
    "Hoy": [], "Ayer": [], "Esta semana": [], "Anteriores": [],
  }
  for (const n of sorted) {
    grupos[getGrupoFecha(n.fecha)].push(n)
  }
  return ORDEN_GRUPOS
    .filter((g) => grupos[g].length > 0)
    .map((g) => ({ label: g, items: grupos[g] }))
}

// ── Toast de notificación entrante ───────────────────────────────────────────
interface ToastProps {
  notif: Notificacion
  count: number
  onClose: () => void
  onVerCliente?: () => void
}

function ToastNotif({ notif, count, onClose, onVerCliente }: ToastProps) {
  const [pct, setPct] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      const v = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100)
      setPct(v)
      if (v === 0) clearInterval(id)
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="fixed bottom-24 right-4 z-[70] w-80 rounded-xl bg-white shadow-2xl border border-emerald-200 overflow-hidden animate-in slide-in-from-right-4 fade-in duration-300">
      <div
        className="h-1 bg-emerald-500"
        style={{ width: `${pct}%`, transition: "width 50ms linear" }}
      />
      <div className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
          <Bell className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-emerald-700 truncate">
              {count > 1 ? `${count} notificaciones nuevas` : notif.titulo}
            </p>
            <button onClick={onClose} className="flex-shrink-0 text-gray-300 hover:text-gray-500">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
            {count > 1 ? `Tienes ${count} notificaciones nuevas sin leer.` : notif.mensaje}
          </p>
          {count === 1 && notif.link_cliente && notif.cliente_numero && onVerCliente && (
            <button
              onClick={onVerCliente}
              className="mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Ver cliente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function NotificationBell() {
  const { user }  = useAuth()
  const router    = useRouter()
  const [open, setOpen]                   = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas]           = useState(0)
  const [loading, setLoading]             = useState(false)
  const [toastData, setToastData]         = useState<{ notif: Notificacion; count: number } | null>(null)
  const [activeTab, setActiveTab]         = useState<TabKey>("atrasados")

  const prevNoLeidasRef = useRef<number | null>(null)
  const toastTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef        = useRef<HTMLDivElement>(null)
  const buttonRef       = useRef<HTMLButtonElement>(null)

  const dispararToast = useCallback((nuevas: number, lista: Notificacion[]) => {
    playNotificationSound()
    const rep = lista.find((n) => !n.leida) ?? lista[0]
    if (!rep) return
    setToastData({ notif: rep, count: nuevas })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastData(null), TOAST_DURATION)
  }, [])

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])

  // ── Polling del conteo ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function fetchConteo() {
      const resultado = await NotificacionService.getConteo()
      if (cancelled) return

      // Si la llamada falló (null), conservamos el último valor conocido sin tocar el estado
      if (resultado === null) return

      const { no_leidas } = resultado
      setNoLeidas(no_leidas)

      if (prevNoLeidasRef.current !== null && no_leidas > prevNoLeidasRef.current) {
        const nuevas = no_leidas - prevNoLeidasRef.current
        const lista  = await NotificacionService.getMisNotificaciones()
        if (!cancelled) {
          setNotificaciones(lista)
          dispararToast(nuevas, lista)
        }
      }
      prevNoLeidasRef.current = no_leidas
    }

    fetchConteo()
    const id = setInterval(fetchConteo, POLLING_INTERVAL)
    return () => { cancelled = true; clearInterval(id) }
  }, [user, dispararToast])

  // ── Carga completa al abrir el panel ─────────────────────────────────────
  useEffect(() => {
    if (!open || !user) return
    let cancelled = false

    async function fetchLista() {
      setLoading(true)
      try {
        const lista    = await NotificacionService.getMisNotificaciones()
        if (cancelled) return
        const sinLeer  = lista.filter((n) => !n.leida).length
        setNotificaciones(lista)
        setNoLeidas(sinLeer)
        prevNoLeidasRef.current = sinLeer   // sincronizar ref con valor real
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchLista()
    return () => { cancelled = true }
  }, [open, user])

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  if (!user) return null

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleMarcarLeida(notif: Notificacion) {
    if (notif.leida) return
    await NotificacionService.marcarLeida(notif.id)
    setNotificaciones((prev) => prev.map((n) => n.id === notif.id ? { ...n, leida: true } : n))
    setNoLeidas((prev) => Math.max(0, prev - 1))
  }

  async function handleEliminar(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const eliminada = notificaciones.find((n) => n.id === id)
    await NotificacionService.eliminar(id)
    setNotificaciones((prev) => prev.filter((n) => n.id !== id))
    if (eliminada && !eliminada.leida) setNoLeidas((prev) => Math.max(0, prev - 1))
  }

  async function handleVerCliente(e: React.MouseEvent, notif: Notificacion) {
    e.stopPropagation()
    if (!notif.leida) await NotificacionService.marcarLeida(notif.id)
    setOpen(false)
    router.push(linkParaNotificacion(notif))
  }

  async function handleMarcarTodasLeidas() {
    // Marca solo las de la pestaña activa
    const tipo = TABS.find((t) => t.key === activeTab)!.tipo
    await NotificacionService.marcarTodasLeidas(tipo)
    setNotificaciones((prev) =>
      prev.map((n) => (n.tipo === tipo ? { ...n, leida: true } : n))
    )
    const nuevasNoLeidas = notificaciones.filter(
      (n) => n.tipo !== tipo && !n.leida
    ).length
    setNoLeidas(nuevasNoLeidas)
    prevNoLeidasRef.current = nuevasNoLeidas
  }

  async function handleEliminarTodas() {
    const tabLabel = TABS.find((t) => t.key === activeTab)!.label.toLowerCase()
    if (!confirm(`¿Eliminar todas las notificaciones de "${tabLabel}"? Esta acción no se puede deshacer.`)) return
    const tipo = TABS.find((t) => t.key === activeTab)!.tipo
    await NotificacionService.eliminarTodas(tipo)
    setNotificaciones((prev) => prev.filter((n) => n.tipo !== tipo))
    const nuevasNoLeidas = notificaciones.filter(
      (n) => n.tipo !== tipo && !n.leida
    ).length
    setNoLeidas(nuevasNoLeidas)
    prevNoLeidasRef.current = nuevasNoLeidas
  }

  const tieneNoLeidas = noLeidas > 0

  // Notificaciones de la pestaña activa
  const activeTipo  = TABS.find((t) => t.key === activeTab)!.tipo
  const visibles    = notificaciones.filter((n) => n.tipo === activeTipo)
  const grupos      = agruparNotificaciones(visibles)

  // Conteo de no leídas por pestaña
  const conteoPorTab: Record<TabKey, number> = { nuevos: 0, atrasados: 0, instaladas: 0, reservas: 0, facturas: 0 }
  for (const n of notificaciones) {
    if (!n.leida) conteoPorTab[tipoToTab(n.tipo)]++
  }

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
                ? "bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-400 shadow-emerald-300"
                : "bg-white hover:bg-gray-50 focus:ring-gray-300 border border-gray-200"
            )}
          >
            <Bell className={cn(
              "h-6 w-6 transition-colors duration-300",
              tieneNoLeidas ? "text-white" : "text-gray-500"
            )} />

            {tieneNoLeidas && (
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40 pointer-events-none" />
            )}

            {tieneNoLeidas && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold shadow-sm z-10">
                {noLeidas > 99 ? "99+" : noLeidas}
              </span>
            )}
          </button>

          {/* ── Panel ─────────────────────────────────────────────────────── */}
          {open && (
            <div
              ref={panelRef}
              className="absolute bottom-full right-0 mb-3 z-50 w-96 max-h-[calc(100vh-8rem)] flex flex-col rounded-xl shadow-2xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-emerald-500" />
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
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Pestañas por tipo */}
              <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
                {TABS.map((tab) => {
                  const count = conteoPorTab[tab.key]
                  const isActive = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors relative",
                        isActive
                          ? "text-emerald-600 border-b-2 border-emerald-500 -mb-px"
                          : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <span>{tab.label}</span>
                      {count > 0 && (
                        <span className={cn(
                          "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                          isActive
                            ? "bg-emerald-500 text-white"
                            : "bg-gray-200 text-gray-600"
                        )}>
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Acciones de la pestaña activa */}
              {visibles.length > 0 && (
                <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0 flex items-center justify-between gap-3">
                  {conteoPorTab[activeTab] > 0 ? (
                    <button
                      onClick={handleMarcarTodasLeidas}
                      className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Marcar todas leídas
                    </button>
                  ) : <span />}
                  <button
                    onClick={handleEliminarTodas}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 font-medium"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar todas
                  </button>
                </div>
              )}

              {/* Lista agrupada */}
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : visibles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                    <Bell className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Sin notificaciones</p>
                  </div>
                ) : (
                  grupos.map(({ label, items }) => (
                    <div key={label}>
                      {/* Cabecera del grupo */}
                      <div className="sticky top-0 z-10 px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          {label}
                        </span>
                      </div>

                      <ul className="divide-y divide-gray-100">
                        {items.map((notif) => {
                          const visual = visualPorTipo(notif.tipo)
                          const { Icon } = visual
                          const esAtraso = notif.tipo === "demora_instalacion"
                          const diasBadge = esAtraso && typeof notif.dias_alerta === "number"
                            ? badgeDiasAtraso(notif.dias_alerta)
                            : null

                          return (
                            <li
                              key={notif.id}
                              onClick={() => handleMarcarLeida(notif)}
                              className={cn(
                                "relative flex gap-3 px-4 py-3 cursor-pointer transition-colors group",
                                notif.leida
                                  ? "bg-white hover:bg-gray-50"
                                  : "bg-emerald-50/60 hover:bg-emerald-50"
                              )}
                            >
                              {/* Icono por tipo */}
                              <div className="flex-shrink-0 relative">
                                <div className={cn(
                                  "w-9 h-9 rounded-full flex items-center justify-center ring-1",
                                  visual.bgClass,
                                  visual.ringClass
                                )}>
                                  <Icon className={cn("h-[18px] w-[18px]", visual.iconClass)} strokeWidth={2.2} />
                                </div>
                                {!notif.leida && (
                                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                                )}
                              </div>

                              {/* Contenido */}
                              <div className="flex-1 min-w-0">
                                {/* Línea 1: Cliente + badge días */}
                                <div className="flex items-center gap-2 min-w-0">
                                  {notif.cliente_nombre ? (
                                    <p className={cn(
                                      "text-sm font-semibold truncate flex-1 min-w-0",
                                      notif.leida ? "text-gray-600" : "text-gray-900"
                                    )}>
                                      {notif.cliente_nombre}
                                    </p>
                                  ) : (
                                    <p className={cn(
                                      "text-sm font-semibold truncate flex-1 min-w-0",
                                      notif.leida ? "text-gray-600" : "text-gray-900"
                                    )}>
                                      {notif.titulo}
                                    </p>
                                  )}
                                  {diasBadge && (
                                    <span className={cn(
                                      "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide",
                                      diasBadge.className
                                    )}>
                                      {diasBadge.label}
                                    </span>
                                  )}
                                </div>

                                {/* Línea 2: Título pequeño (cuando hay cliente) */}
                                {notif.cliente_nombre && (
                                  <p className={cn(
                                    "text-[11px] font-medium mt-0.5 truncate",
                                    notif.leida ? "text-gray-400" : visual.iconClass
                                  )}>
                                    {notif.titulo}
                                  </p>
                                )}

                                {/* Línea 3: Mensaje */}
                                <p className={cn(
                                  "text-xs mt-1 line-clamp-2 leading-snug",
                                  notif.leida ? "text-gray-400" : "text-gray-600"
                                )}>
                                  {notif.mensaje}
                                </p>

                                {/* Línea 4: Fecha + acción */}
                                <div className="flex items-center justify-between mt-1.5">
                                  <p className="text-[10px] text-gray-400">
                                    {fechaRelativa(notif.fecha)}
                                  </p>
                                  {notif.link_cliente && notif.cliente_numero && (
                                    <button
                                      onClick={(e) => handleVerCliente(e, notif)}
                                      className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      Ver cliente
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Eliminar */}
                              <button
                                onClick={(e) => handleEliminar(e, notif.id)}
                                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 hover:bg-red-50 rounded p-0.5 self-start"
                                aria-label="Eliminar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Toast de notificación nueva ──────────────────────────────────── */}
      {toastData && (
        <ToastNotif
          notif={toastData.notif}
          count={toastData.count}
          onClose={() => setToastData(null)}
          onVerCliente={
            toastData.notif.link_cliente && toastData.notif.cliente_numero
              ? () => {
                  setToastData(null)
                  router.push(linkParaNotificacion(toastData.notif))
                }
              : undefined
          }
        />
      )}
    </>
  )
}
