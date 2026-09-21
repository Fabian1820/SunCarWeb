import { apiRequest } from "@/lib/api-config"
import type {
  CambiosLinea,
  HojaNomina,
  PeriodoNominaResumen,
} from "@/lib/types/feats/nomina/nomina-types"

/** Nómina mensual de RRHH. El backend solo la sirve a superAdmin. */
export class NominaService {
  static async listarPeriodos(): Promise<PeriodoNominaResumen[]> {
    return (await apiRequest<PeriodoNominaResumen[]>("/nomina/periodos")) || []
  }

  /** Crea el mes si no existe y añade los trabajadores activos que falten. */
  static async abrir(anio: number, mes: number): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/abrir`, { method: "POST" })
  }

  static async obtener(anio: number, mes: number): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}`)
  }

  /** Devuelve la hoja entera ya recalculada. */
  static async editarLinea(
    anio: number,
    mes: number,
    ci: string,
    cambios: CambiosLinea,
  ): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(
      `/nomina/${anio}/${mes}/trabajadores/${encodeURIComponent(ci)}`,
      { method: "PATCH", body: JSON.stringify(cambios) },
    )
  }

  static async fijarFondo(
    anio: number,
    mes: number,
    departamentoId: string,
    fondoUsd: number,
  ): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(
      `/nomina/${anio}/${mes}/departamentos/${encodeURIComponent(departamentoId)}/fondo`,
      { method: "PUT", body: JSON.stringify({ fondo_usd: fondoUsd }) },
    )
  }

  static async cambiarTasa(
    anio: number,
    mes: number,
    tasaCambio: number | null,
  ): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}`, {
      method: "PATCH",
      body: JSON.stringify({ tasa_cambio: tasaCambio }),
    })
  }

  static async cerrar(anio: number, mes: number): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/cerrar`, { method: "POST" })
  }

  static async reabrir(anio: number, mes: number): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/reabrir`, { method: "POST" })
  }
}
