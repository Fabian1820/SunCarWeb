import { apiRequest } from "@/lib/api-config";
import type {
  DesempenoResponse,
  InformeComparativo,
} from "@/lib/types/feats/informe-direccion/informe-direccion-types";

const BASE = "/informe-direccion";

export const InformeDireccionService = {
  async obtenerComparativo(params: {
    periodoADesde: string;
    periodoAHasta: string;
    periodoBDesde: string;
    periodoBHasta: string;
  }): Promise<InformeComparativo> {
    const query = new URLSearchParams({
      periodo_a_desde: params.periodoADesde,
      periodo_a_hasta: params.periodoAHasta,
      periodo_b_desde: params.periodoBDesde,
      periodo_b_hasta: params.periodoBHasta,
    });
    return apiRequest<InformeComparativo>(`${BASE}/comparativo?${query.toString()}`);
  },

  /** Desempeño mes a mes: los `meses` meses que terminan en el de `hasta`. */
  async obtenerDesempeno(hasta: string, meses: number): Promise<DesempenoResponse> {
    const query = new URLSearchParams({ hasta, meses: String(meses) });
    const data = await apiRequest<DesempenoResponse>(`${BASE}/desempeno?${query.toString()}`);
    // apiRequest devuelve {success:false, error} en vez de lanzar ante un 4xx.
    if (!Array.isArray((data as Partial<DesempenoResponse>)?.meses)) {
      const r = data as { detail?: unknown; error?: unknown } | undefined;
      const mensaje =
        (typeof r?.detail === "string" && r.detail) ||
        (typeof r?.error === "string" && r.error) ||
        (r?.error as { message?: string } | undefined)?.message;
      throw new Error(mensaje || "No se pudo cargar el desempeño.");
    }
    return data;
  },
};
