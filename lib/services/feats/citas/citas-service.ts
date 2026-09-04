import { apiRequest } from "@/lib/api-config";
import type {
  Cita,
  CitaCreateData,
  CitaEspontaneaData,
  CitaUpdateData,
  CitasFiltros,
  ConfiguracionCitas,
  Disponibilidad,
  EstadoCita,
  HorarioDia,
  ResumenCitas,
} from "@/lib/types/feats/citas/citas-types";

const BASE = "/citas";

function construirQuery(filtros: CitasFiltros): string {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === "") return;
    params.append(clave, String(valor));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const CitasService = {
  async listar(
    filtros: CitasFiltros = {},
  ): Promise<{ citas: Cita[]; total: number }> {
    const response = await apiRequest<{
      success: boolean;
      data: Cita[];
      total: number;
    }>(`${BASE}/${construirQuery(filtros)}`);
    return { citas: response.data || [], total: response.total || 0 };
  },

  async obtener(id: string): Promise<Cita | null> {
    const response = await apiRequest<{ success: boolean; data: Cita }>(
      `${BASE}/${id}`,
    );
    return response.data ?? null;
  },

  async crear(data: CitaCreateData): Promise<Cita> {
    const response = await apiRequest<{ success: boolean; data: Cita }>(
      `${BASE}/`,
      { method: "POST", body: JSON.stringify(data) },
    );
    return response.data;
  },

  /** Registra a alguien que llegó sin cita. */
  async crearEspontanea(data: CitaEspontaneaData): Promise<Cita> {
    const response = await apiRequest<{ success: boolean; data: Cita }>(
      `${BASE}/espontanea`,
      { method: "POST", body: JSON.stringify(data) },
    );
    return response.data;
  },

  async actualizar(id: string, data: CitaUpdateData): Promise<Cita> {
    const response = await apiRequest<{ success: boolean; data: Cita }>(
      `${BASE}/${id}`,
      { method: "PUT", body: JSON.stringify(data) },
    );
    return response.data;
  },

  /** Confirmar que vino, marcar que no vino, cancelar o reabrir. */
  async cambiarEstado(
    id: string,
    estado: EstadoCita,
    motivo?: string | null,
  ): Promise<Cita> {
    const response = await apiRequest<{ success: boolean; data: Cita }>(
      `${BASE}/${id}/estado`,
      { method: "PATCH", body: JSON.stringify({ estado, motivo }) },
    );
    return response.data;
  },

  /** Mueve la cita a otra fecha/hora; el backend valida que el slot esté libre. */
  async posponer(
    id: string,
    fecha: string,
    horaInicio: string,
    motivo?: string | null,
  ): Promise<Cita> {
    const response = await apiRequest<{ success: boolean; data: Cita }>(
      `${BASE}/${id}/posponer`,
      {
        method: "PATCH",
        body: JSON.stringify({ fecha, hora_inicio: horaInicio, motivo }),
      },
    );
    return response.data;
  },

  /** Pasa la cita a otra comercial, validando que tenga ese slot libre. */
  async reasignar(
    id: string,
    comercialCi: string,
    motivo?: string | null,
  ): Promise<Cita> {
    const response = await apiRequest<{ success: boolean; data: Cita }>(
      `${BASE}/${id}/reasignar`,
      {
        method: "PATCH",
        body: JSON.stringify({ comercial_ci: comercialCi, motivo }),
      },
    );
    return response.data;
  },

  async eliminar(id: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`${BASE}/${id}`, {
      method: "DELETE",
    });
    return response.success === true;
  },

  async disponibilidad(fecha: string): Promise<Disponibilidad> {
    const response = await apiRequest<{
      success: boolean;
      data: Disponibilidad;
    }>(`${BASE}/disponibilidad?fecha=${fecha}`);
    return response.data;
  },

  async resumen(fechaDesde: string, fechaHasta: string): Promise<ResumenCitas> {
    const response = await apiRequest<{ success: boolean; data: ResumenCitas }>(
      `${BASE}/resumen?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`,
    );
    return response.data;
  },

  async obtenerConfiguracion(): Promise<ConfiguracionCitas> {
    const response = await apiRequest<{
      success: boolean;
      data: ConfiguracionCitas;
    }>(`${BASE}/configuracion`);
    return response.data;
  },

  async guardarConfiguracion(dias: HorarioDia[]): Promise<ConfiguracionCitas> {
    const response = await apiRequest<{
      success: boolean;
      data: ConfiguracionCitas;
    }>(`${BASE}/configuracion`, {
      method: "PUT",
      body: JSON.stringify({ dias }),
    });
    return response.data;
  },
};
