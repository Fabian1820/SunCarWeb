import { apiRequest } from "@/lib/api-config";
import type {
  CandidatoPlanificacion,
  Planificacion,
  TrabajoPlanificado,
} from "@/lib/types/feats/planificacion/planificacion-types";

const BASE = "/planificaciones";

export const PlanificacionService = {
  /** El plan de un día. Si no existe, el backend devuelve uno vacío. */
  async obtener(fecha: string): Promise<Planificacion> {
    const response = await apiRequest<{ success: boolean; data: Planificacion }>(
      `${BASE}/${fecha}`,
    );
    return response.data;
  },

  async guardar(
    fecha: string,
    trabajos: TrabajoPlanificado[],
    creadaPor?: string,
  ): Promise<Planificacion> {
    const response = await apiRequest<{ success: boolean; data: Planificacion }>(
      `${BASE}/${fecha}`,
      {
        method: "PUT",
        body: JSON.stringify({ trabajos, creada_por: creadaPor ?? null }),
      },
    );
    return response.data;
  },

  /** Los clientes y leads que pueden entrar, según el estado que tengan. */
  async candidatos(tipo: string): Promise<CandidatoPlanificacion[]> {
    const response = await apiRequest<{
      success: boolean;
      data: CandidatoPlanificacion[];
    }>(`${BASE}/candidatos?tipo=${encodeURIComponent(tipo)}`);
    return response.data || [];
  },
};
