"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import type { Feature, GeoJsonObject } from "geojson"
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet"
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet"
import { Users, Sun, Cpu, Battery, ArrowLeft, Loader2, Trophy } from "lucide-react"
import Link from "next/link"
import { ResultadosService } from "@/lib/api-services"
import type { DashboardEmpresaPrincipal, MunicipioInstalado } from "@/lib/types/feats/resultados/resultados-types"
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
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setIsLoading(true)
      setError(null)

      try {
        const [dashboardData, geoJsonResponse] = await Promise.all([
          ResultadosService.getDashboardPrincipal(),
          fetch("/data/cuba-municipios.geojson", { cache: "force-cache" }),
        ])

        if (!geoJsonResponse.ok) throw new Error("No se pudo cargar el mapa de Cuba")

        const geoJson = (await geoJsonResponse.json()) as GeoJsonObject

        if (!cancelled) {
          setData(dashboardData)
          setGeoJsonData(geoJson)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar los datos")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [])

  // Build municipality lookup map
  const municipioMap = useMemo(() => {
    if (!data?.municipios_instalados) return new Map<string, MunicipioInstalado>()
    const map = new Map<string, MunicipioInstalado>()
    for (const m of data.municipios_instalados) {
      const key = normalizeText(m.municipio)
      if (key) map.set(key, m)
    }
    return map
  }, [data])

  // Max clients for color scaling
  const maxClientes = useMemo(() => {
    if (!data?.municipios_instalados?.length) return 1
    return Math.max(...data.municipios_instalados.map(m => m.cantidad_clientes || 0), 1)
  }, [data])

  const getFeatureStyle = useCallback((feature?: Feature): PathOptions => {
    const shapeName = String(
      (feature?.properties as Record<string, unknown> | undefined)?.shapeName ?? ""
    )
    const key = normalizeText(shapeName)
    const muni = municipioMap.get(key)

    if (!muni || !muni.cantidad_clientes) {
      return {
        color: "#d4d4d8",
        weight: 0.5,
        fillColor: "#f4f4f5",
        fillOpacity: 0.4,
      }
    }

    // Gradient from light yellow to warm amber/gold
    const ratio = Math.min(muni.cantidad_clientes / maxClientes, 1)
    const fillColor = ratio < 0.15
      ? "#fef9c3"
      : ratio < 0.3
      ? "#fde68a"
      : ratio < 0.5
      ? "#fbbf24"
      : ratio < 0.75
      ? "#f59e0b"
      : "#d97706"

    return {
      color: "#92400e",
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

    // Solo interactuar con municipios que tienen instalaciones
    if (!muni || !muni.cantidad_clientes) return

    if ("on" in layer && "setStyle" in layer) {
      const typedLayer = layer as {
        on: (events: Record<string, (event: LeafletMouseEvent) => void>) => void
        setStyle: (style: PathOptions) => void
        bringToFront: () => void
      }

      typedLayer.on({
        mouseover: (event: LeafletMouseEvent) => {
          event.target.setStyle({
            weight: 3,
            color: "#78350f",
            fillOpacity: 0.95,
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
          setTooltip(prev => prev ? {
            ...prev,
            x: e.clientX,
            y: e.clientY,
          } : null)
        },
        mouseout: (event: LeafletMouseEvent) => {
          event.target.setStyle(getFeatureStyle(feature))
          setTooltip(null)
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 font-medium mb-2">Error al cargar datos</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

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
      {/* Header - mismo estilo que el resto de la app */}
      <header className="bg-white/90 backdrop-blur border-b border-orange-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm font-medium hidden sm:inline">Inicio</span>
              </Link>
              <div className="h-5 w-px bg-gray-200" />
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-50">
                  <Trophy className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-gray-900">
                    Resultados
                  </h1>
                  <p className="text-[11px] text-gray-500 hidden sm:block">
                    Indicadores principales de la empresa
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
          {dashboardCards.map((card) => (
            <div
              key={card.title}
              className="relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Accent top bar */}
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

        {/* Map Section */}
        <div className="rounded-2xl bg-white shadow-lg overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Presencia Nacional</h2>
                <p className="text-sm text-gray-500">
                  Distribución por municipios · {formatNumber(data.cantidad_municipios_instalados, 0)} municipios activos
                </p>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Menos</span>
                <div className="flex h-3 rounded-full overflow-hidden border border-gray-200">
                  {["#fef9c3", "#fde68a", "#fbbf24", "#f59e0b", "#d97706"].map((color) => (
                    <div key={color} className="w-6 h-3" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <span className="text-xs text-gray-400">Más clientes</span>
              </div>
            </div>
          </div>

          <div className="relative h-[400px] sm:h-[500px] lg:h-[600px]">
            {geoJsonData && (
              <MapContainer
                center={[21.5218, -77.7812]}
                zoom={7}
                minZoom={6}
                maxZoom={10}
                style={{ height: "100%", width: "100%", background: "#fafaf9" }}
                zoomControl={true}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                  opacity={0.3}
                />
                <GeoJSON
                  key={`cuba-resultados-${municipioMap.size}`}
                  data={geoJsonData}
                  style={getFeatureStyle}
                  onEachFeature={onEachFeature}
                />
              </MapContainer>
            )}

            {/* Tooltip */}
            {tooltip && (
              <div
                className="fixed z-[9999] pointer-events-none"
                style={{
                  left: tooltip.x + 14,
                  top: tooltip.y - 10,
                }}
              >
                <div className="bg-gray-900 text-white rounded-lg shadow-xl px-3.5 py-2.5 min-w-[160px]">
                  <p className="font-semibold text-sm leading-tight">{tooltip.municipio}</p>
                  {tooltip.provincia && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{tooltip.provincia}</p>
                  )}
                  <div className="mt-1.5 pt-1.5 border-t border-gray-700">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-amber-400" />
                      <span className="text-sm font-medium text-amber-300">
                        {tooltip.clientes} {tooltip.clientes === 1 ? "cliente" : "clientes"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
