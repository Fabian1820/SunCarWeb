import { normalizeSearchText } from "@/lib/utils/string-utils"
import type { DepartamentoNomina } from "@/lib/types/feats/nomina/nomina-types"

/**
 * Filtra por nombre, CI, cargo o departamento y, si se pide, deja solo a los
 * seleccionados. Quita los cargos y departamentos que se quedan sin nadie.
 * Los totales de cada grupo siguen siendo los del grupo entero.
 */
export function filtrarDepartamentos(
  departamentos: DepartamentoNomina[],
  texto: string,
  soloSeleccionados = false,
): DepartamentoNomina[] {
  const q = normalizeSearchText(texto)
  if (!q && !soloSeleccionados) return departamentos

  return departamentos
    .map((d) => ({
      ...d,
      cargos: d.cargos
        .map((c) => ({
          ...c,
          trabajadores: c.trabajadores.filter((t) => {
            if (soloSeleccionados && !t.participa) return false
            if (!q) return true
            return normalizeSearchText(
              `${t.nombre} ${t.trabajador_ci} ${t.cargo} ${t.departamento_nombre}`,
            ).includes(q)
          }),
        }))
        .filter((c) => c.trabajadores.length > 0),
    }))
    .filter((d) => d.cargos.length > 0)
}
