"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import type { Feature, FeatureCollection, GeoJsonObject } from "geojson"
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet"
import { GeoJSON, MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet"
import {
  Users, Sun, Cpu, Battery, ChevronLeft, ChevronRight, Clock,
  AlertTriangle, Eye, CheckCircle, UserPlus, Building2, Calendar,
  Activity, RefreshCw, Wrench, PlayCircle, Phone, Shield, ArrowLeft,
  X, MapPin, Zap, ChevronDown, ChevronUp, TrendingUp, Users2,
  HardHat, TriangleAlert, CalendarClock, ExternalLink, Filter,
} from "lucide-react"
import Link from "next/link"
import { ResultadosService, ClienteService, LeadService } from "@/lib/api-services"
import { BrigadaService } from "@/lib/services/feats/brigade/brigada-service"
import { InstalacionesService } from "@/lib/services/feats/instalaciones/instalaciones-service"
import { apiRequest } from "@/lib/api-config"
import type { MunicipioDetallado } from "@/lib/types/feats/resultados/resultados-types"
import type { Cliente } from "@/lib/api-types"
import type { Lead } from "@/lib/types/feats/leads/lead-types"
import type { Brigada } from "@/lib/types/feats/brigade/brigade-types"
import "leaflet/dist/leaflet.css"

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = "todos" | "pendientes_instalacion" | "en_proceso" | "averias" | "visitas"

interface SimpleBounds { minLat: number; maxLat: number; minLng: number; maxLng: number }

interface ControlData {
  totalClientes: number; totalMunicipios: number; totalKwPaneles: number
  totalKwInversores: number; totalKwhBaterias: number; pendientesInstalacion: number
  enProceso: number; averiasPendientes: number; visitasPendientes: number
  instalacionesTerminadas: number; instalacionesComenzadas: number; nuevosLeads: number
  nuevosClientes: number; averiasSolucionadas: number; visitasRealizadas: number
}

interface TooltipInfo { municipio: string; count: number; label: string; x: number; y: number }

type SelectedItem =
  | { mode: "todos"; muni: MunicipioDetallado }
  | { mode: "pendientes_instalacion"; municipio: string; clientes: Cliente[]; leads: Lead[] }
  | { mode: "en_proceso"; municipio: string; clientes: Cliente[] }
  | { mode: "averias"; municipio: string; clientes: Cliente[] }
  | { mode: "visitas"; municipio: string; clientes: Cliente[]; leads: Lead[] }

// ─── Constantes ──────────────────────────────────────────────────────────────

const ESTADOS_VALIDOS_LEAD = new Set([
  "Esperando equipo", "No interesado", "Pendiente de instalación",
  "Pendiente de presupuesto", "Pendiente de visita", "Pendiente de visitarnos",
  "Proximamente", "Revisando ofertas", "Sin respuesta",
])

function isPendienteInstalacion(estado: string | undefined) {
  return normalizeText(estado ?? "") === "pendiente de instalacion"
}
function isEnProceso(estado: string | undefined) {
  return normalizeText(estado ?? "") === "instalacion en proceso"
}
function isPendienteVisita(estado: string | undefined) {
  return normalizeText(estado ?? "") === "pendiente de visita"
}

// ─── Estado colors ────────────────────────────────────────────────────────────

const ESTADO_COLORS_MAP: Array<{ keys: string[]; style: { bg: string; dot: string; label: string } }> = [
  { keys: ["instalacion terminada", "instalado", "equipo instalado con exito"], style: { bg: "bg-emerald-500/15", dot: "bg-emerald-400", label: "text-emerald-300" } },
  { keys: ["instalacion en proceso"], style: { bg: "bg-blue-500/15", dot: "bg-blue-400", label: "text-blue-300" } },
  { keys: ["pendiente de instalacion"], style: { bg: "bg-orange-500/15", dot: "bg-orange-400", label: "text-orange-300" } },
  { keys: ["pendiente de visita"], style: { bg: "bg-purple-500/15", dot: "bg-purple-400", label: "text-purple-300" } },
  { keys: ["interesado", "revisando ofertas"], style: { bg: "bg-yellow-500/15", dot: "bg-yellow-400", label: "text-yellow-300" } },
]

function getEstadoStyle(estado: string) {
  const key = normalizeText(estado)
  const match = ESTADO_COLORS_MAP.find(e => e.keys.some(k => k === key))
  return match?.style ?? { bg: "bg-slate-500/15", dot: "bg-slate-400", label: "text-slate-300" }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeText(value: string | undefined | null): string {
  if (!value) return ""
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now); monday.setDate(now.getDate() + mondayOffset); monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

function isInRange(dateStr: string | null | undefined, start: Date, end: Date) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return !isNaN(d.getTime()) && d >= start && d <= end
}

function toISODate(date: Date) { return date.toISOString().split("T")[0] }

function formatNum(value: number, decimals = 1) {
  return new Intl.NumberFormat("es-CU", { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(value)
}

function useLiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id) }, [])
  return time
}

// ─── GeoJSON bounds ───────────────────────────────────────────────────────────

function computeGeoJSONBounds(geometry: Feature["geometry"]): SimpleBounds | null {
  const lats: number[] = [], lngs: number[] = []
  function walk(coords: unknown): void {
    if (!Array.isArray(coords)) return
    if (typeof coords[0] === "number") { lngs.push(coords[0]); lats.push(coords[1]) }
    else coords.forEach(walk)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = geometry as any
  if (!g?.coordinates) return null
  walk(g.coordinates)
  if (!lats.length) return null
  return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) }
}

function mergeBounds(a: SimpleBounds, b: SimpleBounds): SimpleBounds {
  return { minLat: Math.min(a.minLat, b.minLat), maxLat: Math.max(a.maxLat, b.maxLat), minLng: Math.min(a.minLng, b.minLng), maxLng: Math.max(a.maxLng, b.maxLng) }
}

// ─── Paginadores ─────────────────────────────────────────────────────────────

async function fetchAllClientes(): Promise<Cliente[]> {
  const PAGE = 200
  const first = await ClienteService.getClientes({ skip: 0, limit: PAGE })
  const all: Cliente[] = [...first.clients]
  if (first.total <= PAGE) return all
  const pages = Math.ceil((first.total - PAGE) / PAGE)
  const rest = await Promise.all(Array.from({ length: pages }, (_, i) =>
    ClienteService.getClientes({ skip: (i + 1) * PAGE, limit: PAGE }).then(r => r.clients).catch(() => [] as Cliente[])
  ))
  rest.forEach(p => all.push(...p))
  return all
}

async function fetchAllLeads(): Promise<Lead[]> {
  const PAGE = 200
  const first = await LeadService.getLeads({ skip: 0, limit: PAGE })
  const all: Lead[] = [...first.leads]
  if (first.total <= PAGE) return all
  const pages = Math.ceil((first.total - PAGE) / PAGE)
  const rest = await Promise.all(Array.from({ length: pages }, (_, i) =>
    LeadService.getLeads({ skip: (i + 1) * PAGE, limit: PAGE }).then(r => r.leads).catch(() => [] as Lead[])
  ))
  rest.forEach(p => all.push(...p))
  return all
}

// ─── Colores del mapa ─────────────────────────────────────────────────────────
// 5 niveles con alto contraste entre cada uno

function densityColor(ratio: number, mode: ViewMode): string {
  const palettes: Record<ViewMode, string[]> = {
    todos:                  ["#3d1505", "#92400e", "#d97706", "#f59e0b", "#fde68a"],
    pendientes_instalacion: ["#431407", "#9a3412", "#ea580c", "#fb923c", "#fed7aa"],
    en_proceso:             ["#172554", "#1e3a8a", "#1d4ed8", "#60a5fa", "#bfdbfe"],
    averias:                ["#450a0a", "#991b1b", "#dc2626", "#f87171", "#fecaca"],
    visitas:                ["#2e1065", "#5b21b6", "#7c3aed", "#c084fc", "#e9d5ff"],
  }
  const p = palettes[mode]
  if (ratio < 0.2) return p[0]
  if (ratio < 0.4) return p[1]
  if (ratio < 0.6) return p[2]
  if (ratio < 0.8) return p[3]
  return p[4]
}

function borderColor(mode: ViewMode): string {
  if (mode === "todos") return "#fbbf24"
  if (mode === "pendientes_instalacion") return "#fb923c"
  if (mode === "en_proceso") return "#60a5fa"
  if (mode === "averias") return "#f87171"
  return "#c084fc"
}

// ─── MapController ────────────────────────────────────────────────────────────

function MapController({ bounds }: { bounds: SimpleBounds | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(
        [[bounds.minLat, bounds.minLng], [bounds.maxLat, bounds.maxLng]],
        { padding: [40, 40], maxZoom: 13, duration: 0.8 }
      )
    } else {
      map.flyTo([22.0, -79.5], 7, { duration: 0.8 })
    }
  }, [bounds, map])
  return null
}

// ─── OperacionesBtn ───────────────────────────────────────────────────────────

function OperacionesBtn({ icon: Icon, label, value, color, activeBg, active, loading, onClick }: {
  icon: React.ComponentType<{ className?: string }>
  label: string; value: number; color: string; activeBg: string
  active: boolean; loading: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-all gap-2 text-left
        ${active ? `${activeBg} ring-1 ring-inset ring-white/20` : "bg-white/5 hover:bg-white/10"}`}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`h-3.5 w-3.5 ${color} shrink-0`} />
        <span className="text-[11px] text-slate-300 leading-tight truncate">{label}</span>
      </div>
      {loading ? <div className="h-4 w-7 bg-slate-700 rounded animate-pulse shrink-0" />
        : <span className={`text-sm font-bold ${color} shrink-0`}>{value}</span>}
    </button>
  )
}

// ─── CardHeader ──────────────────────────────────────────────────────────────

function CardHeader({ name, sub, color, onClose }: { name: string; sub?: string; color: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-slate-700/50">
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className={`h-4 w-4 ${color} shrink-0`} />
        <div className="min-w-0">
          <p className={`text-sm font-bold ${color} truncate`}>{name}</p>
          {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
        </div>
      </div>
      <button onClick={onClose} className="ml-2 p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── MunicipioCard (modo todos) ───────────────────────────────────────────────

function MunicipioCard({ muni, allClients, onClose }: { muni: MunicipioDetallado; allClients: Cliente[]; onClose: () => void }) {
  const munNorm = normalizeText(muni.municipio)
  const provNorm = normalizeText(muni.provincia)
  const clientesDelMunicipio = useMemo(() => allClients.filter(c => {
    const cMun = normalizeText(c.municipio), cProv = normalizeText(c.provincia_montaje)
    return (cMun === munNorm && cProv === provNorm) || (cMun === munNorm && !cProv)
  }), [allClients, munNorm, provNorm])

  const estadosCounts = useMemo(() => {
    const counts = new Map<string, { display: string; count: number }>()
    clientesDelMunicipio.forEach(c => {
      const raw = (c.estado ?? "Sin estado").trim(), key = raw.toLowerCase()
      const ex = counts.get(key); if (ex) ex.count++; else counts.set(key, { display: raw, count: 1 })
    })
    return Array.from(counts.values()).sort((a, b) => b.count - a.count)
  }, [clientesDelMunicipio])

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-72 pointer-events-auto">
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
        <CardHeader name={muni.municipio} sub={muni.provincia} color="text-amber-400" onClose={onClose} />
        <div className="px-4 py-2 flex items-center gap-2 border-b border-slate-700/50">
          <Users className="h-3.5 w-3.5 text-orange-400 shrink-0" />
          <span className="text-xs text-slate-300"><span className="font-bold text-white text-sm">{clientesDelMunicipio.length}</span> cliente{clientesDelMunicipio.length !== 1 ? "s" : ""}</span>
        </div>
        {estadosCounts.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Estados</p>
            <div className="space-y-1">
              {estadosCounts.map(({ display, count }) => {
                const style = getEstadoStyle(display)
                return (
                  <div key={display.toLowerCase()} className={`flex items-center justify-between px-2 py-1 rounded-md ${style.bg}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} shrink-0`} />
                      <span className={`text-[11px] ${style.label} truncate`}>{display}</span>
                    </div>
                    <span className="text-xs font-bold text-white shrink-0 ml-2">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <div className="px-4 py-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Potencia instalada</p>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { icon: Sun, value: muni.total_kw_paneles, label: "kW Pan.", color: "text-yellow-400", bg: "bg-yellow-400/10" },
              { icon: Zap, value: muni.total_kw_inversores, label: "kW Inv.", color: "text-emerald-400", bg: "bg-emerald-400/10" },
              { icon: Battery, value: muni.total_kw_baterias, label: "kWh Bat.", color: "text-blue-400", bg: "bg-blue-400/10" },
            ].map(({ icon: Icon, value, label, color, bg }) => (
              <div key={label} className={`flex flex-col items-center ${bg} rounded-lg px-2 py-1.5`}>
                <Icon className={`h-3 w-3 ${color} mb-0.5`} />
                <span className={`text-xs font-bold ${color}`}>{formatNum(value)}</span>
                <span className="text-[9px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PendientesInstCard ───────────────────────────────────────────────────────

function PendientesInstCard({ municipio, clientes, leads, onClose }: { municipio: string; clientes: Cliente[]; leads: Lead[]; onClose: () => void }) {
  const [expanded, setExpanded] = useState<"clientes" | "leads" | null>(null)
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-80 pointer-events-auto">
      <div className="bg-slate-900/95 border border-orange-500/30 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
        <CardHeader name={municipio} color="text-orange-400" onClose={onClose} />
        <div className="px-4 py-2 flex items-center gap-4 border-b border-slate-700/50 text-xs">
          <span className="text-slate-300"><span className="font-bold text-orange-300 text-sm">{clientes.length}</span> clientes</span>
          <span className="text-slate-300"><span className="font-bold text-amber-300 text-sm">{leads.length}</span> leads</span>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-700/30">
          {clientes.length > 0 && (
            <div>
              <button onClick={() => setExpanded(e => e === "clientes" ? null : "clientes")}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 bg-orange-500/10">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                  <span className="text-[12px] font-semibold text-orange-300">Clientes pendientes</span>
                  <span className="text-xs text-white bg-white/10 px-1.5 py-0.5 rounded-full">{clientes.length}</span>
                </div>
                {expanded === "clientes" ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
              </button>
              {expanded === "clientes" && (
                <div className="bg-slate-950/40 divide-y divide-slate-700/20">
                  {clientes.map(c => (
                    <div key={c.numero ?? c.id} className="px-4 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12px] font-semibold text-white truncate">{c.nombre}</p>
                        {c.numero && <span className="text-[10px] text-slate-500 shrink-0">#{c.numero}</span>}
                      </div>
                      {c.telefono && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><Phone className="h-2.5 w-2.5" />{c.telefono}</p>}
                      {c.direccion && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{c.direccion}</p>}
                      {c.comercial && <p className="text-[10px] text-slate-600 mt-0.5">Comercial: {c.comercial}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {leads.length > 0 && (
            <div>
              <button onClick={() => setExpanded(e => e === "leads" ? null : "leads")}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 bg-amber-500/10">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-[12px] font-semibold text-amber-300">Leads pendientes</span>
                  <span className="text-xs text-white bg-white/10 px-1.5 py-0.5 rounded-full">{leads.length}</span>
                </div>
                {expanded === "leads" ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
              </button>
              {expanded === "leads" && (
                <div className="bg-slate-950/40 divide-y divide-slate-700/20">
                  {leads.map((l, i) => (
                    <div key={l.id ?? i} className="px-4 py-2">
                      <p className="text-[12px] font-semibold text-white truncate">{l.nombre}</p>
                      {l.telefono && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><Phone className="h-2.5 w-2.5" />{l.telefono}</p>}
                      {l.direccion && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{l.direccion}</p>}
                      {l.comercial && <p className="text-[10px] text-slate-600 mt-0.5">Comercial: {l.comercial}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── EnProcesoCard ────────────────────────────────────────────────────────────

function EnProcesoCard({ municipio, clientes, onClose }: { municipio: string; clientes: Cliente[]; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-80 pointer-events-auto">
      <div className="bg-slate-900/95 border border-blue-500/30 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
        <CardHeader name={municipio} color="text-blue-400" onClose={onClose} />
        <div className="px-4 py-2 flex items-center gap-2 border-b border-slate-700/50">
          <Wrench className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span className="text-xs text-slate-300"><span className="font-bold text-blue-300 text-sm">{clientes.length}</span> en proceso</span>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-700/30">
          {clientes.map(c => {
            const key = c.numero ?? c.id ?? ""
            const isOpen = expanded === key
            const falta = (c as Record<string, unknown>).falta_instalacion as string | undefined
            return (
              <div key={key}>
                <button onClick={() => setExpanded(e => e === key ? null : key)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 text-left">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{c.nombre}</p>
                    {c.numero && <p className="text-[10px] text-slate-500">#{c.numero}</p>}
                  </div>
                  {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" />}
                </button>
                {isOpen && (
                  <div className="bg-slate-950/40 px-4 py-2.5 space-y-1">
                    {c.telefono && <p className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{c.telefono}</p>}
                    {c.comercial && <p className="text-[11px] text-slate-400">Comercial: {c.comercial}</p>}
                    {falta ? (
                      <div className="mt-1.5 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-0.5">Falta</p>
                        <p className="text-[11px] text-amber-200">{falta}</p>
                      </div>
                    ) : <p className="text-[11px] text-slate-500 italic">Sin pendientes registrados</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── AveriasCard ──────────────────────────────────────────────────────────────

function AveriasCard({ municipio, clientes, onClose }: { municipio: string; clientes: Cliente[]; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const totalAverias = useMemo(() =>
    clientes.reduce((sum, c) => {
      const avs = (c as Record<string, unknown>).averias as Array<Record<string, unknown>> | undefined
      return sum + (avs?.filter(a => a.estado === "Pendiente").length ?? 0)
    }, 0), [clientes])
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-80 pointer-events-auto">
      <div className="bg-slate-900/95 border border-red-500/30 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
        <CardHeader name={municipio} color="text-red-400" onClose={onClose} />
        <div className="px-4 py-2 flex items-center gap-4 border-b border-slate-700/50 text-xs">
          <span className="text-slate-300"><span className="font-bold text-red-300 text-sm">{clientes.length}</span> clientes</span>
          <span className="text-slate-300"><span className="font-bold text-red-400 text-sm">{totalAverias}</span> averías pendientes</span>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-700/30">
          {clientes.map(c => {
            const key = c.numero ?? c.id ?? ""
            const avs = ((c as Record<string, unknown>).averias as Array<Record<string, unknown>> | undefined)
              ?.filter(a => a.estado === "Pendiente") ?? []
            const isOpen = expanded === key
            return (
              <div key={key}>
                <button onClick={() => setExpanded(e => e === key ? null : key)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 text-left">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{c.nombre}</p>
                    <p className="text-[10px] text-red-400">{avs.length} avería{avs.length !== 1 ? "s" : ""} pendiente{avs.length !== 1 ? "s" : ""}</p>
                  </div>
                  {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-2" />}
                </button>
                {isOpen && (
                  <div className="bg-slate-950/40 px-4 py-2 space-y-1.5">
                    {c.telefono && <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-1"><Phone className="h-2.5 w-2.5" />{c.telefono}</p>}
                    {avs.map((a, i) => (
                      <div key={String(a.id ?? i)} className="p-2 rounded-md bg-red-500/10 border border-red-500/20">
                        <p className="text-[11px] text-red-200">{String(a.descripcion ?? "Sin descripción")}</p>
                        {a.fecha_reporte && <p className="text-[10px] text-slate-500 mt-0.5">Reportada: {new Date(String(a.fecha_reporte)).toLocaleDateString("es-CU")}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── VisitasCard ──────────────────────────────────────────────────────────────

function VisitasCard({ municipio, clientes, leads, onClose }: { municipio: string; clientes: Cliente[]; leads: Lead[]; onClose: () => void }) {
  const [expanded, setExpanded] = useState<"clientes" | "leads" | null>(null)
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-80 pointer-events-auto">
      <div className="bg-slate-900/95 border border-purple-500/30 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
        <CardHeader name={municipio} color="text-purple-400" onClose={onClose} />
        <div className="px-4 py-2 flex items-center gap-4 border-b border-slate-700/50 text-xs">
          <span className="text-slate-300"><span className="font-bold text-purple-300 text-sm">{clientes.length}</span> clientes</span>
          <span className="text-slate-300"><span className="font-bold text-purple-400 text-sm">{leads.length}</span> leads</span>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-700/30">
          {[
            { grupo: "clientes" as const, items: clientes, color: "text-purple-300", bg: "bg-purple-500/10", dot: "bg-purple-400" },
            { grupo: "leads" as const, items: leads, color: "text-purple-300", bg: "bg-purple-500/10", dot: "bg-purple-300" },
          ].map(({ grupo, items, color, bg, dot }) => items.length > 0 && (
            <div key={grupo}>
              <button onClick={() => setExpanded(e => e === grupo ? null : grupo)}
                className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 ${bg}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  <span className={`text-[12px] font-semibold ${color} capitalize`}>{grupo}</span>
                  <span className="text-xs text-white bg-white/10 px-1.5 py-0.5 rounded-full">{items.length}</span>
                </div>
                {expanded === grupo ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
              </button>
              {expanded === grupo && (
                <div className="bg-slate-950/40 divide-y divide-slate-700/20">
                  {items.map((item, i) => {
                    const c = item as Cliente & Lead
                    return (
                      <div key={(c as Cliente).numero ?? c.id ?? i} className="px-4 py-2">
                        <p className="text-[12px] font-semibold text-white truncate">{c.nombre}</p>
                        {c.telefono && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><Phone className="h-2.5 w-2.5" />{c.telefono}</p>}
                        {c.comercial && <p className="text-[10px] text-slate-600 mt-0.5">Comercial: {c.comercial}</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── BrigadasPanel ────────────────────────────────────────────────────────────

function BrigadasPanel({ brigadas, onClose }: { brigadas: Brigada[]; onClose: () => void }) {
  return (
    <div className="absolute inset-y-0 right-0 z-[1000] w-72 pointer-events-auto flex flex-col">
      <div className="bg-slate-900/98 border-l border-slate-700 h-full flex flex-col shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <HardHat className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">Brigadas</span>
            <span className="text-xs text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-full">{brigadas.length}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
          {brigadas.length === 0
            ? <p className="text-center text-slate-500 text-xs py-8">No hay brigadas registradas</p>
            : brigadas.map((b, i) => (
              <div key={b.id ?? b._id ?? i} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Users2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <p className="text-[12px] font-bold text-white truncate">{b.lider?.nombre ?? `Brigada ${i + 1}`}</p>
                </div>
                {b.lider?.CI && <p className="text-[11px] text-slate-400 mb-1">CI Líder: {b.lider.CI}</p>}
                {b.integrantes?.length > 0 && (
                  <div className="ml-2 space-y-0.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Integrantes ({b.integrantes.length})</p>
                    {b.integrantes.map(t => <p key={t.CI} className="text-[11px] text-slate-300">• {t.nombre}</p>)}
                  </div>
                )}
              </div>
            ))}
        </div>
        <div className="px-4 py-3 border-t border-slate-800">
          <Link href="/brigadas" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors">
            <ExternalLink className="h-3 w-3" />Ver todas las brigadas
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CentroControlView() {
  const clock = useLiveClock()
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null)
  const [municipios, setMunicipios] = useState<MunicipioDetallado[]>([])
  const [allClients, setAllClients] = useState<Cliente[]>([])
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [brigadas, setBrigadas] = useState<Brigada[]>([])
  const [clientesConAverias, setClientesConAverias] = useState<Cliente[]>([])
  const [controlData, setControlData] = useState<ControlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(true)
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("todos")
  const [showBrigadas, setShowBrigadas] = useState(false)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros de provincia / municipio
  const [filterProvincia, setFilterProvincia] = useState("")
  const [filterMunicipio, setFilterMunicipio] = useState("")

  // Bounds calculados desde el GeoJSON
  const [geoMuniBoundsMap, setGeoMuniBoundsMap] = useState<Map<string, SimpleBounds>>(new Map())
  const [geoProvBoundsMap, setGeoProvBoundsMap] = useState<Map<string, SimpleBounds>>(new Map())

  // ── Data Fetch ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    try {
      const { start: weekStart, end: weekEnd } = getWeekRange()
      const weekStartStr = toISODate(weekStart), weekEndStr = toISODate(weekEnd)

      const [dashboardResult, pendientesResult, pendientesVisitaResult,
        allClientsResult, clientesConAveriasResult, leadsThisWeekResult,
        allLeadsResult, brigadasResult,
      ] = await Promise.allSettled([
        ResultadosService.getDashboardPrincipal(),
        InstalacionesService.getPendientesInstalacion(),
        apiRequest<{ total_general?: number; clientes?: unknown[]; leads?: unknown[] }>("/pendientes-visita/"),
        fetchAllClientes(),
        ClienteService.getClientesConAverias(),
        LeadService.getLeads({ fechaDesde: weekStartStr, fechaHasta: weekEndStr, limit: 1000 }),
        fetchAllLeads(),
        BrigadaService.getAllBrigadas(),
      ])

      let visitasRealizadas = 0
      try {
        const visitasRes = await apiRequest<Record<string, unknown>>(`/visitas/?estado=completada&fecha_desde=${weekStartStr}&fecha_hasta=${weekEndStr}`)
        const inner = (visitasRes?.data ?? visitasRes) as Record<string, unknown> | null
        const visitas = Array.isArray(inner?.visitas) ? inner.visitas : []
        visitasRealizadas = typeof inner?.total === "number" ? inner.total : visitas.length
      } catch { visitasRealizadas = 0 }

      const dashboard = dashboardResult.status === "fulfilled" ? dashboardResult.value : null
      const pendientes = pendientesResult.status === "fulfilled" ? pendientesResult.value : null
      const pendientesInstalacion = pendientes ? (pendientes.total_leads ?? 0) + (pendientes.total_clientes ?? 0) : 0
      const pendientesVisita = pendientesVisitaResult.status === "fulfilled" ? pendientesVisitaResult.value : null
      const visitasPendientes = pendientesVisita?.total_general ?? ((pendientesVisita?.clientes?.length ?? 0) + (pendientesVisita?.leads?.length ?? 0))

      const clients: Cliente[] = allClientsResult.status === "fulfilled" ? allClientsResult.value : []
      setAllClients(clients)
      const conAverias: Cliente[] = clientesConAveriasResult.status === "fulfilled" ? clientesConAveriasResult.value : []
      setClientesConAverias(conAverias)
      const leads: Lead[] = allLeadsResult.status === "fulfilled" ? allLeadsResult.value : []
      setAllLeads(leads)
      const brigList = brigadasResult.status === "fulfilled" ? brigadasResult.value : []
      setBrigadas(brigList as Brigada[])

      const enProceso = clients.filter(c => isEnProceso(c.estado)).length
      const instalacionesTerminadas = clients.filter(c => {
        const n = normalizeText(c.estado ?? "")
        return (n === "instalacion terminada" || n === "instalado" || n.includes("equipo instalado")) && isInRange(c.fecha_montaje ?? c.fecha_instalacion, weekStart, weekEnd)
      }).length
      const instalacionesComenzadas = clients.filter(c => isEnProceso(c.estado) && isInRange(c.fecha_instalacion ?? c.fecha_montaje, weekStart, weekEnd)).length
      const nuevosClientes = clients.filter(c => isInRange(c.fecha_contacto, weekStart, weekEnd)).length

      let averiasPendientes = 0, averiasSolucionadas = 0
      conAverias.forEach(c => {
        const avs = ((c as unknown as Record<string, unknown>).averias as Array<Record<string, unknown>>) ?? []
        avs.forEach(a => {
          if (a.estado === "Pendiente") averiasPendientes++
          else if (a.estado === "Solucionada" && isInRange(a.fecha_solucion as string, weekStart, weekEnd)) averiasSolucionadas++
        })
      })

      const leadsData = leadsThisWeekResult.status === "fulfilled" ? leadsThisWeekResult.value : { leads: [], total: 0 }
      const nuevosLeads = leadsData.total > 0 ? leadsData.total : leadsData.leads.length

      setControlData({
        totalClientes: dashboard?.cantidad_clientes ?? clients.length,
        totalMunicipios: dashboard?.cantidad_municipios_instalados ?? 0,
        totalKwPaneles: dashboard?.total_kw_paneles ?? 0,
        totalKwInversores: dashboard?.total_kw_inversores ?? 0,
        totalKwhBaterias: dashboard?.total_kw_baterias ?? 0,
        pendientesInstalacion, enProceso, averiasPendientes, visitasPendientes,
        instalacionesTerminadas, instalacionesComenzadas, nuevosLeads, nuevosClientes,
        averiasSolucionadas, visitasRealizadas,
      })
      setLastUpdate(new Date())
    } catch (err) {
      console.error("Error cargando datos:", err)
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  // ── Map Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function loadMap() {
      setMapLoading(true)
      try {
        const [muniData, geoRes] = await Promise.all([
          ResultadosService.getMunicipiosDetallados(),
          fetch("/data/cuba-municipios.geojson", { cache: "force-cache" }),
        ])
        if (!geoRes.ok) throw new Error("GeoJSON no disponible")
        const geoJson = (await geoRes.json()) as GeoJsonObject
        if (!cancelled) { setMunicipios(muniData); setGeoJsonData(geoJson) }
      } catch (err) {
        console.error("Error cargando mapa:", err)
      } finally {
        if (!cancelled) setMapLoading(false)
      }
    }
    loadMap()
    return () => { cancelled = true }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { setSelectedItem(null) }, [viewMode])

  // ── Compute GeoJSON bounds ──────────────────────────────────────────────────
  useEffect(() => {
    if (!geoJsonData || !municipios.length) return
    const fc = geoJsonData as FeatureCollection
    if (!fc.features) return

    // municipio name → provincia (from backend data)
    const muniToProvMap = new Map<string, string>()
    municipios.forEach(m => muniToProvMap.set(normalizeText(m.municipio), m.provincia))

    const muniBounds = new Map<string, SimpleBounds>()
    const provBounds = new Map<string, SimpleBounds>()

    fc.features.forEach(f => {
      const shapeName = f.properties?.shapeName as string | undefined
      if (!shapeName || !f.geometry) return
      const bounds = computeGeoJSONBounds(f.geometry)
      if (!bounds) return
      const key = normalizeText(shapeName)
      muniBounds.set(key, bounds)

      const provincia = muniToProvMap.get(key)
      if (provincia) {
        const provKey = normalizeText(provincia)
        const prev = provBounds.get(provKey)
        provBounds.set(provKey, prev ? mergeBounds(prev, bounds) : bounds)
      }
    })

    setGeoMuniBoundsMap(muniBounds)
    setGeoProvBoundsMap(provBounds)
  }, [geoJsonData, municipios])

  // ── Municipio maps ──────────────────────────────────────────────────────────
  const municipioMap = useMemo(() => {
    const map = new Map<string, MunicipioDetallado>()
    for (const m of municipios) {
      const key = normalizeText(m.municipio)
      if (key && m.cantidad_clientes > 0) map.set(key, m)
    }
    return map
  }, [municipios])

  const maxClientes = useMemo(() => Math.max(...municipios.map(m => m.cantidad_clientes ?? 0), 1), [municipios])

  const pendientesInstMap = useMemo(() => {
    const map = new Map<string, { clientes: Cliente[]; leads: Lead[] }>()
    allClients.filter(c => isPendienteInstalacion(c.estado)).forEach(c => {
      const key = normalizeText(c.municipio); if (!key) return
      const e = map.get(key) ?? { clientes: [], leads: [] }; e.clientes.push(c); map.set(key, e)
    })
    allLeads.filter(l => isPendienteInstalacion(l.estado)).forEach(l => {
      const key = normalizeText(l.municipio); if (!key) return
      const e = map.get(key) ?? { clientes: [], leads: [] }; e.leads.push(l); map.set(key, e)
    })
    return map
  }, [allClients, allLeads])

  const enProcesoMap = useMemo(() => {
    const map = new Map<string, Cliente[]>()
    allClients.filter(c => isEnProceso(c.estado)).forEach(c => {
      const key = normalizeText(c.municipio); if (!key) return
      const list = map.get(key) ?? []; list.push(c); map.set(key, list)
    })
    return map
  }, [allClients])

  const averiasMap = useMemo(() => {
    const map = new Map<string, Cliente[]>()
    clientesConAverias.filter(c => {
      const avs = (c as unknown as Record<string, unknown>).averias as Array<Record<string, unknown>> | undefined
      return avs?.some(a => a.estado === "Pendiente")
    }).forEach(c => {
      const key = normalizeText(c.municipio); if (!key) return
      const list = map.get(key) ?? []; list.push(c); map.set(key, list)
    })
    return map
  }, [clientesConAverias])

  const visitasMap = useMemo(() => {
    const map = new Map<string, { clientes: Cliente[]; leads: Lead[] }>()
    allClients.filter(c => isPendienteVisita(c.estado)).forEach(c => {
      const key = normalizeText(c.municipio); if (!key) return
      const e = map.get(key) ?? { clientes: [], leads: [] }; e.clientes.push(c); map.set(key, e)
    })
    allLeads.filter(l => isPendienteVisita(l.estado)).forEach(l => {
      const key = normalizeText(l.municipio); if (!key) return
      const e = map.get(key) ?? { clientes: [], leads: [] }; e.leads.push(l); map.set(key, e)
    })
    return map
  }, [allClients, allLeads])

  const maxByMode = useMemo(() => {
    if (viewMode === "pendientes_instalacion") return Math.max(...Array.from(pendientesInstMap.values()).map(v => v.clientes.length + v.leads.length), 1)
    if (viewMode === "en_proceso") return Math.max(...Array.from(enProcesoMap.values()).map(v => v.length), 1)
    if (viewMode === "averias") return Math.max(...Array.from(averiasMap.values()).map(v => v.length), 1)
    if (viewMode === "visitas") return Math.max(...Array.from(visitasMap.values()).map(v => v.clientes.length + v.leads.length), 1)
    return maxClientes
  }, [viewMode, pendientesInstMap, enProcesoMap, averiasMap, visitasMap, maxClientes])

  // ── Filtros provincia / municipio ───────────────────────────────────────────
  const provinciasDisponibles = useMemo(() =>
    [...new Set(municipios.map(m => m.provincia))].sort(), [municipios])

  const municipiosDeProvinicia = useMemo(() =>
    municipios.filter(m => m.provincia === filterProvincia).map(m => m.municipio).sort(),
    [municipios, filterProvincia])

  const currentBounds = useMemo<SimpleBounds | null>(() => {
    if (filterMunicipio) return geoMuniBoundsMap.get(normalizeText(filterMunicipio)) ?? null
    if (filterProvincia) return geoProvBoundsMap.get(normalizeText(filterProvincia)) ?? null
    return null
  }, [filterProvincia, filterMunicipio, geoMuniBoundsMap, geoProvBoundsMap])

  // ── Estadísticas comerciales ────────────────────────────────────────────────
  const leadsByEstado = useMemo(() => {
    const counts = new Map<string, number>()
    allLeads.forEach(l => {
      const raw = (l.estado ?? "").trim()
      const estado = ESTADOS_VALIDOS_LEAD.has(raw) ? raw : "Sin estado"
      counts.set(estado, (counts.get(estado) ?? 0) + 1)
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [allLeads])

  const conversionPct = useMemo(() => {
    const total = allClients.length + allLeads.length
    return total ? Math.round((allClients.length / total) * 1000) / 10 : 0
  }, [allClients.length, allLeads.length])

  // ── Map styles ──────────────────────────────────────────────────────────────
  const getFeatureStyle = useCallback((feature?: Feature): PathOptions => {
    const shapeName = String((feature?.properties as Record<string, unknown> | undefined)?.shapeName ?? "")
    const key = normalizeText(shapeName)
    let count = 0
    if (viewMode === "todos") count = municipioMap.get(key)?.cantidad_clientes ?? 0
    else if (viewMode === "pendientes_instalacion") { const e = pendientesInstMap.get(key); count = (e?.clientes.length ?? 0) + (e?.leads.length ?? 0) }
    else if (viewMode === "en_proceso") count = enProcesoMap.get(key)?.length ?? 0
    else if (viewMode === "averias") count = averiasMap.get(key)?.length ?? 0
    else if (viewMode === "visitas") { const e = visitasMap.get(key); count = (e?.clientes.length ?? 0) + (e?.leads.length ?? 0) }
    if (!count) return { color: "#1e293b", weight: 0.4, fillColor: "#0f172a", fillOpacity: 0.5 }
    const ratio = Math.min(count / maxByMode, 1)
    return { color: borderColor(viewMode), weight: 1.5, fillColor: densityColor(ratio, viewMode), fillOpacity: 0.9 }
  }, [viewMode, municipioMap, pendientesInstMap, enProcesoMap, averiasMap, visitasMap, maxByMode])

  const onEachFeature = useCallback((feature: Feature, layer: Layer) => {
    const shapeName = String((feature.properties as Record<string, unknown> | undefined)?.shapeName ?? "")
    const key = normalizeText(shapeName)

    // Calcular count para el modo actual
    let modeCount = 0
    let modeLabel = "cliente"
    if (viewMode === "todos") { modeCount = municipioMap.get(key)?.cantidad_clientes ?? 0; modeLabel = "cliente" }
    else if (viewMode === "pendientes_instalacion") { const e = pendientesInstMap.get(key); modeCount = (e?.clientes.length ?? 0) + (e?.leads.length ?? 0); modeLabel = "pendiente" }
    else if (viewMode === "en_proceso") { modeCount = enProcesoMap.get(key)?.length ?? 0; modeLabel = "en proceso" }
    else if (viewMode === "averias") { modeCount = averiasMap.get(key)?.length ?? 0; modeLabel = "con avería" }
    else if (viewMode === "visitas") { const e = visitasMap.get(key); modeCount = (e?.clientes.length ?? 0) + (e?.leads.length ?? 0); modeLabel = "visita pendiente" }

    // Etiqueta permanente solo en municipios con datos
    if (modeCount > 0 && "bindTooltip" in layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(layer as any).bindTooltip(shapeName, {
        permanent: true,
        direction: "center",
        className: "muni-label",
      })
    }

    if ("on" in layer && "setStyle" in layer) {
      const typed = layer as { on: (ev: Record<string, (e: LeafletMouseEvent) => void>) => void; setStyle: (s: PathOptions) => void; bringToFront: () => void }
      typed.on({
        mouseover: (e: LeafletMouseEvent) => {
          if (!modeCount) return
          e.target.setStyle({ weight: 2.5, color: borderColor(viewMode), fillOpacity: 1 })
          e.target.bringToFront()
          const me = e.originalEvent as MouseEvent
          setTooltip({ municipio: shapeName, count: modeCount, label: modeLabel, x: me.clientX, y: me.clientY })
        },
        mousemove: (e: LeafletMouseEvent) => {
          const me = e.originalEvent as MouseEvent
          setTooltip(prev => prev ? { ...prev, x: me.clientX, y: me.clientY } : null)
        },
        mouseout: (e: LeafletMouseEvent) => { e.target.setStyle(getFeatureStyle(feature)); setTooltip(null) },
        click: () => {
          setTooltip(null)
          if (viewMode === "todos") {
            const muni = municipioMap.get(key); if (!muni) return
            setSelectedItem(prev => prev?.mode === "todos" && prev.muni.municipio === muni.municipio ? null : { mode: "todos", muni })
          } else if (viewMode === "pendientes_instalacion") {
            const en = pendientesInstMap.get(key); if (!en || (!en.clientes.length && !en.leads.length)) return
            setSelectedItem(prev => prev?.mode === "pendientes_instalacion" && prev.municipio === shapeName ? null : { mode: "pendientes_instalacion", municipio: shapeName, clientes: en.clientes, leads: en.leads })
          } else if (viewMode === "en_proceso") {
            const cs = enProcesoMap.get(key); if (!cs?.length) return
            setSelectedItem(prev => prev?.mode === "en_proceso" && prev.municipio === shapeName ? null : { mode: "en_proceso", municipio: shapeName, clientes: cs })
          } else if (viewMode === "averias") {
            const cs = averiasMap.get(key); if (!cs?.length) return
            setSelectedItem(prev => prev?.mode === "averias" && prev.municipio === shapeName ? null : { mode: "averias", municipio: shapeName, clientes: cs })
          } else if (viewMode === "visitas") {
            const ev = visitasMap.get(key); if (!ev || (!ev.clientes.length && !ev.leads.length)) return
            setSelectedItem(prev => prev?.mode === "visitas" && prev.municipio === shapeName ? null : { mode: "visitas", municipio: shapeName, clientes: ev.clientes, leads: ev.leads })
          }
        },
      })
    }
  }, [viewMode, municipioMap, pendientesInstMap, enProcesoMap, averiasMap, visitasMap, getFeatureStyle])

  const weekLabel = useMemo(() => {
    const { start, end } = getWeekRange()
    const fmt = (d: Date) => d.toLocaleDateString("es-CU", { day: "2-digit", month: "short" })
    return `${fmt(start)} – ${fmt(end)}`
  }, [])

  const geoKey = `${viewMode}-${municipioMap.size}-${pendientesInstMap.size}-${enProcesoMap.size}-${averiasMap.size}-${visitasMap.size}`

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col overflow-hidden text-white">

      {/* Estilos para etiquetas del mapa */}
      <style>{`
        .muni-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          font-size: 9px !important;
          font-weight: 800 !important;
          color: rgba(255,255,255,0.95) !important;
          text-shadow: 0 0 3px #000, 0 0 6px #000, 0 1px 2px #000 !important;
          white-space: nowrap !important;
          pointer-events: none !important;
        }
        .muni-label::before { display: none !important; }
        .leaflet-tooltip.muni-label { margin: 0 !important; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-500/20 bg-slate-900/80 backdrop-blur-sm shrink-0 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-sm font-bold text-amber-400 tracking-wider uppercase truncate">Centro de Control · Operaciones</span>
          <span className="text-xs text-slate-500 hidden sm:inline shrink-0">SunCar S.R.L.</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {lastUpdate && <span className="text-[10px] text-slate-500 hidden md:inline">Act.: {lastUpdate.toLocaleTimeString("es-CU")}</span>}
          <button onClick={() => fetchData(true)} disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <div className="text-sm font-mono text-amber-300 tabular-nums">{clock.toLocaleTimeString("es-CU")}</div>
          <div className="text-[11px] text-slate-400 hidden lg:block">
            {clock.toLocaleDateString("es-CU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      {/* ── KPI Bar ── */}
      <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-slate-900/60 border-b border-slate-800 shrink-0">
        {[
          { label: "Clientes",      value: controlData?.totalClientes ?? 0,     icon: Users,    color: "text-orange-400",  bg: "bg-orange-400/10",  dec: 0 },
          { label: "Municipios",    value: controlData?.totalMunicipios ?? 0,   icon: Building2,color: "text-amber-400",   bg: "bg-amber-400/10",   dec: 0 },
          { label: "kW Paneles",    value: controlData?.totalKwPaneles ?? 0,    icon: Sun,      color: "text-yellow-400",  bg: "bg-yellow-400/10",  dec: 1 },
          { label: "kW Inversores", value: controlData?.totalKwInversores ?? 0, icon: Cpu,      color: "text-emerald-400", bg: "bg-emerald-400/10", dec: 1 },
          { label: "kWh Baterías",  value: controlData?.totalKwhBaterias ?? 0,  icon: Battery,  color: "text-blue-400",    bg: "bg-blue-400/10",    dec: 1 },
        ].map(kpi => (
          <div key={kpi.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${kpi.bg} border border-white/5`}>
            <kpi.icon className={`h-4 w-4 ${kpi.color} shrink-0`} />
            <div className="min-w-0">
              <div className={`text-sm font-bold ${kpi.color} truncate`}>{loading ? "—" : formatNum(kpi.value, kpi.dec)}</div>
              <div className="text-[10px] text-slate-400 truncate">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left Panel ── */}
        <div className={`flex flex-col transition-all duration-300 shrink-0 border-r border-slate-800 bg-slate-900/50 ${leftOpen ? "w-64" : "w-8"}`}>
          <button onClick={() => setLeftOpen(p => !p)}
            className="flex items-center justify-center h-8 border-b border-slate-800 hover:bg-slate-800/60 transition-colors shrink-0">
            {leftOpen ? <ChevronLeft className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </button>

          {leftOpen && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4">

              {/* ── OPERACIONES ── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Operaciones</span>
                </div>
                <div className="space-y-1">
                  <OperacionesBtn icon={Clock} label="Pendientes instalación" value={controlData?.pendientesInstalacion ?? 0}
                    color="text-orange-400" activeBg="bg-orange-500/20" active={viewMode === "pendientes_instalacion"} loading={loading}
                    onClick={() => setViewMode(v => v === "pendientes_instalacion" ? "todos" : "pendientes_instalacion")} />
                  <OperacionesBtn icon={Wrench} label="En proceso" value={controlData?.enProceso ?? 0}
                    color="text-blue-400" activeBg="bg-blue-500/20" active={viewMode === "en_proceso"} loading={loading}
                    onClick={() => setViewMode(v => v === "en_proceso" ? "todos" : "en_proceso")} />
                  <OperacionesBtn icon={TriangleAlert} label="Averías pendientes" value={controlData?.averiasPendientes ?? 0}
                    color="text-red-400" activeBg="bg-red-500/20" active={viewMode === "averias"} loading={loading}
                    onClick={() => setViewMode(v => v === "averias" ? "todos" : "averias")} />
                  <OperacionesBtn icon={CalendarClock} label="Visitas pendientes" value={controlData?.visitasPendientes ?? 0}
                    color="text-purple-400" activeBg="bg-purple-500/20" active={viewMode === "visitas"} loading={loading}
                    onClick={() => setViewMode(v => v === "visitas" ? "todos" : "visitas")} />
                  <button onClick={() => setShowBrigadas(b => !b)}
                    className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-all gap-2 text-left
                      ${showBrigadas ? "bg-amber-500/20 ring-1 ring-inset ring-white/20" : "bg-white/5 hover:bg-white/10"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <HardHat className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="text-[11px] text-slate-300 truncate">Brigadas registradas</span>
                    </div>
                    {loading ? <div className="h-4 w-7 bg-slate-700 rounded animate-pulse" />
                      : <span className="text-sm font-bold text-amber-400 shrink-0">{brigadas.length}</span>}
                  </button>
                </div>
                {viewMode !== "todos" && (
                  <div className="mt-2 px-2 py-1.5 rounded-md bg-white/5 border border-white/10">
                    <p className="text-[10px] text-slate-400">
                      Mapa:{" "}
                      <span className={viewMode === "pendientes_instalacion" ? "text-orange-400 font-semibold"
                        : viewMode === "en_proceso" ? "text-blue-400 font-semibold"
                        : viewMode === "averias" ? "text-red-400 font-semibold"
                        : "text-purple-400 font-semibold"}>
                        {viewMode === "pendientes_instalacion" ? "pendientes" : viewMode === "en_proceso" ? "en proceso" : viewMode === "averias" ? "averías" : "visitas"}
                      </span>
                    </p>
                    <button onClick={() => setViewMode("todos")} className="text-[10px] text-slate-500 hover:text-slate-300 mt-0.5 underline">Ver todos</button>
                  </div>
                )}
              </div>

              {/* ── COMERCIAL ── */}
              <div>
                <div className="flex items-center gap-2 mb-2 pt-1 border-t border-slate-800">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400 mt-1" />
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mt-1">Comercial</span>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2 mb-1.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5"><Users2 className="h-3 w-3 text-amber-400" />Leads totales</span>
                    <span className="text-sm font-bold text-amber-400">{loading ? "—" : allLeads.length}</span>
                  </div>
                  {!loading && leadsByEstado.map(([estado, count]) => (
                    <div key={estado} className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getEstadoStyle(estado).dot}`} />
                        <span className="text-[10px] text-slate-400 truncate">{estado}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-300 shrink-0 ml-1">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-emerald-400" />Conversión lead → cliente</span>
                    <span className="text-sm font-bold text-emerald-400">{loading ? "—" : `${conversionPct}%`}</span>
                  </div>
                  {!loading && (
                    <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1">
                      <div className="bg-emerald-400 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(conversionPct, 100)}%` }} />
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-0.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Accesos rápidos</p>
                  {[
                    { href: "/leads", label: "Ver leads", color: "hover:text-amber-400" },
                    { href: "/clientes", label: "Ver clientes", color: "hover:text-orange-400" },
                    { href: "/instalaciones", label: "Instalaciones", color: "hover:text-blue-400" },
                    { href: "/resultados", label: "Resultados", color: "hover:text-emerald-400" },
                    { href: "/brigadas", label: "Brigadas", color: "hover:text-amber-400" },
                  ].map(link => (
                    <Link key={link.href} href={link.href}
                      className={`flex items-center gap-1 text-[10px] text-slate-500 ${link.color} transition-colors py-0.5`}>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />{link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Map ── */}
        <div className="flex-1 relative min-w-0">

          {/* ── Filtros provincia / municipio ── */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={filterProvincia}
              onChange={e => { setFilterProvincia(e.target.value); setFilterMunicipio("") }}
              className="bg-transparent text-xs text-slate-300 border-0 outline-none cursor-pointer pr-1"
            >
              <option value="" className="bg-slate-900">🇨🇺 Toda Cuba</option>
              {provinciasDisponibles.map(p => (
                <option key={p} value={p} className="bg-slate-900">{p}</option>
              ))}
            </select>

            {filterProvincia && (
              <>
                <span className="text-slate-600 text-xs">/</span>
                <select
                  value={filterMunicipio}
                  onChange={e => setFilterMunicipio(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 border-0 outline-none cursor-pointer pr-1"
                >
                  <option value="" className="bg-slate-900">Todos los municipios</option>
                  {municipiosDeProvinicia.map(m => (
                    <option key={m} value={m} className="bg-slate-900">{m}</option>
                  ))}
                </select>
              </>
            )}

            {(filterProvincia || filterMunicipio) && (
              <button
                onClick={() => { setFilterProvincia(""); setFilterMunicipio("") }}
                className="ml-1 p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Loading */}
          {mapLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
              <p className="text-slate-400 text-sm">Cargando mapa...</p>
            </div>
          )}

          {/* Hover tooltip */}
          {tooltip && (
            <div className="fixed z-50 pointer-events-none bg-slate-900/95 border border-amber-500/40 rounded-lg px-3 py-2 shadow-xl"
              style={{ left: tooltip.x + 14, top: tooltip.y - 50 }}>
              <p className="text-xs font-bold text-amber-400">{tooltip.municipio}</p>
              <p className="text-xs text-white">{tooltip.count} {tooltip.label}{tooltip.count !== 1 ? "s" : ""}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Click para ver detalle</p>
            </div>
          )}

          {!mapLoading && (
            <MapContainer center={[22.0, -79.5]} zoom={7} className="h-full w-full" zoomControl={false} attributionControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="" />
              <ZoomControl position="bottomright" />
              <MapController bounds={currentBounds} />
              {geoJsonData && (
                <GeoJSON
                  key={geoKey}
                  data={geoJsonData}
                  style={getFeatureStyle}
                  onEachFeature={onEachFeature}
                />
              )}
            </MapContainer>
          )}

          {/* Leyenda densidad */}
          {viewMode !== "todos" && (
            <div className="absolute bottom-16 right-3 z-[1000] bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-400 space-y-1 backdrop-blur-sm">
              <p className={`font-semibold mb-1 ${viewMode === "pendientes_instalacion" ? "text-orange-400" : viewMode === "en_proceso" ? "text-blue-400" : viewMode === "averias" ? "text-red-400" : "text-purple-400"}`}>
                Densidad
              </p>
              {([0.9, 0.65, 0.4, 0.15] as const).map((ratio, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: densityColor(ratio, viewMode) }} />
                  {["Muy alto", "Alto", "Medio", "Bajo"][i]}
                </div>
              ))}
            </div>
          )}

          {/* Cards */}
          {selectedItem?.mode === "todos" && <MunicipioCard muni={selectedItem.muni} allClients={allClients} onClose={() => setSelectedItem(null)} />}
          {selectedItem?.mode === "pendientes_instalacion" && <PendientesInstCard municipio={selectedItem.municipio} clientes={selectedItem.clientes} leads={selectedItem.leads} onClose={() => setSelectedItem(null)} />}
          {selectedItem?.mode === "en_proceso" && <EnProcesoCard municipio={selectedItem.municipio} clientes={selectedItem.clientes} onClose={() => setSelectedItem(null)} />}
          {selectedItem?.mode === "averias" && <AveriasCard municipio={selectedItem.municipio} clientes={selectedItem.clientes} onClose={() => setSelectedItem(null)} />}
          {selectedItem?.mode === "visitas" && <VisitasCard municipio={selectedItem.municipio} clientes={selectedItem.clientes} leads={selectedItem.leads} onClose={() => setSelectedItem(null)} />}
          {showBrigadas && <BrigadasPanel brigadas={brigadas} onClose={() => setShowBrigadas(false)} />}

          <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_80px_rgba(0,0,0,0.7)]" />
        </div>

        {/* ── Right Panel ── */}
        <div className={`flex flex-col transition-all duration-300 shrink-0 border-l border-slate-800 bg-slate-900/50 ${rightOpen ? "w-64" : "w-8"}`}>
          <button onClick={() => setRightOpen(p => !p)}
            className="flex items-center justify-center h-8 border-b border-slate-800 hover:bg-slate-800/60 transition-colors shrink-0">
            {rightOpen ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronLeft className="h-4 w-4 text-slate-400" />}
          </button>
          {rightOpen && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Esta Semana</span>
              </div>
              <div className="text-[10px] text-slate-500 mb-3">{weekLabel}</div>
              {[
                { icon: CheckCircle, label: "Instalaciones terminadas", value: controlData?.instalacionesTerminadas ?? 0, color: "text-emerald-400" },
                { icon: PlayCircle,  label: "Instalaciones comenzadas", value: controlData?.instalacionesComenzadas ?? 0, color: "text-blue-400" },
                { icon: Phone,       label: "Nuevos leads",             value: controlData?.nuevosLeads ?? 0,             color: "text-amber-400" },
                { icon: UserPlus,    label: "Nuevos clientes",          value: controlData?.nuevosClientes ?? 0,          color: "text-orange-400" },
                { icon: Shield,      label: "Averías solucionadas",     value: controlData?.averiasSolucionadas ?? 0,     color: "text-green-400" },
                { icon: Eye,         label: "Visitas realizadas",       value: controlData?.visitasRealizadas ?? 0,       color: "text-purple-400" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`h-3.5 w-3.5 ${color} shrink-0`} />
                    <span className="text-[11px] text-slate-300 leading-tight truncate">{label}</span>
                  </div>
                  {loading ? <div className="h-4 w-7 bg-slate-700 rounded animate-pulse shrink-0" />
                    : <span className={`text-sm font-bold ${color} shrink-0`}>{value}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
