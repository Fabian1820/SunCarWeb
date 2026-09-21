"use client"

import { Search, X } from "lucide-react"
import type { HojaNomina } from "@/lib/types/feats/nomina/nomina-types"
import { FILTROS_VACIOS, SIN_SEDE, filtrosActivos, type FiltrosNomina } from "./filtro"

interface Props {
  hoja: HojaNomina
  filtros: FiltrosNomina
  onChange: (filtros: FiltrosNomina) => void
  mostrando: number
  total: number
}

const claseSelect =
  "h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-[#012928] " +
  "focus:outline-none focus:ring-1 focus:ring-[#012928]"

/** Buscador por nombre y filtros de sede, departamento y cargo. Valen para las dos vistas. */
export function NominaFiltros({ hoja, filtros, onChange, mostrando, total }: Props) {
  const todos = hoja.departamentos.flatMap((d) => d.cargos.flatMap((c) => c.trabajadores))
  const haySinSede = todos.some((t) => t.sedes_ids.length === 0)

  // Los cargos que se ofrecen son los del departamento elegido (o todos).
  const cargos = Array.from(
    new Set(
      hoja.departamentos
        .filter((d) => !filtros.departamentoId || d.departamento_id === filtros.departamentoId)
        .flatMap((d) => d.cargos.map((c) => c.cargo)),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"))

  const cambiar = (parte: Partial<FiltrosNomina>) => onChange({ ...filtros, ...parte })
  const activos = filtrosActivos(filtros)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={filtros.texto}
          onChange={(e) => cambiar({ texto: e.target.value })}
          placeholder="Buscar por nombre"
          aria-label="Buscar por nombre"
          className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm focus:border-[#012928] focus:outline-none focus:ring-1 focus:ring-[#012928]"
        />
      </label>

      <select
        aria-label="Filtrar por sede"
        value={filtros.sedeId}
        onChange={(e) => cambiar({ sedeId: e.target.value })}
        className={claseSelect}
      >
        <option value="">Todas las sedes</option>
        {hoja.sedes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
        {haySinSede && <option value={SIN_SEDE}>Sin sede</option>}
      </select>

      <select
        aria-label="Filtrar por departamento"
        value={filtros.departamentoId}
        // Al cambiar de departamento el cargo elegido puede no existir en el nuevo.
        onChange={(e) => cambiar({ departamentoId: e.target.value, cargo: "" })}
        className={claseSelect}
      >
        <option value="">Todos los departamentos</option>
        {hoja.departamentos.map((d) => (
          <option key={d.departamento_id} value={d.departamento_id}>
            {d.nombre}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por cargo"
        value={filtros.cargo}
        onChange={(e) => cambiar({ cargo: e.target.value })}
        className={`${claseSelect} max-w-[16rem]`}
      >
        <option value="">Todos los cargos</option>
        {cargos.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {activos > 0 && (
        <button
          type="button"
          onClick={() => onChange({ ...FILTROS_VACIOS, soloSeleccionados: filtros.soloSeleccionados })}
          className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-gray-600 hover:bg-white"
        >
          <X className="h-4 w-4" />
          Limpiar filtros
        </button>
      )}

      <span className="ml-auto text-sm text-gray-500">
        {mostrando === total ? `${total} trabajadores` : `${mostrando} de ${total} trabajadores`}
      </span>
    </div>
  )
}
