import { apiRequest } from "@/lib/api-config";
import type { EntregasDelDia } from "@/lib/types/feats/entregas-devoluciones/entregas-devoluciones-types";

export const EntregasDevolucionesService = {
  /** Lo que salió del almacén ese día y lo que se devolvió. */
  async delDia(fecha: string): Promise<EntregasDelDia> {
    const response = await apiRequest<{ success: boolean; data: EntregasDelDia }>(
      `/operaciones/vales-salida/entregas-devoluciones/dia?fecha=${encodeURIComponent(fecha)}`,
    );
    return response.data;
  },
};
