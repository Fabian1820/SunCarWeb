"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import type { Feature, GeoJsonObject } from "geojson"
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet"
import { GeoJSON, MapContainer, TileLayer, ZoomControl } from "react-leaflet"
import { Users, Sun, Cpu, Battery, Loader2, X } from "lucide-react"
import { ResultadosService } from "@/lib/api-services"
import type {
  DashboardEmpresaPrincipal,
  MunicipioDetallado,
} from "@/lib/types/feats/resultados/resultados-types"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import "leaflet/dist/leaflet.css"

function normalizeText(value: string | undefined | null): string {
  if (!value) return ""
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function formatNumber(value: number, decimals = 1): string {
  if (value == null || isNaN(value)) return "0"
  return new Intl.NumberFormat("es-CU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}

interface TooltipInfo {
  municipio: string
  provincia: string
  clientes: number
  x: number
  y: number
}

export default function ResultadosView() {
  const [data, setData] = useState<DashboardEmpresaPrincipal | null>(null)
  const [municipios, setMunicipios] = useState<MunicipioDetallado[]>([])
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const [selectedMunicipio, setSelectedMunicipio] = useState<MunicipioDetallado | null>(null)

  // Load dashboard data
  useEffect(() => {
    let cancelled = false
    async function load() {
      setIsLoading(true)
      try {
        const dashboardData = await ResultadosService.getDashboardPrincipal()
        if (!cancelled) setData(dashboardData)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar datos")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load map data (public endpoint + geojson)
  useEffect(() => {
    let cancelled = false
    async function load() {
      setMapLoading(true)
      setMapError(null)
      try {
        const [muniData, geoRes] = await Promise.all([
          ResultadosService.getMunicipiosDetallados(),
          fetch("/data/cuba-municipios.geojson", { cache: "force-cache" }),
        ])
        if (!geoRes.ok) throw new Error("No se pudo cargar el mapa")
        const geoJson = (await geoRes.json()) as GeoJsonObject
        if (!cancelled) {
          setMunicipios(muniData)
          setGeoJsonData(geoJson)
        }
      } catch (err) {
        if (!cancelled) setMapError(err instanceof Error ? err.message : "Error al cargar mapa")
      } finally {
        if (!cancelled) setMapLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Build municipality lookup
  const municipioMap = useMemo(() => {
    const map = new Map<string, MunicipioDetallado>()
    for (const m of municipios) {
      const key = normalizeText(m.municipio)
      if (key && m.cantidad_clientes > 0) map.set(key, m)
    }
    return map
  }, [municipios])

  const maxClientes = useMemo(() => {
    if (!municipios.length) return 1
    return Math.max(...municipios.map(m => m.cantidad_clientes || 0), 1)
  }, [municipios])

  const lightsOn = municipioMap.size > 0

  // Amber glow colors for night map
  const getFeatureStyle = useCallback((feature?: Feature): PathOptions => {
    const shapeName = String(
      (feature?.properties as Record<string, unknown> | undefined)?.shapeName ?? ""
    )
    const key = normalizeText(shapeName)
    const muni = municipioMap.get(key)

    if (!muni) {
      return {
        color: "#1e293b",
        weight: 0.4,
        fillColor: "#0f172a",
        fillOpacity: 0.6,
      }
    }

    const ratio = Math.min(muni.cantidad_clientes / maxClientes, 1)
    const fillColor = ratio < 0.15
      ? "#78350f"
      : ratio < 0.3
      ? "#92400e"
      : ratio < 0.5
      ? "#b45309"
      : ratio < 0.75
      ? "#d97706"
      : "#f59e0b"

    return {
      color: "#fbbf24",
      weight: 1.2,
      fillColor,
      fillOpacity: 0.85,
    }
  }, [municipioMap, maxClientes])

  const onEachFeature = useCallback((feature: Feature, layer: Layer) => {
    const shapeName = String(
      (feature.properties as Record<string, unknown> | undefined)?.shapeName ?? ""
    )
    const key = normalizeText(shapeName)
    const muni = municipioMap.get(key)

    if (!muni) return

    if ("on" in layer && "setStyle" in layer) {
      const typedLayer = layer as {
        on: (events: Record<string, (event: LeafletMouseEvent) => void>) => void
        setStyle: (style: PathOptions) => void
        bringToFront: () => void
      }

      typedLayer.on({
        mouseover: (event: LeafletMouseEvent) => {
          event.target.setStyle({
            weight: 2.5,
            color: "#fcd34d",
            fillOpacity: 1,
          })
          event.target.bringToFront()
          const e = event.originalEvent as MouseEvent
          setTooltip({
            municipio: muni.municipio,
            provincia: muni.provincia || "",
            clientes: muni.cantidad_clientes,
            x: e.clientX,
            y: e.clientY,
          })
        },
        mousemove: (event: LeafletMouseEvent) => {
          const e = event.originalEvent as MouseEvent
          setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)
        },
        mouseout: (event: LeafletMouseEvent) => {
          event.target.setStyle(getFeatureStyle(feature))
          setTooltip(null)
        },
        click: () => {
          setSelectedMunicipio(muni)
        },
      })
    }
  }, [municipioMap, getFeatureStyle])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-amber-600 animate-spin" />
          <p className="text-amber-800 font-medium">Cargando resultados...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 font-medium mb-2">Error al cargar datos</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const dashboardCards = [
    {
      title: "Total Clientes",
      value: formatNumber(data.cantidad_clientes, 0),
      subtitle: `${formatNumber(data.cantidad_municipios_instalados, 0)} municipios`,
      icon: Users,
      iconColor: "text-orange-600",
      bgLight: "bg-orange-50",
      accentColor: "bg-orange-500",
    },
    {
      title: "Total kW Paneles",
      value: formatNumber(data.total_kw_paneles),
      subtitle: `Prom: ${formatNumber(data.promedio_kw_paneles_por_cliente)} kW/cliente`,
      icon: Sun,
      iconColor: "text-yellow-600",
      bgLight: "bg-yellow-50",
      accentColor: "bg-yellow-500",
    },
    {
      title: "Total kW Inversores",
      value: formatNumber(data.total_kw_inversores),
      subtitle: `Prom: ${formatNumber(data.promedio_kw_inversores_por_cliente)} kW/cliente`,
      icon: Cpu,
      iconColor: "text-emerald-600",
      bgLight: "bg-emerald-50",
      accentColor: "bg-emerald-500",
    },
    {
      title: "Total kWh Baterías",
      value: formatNumber(data.total_kw_baterias),
      subtitle: `Prom: ${formatNumber(data.promedio_kw_baterias_por_cliente)} kWh/cliente`,
      icon: Battery,
      iconColor: "text-blue-600",
      bgLight: "bg-blue-50",
      accentColor: "bg-blue-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Resultados"
        subtitle="Indicadores principales de la empresa"
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
          {dashboardCards.map((card) => (
            <div
              key={card.title}
              className="relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`h-1.5 ${card.accentColor}`} />
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl ${card.bgLight}`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">{card.title}</p>
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                  {card.value}
                </p>
                <p className="text-xs font-medium text-gray-500 mt-2">{card.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Night Map Section */}
        <div className="relative isolate overflow-hidden rounded-2xl lg:rounded-3xl shadow-2xl border border-white/10">
          {/* Loading overlay */}
          {mapLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-3 h-[450px] sm:h-[550px] lg:h-[650px]">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
              <p className="text-white/60 text-sm font-medium">Cargando mapa</p>
            </div>
          )}

          {/* Error overlay */}
          {mapError && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 h-[450px] sm:h-[550px] lg:h-[650px]">
              <p className="text-red-400 text-center text-sm">{mapError}</p>
            </div>
          )}

          {/* Map with night filter */}
          <div
            className={`relative transition-[filter] duration-1000 ${
              lightsOn
                ? "brightness-100 saturate-[1.1]"
                : "brightness-[0.46] saturate-[0.8]"
            }`}
          >
            <div className="h-[450px] sm:h-[550px] lg:h-[650px]">
              {geoJsonData && (
                <MapContainer
                  center={[21.6, -78.8]}
                  zoom={7}
                  minZoom={6}
                  maxZoom={10}
                  style={{ height: "100%", width: "100%" }}
                  className="rounded-2xl lg:rounded-3xl"
                  scrollWheelZoom={false}
                  dragging
                  doubleClickZoom
                  touchZoom
                  keyboard
                  zoomControl={false}
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                  />
                  <GeoJSON
                    key={`cuba-night-${municipioMap.size}`}
                    data={geoJsonData}
                    style={getFeatureStyle}
                    onEachFeature={onEachFeature}
                  />
                  <ZoomControl position="bottomright" />
                </MapContainer>
              )}
            </div>

            {/* Ambient glow */}
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
              style={{
                opacity: lightsOn ? 1 : 0.35,
                background:
                  "radial-gradient(circle at 28% 22%, rgba(251,191,36,0.22), transparent 40%), radial-gradient(circle at 72% 78%, rgba(251,191,36,0.16), transparent 45%)",
              }}
            />
          </div>

          {/* Municipios counter - floating hub */}
          {lightsOn && (
            <div className="pointer-events-none absolute top-4 left-4 z-[1200]">
              <div className="rounded-2xl border border-amber-300/60 bg-amber-100/15 px-4 py-3 backdrop-blur-xl shadow-[0_0_25px_rgba(251,191,36,0.32)] transition-all duration-700">
                <p className="text-3xl font-semibold leading-none text-amber-50 animate-hub-breathe">
                  {municipioMap.size}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-amber-100/85">
                  municipios instalados
                </p>
              </div>
            </div>
          )}

          {/* Legend - bottom left */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-[1200]">
            <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Menos</span>
                <div className="flex h-2.5 rounded-full overflow-hidden">
                  {["#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b"].map((c) => (
                    <div key={c} className="w-5 h-2.5" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Más</span>
              </div>
            </div>
          </div>

          {/* Tooltip on hover */}
          {tooltip && (
            <div
              className="fixed z-[9999] pointer-events-none"
              style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
            >
              <div className="bg-black/90 border border-amber-400/30 text-white rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.2)] px-4 py-3 min-w-[180px] backdrop-blur-md">
                <p className="font-semibold text-sm text-amber-100 leading-tight">{tooltip.municipio}</p>
                {tooltip.provincia && (
                  <p className="text-[11px] text-white/40 mt-0.5">{tooltip.provincia}</p>
                )}
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-300">
                      {tooltip.clientes} {tooltip.clientes === 1 ? "cliente" : "clientes"}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-white/30 mt-1.5">Clic para ver detalle</p>
              </div>
            </div>
          )}

          {/* Detail panel on click */}
          {selectedMunicipio && (
            <div className="absolute top-4 right-4 z-[1300] max-w-xs w-full pointer-events-auto">
              <div className="bg-black/90 border border-amber-400/30 rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.25)] backdrop-blur-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div>
                    <p className="font-bold text-amber-100 text-base">{selectedMunicipio.municipio}</p>
                    <p className="text-[11px] text-white/40">{selectedMunicipio.provincia}</p>
                  </div>
                  <button
                    onClick={() => setSelectedMunicipio(null)}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="h-4 w-4 text-white/50" />
                  </button>
                </div>

                <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Clientes</p>
                    <p className="text-lg font-bold text-amber-300">{selectedMunicipio.cantidad_clientes}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Paneles</p>
                    <p className="text-lg font-bold text-yellow-300">{formatNumber(selectedMunicipio.total_kw_paneles)} kW</p>
                  </div>
                  <div className="bg-white/5 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Inversores</p>
                    <p className="text-lg font-bold text-emerald-300">{formatNumber(selectedMunicipio.total_kw_inversores)} kW</p>
                  </div>
                  <div className="bg-white/5 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Baterías</p>
                    <p className="text-lg font-bold text-blue-300">{formatNumber(selectedMunicipio.total_kw_baterias)} kWh</p>
                  </div>
                </div>

                {selectedMunicipio.clientes_nombres?.length > 0 && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Clientes</p>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                      {selectedMunicipio.clientes_nombres.map((nombre, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-white/70">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-400/60 shrink-0" />
                          <span className="truncate">{nombre}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes hubBreathe {
          0%, 100% { text-shadow: 0 0 0 rgba(252, 211, 77, 0); }
          50% { text-shadow: 0 0 18px rgba(252, 211, 77, 0.45); }
        }
        .animate-hub-breathe { animation: hubBreathe 2.8s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.3); border-radius: 2px; }
      `}</style>
    </div>
  )
}
