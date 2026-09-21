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

  /** USD complementarios que se reparten este mes entre los seleccionados. */
  static async fijarTotal(anio: number, mes: number, totalUsd: number): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/total`, {
      method: "PUT",
      body: JSON.stringify({ total_usd: totalUsd }),
    })
  }

  static async cerrar(anio: number, mes: number): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/cerrar`, { method: "POST" })
  }

  static async reabrir(anio: number, mes: number): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/reabrir`, { method: "POST" })
  }
}
