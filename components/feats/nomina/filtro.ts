import { normalizeSearchText } from "@/lib/utils/string-utils"
import type { DepartamentoNomina, Reparto } from "@/lib/types/feats/nomina/nomina-types"

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
}

export const FILTROS_VACIOS: FiltrosNomina = {
  texto: "",
  sedeId: "",
  departamentoId: "",
  cargo: "",
}

export function filtrosActivos(f: FiltrosNomina): number {
  return [f.texto.trim(), f.sedeId, f.departamentoId, f.cargo].filter(Boolean).length
}

/** Lo mínimo que hace falta de un trabajador para filtrarlo (vale para filas y miembros). */
interface Filtrable {
  nombre: string
  trabajador_ci: string
  cargo: string
  departamento_id: string
  sedes_ids: string[]
}

export function cumpleFiltros(t: Filtrable, f: FiltrosNomina): boolean {
  if (f.departamentoId && t.departamento_id !== f.departamentoId) return false
  if (f.cargo && t.cargo !== f.cargo) return false
  const sedes = t.sedes_ids ?? []
  if (f.sedeId === SIN_SEDE) {
    if (sedes.length > 0) return false
  } else if (f.sedeId && !sedes.includes(f.sedeId)) {
    return false
  }
  const q = normalizeSearchText(f.texto)
  if (q && !normalizeSearchText(`${t.nombre} ${t.trabajador_ci}`).includes(q)) return false
  return true
}

/**
 * Aplica los filtros a la parte oficial y quita los cargos y departamentos que se
 * quedan sin nadie. Los totales de cada grupo siguen siendo los del grupo entero.
 */
export function filtrarDepartamentos(
  departamentos: DepartamentoNomina[],
  filtros: FiltrosNomina,
): DepartamentoNomina[] {
  return departamentos
    .map((d) => ({
      ...d,
      cargos: d.cargos
        .map((c) => ({ ...c, trabajadores: c.trabajadores.filter((t) => cumpleFiltros(t, filtros)) }))
        .filter((c) => c.trabajadores.length > 0),
    }))
    .filter((d) => d.cargos.length > 0)
}

/**
 * Filtra los miembros de cada reparto. Con algún filtro puesto, los repartos
 * que se quedan sin nadie se ocultan; sin filtros se ven todos (aunque estén vacíos).
 */
export function filtrarRepartos(repartos: Reparto[], filtros: FiltrosNomina): Reparto[] {
  if (filtrosActivos(filtros) === 0) return repartos
  return repartos
    .map((r) => ({ ...r, miembros: r.miembros.filter((m) => cumpleFiltros(m, filtros)) }))
    .filter((r) => r.miembros.length > 0)
}

export function contarTrabajadores(departamentos: DepartamentoNomina[]): number {
  return departamentos.reduce(
    (n, d) => n + d.cargos.reduce((m, c) => m + c.trabajadores.length, 0),
    0,
  )
}
