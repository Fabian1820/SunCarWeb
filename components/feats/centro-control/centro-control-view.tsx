"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import type { Feature, FeatureCollection, GeoJsonObject } from "geojson"
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet"
import L from "leaflet"
import { GeoJSON, MapContainer, Marker, TileLayer, ZoomControl, useMap } from "react-leaflet"
import {
  Users, Sun, Cpu, Battery, Clock,
  Eye, CheckCircle, UserPlus, Building2, Calendar,
  Activity, RefreshCw, Wrench, PlayCircle, Phone, Shield, ArrowLeft,
  X, MapPin, Zap, ChevronDown, ChevronUp, TrendingUp, Users2,
  HardHat, TriangleAlert, CalendarClock, ExternalLink, Filter,
  XCircle, Bookmark, UserCheck,
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
interface Point2D { lat: number; lng: number }

interface ControlData {
  totalClientes: number; totalMunicipios: number; totalKwPaneles: number
  totalKwInversores: number; totalKwhBaterias: number; pendientesInstalacion: number
  enProceso: number; averiasPendientes: number; visitasPendientes: number
  instalacionesTerminadas: number; instalacionesComenzadas: number; nuevosLeads: number
  nuevosClientes: number; averiasSolucionadas: number; visitasRealizadas: number
}

interface TooltipInfo { municipio: string; count: number; label: string; x: number; y: number }
interface ComercialResumen { confirmadas: number; canceladas: number; reservadas: number }

type SelectedItem =
  | { mode: "todos"; muni: MunicipioDetallado }
  | { mode: "pendientes_instalacion"; municipio: string; clientes: Cliente[]; leads: Lead[] }
  | { mode: "en_proceso"; municipio: string; clientes: Cliente[] }
  | { mode: "averias"; municipio: string; clientes: Cliente[] }
  | { mode: "visitas"; municipio: string; clientes: Cliente[]; leads: Lead[] }

interface MaterialAgregado {
  nombre: string
  categoria: string
  cantidad: number
  entidades: Array<{
    nombre: string
    numero: string
    tipo: "cliente" | "lead"
    cantidad: number
    provincia: string
    municipio: string
  }>
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const CUBA_PROVINCIAS_ORDEN = [
  "Pinar del Río", "Artemisa", "La Habana", "Mayabeque", "Matanzas",
  "Cienfuegos", "Villa Clara", "Sancti Spíritus", "Ciego de Ávila",
  "Camagüey", "Las Tunas", "Holguín", "Granma", "Santiago de Cuba",
  "Guantánamo", "Isla de la Juventud",
]

const ESTADOS_VALIDOS_LEAD = new Set([
  "Esperando equipo", "No interesado", "Pendiente de instalación",
  "Pendiente de presupuesto", "Pendiente de visita", "Pendiente de visitarnos",
  "Proximamente", "Revisando ofertas", "Sin respuesta",
])

/** Ordena clientes o leads por fecha_contacto desc (más reciente primero) */
function sortByFechaDesc<T extends { fecha_contacto?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const da = a.fecha_contacto ? new Date(a.fecha_contacto).getTime() : 0
    const db = b.fecha_contacto ? new Date(b.fecha_contacto).getTime() : 0
    return db - da
  })
}

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

function computeGeoJSONCenter(geometry: Feature["geometry"]): Point2D | null {
  const points: Point2D[] = []
  function walk(coords: unknown): void {
    if (!Array.isArray(coords)) return
    if (typeof coords[0] === "number") {
      points.push({ lng: Number(coords[0]), lat: Number(coords[1]) })
      return
    }
    coords.forEach(walk)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = geometry as any
  if (!g?.coordinates) return null
  walk(g.coordinates)
  if (!points.length) return null
  const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length
  const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length
  return { lat: avgLat, lng: avgLng }
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
                  {sortByFechaDesc(clientes).map(c => (
                    <div key={c.numero ?? c.id} className="px-4 py-2 space-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12px] font-semibold text-white truncate">{c.nombre}</p>
                        {c.numero && <span className="text-[10px] text-slate-500 shrink-0">#{c.numero}</span>}
                      </div>
                      {c.telefono && <p className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="h-2.5 w-2.5 shrink-0" />{c.telefono}</p>}
                      {c.direccion && <p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{c.direccion}</span></p>}
                      {(c.fecha_contacto || (c as unknown as Record<string, unknown>).created_at as string | undefined) && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5 shrink-0" />
                          Alta: {new Date(String(c.fecha_contacto ?? (c as unknown as Record<string, unknown>).created_at as string | undefined)).toLocaleDateString("es-CU")}
                        </p>
                      )}
                      {c.comercial && <p className="text-[10px] text-slate-600">Comercial: {c.comercial}</p>}
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
                  {sortByFechaDesc(leads).map((l, i) => (
                    <div key={l.id ?? i} className="px-4 py-2 space-y-0.5">
                      <p className="text-[12px] font-semibold text-white truncate">{l.nombre}</p>
                      {l.telefono && <p className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="h-2.5 w-2.5 shrink-0" />{l.telefono}</p>}
                      {l.direccion && <p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{l.direccion}</span></p>}
                      {l.fecha_contacto && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5 shrink-0" />
                          Contacto: {new Date(l.fecha_contacto).toLocaleDateString("es-CU")}
                        </p>
                      )}
                      {l.comercial && <p className="text-[10px] text-slate-600">Comercial: {l.comercial}</p>}
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
          {sortByFechaDesc(clientes).map(c => {
            const key = c.numero ?? c.id ?? ""
            const isOpen = expanded === key
            const falta = (c as unknown as Record<string, unknown>).falta_instalacion as string | undefined
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
                    {c.direccion && <p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{c.direccion}</span></p>}
                    {c.comercial && <p className="text-[11px] text-slate-400">Comercial: {c.comercial}</p>}
                    {(c.fecha_contacto || (c as unknown as Record<string, unknown>).created_at as string | undefined) && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5 shrink-0" />
                        Alta: {new Date(String(c.fecha_contacto ?? (c as unknown as Record<string, unknown>).created_at as string | undefined)).toLocaleDateString("es-CU")}
                      </p>
                    )}
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
      const avs = (c as unknown as Record<string, unknown>).averias as Array<Record<string, unknown>> | undefined
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
          {sortByFechaDesc(clientes).map(c => {
            const key = c.numero ?? c.id ?? ""
            const avs = ((c as unknown as Record<string, unknown>).averias as Array<Record<string, unknown>> | undefined)
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
                    {c.telefono && <p className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{c.telefono}</p>}
                    {c.direccion && <p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{c.direccion}</span></p>}
                    {(c.fecha_contacto || (c as unknown as Record<string, unknown>).created_at as string | undefined) && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5 shrink-0" />
                        Alta: {new Date(String(c.fecha_contacto ?? (c as unknown as Record<string, unknown>).created_at as string | undefined)).toLocaleDateString("es-CU")}
                      </p>
                    )}
                    {avs.map((a, i) => (
                      <div key={String(a.id ?? i)} className="p-2 rounded-md bg-red-500/10 border border-red-500/20">
                        <p className="text-[11px] text-red-200">{String(a.descripcion ?? "Sin descripción")}</p>
                        {a.fecha_reporte != null && <p className="text-[10px] text-slate-500 mt-0.5">Reportada: {new Date(String(a.fecha_reporte)).toLocaleDateString("es-CU")}</p>}
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
            { grupo: "clientes" as const, items: sortByFechaDesc(clientes), color: "text-purple-300", bg: "bg-purple-500/10", dot: "bg-purple-400" },
            { grupo: "leads" as const, items: sortByFechaDesc(leads), color: "text-purple-300", bg: "bg-purple-500/10", dot: "bg-purple-300" },
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
                    const isCliente = grupo === "clientes"
                    const fechaAlta = isCliente
                      ? (c.fecha_contacto ?? (c as unknown as Record<string, unknown>).created_at as string | undefined as string | undefined)
                      : c.fecha_contacto
                    return (
                      <div key={(c as Cliente).numero ?? c.id ?? i} className="px-4 py-2 space-y-0.5">
                        <p className="text-[12px] font-semibold text-white truncate">{c.nombre}</p>
                        {c.telefono && <p className="text-[11px] text-slate-400 flex items-center gap-1"><Phone className="h-2.5 w-2.5 shrink-0" />{c.telefono}</p>}
                        {c.direccion && <p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{c.direccion}</span></p>}
                        {fechaAlta && (
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5 shrink-0" />
                            {isCliente ? "Alta" : "Contacto"}: {new Date(String(fechaAlta)).toLocaleDateString("es-CU")}
                          </p>
                        )}
                        {c.comercial && <p className="text-[10px] text-slate-600">Comercial: {c.comercial}</p>}
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

// ─── agregarMateriales helpers ────────────────────────────────────────────────

function catPeso(cat: string): number {
  const n = normalizeText(cat)
  if (n.includes("inversor")) return 0
  if (n.includes("bateria") || n.includes("batería")) return 1
  if (n.includes("estructura") || n.includes("soporte")) return 2
  if (n.includes("panel")) return 3
  if (n.includes("mppt")) return 4
  return 10
}

function catStyle(cat: string): { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string } {
  const n = normalizeText(cat)
  if (n.includes("inversor"))                             return { icon: Zap,     color: "text-yellow-400",  bg: "bg-yellow-400/10",  border: "border-yellow-400/25" }
  if (n.includes("bateria") || n.includes("batería"))     return { icon: Battery, color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/25" }
  if (n.includes("panel"))                                return { icon: Sun,     color: "text-orange-400",  bg: "bg-orange-400/10",  border: "border-orange-400/25" }
  if (n.includes("cable"))                                return { icon: Zap,     color: "text-cyan-400",    bg: "bg-cyan-400/10",    border: "border-cyan-400/25" }
  if (n.includes("soporte") || n.includes("estructura"))  return { icon: HardHat, color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/25" }
  return { icon: Wrench, color: "text-slate-300", bg: "bg-slate-400/10", border: "border-slate-400/25" }
}

type RawConfeccionOferta = {
  id?: string
  _id?: string
  cliente_numero?: string
  lead_id?: string
  estado?: string
  created_at?: string
  updated_at?: string
  fecha_creacion?: string
  fecha_actualizacion?: string
  fecha?: string
  items?: Array<{ material_codigo: string; descripcion: string; cantidad: number; categoria: string }>
  elementos_personalizados?: Array<{ descripcion: string; cantidad: number; categoria?: string }>
}

function isOfertaConfirmadaPorCliente(estado: string | undefined): boolean {
  const n = normalizeText(estado ?? "")
  return n.includes("confirmada por cliente") || n.includes("confirmada_por_cliente")
}

function ofertaTimestamp(oferta: RawConfeccionOferta): number {
  const candidates = [
    oferta.updated_at,
    oferta.fecha_actualizacion,
    oferta.created_at,
    oferta.fecha_creacion,
    oferta.fecha,
  ]
  for (const c of candidates) {
    if (!c) continue
    const t = new Date(c).getTime()
    if (!Number.isNaN(t)) return t
  }
  return 0
}

function agregarMaterialesDeOfertas(
  clientes: Cliente[],
  leads: Lead[],
  confeccionOfertas: RawConfeccionOferta[],
): MaterialAgregado[] {
  const map = new Map<string, MaterialAgregado>()
  const clienteNums = new Set(clientes.map(c => c.numero ?? "").filter(Boolean))
  const leadIds     = new Set(leads.map(l => l.id ?? "").filter(Boolean))

  const addItem = (
    key: string,
    nombre: string,
    categoria: string,
    cantidad: number,
    entidad: {
      nombre: string
      numero: string
      tipo: "cliente" | "lead"
      provincia: string
      municipio: string
    }
  ) => {
    if (!nombre || cantidad <= 0) return
    const ex = map.get(key) ?? { nombre, categoria: categoria || "Material", cantidad: 0, entidades: [] }
    ex.cantidad += cantidad
    const idx = ex.entidades.findIndex(
      e => e.numero === entidad.numero && e.tipo === entidad.tipo
    )
    if (idx >= 0) {
      ex.entidades[idx].cantidad += cantidad
    } else {
      ex.entidades.push({ ...entidad, cantidad })
    }
    map.set(key, ex)
  }

  confeccionOfertas.forEach(oferta => {
    let entidad: {
      nombre: string
      numero: string
      tipo: "cliente" | "lead"
      provincia: string
      municipio: string
    } | null = null
    if (oferta.cliente_numero && clienteNums.has(oferta.cliente_numero)) {
      const c = clientes.find(cl => cl.numero === oferta.cliente_numero)
      if (c) entidad = {
        nombre: c.nombre,
        numero: c.numero ?? c.id ?? "",
        tipo: "cliente",
        provincia: c.provincia_montaje ?? "",
        municipio: c.municipio ?? "",
      }
    } else if (oferta.lead_id && leadIds.has(oferta.lead_id)) {
      const l = leads.find(ld => ld.id === oferta.lead_id)
      if (l) entidad = {
        nombre: l.nombre,
        numero: l.id ?? "",
        tipo: "lead",
        provincia: l.provincia_montaje ?? "",
        municipio: l.municipio ?? "",
      }
    }
    if (!entidad) return

    oferta.items?.forEach(item => {
      if (item.cantidad > 0)
        addItem(`${normalizeText(item.categoria)}::${normalizeText(item.descripcion)}`, item.descripcion, item.categoria, item.cantidad, entidad!)
    })
    oferta.elementos_personalizados?.forEach(el => {
      if (el.cantidad > 0)
        addItem(`elempers::${normalizeText(el.descripcion)}`, el.descripcion, el.categoria || "Elemento personalizado", el.cantidad, entidad!)
    })
  })

  return Array.from(map.values()).sort((a, b) => {
    const pa = catPeso(a.categoria), pb = catPeso(b.categoria)
    if (pa !== pb) return pa - pb
    const ca = normalizeText(a.categoria).localeCompare(normalizeText(b.categoria))
    if (ca !== 0) return ca
    return b.cantidad - a.cantidad
  })
}

// ─── AnalisisRegionalPanel ────────────────────────────────────────────────────

function AnalisisRegionalPanel({
  allClients, allLeads, viewMode, provinciasDisponibles, confeccionOfertas, selectedProvincias, onSelectedProvinciasChange, onClose,
}: {
  allClients: Cliente[]
  allLeads: Lead[]
  viewMode: ViewMode
  provinciasDisponibles: string[]
  confeccionOfertas: RawConfeccionOferta[]
  selectedProvincias: string[]
  onSelectedProvinciasChange: (provincias: string[]) => void
  onClose: () => void
}) {
  const [provinciasSeleccionadas, setProvinciasSeleccionadas] = useState<string[]>(selectedProvincias)
  const [estadosSeleccionados, setEstadosSeleccionados] = useState<string[]>([])
  const [modoAnalisis, setModoAnalisis] = useState<ViewMode>(viewMode)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [expandedMateriales, setExpandedMateriales] = useState<Set<string>>(new Set())
  const [vistaDetalle, setVistaDetalle] = useState<"material_cliente" | "cliente_material">("material_cliente")
  const [exportingXls, setExportingXls] = useState(false)

  useEffect(() => {
    setProvinciasSeleccionadas(selectedProvincias)
  }, [selectedProvincias])

  useEffect(() => {
    onSelectedProvinciasChange(provinciasSeleccionadas)
  }, [provinciasSeleccionadas, onSelectedProvinciasChange])

  const provinciasOrdenadas = useMemo(() => {
    const disponibles = new Set(provinciasDisponibles.map(normalizeText))
    const primeroCuba = CUBA_PROVINCIAS_ORDEN.filter(p => disponibles.has(normalizeText(p)))
    const extras = provinciasDisponibles
      .filter(p => !CUBA_PROVINCIAS_ORDEN.some(cp => normalizeText(cp) === normalizeText(p)))
      .sort((a, b) => normalizeText(a).localeCompare(normalizeText(b)))
    return [...primeroCuba, ...extras]
  }, [provinciasDisponibles])

  const provinciasEnRegion = useMemo(() => {
    if (provinciasSeleccionadas.length === 0) return provinciasDisponibles
    const selected = new Set(provinciasSeleccionadas.map(normalizeText))
    return provinciasDisponibles.filter(p => selected.has(normalizeText(p)))
  }, [provinciasDisponibles, provinciasSeleccionadas])

  const inRegion = useCallback((prov: string | undefined) =>
    provinciasSeleccionadas.length === 0 || provinciasEnRegion.some(p => normalizeText(p) === normalizeText(prov ?? "")),
    [provinciasSeleccionadas.length, provinciasEnRegion])

  const estadoKey = useCallback((estado?: string) => normalizeText(estado ?? "Sin estado"), [])

  const estadosDisponibles = useMemo(() => {
    const map = new Map<string, string>()
    allClients
      .filter(c => inRegion(c.provincia_montaje))
      .forEach(c => {
        const raw = (c.estado ?? "Sin estado").trim() || "Sin estado"
        const key = estadoKey(raw)
        if (!map.has(key)) map.set(key, raw)
      })
    allLeads
      .filter(l => inRegion(l.provincia_montaje))
      .forEach(l => {
        const raw = (l.estado ?? "Sin estado").trim() || "Sin estado"
        const key = estadoKey(raw)
        if (!map.has(key)) map.set(key, raw)
      })
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [allClients, allLeads, inRegion, estadoKey])

  const clientesFiltrados = useMemo(() => {
    const byMode = (c: Cliente) => {
      if (modoAnalisis === "todos") return true
      if (modoAnalisis === "pendientes_instalacion") return isPendienteInstalacion(c.estado)
      if (modoAnalisis === "en_proceso") return isEnProceso(c.estado)
      if (modoAnalisis === "averias") {
        const avs = (c as unknown as Record<string, unknown>).averias as Array<Record<string, unknown>> | undefined
        return avs?.some(a => a.estado === "Pendiente") ?? false
      }
      if (modoAnalisis === "visitas") return isPendienteVisita(c.estado)
      return false
    }
    const selectedEstados = new Set(estadosSeleccionados.map(normalizeText))
    return allClients.filter(c => {
      if (!byMode(c) || !inRegion(c.provincia_montaje)) return false
      if (selectedEstados.size === 0) return true
      return selectedEstados.has(estadoKey(c.estado))
    })
  }, [allClients, modoAnalisis, inRegion, estadosSeleccionados, estadoKey])

  const leadsFiltrados = useMemo(() => {
    const byMode = (l: Lead) => {
      if (modoAnalisis === "pendientes_instalacion") return isPendienteInstalacion(l.estado)
      if (modoAnalisis === "visitas") return isPendienteVisita(l.estado)
      return false
    }
    const selectedEstados = new Set(estadosSeleccionados.map(normalizeText))
    return allLeads.filter(l => {
      if (!byMode(l) || !inRegion(l.provincia_montaje)) return false
      if (selectedEstados.size === 0) return true
      return selectedEstados.has(estadoKey(l.estado))
    })
  }, [allLeads, modoAnalisis, inRegion, estadosSeleccionados, estadoKey])

  const ofertasConfirmadasVigentes = useMemo(() => {
    const latestByEntity = new Map<string, RawConfeccionOferta>()
    confeccionOfertas.forEach(oferta => {
      if (!isOfertaConfirmadaPorCliente(oferta.estado)) return
      const entityKey = oferta.cliente_numero
        ? `cliente:${oferta.cliente_numero}`
        : oferta.lead_id
          ? `lead:${oferta.lead_id}`
          : null
      if (!entityKey) return
      const prev = latestByEntity.get(entityKey)
      if (!prev || ofertaTimestamp(oferta) >= ofertaTimestamp(prev)) {
        latestByEntity.set(entityKey, oferta)
      }
    })
    return Array.from(latestByEntity.values())
  }, [confeccionOfertas])

  const materiales = useMemo(
    () => agregarMaterialesDeOfertas(clientesFiltrados, leadsFiltrados, ofertasConfirmadasVigentes),
    [clientesFiltrados, leadsFiltrados, ofertasConfirmadasVigentes]
  )

  const categorias = useMemo(() => {
    const cats = [...new Set(materiales.map(m => m.categoria))]
    return cats.sort((a, b) => {
      const pa = catPeso(a), pb = catPeso(b)
      if (pa !== pb) return pa - pb
      return normalizeText(a).localeCompare(normalizeText(b))
    })
  }, [materiales])

  useEffect(() => {
    if (categorias.length > 0 && expandedCats.size === 0)
      setExpandedCats(new Set(categorias.slice(0, 3)))
  }, [categorias]) // eslint-disable-line react-hooks/exhaustive-deps

  const byCategory = useMemo(() => {
    const cats = new Map<string, MaterialAgregado[]>()
    materiales.forEach(m => { const list = cats.get(m.categoria) ?? []; list.push(m); cats.set(m.categoria, list) })
    return cats
  }, [materiales])

  const entidadesConMateriales = useMemo(() => {
    type Mat = { nombre: string; categoria: string; cantidad: number }
    type Ent = {
      id: string
      tipo: "cliente" | "lead"
      nombre: string
      numero: string
      provincia: string
      municipio: string
      estado: string
      materiales: Mat[]
    }

    const entidades = new Map<string, Ent>()
    clientesFiltrados.forEach(c => {
      const numero = c.numero ?? c.id ?? ""
      entidades.set(`cliente:${numero}`, {
        id: `cliente:${numero}`,
        tipo: "cliente",
        nombre: c.nombre,
        numero,
        provincia: c.provincia_montaje ?? "—",
        municipio: c.municipio ?? "—",
        estado: c.estado ?? "Sin estado",
        materiales: [],
      })
    })
    leadsFiltrados.forEach(l => {
      const numero = l.id ?? ""
      entidades.set(`lead:${numero}`, {
        id: `lead:${numero}`,
        tipo: "lead",
        nombre: l.nombre,
        numero,
        provincia: l.provincia_montaje ?? "—",
        municipio: l.municipio ?? "—",
        estado: l.estado ?? "Sin estado",
        materiales: [],
      })
    })

    const addMaterial = (id: string, material: { nombre: string; categoria: string; cantidad: number }) => {
      const entidad = entidades.get(id)
      if (!entidad) return
      const idx = entidad.materiales.findIndex(
        m => normalizeText(m.nombre) === normalizeText(material.nombre) &&
          normalizeText(m.categoria) === normalizeText(material.categoria)
      )
      if (idx >= 0) entidad.materiales[idx].cantidad += material.cantidad
      else entidad.materiales.push(material)
    }

    ofertasConfirmadasVigentes.forEach(oferta => {
      let id: string | null = null
      if (oferta.cliente_numero) id = `cliente:${oferta.cliente_numero}`
      else if (oferta.lead_id) id = `lead:${oferta.lead_id}`
      if (!id || !entidades.has(id)) return

      ;(oferta.items ?? []).forEach(item => {
        if (item.cantidad > 0) {
          addMaterial(id!, { nombre: item.descripcion, categoria: item.categoria || "Material", cantidad: item.cantidad })
        }
      })
      ;(oferta.elementos_personalizados ?? []).forEach(el => {
        if (el.cantidad > 0) {
          addMaterial(id!, { nombre: el.descripcion, categoria: el.categoria || "Elemento personalizado", cantidad: el.cantidad })
        }
      })
    })

    return Array.from(entidades.values())
      .filter(e => e.materiales.length > 0)
      .map(e => ({
        ...e,
        materiales: e.materiales.sort((a, b) => {
          const pa = catPeso(a.categoria)
          const pb = catPeso(b.categoria)
          if (pa !== pb) return pa - pb
          return normalizeText(a.nombre).localeCompare(normalizeText(b.nombre))
        }),
      }))
      .sort((a, b) => {
        const prov = normalizeText(a.provincia).localeCompare(normalizeText(b.provincia))
        if (prov !== 0) return prov
        return normalizeText(a.nombre).localeCompare(normalizeText(b.nombre))
      })
  }, [clientesFiltrados, leadsFiltrados, ofertasConfirmadasVigentes])

  const entidadesPorProvincia = useMemo(() => {
    const map = new Map<string, typeof entidadesConMateriales>()
    entidadesConMateriales.forEach(e => {
      const key = e.provincia || "—"
      const list = map.get(key) ?? []
      list.push(e)
      map.set(key, list)
    })
    return Array.from(map.entries()).sort((a, b) => normalizeText(a[0]).localeCompare(normalizeText(b[0])))
  }, [entidadesConMateriales])

  const modoLabel: Record<ViewMode, string> = {
    todos: "Todos", pendientes_instalacion: "Pendientes instalación",
    en_proceso: "En proceso", averias: "Con averías", visitas: "Pendientes visita",
  }

  const handleExportExcel = async () => {
    setExportingXls(true)
    try {
      const ExcelJSImport = await import("exceljs")
      const ExcelJS = ExcelJSImport.default
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("Análisis Regional")

      const title = `SunCar · Análisis Regional — ${modoLabel[modoAnalisis]}`
      const subtitle = `${provinciasSeleccionadas.length > 0 ? `${provinciasSeleccionadas.length} provincia(s) seleccionada(s)` : "Toda Cuba"} · ${clientesFiltrados.length} clientes${leadsFiltrados.length > 0 ? ` · ${leadsFiltrados.length} leads` : ""}${estadosSeleccionados.length > 0 ? ` · ${estadosSeleccionados.length} estado(s)` : ""}`
      const headers = ["Provincia", "Municipio", "Cliente", "Nº", "Estado", "Categoría", "Material", "Cantidad"]

      worksheet.addRow([title])
      worksheet.mergeCells(1, 1, 1, headers.length)
      worksheet.getCell(1, 1).font = { bold: true, size: 14 }

      worksheet.addRow([subtitle])
      worksheet.mergeCells(2, 1, 2, headers.length)
      worksheet.getCell(2, 1).font = { size: 11 }

      worksheet.addRow([])
      const headerRow = worksheet.addRow(headers)
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA580C" } }
        cell.alignment = { horizontal: "center", vertical: "middle" }
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" },
        }
      })

      worksheet.columns = [
        { width: 20 }, { width: 18 }, { width: 30 }, { width: 12 },
        { width: 24 }, { width: 20 }, { width: 46 }, { width: 12 },
      ]

      const dataStartRow = worksheet.rowCount + 1
      entidadesConMateriales.forEach(entidad => {
        entidad.materiales.forEach(material => {
          worksheet.addRow([
            entidad.provincia ?? "—",
            entidad.municipio ?? "—",
            entidad.tipo === "lead" ? `[LEAD] ${entidad.nombre}` : entidad.nombre,
            entidad.numero || "—",
            entidad.estado || "—",
            material.categoria || "Material",
            material.nombre,
            material.cantidad,
          ])
        })
      })

      let rowCursor = dataStartRow
      entidadesConMateriales.forEach(entidad => {
        const span = entidad.materiales.length
        if (span > 1) {
          ;[1, 2, 3, 4, 5].forEach(col => {
            worksheet.mergeCells(rowCursor, col, rowCursor + span - 1, col)
            worksheet.getCell(rowCursor, col).alignment = { vertical: "top", horizontal: "left", wrapText: true }
          })
        }
        rowCursor += span
      })

      const detailsEndRow = worksheet.rowCount
      for (let r = dataStartRow; r <= detailsEndRow; r++) {
        const row = worksheet.getRow(r)
        row.eachCell(cell => {
          cell.alignment = cell.alignment ?? { vertical: "top", horizontal: "left", wrapText: true }
          cell.border = {
            top: { style: "thin", color: { argb: "FFCCCCCC" } },
            bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
            left: { style: "thin", color: { argb: "FFCCCCCC" } },
            right: { style: "thin", color: { argb: "FFCCCCCC" } },
          }
          cell.font = { name: "Arial", size: 11 }
        })
      }

      worksheet.addRow([])
      const resumenTitleRow = worksheet.addRow(["RESUMEN POR MATERIAL"])
      worksheet.mergeCells(resumenTitleRow.number, 1, resumenTitleRow.number, headers.length)
      resumenTitleRow.getCell(1).font = { bold: true, color: { argb: "FF059669" } }
      resumenTitleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6FFFA" } }

      materiales.forEach(m => {
        const row = worksheet.addRow(["", "", "", "", "", m.categoria, m.nombre, m.cantidad])
        row.eachCell(cell => {
          cell.alignment = { vertical: "top", horizontal: "left", wrapText: true }
          cell.border = {
            top: { style: "thin", color: { argb: "FFCCCCCC" } },
            bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
            left: { style: "thin", color: { argb: "FFCCCCCC" } },
            right: { style: "thin", color: { argb: "FFCCCCCC" } },
          }
          cell.font = { name: "Arial", size: 11 }
        })
      })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `analisis-regional-${modoAnalisis}-${new Date().toISOString().split("T")[0]}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Error exportando:", err)
    } finally {
      setExportingXls(false)
    }
  }

  const totalMateriales = materiales.reduce((s, m) => s + m.cantidad, 0)
  const toggleProvincia = (provincia: string) => {
    setProvinciasSeleccionadas(prev => {
      const key = normalizeText(provincia)
      return prev.some(p => normalizeText(p) === key)
        ? prev.filter(p => normalizeText(p) !== key)
        : [...prev, provincia]
    })
  }
  const toggleEstado = (estado: string) => {
    setEstadosSeleccionados(prev => {
      const key = normalizeText(estado)
      return prev.some(e => normalizeText(e) === key)
        ? prev.filter(e => normalizeText(e) !== key)
        : [...prev, estado]
    })
  }

  return (
    <div className="absolute inset-y-0 right-0 z-[1001] w-[26rem] pointer-events-auto flex flex-col bg-slate-900/98 border-l border-slate-700/80 shadow-2xl backdrop-blur-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-800/60 shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold text-amber-400">Análisis Regional</span>
        </div>
        <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 space-y-2 border-b border-slate-700/60 bg-slate-800/30 shrink-0">
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Provincias (1 o más)</label>
          <details className="bg-slate-800 border border-slate-600/60 rounded-md">
            <summary className="list-none cursor-pointer px-2 py-1.5 text-xs text-slate-300 flex items-center justify-between">
              <span>{provinciasSeleccionadas.length > 0 ? `${provinciasSeleccionadas.length} seleccionadas` : "🇨🇺 Toda Cuba"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </summary>
            <div className="border-t border-slate-700/60 max-h-44 overflow-y-auto p-2 space-y-1">
              {provinciasOrdenadas.map(prov => {
                const checked = provinciasSeleccionadas.some(p => normalizeText(p) === normalizeText(prov))
                return (
                  <button
                    key={prov}
                    onClick={() => toggleProvincia(prov)}
                    className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded text-xs transition-colors ${checked ? "bg-emerald-500/20 text-emerald-300" : "hover:bg-white/5 text-slate-300"}`}>
                    <span>{prov}</span>
                    {checked && <CheckCircle className="h-3 w-3" />}
                  </button>
                )
              })}
            </div>
          </details>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Operación</label>
            <select value={modoAnalisis} onChange={e => setModoAnalisis(e.target.value as ViewMode)}
              className="w-full bg-slate-800 border border-slate-600/60 rounded-md px-2 py-1.5 text-xs text-slate-300 outline-none cursor-pointer">
              <option value="todos" className="bg-slate-900">Todos los clientes</option>
              <option value="pendientes_instalacion" className="bg-slate-900">Pendientes instalación</option>
              <option value="en_proceso" className="bg-slate-900">En proceso</option>
              <option value="averias" className="bg-slate-900">Con averías</option>
              <option value="visitas" className="bg-slate-900">Pendientes visita</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Estados (1 o más)</label>
            <details className="bg-slate-800 border border-slate-600/60 rounded-md">
              <summary className="list-none cursor-pointer px-2 py-1.5 text-xs text-slate-300 flex items-center justify-between">
                <span>{estadosSeleccionados.length > 0 ? `${estadosSeleccionados.length} seleccionados` : "Todos"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </summary>
              <div className="border-t border-slate-700/60 max-h-44 overflow-y-auto p-2 space-y-1">
                {estadosDisponibles.map(estado => {
                  const checked = estadosSeleccionados.some(e => normalizeText(e) === estado.key)
                  return (
                    <button
                      key={estado.key}
                      onClick={() => toggleEstado(estado.label)}
                      className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded text-xs transition-colors ${checked ? "bg-blue-500/20 text-blue-300" : "hover:bg-white/5 text-slate-300"}`}>
                      <span>{estado.label}</span>
                      {checked && <CheckCircle className="h-3 w-3" />}
                    </button>
                  )
                })}
              </div>
            </details>
          </div>
        </div>
        {(provinciasSeleccionadas.length > 0 || estadosSeleccionados.length > 0) && (
          <button
            onClick={() => { setProvinciasSeleccionadas([]); setEstadosSeleccionados([]) }}
            className="text-[11px] text-slate-400 hover:text-white underline">
            Limpiar filtros múltiples
          </button>
        )}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-500">{provinciasEnRegion.length} prov. ·</span>
          <span className="font-bold text-white">{clientesFiltrados.length} clientes</span>
          {leadsFiltrados.length > 0 && <><span className="text-slate-500">·</span><span className="font-bold text-amber-400">{leadsFiltrados.length} leads</span></>}
          {totalMateriales > 0 && <><span className="text-slate-500">·</span><span className="font-bold text-emerald-400">{totalMateriales} materiales</span></>}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Materiales por categoría */}
        <div className="px-4 py-3 border-b border-slate-700/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Materiales · {categorias.length} categoría{categorias.length !== 1 ? "s" : ""}
            </span>
            <button onClick={handleExportExcel} disabled={exportingXls || (clientesFiltrados.length === 0 && leadsFiltrados.length === 0)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {exportingXls ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
              Excel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => setVistaDetalle("material_cliente")}
              className={`px-2 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${vistaDetalle === "material_cliente" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/60"}`}>
              Material → Cliente
            </button>
            <button
              onClick={() => setVistaDetalle("cliente_material")}
              className={`px-2 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${vistaDetalle === "cliente_material" ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700/60"}`}>
              Cliente → Material
            </button>
          </div>

          {categorias.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-500 italic">
                {clientesFiltrados.length === 0
                  ? "Sin clientes en esta región / modo"
                  : "Los clientes no tienen ofertas confirmadas por cliente"}
              </p>
            </div>
          ) : vistaDetalle === "material_cliente" ? (
            <div className="space-y-2">
              {categorias.map(cat => {
                const items = byCategory.get(cat) ?? []
                const { icon: CatIcon, color, bg, border } = catStyle(cat)
                const isOpen = expandedCats.has(cat)
                const total = items.reduce((s, m) => s + m.cantidad, 0)
                return (
                  <div key={cat} className={`rounded-xl border ${border} overflow-hidden`}>
                    <button
                      onClick={() => setExpandedCats(prev => { const s = new Set(prev); s.has(cat) ? s.delete(cat) : s.add(cat); return s })}
                      className={`w-full flex items-center justify-between px-3 py-2.5 ${bg} text-left hover:opacity-90 transition-opacity`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <CatIcon className={`h-4 w-4 ${color} shrink-0`} />
                        <span className={`text-[12px] font-bold ${color} truncate`}>{cat}</span>
                        <span className={`text-[10px] ${color} opacity-60 shrink-0`}>({items.length})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`text-sm font-bold ${color}`}>{total} u.</span>
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="bg-slate-950/60 divide-y divide-slate-800/50">
                        {items.sort((a, b) => b.cantidad - a.cantidad).map(m => {
                          const matKey = `${cat}::${m.nombre}`
                          const openMaterial = expandedMateriales.has(matKey)
                          return (
                            <div key={m.nombre} className="px-3 py-1.5">
                              <button
                                onClick={() => setExpandedMateriales(prev => {
                                  const s = new Set(prev)
                                  s.has(matKey) ? s.delete(matKey) : s.add(matKey)
                                  return s
                                })}
                                className="w-full flex items-center justify-between py-1.5">
                                <div className="min-w-0 text-left">
                                  <p className="text-[12px] text-slate-200 leading-snug truncate">{m.nombre}</p>
                                  <p className="text-[10px] text-slate-500">{m.entidades.length} entidad{m.entidades.length !== 1 ? "es" : ""}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  <span className={`text-sm font-bold ${color}`}>×{m.cantidad}</span>
                                  {openMaterial ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                                </div>
                              </button>
                              {openMaterial && (
                                <div className="mt-1 mb-1 rounded-lg border border-slate-700/60 overflow-hidden">
                                  <div className="grid grid-cols-[1fr_auto] gap-2 px-2.5 py-1.5 bg-slate-900 text-[10px] uppercase tracking-wider text-slate-500">
                                    <span>Cliente/Lead</span>
                                    <span>Cant.</span>
                                  </div>
                                  <div className="divide-y divide-slate-800/70 bg-slate-950/50">
                                    {m.entidades
                                      .sort((a, b) => b.cantidad - a.cantidad)
                                      .map(entidad => (
                                        <div key={`${entidad.tipo}:${entidad.numero}`} className="grid grid-cols-[1fr_auto] gap-2 px-2.5 py-1.5">
                                          <div className="min-w-0">
                                            <p className="text-[11px] text-slate-200 truncate">
                                              {entidad.tipo === "lead" ? "[LEAD] " : ""}{entidad.nombre}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate">
                                              {[entidad.municipio, entidad.provincia].filter(Boolean).join(", ")}
                                            </p>
                                          </div>
                                          <span className="text-[11px] font-bold text-emerald-300">{entidad.cantidad}</span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {entidadesPorProvincia.map(([provincia, entidades]) => (
                <div key={provincia} className="rounded-xl border border-slate-700/60 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-800/70 border-b border-slate-700/60">
                    <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">{provincia}</p>
                  </div>
                  <div className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {entidades.map(entidad => (
                      <div key={entidad.id} className="px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[12px] text-white font-semibold truncate">
                              {entidad.tipo === "lead" ? "[LEAD] " : ""}{entidad.nombre}
                            </p>
                            <p className="text-[10px] text-slate-500">{entidad.municipio} · {entidad.estado}</p>
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">{entidad.materiales.length} mat.</span>
                        </div>
                        <div className="mt-1.5 space-y-1">
                          {entidad.materiales.map(m => (
                            <div key={`${m.categoria}::${m.nombre}`} className="grid grid-cols-[auto_1fr_auto] gap-2 text-[11px]">
                              <span className="text-slate-500">{m.categoria}:</span>
                              <span className="text-slate-200 truncate">{m.nombre}</span>
                              <span className="text-emerald-300 font-bold">×{m.cantidad}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-emerald-500/25 overflow-hidden">
                <div className="px-3 py-2 bg-emerald-500/10 border-b border-emerald-500/25">
                  <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Resumen por material (final)</p>
                </div>
                <div className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {materiales.map(m => (
                    <div key={`${m.categoria}::${m.nombre}`} className="px-3 py-1.5 grid grid-cols-[auto_1fr_auto] gap-2 text-[11px]">
                      <span className="text-slate-500">{m.categoria}</span>
                      <span className="text-slate-200 truncate">{m.nombre}</span>
                      <span className="text-emerald-300 font-bold">{m.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
  const [showAnalisisRegional, setShowAnalisisRegional] = useState(false)
  const [allConfeccionOfertas, setAllConfeccionOfertas] = useState<RawConfeccionOferta[]>([])
  const [showLeadStates, setShowLeadStates] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [comercialResumen, setComercialResumen] = useState<ComercialResumen>({ confirmadas: 0, canceladas: 0, reservadas: 0 })

  // Filtros de provincia / municipio
  const [filterProvincia, setFilterProvincia] = useState("")
  const [filterMunicipio, setFilterMunicipio] = useState("")
  const [analisisProvinciasSeleccionadas, setAnalisisProvinciasSeleccionadas] = useState<string[]>([])

  // Bounds calculados desde el GeoJSON
  const [geoMuniBoundsMap, setGeoMuniBoundsMap] = useState<Map<string, SimpleBounds>>(new Map())
  const [geoProvBoundsMap, setGeoProvBoundsMap] = useState<Map<string, SimpleBounds>>(new Map())
  const [geoProvCenterMap, setGeoProvCenterMap] = useState<Map<string, [number, number]>>(new Map())

  // ── Data Fetch ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)

    const getVisitasRealizadas = async (weekStartStr: string, weekEndStr: string) => {
      try {
        const visitasRes = await apiRequest<Record<string, unknown>>(`/visitas/?estado=completada&fecha_desde=${weekStartStr}&fecha_hasta=${weekEndStr}`)
        const inner = (visitasRes?.data ?? visitasRes) as Record<string, unknown> | null
        const visitas = Array.isArray(inner?.visitas) ? inner.visitas : []
        return typeof inner?.total === "number" ? inner.total : visitas.length
      } catch {
        return 0
      }
    }

    const parseOfertasConfeccion = (payload: unknown): unknown[] => {
      if (Array.isArray(payload)) return payload
      if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data)) {
        return (payload as { data?: unknown[] }).data ?? []
      }
      return []
    }

    try {
      const { start: weekStart, end: weekEnd } = getWeekRange()
      const weekStartStr = toISODate(weekStart), weekEndStr = toISODate(weekEnd)

      // Fase 1 (rápida): tarjetas y métricas principales
      const [dashboardResult, pendientesResult, pendientesVisitaResult,
        leadsThisWeekResult, visitasRealizadasResult,
      ] = await Promise.allSettled([
        ResultadosService.getDashboardPrincipal(),
        InstalacionesService.getPendientesInstalacion(),
        apiRequest<{ total_general?: number; clientes?: unknown[]; leads?: unknown[] }>("/pendientes-visita/"),
        LeadService.getLeads({ fechaDesde: weekStartStr, fechaHasta: weekEndStr, limit: 1000 }),
        getVisitasRealizadas(weekStartStr, weekEndStr),
      ])

      const dashboard = dashboardResult.status === "fulfilled" ? dashboardResult.value : null
      const pendientes = pendientesResult.status === "fulfilled" ? pendientesResult.value : null
      const pendientesInstalacion = pendientes ? (pendientes.total_leads ?? 0) + (pendientes.total_clientes ?? 0) : 0
      const pendientesVisita = pendientesVisitaResult.status === "fulfilled" ? pendientesVisitaResult.value : null
      const visitasPendientes = pendientesVisita?.total_general ?? ((pendientesVisita?.clientes?.length ?? 0) + (pendientesVisita?.leads?.length ?? 0))
      const leadsData = leadsThisWeekResult.status === "fulfilled" ? leadsThisWeekResult.value : { leads: [], total: 0 }
      const nuevosLeads = leadsData.total > 0 ? leadsData.total : leadsData.leads.length
      const visitasRealizadas = visitasRealizadasResult.status === "fulfilled" ? visitasRealizadasResult.value : 0

      setControlData(prev => ({
        totalClientes: dashboard?.cantidad_clientes ?? prev?.totalClientes ?? 0,
        totalMunicipios: dashboard?.cantidad_municipios_instalados ?? 0,
        totalKwPaneles: dashboard?.total_kw_paneles ?? 0,
        totalKwInversores: dashboard?.total_kw_inversores ?? 0,
        totalKwhBaterias: dashboard?.total_kw_baterias ?? 0,
        pendientesInstalacion,
        enProceso: prev?.enProceso ?? 0,
        averiasPendientes: prev?.averiasPendientes ?? 0,
        visitasPendientes,
        instalacionesTerminadas: prev?.instalacionesTerminadas ?? 0,
        instalacionesComenzadas: prev?.instalacionesComenzadas ?? 0,
        nuevosLeads,
        nuevosClientes: prev?.nuevosClientes ?? 0,
        averiasSolucionadas: prev?.averiasSolucionadas ?? 0,
        visitasRealizadas,
      }))
      setLastUpdate(new Date())

      // Fase 2 (pesada): datasets completos para mapa/paneles
      void (async () => {
        try {
          const [allClientsResult, clientesConAveriasResult, allLeadsResult, brigadasResult, ofertasConfeccionResult] = await Promise.allSettled([
            fetchAllClientes(),
            ClienteService.getClientesConAverias(),
            fetchAllLeads(),
            BrigadaService.getAllBrigadas(),
            apiRequest<{ data?: unknown[] } | unknown[]>("/ofertas/confeccion/"),
          ])

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

          const ofertasRaw = ofertasConfeccionResult.status === "fulfilled"
            ? parseOfertasConfeccion(ofertasConfeccionResult.value)
            : []
          const resumenComercial = ofertasRaw.reduce<ComercialResumen>((acc, item) => {
            const record = item as Record<string, unknown>
            const estado = String(record.estado ?? record.status ?? "").toLowerCase().trim()
            if (estado.includes("confirmada_por_cliente") || estado.includes("confirmada por cliente")) acc.confirmadas += 1
            else if (estado.includes("cancelada")) acc.canceladas += 1
            else if (estado.includes("reservada")) acc.reservadas += 1
            return acc
          }, { confirmadas: 0, canceladas: 0, reservadas: 0 })
          setComercialResumen(resumenComercial)
          setAllConfeccionOfertas(ofertasRaw as RawConfeccionOferta[])

          setControlData(prev => prev ? {
            ...prev,
            totalClientes: dashboard?.cantidad_clientes ?? clients.length,
            enProceso,
            averiasPendientes,
            instalacionesTerminadas,
            instalacionesComenzadas,
            nuevosClientes,
            averiasSolucionadas,
          } : prev)
          setLastUpdate(new Date())
        } catch (err) {
          console.error("Error cargando datasets completos de Centro de Control:", err)
        }
      })()
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
    const provCenters = new Map<string, Point2D[]>()

    fc.features.forEach(f => {
      const shapeName = f.properties?.shapeName as string | undefined
      if (!shapeName || !f.geometry) return
      const bounds = computeGeoJSONBounds(f.geometry)
      const center = computeGeoJSONCenter(f.geometry)
      if (!bounds) return
      const key = normalizeText(shapeName)
      muniBounds.set(key, bounds)

      const provincia = muniToProvMap.get(key)
      if (provincia) {
        const provKey = normalizeText(provincia)
        const prev = provBounds.get(provKey)
        provBounds.set(provKey, prev ? mergeBounds(prev, bounds) : bounds)
        if (center) {
          const list = provCenters.get(provKey) ?? []
          list.push(center)
          provCenters.set(provKey, list)
        }
      }
    })

    const provCenterMap = new Map<string, [number, number]>()
    provCenters.forEach((centers, provKey) => {
      if (!centers.length) return
      const lat = centers.reduce((s, c) => s + c.lat, 0) / centers.length
      const lng = centers.reduce((s, c) => s + c.lng, 0) / centers.length
      provCenterMap.set(provKey, [lat, lng])
    })

    setGeoMuniBoundsMap(muniBounds)
    setGeoProvBoundsMap(provBounds)
    setGeoProvCenterMap(provCenterMap)
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

  const municipioToProvinciaMap = useMemo(() => {
    const map = new Map<string, string>()
    municipios.forEach(m => {
      const muniKey = normalizeText(m.municipio)
      const provKey = normalizeText(m.provincia)
      if (muniKey && provKey) map.set(muniKey, provKey)
    })
    return map
  }, [municipios])

  const provinceDisplayNameByKey = useMemo(() => {
    const map = new Map<string, string>()
    municipios.forEach(m => {
      const provKey = normalizeText(m.provincia)
      if (provKey && !map.has(provKey)) map.set(provKey, m.provincia)
    })
    return map
  }, [municipios])

  const selectedProvinciaKeys = useMemo(() => {
    if (analisisProvinciasSeleccionadas.length > 0) {
      return new Set(analisisProvinciasSeleccionadas.map(normalizeText))
    }
    if (filterProvincia) return new Set([normalizeText(filterProvincia)])
    return new Set<string>()
  }, [analisisProvinciasSeleccionadas, filterProvincia])

  const selectedProvinciaKey = useMemo(() => {
    if (analisisProvinciasSeleccionadas.length === 0 && filterProvincia) return normalizeText(filterProvincia)
    return ""
  }, [analisisProvinciasSeleccionadas, filterProvincia])
  const selectedMunicipioKey = useMemo(() => normalizeText(filterMunicipio), [filterMunicipio])

  const currentBounds = useMemo<SimpleBounds | null>(() => {
    if (filterMunicipio) return geoMuniBoundsMap.get(normalizeText(filterMunicipio)) ?? null
    if (analisisProvinciasSeleccionadas.length > 0) {
      const selected = analisisProvinciasSeleccionadas
        .map(p => geoProvBoundsMap.get(normalizeText(p)))
        .filter((b): b is SimpleBounds => Boolean(b))
      if (selected.length === 0) return null
      return selected.reduce((acc, b) => mergeBounds(acc, b))
    }
    if (filterProvincia) return geoProvBoundsMap.get(normalizeText(filterProvincia)) ?? null
    return null
  }, [analisisProvinciasSeleccionadas, filterProvincia, filterMunicipio, geoMuniBoundsMap, geoProvBoundsMap])

  const provinceLabels = useMemo(() => {
    if (filterProvincia || analisisProvinciasSeleccionadas.length > 0) return []
    return Array.from(geoProvBoundsMap.entries()).map(([provKey, b]) => {
      const provincia = provinceDisplayNameByKey.get(provKey) ?? provKey
      return {
        key: provKey,
        provincia,
        center: geoProvCenterMap.get(provKey) ?? ([(b.minLat + b.maxLat) / 2, (b.minLng + b.maxLng) / 2] as [number, number]),
        icon: L.divIcon({
          className: "province-label-icon",
          html: `<span class="province-label-inner">${provincia}</span>`,
          iconSize: [0, 0],
        }),
      }
    })
  }, [geoProvBoundsMap, geoProvCenterMap, provinceDisplayNameByKey, filterProvincia, analisisProvinciasSeleccionadas.length])

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
    const featureProvinciaKey = municipioToProvinciaMap.get(key) ?? ""
    const isProvinciaFilterActive = selectedProvinciaKeys.size > 0
    const isMunicipioFilterActive = Boolean(selectedMunicipioKey)
    const inSelectedProvincia = !isProvinciaFilterActive || selectedProvinciaKeys.has(featureProvinciaKey)
    const isSelectedMunicipio = !isMunicipioFilterActive || key === selectedMunicipioKey
    const isInsideFilter = inSelectedProvincia && isSelectedMunicipio

    let count = 0
    if (viewMode === "todos") count = municipioMap.get(key)?.cantidad_clientes ?? 0
    else if (viewMode === "pendientes_instalacion") { const e = pendientesInstMap.get(key); count = (e?.clientes.length ?? 0) + (e?.leads.length ?? 0) }
    else if (viewMode === "en_proceso") count = enProcesoMap.get(key)?.length ?? 0
    else if (viewMode === "averias") count = averiasMap.get(key)?.length ?? 0
    else if (viewMode === "visitas") { const e = visitasMap.get(key); count = (e?.clientes.length ?? 0) + (e?.leads.length ?? 0) }

    if (!isInsideFilter) {
      return { color: "#0b1220", weight: 0.5, fillColor: "#020617", fillOpacity: 0.15 }
    }

    if (!count) {
      return {
        color: isMunicipioFilterActive ? "#fde68a" : isProvinciaFilterActive ? "#fbbf24" : "#1e293b",
        weight: isMunicipioFilterActive ? 2.4 : isProvinciaFilterActive ? 1.6 : 0.4,
        fillColor: "#0f172a",
        fillOpacity: isMunicipioFilterActive ? 0.75 : isProvinciaFilterActive ? 0.6 : 0.5,
      }
    }
    const ratio = Math.min(count / maxByMode, 1)
    return {
      color: isMunicipioFilterActive ? "#fde68a" : isProvinciaFilterActive ? "#fbbf24" : borderColor(viewMode),
      weight: isMunicipioFilterActive ? 2.8 : isProvinciaFilterActive ? 2 : 1.5,
      fillColor: densityColor(ratio, viewMode),
      fillOpacity: isMunicipioFilterActive ? 1 : 0.9,
    }
  }, [viewMode, municipioMap, pendientesInstMap, enProcesoMap, averiasMap, visitasMap, maxByMode, municipioToProvinciaMap, selectedMunicipioKey, selectedProvinciaKey, selectedProvinciaKeys])

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

    const featureProvinciaKey = municipioToProvinciaMap.get(key) ?? ""
    const shouldShowMunicipioLabels = selectedProvinciaKeys.size > 0
    const isInsideProvincia = selectedProvinciaKeys.size === 0 || selectedProvinciaKeys.has(featureProvinciaKey)
    const isFocusedMunicipio = Boolean(selectedMunicipioKey) && key === selectedMunicipioKey
    const shouldBindMuniLabel =
      shouldShowMunicipioLabels &&
      isInsideProvincia &&
      (!selectedMunicipioKey || isFocusedMunicipio)

    if (shouldBindMuniLabel && "bindTooltip" in layer) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(layer as any).bindTooltip(shapeName, {
        permanent: true,
        direction: "center",
        className: `muni-label${isFocusedMunicipio ? " muni-label--focus" : ""}`,
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
  }, [viewMode, municipioMap, pendientesInstMap, enProcesoMap, averiasMap, visitasMap, getFeatureStyle, municipioToProvinciaMap, selectedMunicipioKey, selectedProvinciaKey, selectedProvinciaKeys])

  const weekLabel = useMemo(() => {
    const { start, end } = getWeekRange()
    const fmt = (d: Date) => d.toLocaleDateString("es-CU", { day: "2-digit", month: "short" })
    return `${fmt(start)} – ${fmt(end)}`
  }, [])

  const geoKey = `${viewMode}-${municipioMap.size}-${pendientesInstMap.size}-${enProcesoMap.size}-${averiasMap.size}-${visitasMap.size}-${Array.from(selectedProvinciaKeys).join(",")}-${selectedMunicipioKey}`

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
          color: rgba(255,255,255,0.9) !important;
          text-shadow: 0 0 3px #000, 0 0 6px #000, 0 1px 2px #000 !important;
          white-space: nowrap !important;
          pointer-events: none !important;
        }
        .muni-label--focus {
          font-size: 13px !important;
          font-weight: 900 !important;
          color: #fde68a !important;
          text-transform: uppercase !important;
          letter-spacing: 0.02em !important;
          text-shadow: 0 0 4px #000, 0 0 12px rgba(251, 191, 36, 0.65), 0 0 18px rgba(251, 191, 36, 0.5) !important;
        }
        .muni-label::before { display: none !important; }
        .leaflet-tooltip.muni-label { margin: 0 !important; }
        .province-label-icon {
          background: transparent !important;
          border: 0 !important;
        }
        .province-label-inner {
          display: inline-block;
          font-size: 12px;
          font-weight: 900;
          line-height: 1;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: rgba(255, 255, 255, 0.96);
          text-shadow: 0 0 4px #000, 0 0 9px rgba(2, 6, 23, 0.95), 0 0 14px rgba(15, 23, 42, 0.9);
          white-space: nowrap;
          transform: translate(-50%, -50%);
          pointer-events: auto;
          cursor: pointer;
          padding: 3px 5px;
          border-radius: 3px;
          transition: color 0.15s, text-shadow 0.15s;
        }
        .province-label-inner:hover {
          color: #fde68a;
          text-shadow: 0 0 4px #000, 0 0 10px rgba(251, 191, 36, 0.7), 0 0 18px rgba(251, 191, 36, 0.4);
        }
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

      {/* ── Main Content ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left Panel ── */}
        <div className="flex flex-col shrink-0 border-r border-slate-800 bg-slate-900/50 w-64">
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
                  <button onClick={() => setShowAnalisisRegional(b => !b)}
                    className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-all gap-2 text-left
                      ${showAnalisisRegional ? "bg-emerald-500/20 ring-1 ring-inset ring-white/20" : "bg-white/5 hover:bg-white/10"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-slate-300 truncate">Análisis regional</span>
                    </div>
                    <Filter className="h-3 w-3 text-emerald-400/60 shrink-0" />
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
                <div className="space-y-1">

                  {/* Leads — expandable */}
                  <button onClick={() => setShowLeadStates(prev => !prev)}
                    className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-all gap-2 text-left
                      ${showLeadStates ? "bg-amber-500/20 ring-1 ring-inset ring-white/20" : "bg-white/5 hover:bg-white/10"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Users2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="text-[11px] text-slate-300 leading-tight truncate">Leads totales</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {loading ? <div className="h-4 w-7 bg-slate-700 rounded animate-pulse" />
                        : <span className="text-sm font-bold text-amber-400">{allLeads.length}</span>}
                      {showLeadStates ? <ChevronUp className="h-3 w-3 text-slate-500" /> : <ChevronDown className="h-3 w-3 text-slate-500" />}
                    </div>
                  </button>
                  {showLeadStates && !loading && (
                    <div className="ml-2 mr-1 bg-slate-800/60 rounded-lg px-2.5 py-2 space-y-1 border border-slate-700/40">
                      {leadsByEstado.map(([estado, count]) => (
                        <div key={estado} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getEstadoStyle(estado).dot}`} />
                            <span className="text-[10px] text-slate-400 truncate">{estado}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-300 shrink-0 ml-1">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Clientes */}
                  <div className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCheck className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                      <span className="text-[11px] text-slate-300 leading-tight truncate">Clientes</span>
                    </div>
                    {loading ? <div className="h-4 w-7 bg-slate-700 rounded animate-pulse shrink-0" />
                      : <span className="text-sm font-bold text-orange-400 shrink-0">{allClients.length}</span>}
                  </div>

                  {/* Ofertas confirmadas */}
                  <div className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[11px] text-slate-300 leading-tight truncate">Ofertas confirmadas</span>
                    </div>
                    {loading ? <div className="h-4 w-7 bg-slate-700 rounded animate-pulse shrink-0" />
                      : <span className="text-sm font-bold text-emerald-400 shrink-0">{comercialResumen.confirmadas}</span>}
                  </div>

                  {/* Ofertas canceladas */}
                  <div className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                      <span className="text-[11px] text-slate-300 leading-tight truncate">Ofertas canceladas</span>
                    </div>
                    {loading ? <div className="h-4 w-7 bg-slate-700 rounded animate-pulse shrink-0" />
                      : <span className="text-sm font-bold text-rose-400 shrink-0">{comercialResumen.canceladas}</span>}
                  </div>

                  {/* Reservas */}
                  <div className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bookmark className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="text-[11px] text-slate-300 leading-tight truncate">Reservas</span>
                    </div>
                    {loading ? <div className="h-4 w-7 bg-slate-700 rounded animate-pulse shrink-0" />
                      : <span className="text-sm font-bold text-amber-400 shrink-0">{comercialResumen.reservadas}</span>}
                  </div>

                  {/* Conversión */}
                  <div className="w-full flex flex-col py-2 px-3 rounded-lg bg-white/5 gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="text-[11px] text-slate-300 leading-tight truncate">Conversión lead→cliente</span>
                      </div>
                      {loading ? <div className="h-4 w-10 bg-slate-700 rounded animate-pulse shrink-0" />
                        : <span className="text-sm font-bold text-emerald-400 shrink-0">{conversionPct}%</span>}
                    </div>
                    {!loading && (
                      <div className="w-full bg-slate-800 rounded-full h-1">
                        <div className="bg-emerald-400 h-1 rounded-full transition-all" style={{ width: `${Math.min(conversionPct, 100)}%` }} />
                      </div>
                    )}
                  </div>

                </div>
              </div>
          </div>
        </div>

        {/* ── Map ── */}
        <div className="flex-1 relative min-w-0">

          {/* ── KPI Cards centradas entre paneles ── */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[min(980px,calc(100%-1.5rem))]">
            <div className="grid grid-cols-5 gap-2 bg-slate-900/92 border border-slate-700/70 rounded-xl px-2.5 py-2 shadow-xl backdrop-blur-sm">
              {[
                { label: "Clientes",      value: controlData?.totalClientes ?? 0,     icon: Users,    color: "text-orange-400",  bg: "bg-orange-400/10",  dec: 0 },
                { label: "Municipios",    value: controlData?.totalMunicipios ?? 0,   icon: Building2,color: "text-amber-400",   bg: "bg-amber-400/10",   dec: 0 },
                { label: "kW Paneles",    value: controlData?.totalKwPaneles ?? 0,    icon: Sun,      color: "text-yellow-400",  bg: "bg-yellow-400/10",  dec: 1 },
                { label: "kW Inversores", value: controlData?.totalKwInversores ?? 0, icon: Cpu,      color: "text-emerald-400", bg: "bg-emerald-400/10", dec: 1 },
                { label: "kWh Baterías",  value: controlData?.totalKwhBaterias ?? 0,  icon: Battery,  color: "text-blue-400",    bg: "bg-blue-400/10",    dec: 1 },
              ].map(kpi => (
                <div key={kpi.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${kpi.bg} border border-white/5 min-w-0`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color} shrink-0`} />
                  <div className="min-w-0">
                    <div className={`text-sm font-bold ${kpi.color} truncate`}>{loading ? "—" : formatNum(kpi.value, kpi.dec)}</div>
                    <div className="text-[10px] text-slate-400 truncate">{kpi.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Filtros provincia / municipio ── */}
          <div className="absolute top-[78px] left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm">
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
              {!filterProvincia && provinceLabels.map(label => (
                <Marker
                  key={label.key}
                  position={label.center}
                  icon={label.icon}
                  interactive={true}
                  eventHandlers={{ click: () => setFilterProvincia(label.provincia) }}
                />
              ))}
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
          {showAnalisisRegional && (
            <AnalisisRegionalPanel
              allClients={allClients}
              allLeads={allLeads}
              viewMode={viewMode}
              provinciasDisponibles={provinciasDisponibles}
              confeccionOfertas={allConfeccionOfertas}
              selectedProvincias={analisisProvinciasSeleccionadas}
              onSelectedProvinciasChange={setAnalisisProvinciasSeleccionadas}
              onClose={() => { setShowAnalisisRegional(false); setAnalisisProvinciasSeleccionadas([]) }}
            />
          )}

          <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_80px_rgba(0,0,0,0.7)]" />
        </div>

        {/* ── Right Panel ── */}
        <div className="flex flex-col shrink-0 border-l border-slate-800 bg-slate-900/50 w-64">
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
        </div>
      </div>
    </div>
  )
}
