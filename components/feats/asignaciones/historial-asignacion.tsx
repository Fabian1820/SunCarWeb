"use client"

import type { MovimientoAsignacion } from "@/lib/types/feats/asignaciones/asignacion-types"
import {
  Plus, Minus, X, DollarSign, ArrowRightCircle, ArrowLeftCircle, FileText,
} from "lucide-react"

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  creacion:           { label: "Creación",        color: "bg-emerald-100 text-emerald-700", icon: Plus },
  reduccion:          { label: "Reducción",       color: "bg-amber-100 text-amber-700",     icon: Minus },
  eliminacion:        { label: "Eliminación",     color: "bg-red-100 text-red-700",         icon: X },
  ajuste_costo:       { label: "Ajuste de costo", color: "bg-blue-100 text-blue-700",       icon: DollarSign },
  transferencia_out:  { label: "Transferida a",   color: "bg-purple-100 text-purple-700",   icon: ArrowRightCircle },
  transferencia_in:   { label: "Recibida de",     color: "bg-purple-100 text-purple-700",   icon: ArrowLeftCircle },
}

const fmtFecha = (s?: string | null) => {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("es-CU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const money = (n?: number | null) =>
  n == null ? "—" : `$${Number(n).toFixed(2)}`

interface HistorialAsignacionProps {
  historial: MovimientoAsignacion[]
}

export function HistorialAsignacion({ historial }: HistorialAsignacionProps) {
  if (!historial || historial.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-gray-400 flex flex-col items-center gap-1">
        <FileText className="h-6 w-6 text-gray-300" />
        Sin movimientos registrados
      </div>
    )
  }

  // Más recientes primero
  const ordenado = [...historial].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  return (
    <ol className="space-y-2">
      {ordenado.map((m, idx) => {
        const cfg = TIPO_CONFIG[m.tipo] ?? { label: m.tipo, color: "bg-gray-100 text-gray-700", icon: FileText }
        const Icon = cfg.icon
        return (
          <li key={idx} className="flex gap-2 text-xs">
            <span className={`mt-0.5 shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full ${cfg.color}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded p-2">
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="text-[10px] text-gray-400">{fmtFecha(m.fecha)}</span>
              </div>
              {/* Detalle por tipo */}
              {(m.cantidad_anterior != null || m.cantidad_nueva != null) && (
                <p className="text-gray-600">
                  Cantidad: <span className="font-medium">{m.cantidad_anterior ?? "—"}</span>{" → "}
                  <span className="font-medium">{m.cantidad_nueva ?? "—"}</span>
                </p>
              )}
              {(m.costo_anterior != null || m.costo_nuevo != null) && (
                <p className="text-gray-600">
                  Costo: <span className="font-medium">{money(m.costo_anterior)}</span>{" → "}
                  <span className="font-medium">{money(m.costo_nuevo)}</span>
                </p>
              )}
              {m.entidad_contraparte_id && (
                <p className="text-gray-600">
                  Contraparte:{" "}
                  <span className="font-medium capitalize">{m.entidad_contraparte_tipo}</span>
                  {" — "}
                  <span className="font-medium">
                    {m.entidad_contraparte_nombre || m.entidad_contraparte_id}
                  </span>
                </p>
              )}
              {m.motivo && (
                <p className="text-gray-500">
                  Motivo: <span className="font-medium text-gray-700 capitalize">{m.motivo}</span>
                </p>
              )}
              {m.nota && (
                <p className="text-gray-500 italic">"{m.nota}"</p>
              )}
              {m.actor_ci && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Por: {m.actor_nombre || m.actor_ci} {m.actor_nombre && <span className="font-mono">({m.actor_ci})</span>}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
