"use client";

import { useEffect, useState, useRef } from "react";
import { X, User, MapPin, Zap, Sun, Cpu, Eye, Lock } from "lucide-react";
import type { Feature } from "geojson";
import { ClienteService } from "@/lib/api-services";
import type { Cliente } from "@/lib/api-types";

interface TacticalDetailPanelProps {
  municipio: string;
  provincia: string;
  stat: {
    total_clientes_instalados: number;
    potencia_paneles_kw: number;
    potencia_inversores_kw: number;
    total_kw_instalados: number;
  };
  geoFeature: Feature | null;
  onClose: () => void;
}

function formatMetric(value: number): string {
  return new Intl.NumberFormat("es-CU", {
    maximumFractionDigits: value > 100 ? 0 : 2,
  }).format(value);
}

function extractMunicipalCode(clientCode: string): string {
  if (!clientCode) return "";
  const trimmed = clientCode.trim();
  // Si empieza con letra, tomar los siguientes 4 dígitos
  if (/^[A-Za-z]/.test(trimmed)) {
    const digits = trimmed.slice(1).match(/\d{1,4}/);
    return digits ? digits[0] : "";
  }
  // Si empieza con número, tomar los primeros 4 dígitos
  const digits = trimmed.match(/^\d{1,4}/);
  return digits ? digits[0] : "";
}

export function TacticalDetailPanel({
  municipio,
  provincia,
  stat,
  geoFeature,
  onClose,
}: TacticalDetailPanelProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Panel deployment sound
  const playDeploySound = () => {
    if (typeof window === "undefined") return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const now = ctx.currentTime;

      // Deep mechanical deploy sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio not available
    }
  };

  // Data typing sound (subtle click)
  const playTypingSound = () => {
    if (typeof window === "undefined") return;
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(1800, now);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.02);
    } catch {
      // Audio not available
    }
  };

  useEffect(() => {
    playDeploySound();
    setTimeout(() => setAnimate(true), 50);

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    async function loadClientes() {
      setLoading(true);
      try {
        // Cargar todos los clientes
        const allClientes = await ClienteService.getClientes();

        // Filtrar por código de municipio
        // Para simplificar, usamos los primeros 4 dígitos/letras del número como código de municipio
        const filtered = allClientes.filter((c) => {
          const code = extractMunicipalCode(c.numero);
          // Por ahora, mostrar todos (necesitarías mapear municipio -> código)
          // Como no tenemos el mapeo, mostrar los primeros clientes
          return true;
        }).slice(0, 20); // Limitar a 20 para performance

        setClientes(filtered);

        // Play typing sound for each client loaded (staggered)
        filtered.forEach((_, idx) => {
          setTimeout(() => playTypingSound(), idx * 50);
        });
      } catch (error) {
        console.error("Error loading clientes:", error);
      } finally {
        setLoading(false);
      }
    }

    loadClientes();
  }, [municipio]);

  // Extract SVG path from GeoJSON
  const svgPath = (() => {
    if (!geoFeature || geoFeature.geometry.type !== "Polygon") return null;

    const coords = geoFeature.geometry.coordinates[0];
    if (!coords || coords.length === 0) return null;

    // Find bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    coords.forEach(([lng, lat]) => {
      if (lng < minX) minX = lng;
      if (lng > maxX) maxX = lng;
      if (lat < minY) minY = lat;
      if (lat > maxY) maxY = lat;
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const viewBoxSize = 400;
    const scaleX = viewBoxSize / width;
    const scaleY = viewBoxSize / height;
    const scale = Math.min(scaleX, scaleY) * 0.9;

    const pathData = coords.map(([lng, lat], idx) => {
      const x = (lng - minX) * scale + (viewBoxSize - width * scale) / 2;
      const y = viewBoxSize - ((lat - minY) * scale + (viewBoxSize - height * scale) / 2);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ") + " Z";

    return pathData;
  })();

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Main tactical panel */}
      <div
        className={`relative w-[95vw] max-w-[1400px] h-[85vh] bg-[#010810] border border-cyan-400/30 rounded-lg shadow-[0_0_60px_rgba(34,211,238,0.2),0_0_120px_rgba(34,211,238,0.1)] transition-all duration-500 ${
          animate ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {/* Classified header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-cyan-400/20 bg-gradient-to-r from-cyan-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-red-400/70" />
            <div>
              <h2 className="text-sm font-bold font-mono tracking-[0.15em] text-cyan-50 uppercase">
                Dossier Táctico &mdash; {municipio}
              </h2>
              <p className="text-[10px] font-mono tracking-[0.2em] text-cyan-400/40 uppercase">
                {provincia} // Nivel de acceso: Top Secret
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded border border-emerald-400/20 bg-emerald-400/5">
              <Eye className="h-3 w-3 text-emerald-400/70" />
              <span className="text-[9px] font-mono tracking-wider text-emerald-300/60 uppercase">
                {stat.total_clientes_instalados} Objetivos
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 rounded border border-cyan-400/20 bg-cyan-400/5 text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-5 h-[calc(100%-60px)]">
          {/* Left: Municipal outline + stats */}
          <div className="col-span-2 border-r border-cyan-400/15 p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-cyan-400/70" />
              <span className="text-xs font-mono tracking-[0.15em] text-cyan-300/60 uppercase">Zona de operaciones</span>
            </div>

            {/* SVG Outline */}
            <div className="flex-1 flex items-center justify-center bg-[#020a18] rounded-lg border border-cyan-400/10 mb-6 relative overflow-hidden">
              {/* Grid background */}
              <div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(0deg,rgba(56,189,248,1)_0px,transparent_1px,transparent_20px),repeating-linear-gradient(90deg,rgba(56,189,248,1)_0px,transparent_1px,transparent_20px)]" />

              {svgPath ? (
                <svg
                  viewBox="0 0 400 400"
                  className="w-full h-full p-8 tactical-outline-pulse"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    d={svgPath}
                    fill="rgba(34, 211, 238, 0.05)"
                    stroke="rgba(34, 211, 238, 0.6)"
                    strokeWidth="2"
                    filter="url(#glow)"
                    className="tactical-outline-animate"
                  />
                </svg>
              ) : (
                <div className="text-cyan-400/30 text-xs font-mono">Mapeando territorio...</div>
              )}
            </div>

            {/* Zone stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#020a18] rounded-lg border border-amber-400/15 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sun className="h-3.5 w-3.5 text-amber-400/60" />
                  <span className="text-[10px] font-mono tracking-wider text-amber-400/50 uppercase">Paneles</span>
                </div>
                <p className="text-lg font-bold font-mono text-amber-200 tabular-nums">{formatMetric(stat.potencia_paneles_kw)} kW</p>
              </div>
              <div className="bg-[#020a18] rounded-lg border border-emerald-400/15 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Cpu className="h-3.5 w-3.5 text-emerald-400/60" />
                  <span className="text-[10px] font-mono tracking-wider text-emerald-400/50 uppercase">Inversores</span>
                </div>
                <p className="text-lg font-bold font-mono text-emerald-200 tabular-nums">{formatMetric(stat.potencia_inversores_kw)} kW</p>
              </div>
              <div className="col-span-2 bg-[#020a18] rounded-lg border border-cyan-400/15 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-3.5 w-3.5 text-cyan-400/60" />
                  <span className="text-[10px] font-mono tracking-wider text-cyan-400/50 uppercase">Potencia Total</span>
                </div>
                <p className="text-xl font-bold font-mono text-cyan-100 tabular-nums">{formatMetric(stat.total_kw_instalados)} kW</p>
              </div>
            </div>
          </div>

          {/* Right: Clients list */}
          <div className="col-span-3 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-cyan-400/70" />
                <span className="text-xs font-mono tracking-[0.15em] text-cyan-300/60 uppercase">
                  Clientes instalados ({clientes.length})
                </span>
              </div>
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-cyan-400/50 uppercase tracking-wider">
                    Cargando intel...
                  </span>
                </div>
              )}
            </div>

            {/* Scrollable clients grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
                    <div className="absolute inset-3 rounded-full border border-cyan-400/40 animate-spin" style={{ animationDuration: '2s' }} />
                  </div>
                </div>
              ) : clientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-cyan-400/30">
                  <User className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm font-mono uppercase tracking-wider">Sin clientes registrados</p>
                </div>
              ) : (
                clientes.map((cliente, idx) => (
                  <div
                    key={cliente.id}
                    className="bg-[#020a18] border border-cyan-400/10 rounded-lg p-3 hover:border-cyan-400/25 hover:bg-cyan-400/[0.02] transition-all group client-fade-in"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="text-xs font-mono font-semibold text-cyan-100 uppercase tracking-wide">
                          {cliente.numero}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-cyan-400/40 uppercase tracking-wider">
                        ID: {cliente.id.slice(0, 8)}...
                      </span>
                    </div>
                    <p className="text-xs font-mono text-cyan-300/70 mb-1">{cliente.nombre}</p>
                    <p className="text-[10px] font-mono text-cyan-400/40 truncate">{cliente.direccion}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer bar */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
        <div className="absolute bottom-1 left-6 right-6 flex items-center justify-between">
          <span className="text-[8px] font-mono text-cyan-400/20 tracking-widest uppercase">
            SNC-TACTICAL-INTEL v3.2
          </span>
          <span className="text-[8px] font-mono text-red-400/30 tracking-widest uppercase">
            Clasificación: Top Secret // NOFORN
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes client-fade-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .client-fade-in {
          animation: client-fade-in 0.4s ease-out both;
        }

        .tactical-outline-animate {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: draw-outline 2s ease-out forwards;
        }

        @keyframes draw-outline {
          to {
            stroke-dashoffset: 0;
          }
        }

        .tactical-outline-pulse {
          animation: pulse-glow 3s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(34, 211, 238, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.5));
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(34, 211, 238, 0.03);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.15);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.3);
        }
      `}</style>
    </div>
  );
}
