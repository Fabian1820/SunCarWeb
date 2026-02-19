"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Feature, GeoJsonObject } from "geojson";
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import {
  Cpu, Sun, Crosshair, Activity, Users, Zap, MapPin,
  Search, ChevronRight, ChevronLeft, List,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import "leaflet/dist/leaflet.css";

type MetricKey = "paneles" | "inversores";

interface MunicipioStatApiItem {
  provincia: string;
  municipio: string;
  total_clientes_instalados: number;
  potencia_inversores_kw: number;
  potencia_paneles_kw: number;
  total_kw_instalados: number;
}

interface MunicipioStatsApiResponse {
  success: boolean;
  message?: string;
  data?: MunicipioStatApiItem[];
}

interface AggregatedMunicipioStat {
  municipio: string;
  provincias: string[];
  total_clientes_instalados: number;
  potencia_inversores_kw: number;
  potencia_paneles_kw: number;
  total_kw_instalados: number;
}

interface HoverInfo {
  municipio: string;
  clientX: number;
  clientY: number;
  stat: AggregatedMunicipioStat | null;
}

const mapCenter: [number, number] = [21.5218, -77.7812];

const METRIC_CONFIG: Record<
  MetricKey,
  {
    label: string;
    field: "potencia_paneles_kw" | "potencia_inversores_kw";
    icon: typeof Sun;
  }
> = {
  inversores: {
    label: "Inversores",
    field: "potencia_inversores_kw",
    icon: Cpu,
  },
  paneles: {
    label: "Paneles",
    field: "potencia_paneles_kw",
    icon: Sun,
  },
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatMetric(value: number): string {
  return new Intl.NumberFormat("es-CU", {
    maximumFractionDigits: value > 100 ? 0 : 2,
  }).format(value);
}

function heatColorFromRatio(ratio: number): string {
  if (ratio <= 0) return "#081224";
  if (ratio < 0.15) return "#0c2b44";
  if (ratio < 0.3) return "#13526b";
  if (ratio < 0.5) return "#1b7e9f";
  if (ratio < 0.7) return "#25a5c9";
  if (ratio < 0.85) return "#5fc0d4";
  if (ratio < 0.95) return "#f4c84b";
  return "#ff6b6b";
}

function MapCoordinatesTracker({ onCoordsChange }: { onCoordsChange: (lat: string, lng: string) => void }) {
  const map = useMap();

  useEffect(() => {
    const handler = () => {
      const center = map.getCenter();
      onCoordsChange(center.lat.toFixed(4), center.lng.toFixed(4));
    };
    map.on("move", handler);
    handler();
    return () => { map.off("move", handler); };
  }, [map, onCoordsChange]);

  return null;
}

export default function FuturisticRadarHeatmap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("inversores");
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [stats, setStats] = useState<MunicipioStatApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [coords, setCoords] = useState({ lat: "21.5218", lng: "-77.7812" });
  const [currentTime, setCurrentTime] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
        " UTC" + (now.getTimezoneOffset() > 0 ? "-" : "+") + String(Math.abs(now.getTimezoneOffset() / 60)).padStart(2, "0")
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const endpoint = `${API_BASE_URL.replace(/\/+$/, "")}/clientes/estadisticas/kw-instalados-por-municipio`;

        const [geoJsonResponse, statsResponse] = await Promise.all([
          fetch("/data/cuba-municipios.geojson", { cache: "force-cache" }),
          fetch(endpoint, { cache: "no-store" }),
        ]);

        if (!geoJsonResponse.ok) throw new Error("No se pudo cargar el GeoJSON de municipios");
        if (!statsResponse.ok) throw new Error("No se pudieron cargar las estadísticas por municipio");

        const geoJson = (await geoJsonResponse.json()) as GeoJsonObject;
        const statsPayload = (await statsResponse.json()) as MunicipioStatsApiResponse;

        if (!statsPayload.success || !Array.isArray(statsPayload.data)) {
          throw new Error(statsPayload.message || "Formato de respuesta inesperado");
        }

        if (!cancelled) {
          setGeoJsonData(geoJson);
          setStats(statsPayload.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error desconocido al cargar el radar");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const aggregatedStats = useMemo(() => {
    const map = new Map<string, AggregatedMunicipioStat>();

    for (const item of stats) {
      const municipioKey = normalizeText(item.municipio);
      const previous = map.get(municipioKey);

      if (previous) {
        previous.total_clientes_instalados += Number(item.total_clientes_instalados || 0);
        previous.potencia_inversores_kw += Number(item.potencia_inversores_kw || 0);
        previous.potencia_paneles_kw += Number(item.potencia_paneles_kw || 0);
        previous.total_kw_instalados += Number(item.total_kw_instalados || 0);
        if (!previous.provincias.includes(item.provincia)) {
          previous.provincias.push(item.provincia);
        }
      } else {
        map.set(municipioKey, {
          municipio: item.municipio,
          provincias: [item.provincia],
          total_clientes_instalados: Number(item.total_clientes_instalados || 0),
          potencia_inversores_kw: Number(item.potencia_inversores_kw || 0),
          potencia_paneles_kw: Number(item.potencia_paneles_kw || 0),
          total_kw_instalados: Number(item.total_kw_instalados || 0),
        });
      }
    }
    return map;
  }, [stats]);

  const totalStats = useMemo(() => {
    let clientes = 0, inversores = 0, paneles = 0;
    for (const s of aggregatedStats.values()) {
      clientes += s.total_clientes_instalados;
      inversores += s.potencia_inversores_kw;
      paneles += s.potencia_paneles_kw;
    }
    return { clientes, inversores, paneles, municipios: aggregatedStats.size };
  }, [aggregatedStats]);

  const sortedMunicipios = useMemo(() => {
    const all = Array.from(aggregatedStats.values());
    const filtered = searchQuery.trim()
      ? all.filter((s) =>
          normalizeText(s.municipio).includes(normalizeText(searchQuery)) ||
          s.provincias.some((p) => normalizeText(p).includes(normalizeText(searchQuery)))
        )
      : all;
    return filtered.sort((a, b) => {
      const aVal = a.potencia_inversores_kw + a.potencia_paneles_kw;
      const bVal = b.potencia_inversores_kw + b.potencia_paneles_kw;
      return bVal - aVal;
    });
  }, [aggregatedStats, searchQuery]);

  const filteredTotals = useMemo(() => {
    let inversores = 0, paneles = 0, clientes = 0;
    for (const s of sortedMunicipios) {
      inversores += s.potencia_inversores_kw;
      paneles += s.potencia_paneles_kw;
      clientes += s.total_clientes_instalados;
    }
    return { inversores, paneles, clientes };
  }, [sortedMunicipios]);

  const maxMetricValue = useMemo(() => {
    const field = METRIC_CONFIG[selectedMetric].field;
    const values = Array.from(aggregatedStats.values()).map((item) => Number(item[field] || 0));
    const max = Math.max(...values, 0);
    return max > 0 ? max : 1;
  }, [aggregatedStats, selectedMetric]);

  const getMetricValue = (stat: AggregatedMunicipioStat, metric: MetricKey): number => {
    return Number(stat[METRIC_CONFIG[metric].field] || 0);
  };

  const getFeatureStyle = useCallback((feature?: Feature): PathOptions => {
    const shapeName = String(
      (feature?.properties as Record<string, unknown> | undefined)?.shapeName ?? "",
    );
    const stat = aggregatedStats.get(normalizeText(shapeName));

    if (!stat) {
      return {
        color: "#0e2a3f",
        weight: 0.6,
        fillColor: "#040e1a",
        fillOpacity: 0.4,
      };
    }

    const value = getMetricValue(stat, selectedMetric);
    const ratio = Math.sqrt(Math.max(value, 0) / maxMetricValue);

    return {
      color: "#22d3ee55",
      weight: 0.9,
      fillColor: heatColorFromRatio(ratio),
      fillOpacity: 0.78,
    };
  }, [aggregatedStats, selectedMetric, maxMetricValue]);

  const onEachFeature = useCallback((feature: Feature, layer: Layer) => {
    const shapeName = String(
      (feature.properties as Record<string, unknown> | undefined)?.shapeName ?? "Municipio",
    );
    const stat = aggregatedStats.get(normalizeText(shapeName)) ?? null;

    if ("on" in layer && "setStyle" in layer) {
      const typedLayer = layer as {
        on: (events: Record<string, (event: LeafletMouseEvent) => void>) => void;
        setStyle: (style: PathOptions) => void;
      };

      typedLayer.on({
        mouseover: (event: LeafletMouseEvent) => {
          event.target.setStyle({
            weight: 2.5,
            color: "#a5f3fc",
            fillOpacity: 0.95,
          });
          const e = event.originalEvent as MouseEvent;
          setHoverInfo({ municipio: shapeName, clientX: e.clientX, clientY: e.clientY, stat });
        },
        mousemove: (event: LeafletMouseEvent) => {
          const e = event.originalEvent as MouseEvent;
          setHoverInfo({ municipio: shapeName, clientX: e.clientX, clientY: e.clientY, stat });
        },
        mouseout: (event: LeafletMouseEvent) => {
          event.target.setStyle(getFeatureStyle(feature));
          setHoverInfo((prev) => (prev?.municipio === shapeName ? null : prev));
        },
      });
    }
  }, [aggregatedStats, getFeatureStyle]);

  const handleCoordsChange = useCallback((lat: string, lng: string) => {
    setCoords({ lat, lng });
  }, []);

  const tooltipPosition = useMemo(() => {
    if (!hoverInfo) return null;
    const cardW = 290;
    const cardH = 220;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
    const vh = typeof window !== "undefined" ? window.innerHeight : 1080;

    let left = hoverInfo.clientX + 16;
    let top = hoverInfo.clientY - cardH - 12;

    if (left + cardW > vw - 10) left = hoverInfo.clientX - cardW - 16;
    if (top < 10) top = hoverInfo.clientY + 16;
    if (left < 10) left = 10;
    if (top + cardH > vh - 10) top = vh - cardH - 10;

    return { left, top };
  }, [hoverInfo]);

  return (
    <div className="relative w-full flex" style={{ height: "calc(100vh - 120px)" }}>
      {/* ===== MAP AREA ===== */}
      <div ref={containerRef} className="relative flex-1 min-w-0 isolate overflow-hidden rounded-xl">
        {/* Corner brackets */}
        <div className="absolute inset-0 z-[900] pointer-events-none">
          <svg className="absolute top-0 left-0 w-12 h-12 text-cyan-400/40"><path d="M2 12 L2 2 L12 2" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          <svg className="absolute top-0 right-0 w-12 h-12 text-cyan-400/40"><path d="M36 2 L46 2 L46 12" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          <svg className="absolute bottom-0 left-0 w-12 h-12 text-cyan-400/40"><path d="M2 36 L2 46 L12 46" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          <svg className="absolute bottom-0 right-0 w-12 h-12 text-cyan-400/40"><path d="M36 46 L46 46 L46 36" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
        </div>

        {/* Scan lines */}
        <div className="absolute inset-0 z-[900] pointer-events-none opacity-[0.04] bg-[repeating-linear-gradient(180deg,rgba(56,189,248,0.7)_0px,rgba(56,189,248,0.7)_1px,transparent_1px,transparent_4px)]" />

        {/* Metric selector - top left */}
        <div className="absolute left-4 top-4 z-[1000] flex gap-1.5 rounded-xl border border-cyan-400/20 bg-[#010a18]/90 p-1.5 backdrop-blur-md">
          {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((metric) => {
            const Icon = METRIC_CONFIG[metric].icon;
            const active = metric === selectedMetric;
            return (
              <button
                key={metric}
                type="button"
                onClick={() => setSelectedMetric(metric)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold tracking-wider uppercase transition-all ${
                  active
                    ? "bg-cyan-400/15 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.25)] border border-cyan-400/30"
                    : "text-cyan-300/50 hover:bg-cyan-400/5 hover:text-cyan-200 border border-transparent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {METRIC_CONFIG[metric].label}
              </button>
            );
          })}
        </div>

        {/* Global stats - top right */}
        <div className="absolute right-4 top-4 z-[1000] rounded-xl border border-cyan-400/20 bg-[#010a18]/90 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-3 w-3 text-cyan-400/70" />
            <span className="text-[10px] font-mono tracking-[0.15em] text-cyan-400/60 uppercase">Intel Summary</span>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-cyan-400/50" />
              <span className="text-cyan-300/50">Clientes</span>
            </div>
            <span className="text-cyan-100 text-right">{formatMetric(totalStats.clientes)}</span>
            <div className="flex items-center gap-1.5">
              <Sun className="h-3 w-3 text-amber-400/60" />
              <span className="text-cyan-300/50">Paneles</span>
            </div>
            <span className="text-amber-200 text-right">{formatMetric(totalStats.paneles)} kW</span>
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3 w-3 text-emerald-400/60" />
              <span className="text-cyan-300/50">Inversores</span>
            </div>
            <span className="text-emerald-200 text-right">{formatMetric(totalStats.inversores)} kW</span>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-cyan-400/50" />
              <span className="text-cyan-300/50">Zonas</span>
            </div>
            <span className="text-cyan-100 text-right">{totalStats.municipios}</span>
          </div>
        </div>

        {/* Coordinates & time - bottom left */}
        <div className="absolute left-4 bottom-4 z-[1000] flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-[#010a18]/90 px-3 py-2 backdrop-blur-md">
          <Crosshair className="h-3.5 w-3.5 text-cyan-400/50" />
          <span className="text-[11px] font-mono text-cyan-300/70 tracking-wider">
            {coords.lat}°N {coords.lng}°W
          </span>
          <div className="h-3 w-px bg-cyan-400/20" />
          <span className="text-[11px] font-mono text-cyan-300/70 tracking-wider">{currentTime}</span>
        </div>

        {/* Heat legend - bottom right */}
        <div className="absolute right-4 bottom-4 z-[1000] rounded-xl border border-cyan-400/20 bg-[#010a18]/90 p-3 backdrop-blur-md">
          <span className="text-[10px] font-mono tracking-[0.15em] text-cyan-400/60 uppercase block mb-2">Intensidad</span>
          <div className="flex items-center gap-0.5">
            {["#081224", "#0c2b44", "#13526b", "#1b7e9f", "#25a5c9", "#5fc0d4", "#f4c84b", "#ff6b6b"].map((color) => (
              <div key={color} className="w-5 h-3 rounded-sm" style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] font-mono text-cyan-400/40">0 kW</span>
            <span className="text-[9px] font-mono text-cyan-400/40">MAX</span>
          </div>
        </div>

        {/* Sidebar toggle button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute right-4 top-[140px] z-[1001] flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-[#010a18]/90 px-2.5 py-2 text-cyan-300/70 hover:text-cyan-100 hover:bg-cyan-400/10 backdrop-blur-md transition-all"
        >
          <List className="h-3.5 w-3.5" />
          <span className="text-[10px] font-mono tracking-wider uppercase hidden sm:inline">Municipios</span>
          {sidebarOpen ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        {/* Loading */}
        {isLoading && (
          <div className="absolute inset-0 z-[1100] flex flex-col items-center justify-center bg-[#010a18]/95 gap-4">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
              <div className="absolute inset-3 rounded-full border border-cyan-400/40 animate-spin" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-6 rounded-full bg-cyan-400/15 animate-pulse" />
            </div>
            <span className="text-sm font-mono tracking-[0.2em] text-cyan-300/60 uppercase">Cargando radar...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-[#010a18]/95 px-4">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full border border-red-400/30 bg-red-400/10 mb-4">
                <span className="text-red-400 text-xl">!</span>
              </div>
              <p className="text-red-300 text-sm font-mono">{error}</p>
            </div>
          </div>
        )}

        {/* Map */}
        {geoJsonData && (
          <MapContainer
            center={mapCenter}
            zoom={7}
            minZoom={6}
            maxZoom={18}
            style={{ height: "100%", width: "100%" }}
            className="rounded-xl"
            scrollWheelZoom
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; Esri, Maxar, Earthstar Geographics'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
              opacity={0.4}
            />
            <GeoJSON
              key={selectedMetric}
              data={geoJsonData}
              style={(feature) => getFeatureStyle(feature as Feature)}
              onEachFeature={(feature, layer) => onEachFeature(feature as Feature, layer)}
            />
            <MapCoordinatesTracker onCoordsChange={handleCoordsChange} />
          </MapContainer>
        )}

        {/* Radar sweep */}
        <div className="intel-radar-sweep pointer-events-none absolute inset-0 z-[5] rounded-xl" />
      </div>

      {/* ===== SIDEBAR - Municipality List ===== */}
      <div
        className={`relative z-[1100] flex-shrink-0 border-l border-cyan-400/15 bg-[#010a18] transition-all duration-300 overflow-hidden ${
          sidebarOpen ? "w-[340px]" : "w-0"
        }`}
      >
        <div className="w-[340px] h-full flex flex-col">
          {/* Sidebar header */}
          <div className="p-3 border-b border-cyan-400/15">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <List className="h-3.5 w-3.5 text-cyan-400/70" />
                <span className="text-xs font-mono tracking-[0.12em] text-cyan-300/80 uppercase font-semibold">
                  Municipios ({sortedMunicipios.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="text-cyan-400/40 hover:text-cyan-200 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cyan-400/40" />
              <input
                type="text"
                placeholder="Buscar municipio o provincia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#020e1c] border border-cyan-400/15 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-cyan-100 placeholder:text-cyan-400/30 focus:outline-none focus:border-cyan-400/40 transition-colors"
              />
            </div>

            {/* Filtered totals */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-[#020e1c] border border-cyan-400/10 p-2 text-center">
                <Sun className="h-3 w-3 text-amber-400/70 mx-auto mb-1" />
                <p className="text-[10px] font-mono text-cyan-400/50 uppercase">Paneles</p>
                <p className="text-xs font-mono text-amber-200 font-bold">{formatMetric(filteredTotals.paneles)} kW</p>
              </div>
              <div className="rounded-lg bg-[#020e1c] border border-cyan-400/10 p-2 text-center">
                <Cpu className="h-3 w-3 text-emerald-400/70 mx-auto mb-1" />
                <p className="text-[10px] font-mono text-cyan-400/50 uppercase">Inversores</p>
                <p className="text-xs font-mono text-emerald-200 font-bold">{formatMetric(filteredTotals.inversores)} kW</p>
              </div>
              <div className="rounded-lg bg-[#020e1c] border border-cyan-400/10 p-2 text-center">
                <Users className="h-3 w-3 text-cyan-400/70 mx-auto mb-1" />
                <p className="text-[10px] font-mono text-cyan-400/50 uppercase">Clientes</p>
                <p className="text-xs font-mono text-cyan-100 font-bold">{formatMetric(filteredTotals.clientes)}</p>
              </div>
            </div>
          </div>

          {/* Municipality list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {sortedMunicipios.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-cyan-400/30 font-mono text-xs">
                <Search className="h-5 w-5 mb-2" />
                Sin resultados
              </div>
            ) : (
              <div className="divide-y divide-cyan-400/[0.06]">
                {sortedMunicipios.map((stat, idx) => (
                  <div
                    key={stat.municipio + idx}
                    className="px-3 py-2.5 hover:bg-cyan-400/[0.04] transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold text-cyan-100 group-hover:text-cyan-50 truncate">
                        {stat.municipio}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400/40 flex-shrink-0 ml-2">
                        {stat.provincias.join(", ")}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-amber-400/50">Paneles</span>
                        <p className="text-amber-200">{formatMetric(stat.potencia_paneles_kw)} kW</p>
                      </div>
                      <div>
                        <span className="text-emerald-400/50">Inversores</span>
                        <p className="text-emerald-200">{formatMetric(stat.potencia_inversores_kw)} kW</p>
                      </div>
                      <div>
                        <span className="text-cyan-400/50">Clientes</span>
                        <p className="text-cyan-100">{formatMetric(stat.total_clientes_instalados)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== HOVER TOOLTIP (portal to body, fixed position) ===== */}
      {mounted && hoverInfo && tooltipPosition && createPortal(
        <div
          className="pointer-events-none fixed z-[9999] w-[290px] rounded-xl border border-cyan-300/30 bg-[#010a18]/95 backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.2),0_0_60px_rgba(34,211,238,0.05)]"
          style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
        >
          <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

          <div className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-cyan-50 font-mono tracking-wide">{hoverInfo.municipio}</p>
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-cyan-400/50 mb-3">
              {hoverInfo.stat ? hoverInfo.stat.provincias.join(" / ") : "Sin datos"}
            </p>

            {hoverInfo.stat ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-300/60 flex items-center gap-1.5">
                    <Users className="h-3 w-3" /> Clientes
                  </span>
                  <span className="text-cyan-100 font-semibold">{formatMetric(hoverInfo.stat.total_clientes_instalados)}</span>
                </div>
                <div className="h-px bg-cyan-400/10" />
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-300/60 flex items-center gap-1.5">
                    <Sun className="h-3 w-3" /> Paneles
                  </span>
                  <span className="text-amber-200 font-semibold">{formatMetric(hoverInfo.stat.potencia_paneles_kw)} kW</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-300/60 flex items-center gap-1.5">
                    <Cpu className="h-3 w-3" /> Inversores
                  </span>
                  <span className="text-emerald-200 font-semibold">{formatMetric(hoverInfo.stat.potencia_inversores_kw)} kW</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300/40">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/20" />
                Sin instalaciones registradas
              </div>
            )}
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        </div>,
        document.body
      )}

      <style jsx global>{`
        .leaflet-container {
          background: #010a18 !important;
          border-radius: 0.75rem;
        }

        .leaflet-control-attribution {
          background: rgba(1, 10, 24, 0.85) !important;
          color: rgba(165, 243, 252, 0.6) !important;
          border-top-left-radius: 6px !important;
          border: 1px solid rgba(34, 211, 238, 0.15) !important;
          font-family: ui-monospace, monospace !important;
          font-size: 9px !important;
          backdrop-filter: blur(8px);
        }

        .leaflet-control-attribution a {
          color: rgba(34, 211, 238, 0.5) !important;
        }

        .leaflet-control-zoom {
          border: none !important;
        }

        .leaflet-control-zoom a {
          background: rgba(1, 10, 24, 0.9) !important;
          color: #67e8f9 !important;
          border: 1px solid rgba(34, 211, 238, 0.2) !important;
          font-family: ui-monospace, monospace !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 30px !important;
          backdrop-filter: blur(8px);
        }

        .leaflet-control-zoom a:hover {
          background: rgba(14, 116, 144, 0.4) !important;
          color: #a5f3fc !important;
        }

        .intel-radar-sweep {
          background: conic-gradient(
            from 0deg at 50% 50%,
            transparent 0deg,
            transparent 320deg,
            rgba(14, 165, 233, 0.08) 360deg
          );
          mix-blend-mode: screen;
          animation: intel-radar-rotate 8s linear infinite;
          transform-origin: center;
        }

        @keyframes intel-radar-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.15);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.3);
        }
      `}</style>
    </div>
  );
}
