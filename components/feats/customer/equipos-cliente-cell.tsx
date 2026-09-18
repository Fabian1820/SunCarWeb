"use client"

import type { ReactNode } from "react"
import { Battery, Boxes, ChevronRight, Cpu, Package, Sun, Zap, type LucideIcon } from "lucide-react"
import type { CategoriaEquipo, EquipoCliente } from "@/lib/api-types"

/** Icono, color, etiqueta y orden de cada familia de equipo. */
export const CATEGORIA_EQUIPO_UI: Record<
  CategoriaEquipo,
  { icon: LucideIcon; color: string; label: string; orden: number }
> = {
  INVERSORES: { icon: Zap, color: "text-emerald-500", label: "Inversor", orden: 0 },
  BATERIAS: { icon: Battery, color: "text-green-500", label: "Batería", orden: 1 },
  PANELES: { icon: Sun, color: "text-yellow-500", label: "Paneles", orden: 2 },
  MPPT: { icon: Cpu, color: "text-sky-500", label: "MPPT", orden: 3 },
  CAJA_COMBINADORA: { icon: Boxes, color: "text-slate-500", label: "Caja combinadora", orden: 4 },
  OTRO: { icon: Package, color: "text-gray-400", label: "Otro", orden: 5 },
}

export type LineaEquipo = {
  categoria: CategoriaEquipo
  cantidad: number
  descripcion: string
}

export const formatFechaCorta = (valor?: string | null): string | null => {
  if (!valor) return null
  const d = new Date(valor)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString("es-CU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/**
 * Si el cliente ya tiene el equipo puesto. Tolera mayúsculas y tildes: hay
 * clientes con "Equipo Instalado con Éxito".
 */
export function esClienteInstalado(estado?: string | null): boolean {
  const e = (estado ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
  return e === "equipo instalado con exito"
}

const formatCantidad = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))

/** Lo que el cliente tiene hoy: activos con cantidad, en el orden de la ficha. */
export function lineasActivas(equipos: EquipoCliente[]): LineaEquipo[] {
  return equipos
    .filter((e) => e.estado === "activo" && e.cantidad_actual > 0)
    .sort(
      (a, b) =>
        (CATEGORIA_EQUIPO_UI[a.categoria]?.orden ?? 9) -
          (CATEGORIA_EQUIPO_UI[b.categoria]?.orden ?? 9) ||
        a.descripcion.localeCompare(b.descripcion),
    )
    // Nombre de catálogo primero: la descripción es la línea de la oferta.
    .map((e) => ({
      categoria: e.categoria,
      cantidad: e.cantidad_actual,
      descripcion: e.nombre || e.descripcion,
    }))
}

/**
 * Fecha del último movimiento de la ficha, retirados incluidos: retirar un
 * equipo también es un cambio.
 */
export function resumenCambios(equipos: EquipoCliente[]): { fecha: string | null; movimientos: number } {
  let ultima: string | null = null
  let movimientos = 0
  for (const e of equipos) {
    movimientos += e.total_movimientos || 0
    if (e.fecha_ultimo_cambio && (!ultima || new Date(e.fecha_ultimo_cambio) > new Date(ultima))) {
      ultima = e.fecha_ultimo_cambio
    }
  }
  return { fecha: ultima, movimientos }
}

interface EquiposClienteCellProps {
  /** Líneas a pintar: de la ficha si existe, si no las derivadas de la oferta. */
  lineas: LineaEquipo[]
  /**
   * `true` cuando no hay ficha y las líneas salen de la oferta. Se rotula para
   * no presentar lo ofertado a un cliente sin instalar como algo que ya tiene.
   */
  segunOferta: boolean
  /**
   * Hay ficha pero el cliente aún no está instalado: lo que se ve es lo
   * contratado, no lo que tiene puesto, y hay que decirlo.
   */
  pendienteInstalar?: boolean
  ultimoCambio?: string | null
  totalMovimientos?: number
  /** Solo se pasa cuando hay ficha: sin ella no hay historial que abrir. */
  onVerDetalle?: () => void
  /** Resumen de capacidad, "Falta: …" y demás, tal como los pinta la tabla. */
  encabezado?: ReactNode
  pie?: ReactNode
}

export function EquiposClienteCell({
  lineas,
  segunOferta,
  pendienteInstalar = false,
  ultimoCambio,
  totalMovimientos = 0,
  onVerDetalle,
  encabezado,
  pie,
}: EquiposClienteCellProps) {
  const fecha = formatFechaCorta(ultimoCambio)

  const cuerpo = (
    <div className="space-y-1.5">
      {encabezado}
      {lineas.length > 0 ? (
        <div className="space-y-1 text-[14px]">
          {lineas.map((linea, i) => {
            const ui = CATEGORIA_EQUIPO_UI[linea.categoria] ?? CATEGORIA_EQUIPO_UI.OTRO
            const Icon = ui.icon
            return (
              <div
                key={`${linea.categoria}-${i}`}
                className="flex items-center gap-1 text-gray-700"
                title={`${ui.label}: ${linea.descripcion}`}
              >
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${ui.color}`} />
                <span className="font-medium">{formatCantidad(linea.cantidad)}x</span>
                <span className="truncate">{linea.descripcion}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-[14px] text-gray-400">Sin equipos registrados</div>
      )}
      {segunOferta && lineas.length > 0 && (
        <div className="text-[12px] text-gray-400">Según oferta · sin ficha de equipos</div>
      )}
      {pendienteInstalar && lineas.length > 0 && (
        <div className="text-[12px] text-gray-400">Contratado · pendiente de instalar</div>
      )}
      {!segunOferta && fecha && (
        <div className="flex items-center gap-1 text-[12px] text-gray-500">
          <span>
            Último cambio: {fecha}
            {totalMovimientos > 0 &&
              ` · ${totalMovimientos} ${totalMovimientos === 1 ? "movimiento" : "movimientos"}`}
          </span>
          {onVerDetalle && <ChevronRight className="h-3 w-3 text-gray-400" />}
        </div>
      )}
      {pie}
    </div>
  )

  if (!onVerDetalle) return cuerpo

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onVerDetalle()
      }}
      className="-m-1.5 block w-[calc(100%+0.75rem)] rounded-md p-1.5 text-left transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      title="Ver todos los equipos y su historial"
    >
      {cuerpo}
    </button>
  )
}
