import { apiRequest } from "@/lib/api-config";
import type { InformeComparativo } from "@/lib/types/feats/informe-direccion/informe-direccion-types";

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
};
