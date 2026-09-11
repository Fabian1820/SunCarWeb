import { apiRequest } from "@/lib/api-config";
import type {
  CategoriaSolicitud,
  ResolucionSolicitud,
  SolicitudDesarrollo,
  SolicitudDesarrolloFiltros,
} from "@/lib/types/feats/solicitudes-desarrollo/solicitud-desarrollo-types";

const BASE = "/solicitudes-desarrollo";

export const SolicitudDesarrolloService = {
  async crear(
    categoria: CategoriaSolicitud,
    mensaje: string,
    pantalla?: string,
  ): Promise<boolean> {
    try {
      const response = await apiRequest<{ success: boolean }>(`${BASE}/`, {
        method: "POST",
        body: JSON.stringify({ categoria, mensaje, pantalla }),
      });
      return response.success === true;
    } catch (error) {
      console.error("[SolicitudDesarrolloService] Error al crear:", error);
      return false;
    }
  },

  async listar(filtros?: SolicitudDesarrolloFiltros): Promise<SolicitudDesarrollo[]> {
    try {
      const params = new URLSearchParams();
      filtros?.categoria?.forEach((c) => params.append("categoria", c));
      if (filtros?.terminada !== undefined) {
        params.set("terminada", String(filtros.terminada));
      }
      if (filtros?.fechaDesde) params.set("fechaDesde", filtros.fechaDesde);
      if (filtros?.fechaHasta) params.set("fechaHasta", filtros.fechaHasta);
      if (filtros?.q) params.set("q", filtros.q);

      const qs = params.toString();
      const response = await apiRequest<{
        success: boolean;
        data: SolicitudDesarrollo[];
      }>(`${BASE}/${qs ? `?${qs}` : ""}`);
      return response.data || [];
    } catch (error) {
      console.error("[SolicitudDesarrolloService] Error al listar:", error);
      return [];
    }
  },

  async getConteo(): Promise<number> {
    try {
      const response = await apiRequest<{
        success: boolean;
        data: { conteo: number };
      }>(`${BASE}/conteo`);
      return response.data?.conteo ?? 0;
    } catch (error) {
      console.error("[SolicitudDesarrolloService] Error al obtener conteo:", error);
      return 0;
    }
  },

  async marcarVistas(): Promise<void> {
    try {
      await apiRequest(`${BASE}/marcar-vistas`, { method: "PATCH" });
    } catch (error) {
      console.error("[SolicitudDesarrolloService] Error al marcar vistas:", error);
    }
  },

  async resolver(
    id: string,
    estado: ResolucionSolicitud,
    comentario: string,
  ): Promise<boolean> {
    try {
      const response = await apiRequest<{ success: boolean }>(
        `${BASE}/${id}/resolver`,
        {
          method: "PATCH",
          body: JSON.stringify({ estado, comentario }),
        },
      );
      return response.success === true;
    } catch (error) {
      console.error("[SolicitudDesarrolloService] Error al resolver:", error);
      return false;
    }
  },

  async marcarTerminada(id: string, terminada: boolean): Promise<boolean> {
    try {
      const response = await apiRequest<{ success: boolean }>(
        `${BASE}/${id}/terminada`,
        {
          method: "PATCH",
          body: JSON.stringify({ terminada }),
        },
      );
      return response.success === true;
    } catch (error) {
      console.error("[SolicitudDesarrolloService] Error al marcar terminada:", error);
      return false;
    }
  },
};
