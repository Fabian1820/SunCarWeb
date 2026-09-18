"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  ArrowRightLeft,
  FileText,
  Loader2,
  Minus,
  Pencil,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Badge } from "@/components/shared/atom/badge"
import type { EquipoCliente, MovimientoEquipoCliente } from "@/lib/api-types"
import { EquiposClienteService } from "@/lib/services/feats/customer/equipos-cliente-service"
import { CATEGORIA_EQUIPO_UI, formatFechaCorta } from "./equipos-cliente-cell"

const TIPO_MOVIMIENTO_UI: Record<
  MovimientoEquipoCliente["tipo"],
  { label: string; color: string; icon: LucideIcon }
> = {
  alta: { label: "Alta", color: "bg-emerald-100 text-emerald-700", icon: Plus },
  ajuste_cantidad: { label: "Ajuste", color: "bg-blue-100 text-blue-700", icon: Pencil },
  sustitucion: { label: "Sustitución", color: "bg-purple-100 text-purple-700", icon: ArrowRightLeft },
  retiro: { label: "Retiro", color: "bg-red-100 text-red-700", icon: Minus },
  correccion: { label: "Corrección", color: "bg-gray-100 text-gray-700", icon: FileText },
}

const MOTIVO_LABEL: Record<MovimientoEquipoCliente["motivo"], string> = {
  instalacion_inicial: "Instalación inicial",
  ampliacion: "Ampliación",
  garantia: "Garantía",
  autorizado_direccion: "Autorizado por dirección",
  correccion_dato: "Corrección de dato",
  venta_adicional: "Venta adicional",
  retiro: "Retiro",
  migracion: "Migración",
}

const ORIGEN_LABEL: Record<MovimientoEquipoCliente["origen"], string> = {
  oferta_confirmada: "Oferta confirmada",
  migracion_oferta: "Migrado de oferta",
  migracion_snapshot: "Migrado del registro antiguo",
  alta_manual: "Alta manual",
  equipo_propio_cliente: "Equipo propio del cliente",
}

const ESTADO_EQUIPO_UI: Record<EquipoCliente["estado"], string> = {
  activo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  retirado: "bg-gray-100 text-gray-600 border-gray-200",
  sustituido: "bg-purple-50 text-purple-700 border-purple-200",
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))

const signo = (n: number) => (n > 0 ? `+${num(n)}` : num(n))

const ordenar = (equipos: EquipoCliente[]) =>
  [...equipos].sort(
    (a, b) =>
      (CATEGORIA_EQUIPO_UI[a.categoria]?.orden ?? 9) - (CATEGORIA_EQUIPO_UI[b.categoria]?.orden ?? 9) ||
      a.descripcion.localeCompare(b.descripcion),
  )

function FilaEquipo({ equipo }: { equipo: EquipoCliente }) {
  const ui = CATEGORIA_EQUIPO_UI[equipo.categoria] ?? CATEGORIA_EQUIPO_UI.OTRO
  const Icon = ui.icon
  const discrepancia = equipo.discrepancia ?? equipo.cantidad_actual - equipo.cantidad_entregada

  return (
    <li className="flex items-start gap-2.5 rounded-md border border-gray-100 bg-white p-2.5">
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${ui.color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-gray-900">{num(equipo.cantidad_actual)}x</span>
          <span className="text-sm text-gray-800 break-words">{equipo.descripcion}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-gray-500">
          <span>{ui.label}</span>
          {equipo.marca && <span>· {equipo.marca}</span>}
          {equipo.potencia_kw != null && equipo.categoria !== "CAJA_COMBINADORA" && (
            <span>
              · {num(equipo.potencia_kw)} {equipo.categoria === "BATERIAS" ? "kWh" : "kW"} c/u
            </span>
          )}
          {equipo.estado !== "activo" && (
            <Badge variant="outline" className={`px-1.5 py-0 text-[11px] ${ESTADO_EQUIPO_UI[equipo.estado]}`}>
              {equipo.estado === "retirado" ? "Retirado" : "Sustituido"}
            </Badge>
          )}
          {equipo.es_equipo_propio && (
            <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
              Propio del cliente
            </Badge>
          )}
        </div>
        {equipo.estado === "activo" && (
          <div className="mt-1 text-[12px] text-gray-500">
            Ofertado {num(equipo.cantidad_actual)} · Entregado con vale {num(equipo.cantidad_entregada)}
            {Math.abs(discrepancia) > 0.001 && (
              <span className="ml-1 text-amber-700">· Diferencia {signo(discrepancia)}</span>
            )}
          </div>
        )}
        {equipo.numeros_serie.length > 0 && (
          <div className="mt-1 text-[12px] text-gray-500">Serie: {equipo.numeros_serie.join(", ")}</div>
        )}
      </div>
    </li>
  )
}

function Historial({ movimientos }: { movimientos: MovimientoEquipoCliente[] }) {
  if (movimientos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-6 text-xs text-gray-400">
        <FileText className="h-6 w-6 text-gray-300" />
        Sin movimientos registrados
      </div>
    )
  }

  return (
    <ol className="space-y-2">
      {movimientos.map((m, idx) => {
        const cfg = TIPO_MOVIMIENTO_UI[m.tipo] ?? { label: m.tipo, color: "bg-gray-100 text-gray-700", icon: FileText }
        const Icon = cfg.icon
        return (
          <li key={m.id ?? idx} className="flex gap-2 text-xs">
            <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 rounded border border-gray-100 bg-white p-2">
              <div className="mb-0.5 flex items-baseline justify-between gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cfg.color}`}>
                  {cfg.label} · {MOTIVO_LABEL[m.motivo] ?? m.motivo}
                </span>
                <span className="shrink-0 text-[11px] text-gray-400">{formatFechaCorta(m.fecha_efectiva)}</span>
              </div>
              <p className="break-words text-gray-800">
                {m.cantidad_delta !== 0 && <span className="font-semibold">{signo(m.cantidad_delta)} </span>}
                {m.descripcion}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                {ORIGEN_LABEL[m.origen] ?? m.origen}
                {m.numero_oferta && ` · ${m.numero_oferta}`}
                {m.actor_nombre && ` · por ${m.actor_nombre}`}
                {m.autorizado_por && ` · autorizó ${m.autorizado_por}`}
              </p>
              {m.nota && <p className="mt-1 whitespace-pre-wrap break-words text-gray-600">{m.nota}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

interface EquiposClienteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clienteNumero: string | null
  clienteNombre?: string | null
}

export function EquiposClienteDialog({
  open,
  onOpenChange,
  clienteNumero,
  clienteNombre,
}: EquiposClienteDialogProps) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [equipos, setEquipos] = useState<EquipoCliente[]>([])
  const [historial, setHistorial] = useState<MovimientoEquipoCliente[]>([])

  useEffect(() => {
    if (!open || !clienteNumero) return
    let vivo = true
    setCargando(true)
    setError(null)
    Promise.all([
      EquiposClienteService.getEquipos(clienteNumero),
      EquiposClienteService.getHistorial(clienteNumero),
    ])
      .then(([resEquipos, movimientos]) => {
        if (!vivo) return
        setEquipos(resEquipos.equipos)
        setHistorial(movimientos)
      })
      .catch((err: unknown) => {
        if (!vivo) return
        setEquipos([])
        setHistorial([])
        setError(err instanceof Error ? err.message : "No se pudieron cargar los equipos")
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [open, clienteNumero])

  const activos = ordenar(equipos.filter((e) => e.estado === "activo" && e.cantidad_actual > 0))
  const fuera = ordenar(equipos.filter((e) => !(e.estado === "activo" && e.cantidad_actual > 0)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Equipos del cliente</DialogTitle>
          <DialogDescription>
            {clienteNombre ? `${clienteNombre} · ` : ""}
            {clienteNumero}
          </DialogDescription>
        </DialogHeader>

        {cargando && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando equipos…
          </div>
        )}

        {!cargando && error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}

        {!cargando && !error && (
          <div className="space-y-5">
            <section>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Tiene hoy
              </h4>
              {activos.length > 0 ? (
                <ul className="space-y-1.5">
                  {activos.map((e) => (
                    <FilaEquipo key={e.equipo_key} equipo={e} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No tiene equipos activos.</p>
              )}
            </section>

            {fuera.length > 0 && (
              <section>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Retirados o sustituidos
                </h4>
                <ul className="space-y-1.5">
                  {fuera.map((e) => (
                    <FilaEquipo key={e.equipo_key} equipo={e} />
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Historial
              </h4>
              <Historial movimientos={historial} />
            </section>
          </div>
        )}

        {!cargando && !error && equipos.length === 0 && historial.length === 0 && (
          <p className="text-xs text-gray-400">
            <X className="mr-1 inline h-3 w-3" />
            La ficha se crea sola cuando la instalación se marca como terminada.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
