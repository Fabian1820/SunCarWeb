import { apiRequest } from "@/lib/api-config";
import type {
  ComercialAtencion,
  ConfiguracionAtencion,
  DiaPlanificado,
  EstadoDia,
  ImpactoConfiguracion,
  LeadDelDia,
  ResultadoRotacion,
  SupervisionResumen,
  TurnoConfig,
} from "@/lib/types/feats/atencion-cliente/atencion-cliente-types";

const BASE = "/atencion-cliente";

type Respuesta<T> = { success: boolean; data: T; message?: string };

export const AtencionClienteService = {
  async getComerciales(): Promise<ComercialAtencion[]> {
    const res = await apiRequest<Respuesta<ComercialAtencion[]>>(
      `${BASE}/comerciales`,
    );
    return res.data || [];
  },

  async getConfiguracion(): Promise<ConfiguracionAtencion> {
    const res = await apiRequest<Respuesta<ConfiguracionAtencion>>(
      `${BASE}/configuracion`,
    );
    return res.data;
  },

  /** Qué días ya planificados cambiarían con esta plantilla. Se consulta antes
   *  de guardar para que el planificador decida con el impacto delante. */
  async getImpacto(
    dias: Record<string, TurnoConfig[]>,
    aplicarDesde?: string,
  ): Promise<ImpactoConfiguracion> {
    const res = await apiRequest<Respuesta<ImpactoConfiguracion>>(
      `${BASE}/configuracion/impacto`,
      {
        method: "POST",
        body: JSON.stringify({ dias, aplicar_desde: aplicarDesde || null }),
      },
    );
    return res.data;
  },

  async guardarConfiguracion(
    dias: Record<string, TurnoConfig[]>,
    aplicarDesde?: string,
  ): Promise<{ configuracion: ConfiguracionAtencion; dias_reescritos: number }> {
    const res = await apiRequest<
      Respuesta<{ configuracion: ConfiguracionAtencion; dias_reescritos: number }>
    >(`${BASE}/configuracion`, {
      method: "PUT",
      body: JSON.stringify({ dias, aplicar_desde: aplicarDesde || null }),
    });
    return res.data;
  },

  async getPlanificacion(desde: string, hasta: string): Promise<DiaPlanificado[]> {
    const res = await apiRequest<Respuesta<{ dias: DiaPlanificado[] }>>(
      `${BASE}/planificacion?desde=${desde}&hasta=${hasta}`,
    );
    return res.data?.dias || [];
  },

  async guardarDia(
    fecha: string,
    turnos: {
      clave: string;
      nombre: string;
      inicio: string;
      fin: string;
      comerciales: string[];
      nota?: string | null;
    }[],
  ): Promise<DiaPlanificado> {
    const res = await apiRequest<Respuesta<DiaPlanificado>>(
      `${BASE}/planificacion/${fecha}`,
      { method: "PUT", body: JSON.stringify({ turnos }) },
    );
    return res.data;
  },

  async borrarDia(fecha: string): Promise<boolean> {
    const res = await apiRequest<{ success: boolean }>(
      `${BASE}/planificacion/${fecha}`,
      { method: "DELETE" },
    );
    return res.success === true;
  },

  async registrarSuplencia(
    fecha: string,
    turnoClave: string,
    saleCi: string,
    entraCi: string,
    motivo?: string,
  ): Promise<DiaPlanificado> {
    const res = await apiRequest<Respuesta<DiaPlanificado>>(
      `${BASE}/planificacion/${fecha}/suplencia`,
      {
        method: "POST",
        body: JSON.stringify({
          turno_clave: turnoClave,
          sale_ci: saleCi,
          entra_ci: entraCi,
          motivo: motivo || null,
        }),
      },
    );
    return res.data;
  },

  async generarRotacion(params: {
    desde: string;
    hasta: string;
    comerciales: string[];
    personasPorTurno: number;
    sobrescribir: boolean;
  }): Promise<ResultadoRotacion> {
    const res = await apiRequest<Respuesta<ResultadoRotacion>>(
      `${BASE}/planificacion/generar`,
      {
        method: "POST",
        body: JSON.stringify({
          desde: params.desde,
          hasta: params.hasta,
          comerciales: params.comerciales,
          personas_por_turno: params.personasPorTurno,
          sobrescribir: params.sobrescribir,
        }),
      },
    );
    return res.data;
  },

  async getEstadoDia(fecha?: string): Promise<EstadoDia> {
    const query = fecha ? `?fecha=${fecha}` : "";
    const res = await apiRequest<Respuesta<EstadoDia>>(`${BASE}/dia${query}`);
    return res.data;
  },

  async getLeadsDelDia(
    fecha?: string,
    soloCi?: string,
  ): Promise<{ fecha: string; leads: LeadDelDia[]; sin_repartir: number }> {
    const params = new URLSearchParams();
    if (fecha) params.set("fecha", fecha);
    if (soloCi) params.set("solo_ci", soloCi);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await apiRequest<
      Respuesta<{ fecha: string; leads: LeadDelDia[]; sin_repartir: number }>
    >(`${BASE}/leads-del-dia${query}`);
    return res.data;
  },

  async repartir(
    fecha: string,
    asignaciones: { comercial_ci: string; lead_ids: string[] }[],
  ): Promise<{ total: number; asignaciones: { nombre: string; leads_asignados: number }[] }> {
    const res = await apiRequest<
      Respuesta<{
        total: number;
        asignaciones: { nombre: string; leads_asignados: number }[];
      }>
    >(`${BASE}/reparto`, {
      method: "POST",
      body: JSON.stringify({ fecha, asignaciones }),
    });
    return res.data;
  },

  async getSupervision(desde: string, hasta: string): Promise<SupervisionResumen> {
    const res = await apiRequest<Respuesta<SupervisionResumen>>(
      `${BASE}/supervision?desde=${desde}&hasta=${hasta}`,
    );
    return res.data;
  },
};
