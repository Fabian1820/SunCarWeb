"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, GeoJsonObject } from "geojson";
import type { Layer, LeafletMouseEvent, PathOptions } from "leaflet";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import { Cpu, Sun, Zap } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";
import "leaflet/dist/leaflet.css";

type MetricKey = "paneles" | "inversores" | "total";

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
  x: number;
  y: number;
  stat: AggregatedMunicipioStat | null;
}

const CARD_WIDTH = 250;
const CARD_HEIGHT = 175;
const mapCenter: [number, number] = [21.5218, -77.7812];

const METRIC_CONFIG: Record<
  MetricKey,
  {
    label: string;
    field:
      | "potencia_paneles_kw"
      | "potencia_inversores_kw"
      | "total_kw_instalados";
    icon: typeof Sun;
  }
> = {
  paneles: {
    label: "Paneles",
    field: "potencia_paneles_kw",
    icon: Sun,
  },
  inversores: {
    label: "Inversores",
    field: "potencia_inversores_kw",
    icon: Cpu,
  },
  total: {
    label: "Total",
    field: "total_kw_instalados",
    icon: Zap,
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function FuturisticRadarHeatmap() {
  const mapShellRef = useRef<HTMLDivElement>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("paneles");
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [stats, setStats] = useState<MunicipioStatApiItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

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

        if (!geoJsonResponse.ok) {
          throw new Error("No se pudo cargar el GeoJSON de municipios");
        }

        if (!statsResponse.ok) {
          throw new Error("No se pudieron cargar las estadísticas por municipio");
        }

        const geoJson = (await geoJsonResponse.json()) as GeoJsonObject;
        const statsPayload = (await statsResponse.json()) as MunicipioStatsApiResponse;

        if (!statsPayload.success || !Array.isArray(statsPayload.data)) {
          throw new Error(
            statsPayload.message ||
              "La API de estadísticas respondió en un formato inesperado",
          );
        }

        if (!cancelled) {
          setGeoJsonData(geoJson);
          setStats(statsPayload.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Error desconocido al cargar el radar",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
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

  const maxMetricValue = useMemo(() => {
    const field = METRIC_CONFIG[selectedMetric].field;
    const values = Array.from(aggregatedStats.values()).map((item) =>
      Number(item[field] || 0),
    );
    const max = Math.max(...values, 0);
    return max > 0 ? max : 1;
  }, [aggregatedStats, selectedMetric]);

  const getMetricValue = (
    stat: AggregatedMunicipioStat,
    metric: MetricKey,
  ): number => {
    const field = METRIC_CONFIG[metric].field;
    return Number(stat[field] || 0);
  };

  const getFeatureStyle = (feature?: Feature): PathOptions => {
    const shapeName = String(
      (feature?.properties as Record<string, unknown> | undefined)?.shapeName ?? "",
    );
    const stat = aggregatedStats.get(normalizeText(shapeName));

    if (!stat) {
      return {
        color: "#1f2b45",
        weight: 0.8,
        fillColor: "#081224",
        fillOpacity: 0.5,
      };
    }

    const value = getMetricValue(stat, selectedMetric);
    const ratio = Math.sqrt(Math.max(value, 0) / maxMetricValue);

    return {
      color: "#31b4d4",
      weight: 1.15,
      fillColor: heatColorFromRatio(ratio),
      fillOpacity: 0.86,
    };
  };

  const getHoverCardPosition = (x: number, y: number) => {
    const shell = mapShellRef.current;
    if (!shell) return { left: x + 18, top: y - 18 };

    const width = shell.clientWidth;
    const height = shell.clientHeight;
    return {
      left: clamp(x + 18, 12, Math.max(12, width - CARD_WIDTH - 12)),
      top: clamp(y - CARD_HEIGHT - 8, 12, Math.max(12, height - CARD_HEIGHT - 12)),
    };
  };

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const shapeName = String(
      (feature.properties as Record<string, unknown> | undefined)?.shapeName ?? "Municipio",
    );

    const stat = aggregatedStats.get(normalizeText(shapeName)) ?? null;

    if ("on" in layer && "setStyle" in layer) {
      (
        layer as {
          on: (events: Record<string, (event: LeafletMouseEvent) => void>) => void;
          setStyle: (style: PathOptions) => void;
        }
      ).on({
        mouseover: (event: LeafletMouseEvent) => {
          event.target.setStyle({
            weight: 2.4,
            color: "#a5f3fc",
            fillOpacity: 1,
          });

          setHoverInfo({
            municipio: shapeName,
            x: event.containerPoint.x,
            y: event.containerPoint.y,
            stat,
          });
        },
        mousemove: (event: LeafletMouseEvent) => {
          setHoverInfo({
            municipio: shapeName,
            x: event.containerPoint.x,
            y: event.containerPoint.y,
            stat,
          });
        },
        mouseout: (event: LeafletMouseEvent) => {
          event.target.setStyle(getFeatureStyle(feature));
          setHoverInfo((prev) => (prev?.municipio === shapeName ? null : prev));
        },
      });
    }
  };

  const hoverCardStyle = hoverInfo
    ? getHoverCardPosition(hoverInfo.x, hoverInfo.y)
    : null;

  return (
    <div className="intel-tilt-stage">
      <div
        ref={mapShellRef}
        className="intel-map-shell relative overflow-hidden rounded-3xl border border-cyan-400/40 bg-gradient-to-br from-slate-950 via-[#02172d] to-slate-900 p-3 shadow-[0_0_40px_rgba(34,211,238,0.15)]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.35),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.25),transparent_45%),radial-gradient(circle_at_50%_90%,rgba(14,116,144,0.22),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background:repeating-linear-gradient(180deg,rgba(56,189,248,0.12)_0px,rgba(56,189,248,0.12)_1px,transparent_1px,transparent_7px)]" />
        <div className="intel-radar-sweep pointer-events-none absolute inset-0 z-[7] rounded-[24px]" />

        <div className="absolute left-5 top-5 z-20 grid grid-cols-3 gap-2 rounded-2xl border border-cyan-400/30 bg-slate-950/70 p-2">
          {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((metric) => {
            const Icon = METRIC_CONFIG[metric].icon;
            const active = metric === selectedMetric;

            return (
              <button
                key={metric}
                type="button"
                onClick={() => setSelectedMetric(metric)}
                className={`flex min-w-[96px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all sm:text-sm ${
                  active
                    ? "bg-cyan-400/20 text-cyan-100 shadow-[0_0_22px_rgba(56,189,248,0.4)]"
                    : "text-cyan-200/70 hover:bg-cyan-400/10 hover:text-cyan-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {METRIC_CONFIG[metric].label}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/85 text-cyan-100">
            Cargando radar...
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 px-4 text-center text-red-300">
            {error}
          </div>
        )}

        {hoverInfo && hoverCardStyle && (
          <div
            className="pointer-events-none absolute z-30 w-[250px] rounded-2xl border border-cyan-200/40 bg-slate-950/95 p-3 text-cyan-50 shadow-[0_0_26px_rgba(34,211,238,0.28)] backdrop-blur-md"
            style={{ left: hoverCardStyle.left, top: hoverCardStyle.top }}
          >
            <p className="mb-1 text-sm font-bold text-cyan-100">{hoverInfo.municipio}</p>
            <p className="mb-2 text-[11px] uppercase tracking-[0.13em] text-cyan-300/80">
              Panel Energético
            </p>
            {hoverInfo.stat ? (
              <div className="space-y-1 text-xs">
                <p className="text-cyan-100/90">
                  Provincia(s): {hoverInfo.stat.provincias.join(", ")}
                </p>
                <p>Clientes: {formatMetric(hoverInfo.stat.total_clientes_instalados)}</p>
                <p>Paneles: {formatMetric(hoverInfo.stat.potencia_paneles_kw)} kW</p>
                <p>Inversores: {formatMetric(hoverInfo.stat.potencia_inversores_kw)} kW</p>
                <p className="mt-2 border-t border-cyan-200/25 pt-2 font-semibold text-cyan-200">
                  Total: {formatMetric(hoverInfo.stat.total_kw_instalados)} kW
                </p>
              </div>
            ) : (
              <p className="text-xs text-cyan-100/85">Sin instalaciones registradas.</p>
            )}
          </div>
        )}

        {geoJsonData && (
          <MapContainer
            center={mapCenter}
            zoom={7}
            minZoom={6}
            maxZoom={10}
            style={{ height: "680px", width: "100%" }}
            className="rounded-2xl"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON
              key={selectedMetric}
              data={geoJsonData}
              style={(feature) => getFeatureStyle(feature as Feature)}
              onEachFeature={(feature, layer) => onEachFeature(feature as Feature, layer)}
            />
          </MapContainer>
        )}
      </div>

      <style jsx global>{`
        .intel-tilt-stage {
          perspective: 1600px;
        }

        .intel-map-shell {
          transform: rotateX(7deg) rotateY(-4deg) rotateZ(0.3deg);
          transform-style: preserve-3d;
          transition: transform 450ms ease, box-shadow 450ms ease;
        }

        .intel-map-shell:hover {
          transform: rotateX(5deg) rotateY(-2deg) rotateZ(0deg);
          box-shadow: 0 34px 90px rgba(14, 116, 144, 0.3);
        }

        .intel-radar-sweep {
          background: conic-gradient(
            from 0deg at 50% 50%,
            transparent 0deg,
            transparent 300deg,
            rgba(14, 165, 233, 0.22) 360deg
          );
          mix-blend-mode: screen;
          animation: intel-radar-rotate 7s linear infinite;
          transform-origin: center;
        }

        .intel-map-shell .leaflet-container {
          background: #020617;
        }

        .intel-map-shell .leaflet-control-attribution {
          background: rgba(2, 6, 23, 0.8);
          color: rgba(186, 230, 253, 0.85);
          border-top-left-radius: 6px;
          border: 1px solid rgba(56, 189, 248, 0.2);
        }

        .intel-map-shell .leaflet-control-attribution a {
          color: rgba(125, 211, 252, 0.95);
        }

        .intel-map-shell .leaflet-control-zoom a {
          background: rgba(2, 6, 23, 0.85);
          color: #a5f3fc;
          border-color: rgba(56, 189, 248, 0.4);
        }

        .intel-map-shell .leaflet-control-zoom a:hover {
          background: rgba(14, 116, 144, 0.5);
        }

        @keyframes intel-radar-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1024px) {
          .intel-map-shell,
          .intel-map-shell:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
