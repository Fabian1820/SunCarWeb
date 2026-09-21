import { normalizeSearchText } from "@/lib/utils/string-utils"
import type { DepartamentoNomina, LineaNomina } from "@/lib/types/feats/nomina/nomina-types"

export const SIN_SEDE = "sin_sede"

export interface FiltrosNomina {
  /** Nombre o CI */
  texto: string
  /** "" = todas, SIN_SEDE = sin sede asignada, o el id de la sede */
  sedeId: string
  /** "" = todos, o el id del departamento */
  departamentoId: string
  /** "" = todos, o el nombre del cargo */
  cargo: string
  soloSeleccionados: boolean
}

export const FILTROS_VACIOS: FiltrosNomina = {
  texto: "",
  sedeId: "",
  departamentoId: "",
  cargo: "",
  soloSeleccionados: false,
}

/** Cuántos filtros hay puestos (el de "solo seleccionados" cuenta aparte, es de una vista). */
export function filtrosActivos(f: FiltrosNomina): number {
  return [f.texto.trim(), f.sedeId, f.departamentoId, f.cargo].filter(Boolean).length
}

function cumple(t: LineaNomina, f: FiltrosNomina, q: string): boolean {
  if (f.soloSeleccionados && !t.participa) return false
  if (f.sedeId === SIN_SEDE) {
    if (t.sedes_ids.length > 0) return false
  } else if (f.sedeId && !t.sedes_ids.includes(f.sedeId)) {
    return false
  }
  if (q && !normalizeSearchText(`${t.nombre} ${t.trabajador_ci}`).includes(q)) return false
  return true
}

/**
 * Aplica los filtros y quita los cargos y departamentos que se quedan sin nadie.
 * Los totales de cada grupo siguen siendo los del grupo entero.
 */
export function filtrarDepartamentos(
  departamentos: DepartamentoNomina[],
  filtros: FiltrosNomina,
): DepartamentoNomina[] {
  const q = normalizeSearchText(filtros.texto)

  return departamentos
    .filter((d) => !filtros.departamentoId || d.departamento_id === filtros.departamentoId)
    .map((d) => ({
      ...d,
      cargos: d.cargos
        .filter((c) => !filtros.cargo || c.cargo === filtros.cargo)
        .map((c) => ({ ...c, trabajadores: c.trabajadores.filter((t) => cumple(t, filtros, q)) }))
        .filter((c) => c.trabajadores.length > 0),
    }))
    .filter((d) => d.cargos.length > 0)
}

export function contarTrabajadores(departamentos: DepartamentoNomina[]): number {
  return departamentos.reduce(
    (n, d) => n + d.cargos.reduce((m, c) => m + c.trabajadores.length, 0),
    0,
  )
}
