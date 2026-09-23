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
    automatico = false,
  ): Promise<Planificacion> {
    const response = await apiRequest<{ success: boolean; data: Planificacion }>(
      `${BASE}/${fecha}${automatico ? "?automatico=true" : ""}`,
      {
        method: "PUT",
        body: JSON.stringify({ trabajos, creada_por: creadaPor ?? null }),
      },
    );
    return response.data;
  },

  /** Los planes guardados entre dos días, ambos incluidos. */
  async listar(desde: string, hasta: string): Promise<Planificacion[]> {
    const response = await apiRequest<{ success?: boolean; data?: Planificacion[] } | Planificacion[]>(
      `${BASE}/?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`,
    );
    return Array.isArray(response) ? response : response.data || [];
  },

  /** Confirma el plan de un día como definitivo. Requiere permiso `planificacion/confirmar`. */
  async confirmar(fecha: string): Promise<Planificacion> {
    const response = await apiRequest<{ success: boolean; data: Planificacion }>(
      `${BASE}/${fecha}/confirmar`,
      { method: "POST" },
    );
    return response.data;
  },

  /** Le quita la confirmación a un día. Requiere permiso `planificacion/desconfirmar`. */
  async desconfirmar(fecha: string): Promise<Planificacion> {
    const response = await apiRequest<{ success: boolean; data?: Planificacion; detail?: string; message?: string }>(
      `${BASE}/${fecha}/desconfirmar`,
      { method: "POST" },
    );
    // apiRequest no lanza ante un 404 de FastAPI: devuelve el cuerpo del error.
    if (!response?.success || !response.data) {
      throw new Error(response?.detail || response?.message || "No se pudo desconfirmar");
    }
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

  /** El comentario con el que arranca un trabajo: qué está roto, o lo anotado en la visita. */
  async notaSugerida(tipo: string, clienteNumero?: string | null, leadId?: string | null): Promise<string | null> {
    const params = new URLSearchParams({ tipo });
    if (clienteNumero) params.set("cliente_numero", clienteNumero);
    if (leadId) params.set("lead_id", leadId);
    const response = await apiRequest<{ success: boolean; data?: { nota?: string | null } }>(
      `${BASE}/nota-sugerida?${params.toString()}`,
    );
    return response.data?.nota ?? null;
  },
};
