import { apiRequest } from "@/lib/api-config"
import type {
  CambiosLinea,
  HojaNomina,
  PeriodoNominaResumen,
  TipoPlantilla,
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

  // ---- Repartos complementarios: todos devuelven la hoja recalculada

  static async crearReparto(
    anio: number,
    mes: number,
    etiqueta: string,
    montoUsd = 0,
  ): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/repartos`, {
      method: "POST",
      body: JSON.stringify({ etiqueta, monto_usd: montoUsd }),
    })
  }

  /** Un reparto por cada departamento (o sede) con todos sus trabajadores. */
  static async crearPlantilla(anio: number, mes: number, tipo: TipoPlantilla): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/repartos/plantilla`, {
      method: "POST",
      body: JSON.stringify({ tipo }),
    })
  }

  static async editarReparto(
    anio: number,
    mes: number,
    repartoId: string,
    cambios: { etiqueta?: string; monto_usd?: number },
  ): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/repartos/${encodeURIComponent(repartoId)}`, {
      method: "PATCH",
      body: JSON.stringify(cambios),
    })
  }

  static async borrarReparto(anio: number, mes: number, repartoId: string): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/repartos/${encodeURIComponent(repartoId)}`, {
      method: "DELETE",
    })
  }

  /** Sin porcentaje, cada trabajador entra con el último que tuvo (o 0). */
  static async agregarMiembros(
    anio: number,
    mes: number,
    repartoId: string,
    cis: string[],
  ): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(
      `/nomina/${anio}/${mes}/repartos/${encodeURIComponent(repartoId)}/miembros`,
      { method: "PUT", body: JSON.stringify({ miembros: cis.map((ci) => ({ ci })) }) },
    )
  }

  static async editarMiembro(
    anio: number,
    mes: number,
    repartoId: string,
    ci: string,
    porcentaje: number,
  ): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(
      `/nomina/${anio}/${mes}/repartos/${encodeURIComponent(repartoId)}/miembros/${encodeURIComponent(ci)}`,
      { method: "PATCH", body: JSON.stringify({ porcentaje }) },
    )
  }

  static async quitarMiembro(
    anio: number,
    mes: number,
    repartoId: string,
    ci: string,
  ): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(
      `/nomina/${anio}/${mes}/repartos/${encodeURIComponent(repartoId)}/miembros/${encodeURIComponent(ci)}`,
      { method: "DELETE" },
    )
  }

  static async cerrar(anio: number, mes: number): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/cerrar`, { method: "POST" })
  }

  static async reabrir(anio: number, mes: number): Promise<HojaNomina> {
    return apiRequest<HojaNomina>(`/nomina/${anio}/${mes}/reabrir`, { method: "POST" })
  }
}
