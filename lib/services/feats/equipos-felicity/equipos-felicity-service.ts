import { apiRequest } from "@/lib/api-config";
import type {
  ComandoResponse,
  CuentaResponse,
  DispositivoFelicity,
  EquipoOficinaConfig,
  EstadoOficina,
  EstadoRapido,
  EstadosRapidosListResponse,
  LecturaFelicity,
  NivelRiesgo,
  OperacionCatalogoItem,
  OperacionFelicity,
  ParametroConfigurable,
  PrevisualizacionData,
  ResumenPlanta,
  SincronizacionResultado,
  ComandoFelicity,
  UnidadMedida,
} from "@/lib/types/feats/equipos-felicity/equipos-felicity-types";

const BASE = "/equipos-felicity";

interface ListResponse<T> {
  success: boolean;
  message: string;
  data: T[];
}

interface ItemResponse<T> {
  success: boolean;
  message: string;
  data?: T | null;
}

export const EquiposFelicityService = {
  // ------------------------------------------------------------- cuenta

  async vincularCuenta(payload: {
    fsolar_user: string;
    password: string;
    region?: string;
    password_comandos?: string | null;
  }): Promise<CuentaResponse> {
    return apiRequest<CuentaResponse>(`${BASE}/cuenta`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async obtenerCuenta(): Promise<CuentaResponse> {
    return apiRequest<CuentaResponse>(`${BASE}/cuenta`);
  },

  async desvincularCuenta(): Promise<CuentaResponse> {
    return apiRequest<CuentaResponse>(`${BASE}/cuenta`, { method: "DELETE" });
  },

  // ------------------------------------------------------------ lecturas

  async estadoDeTodos(unidad: UnidadMedida = "kw"): Promise<EstadosRapidosListResponse> {
    return apiRequest<EstadosRapidosListResponse>(`${BASE}/estado?unidad=${unidad}`);
  },

  async estadoRapido(sn: string, unidad: UnidadMedida = "kw"): Promise<ItemResponse<EstadoRapido>> {
    return apiRequest<ItemResponse<EstadoRapido>>(
      `${BASE}/dispositivos/${encodeURIComponent(sn)}/estado?unidad=${unidad}`,
    );
  },

  async resumenPlantas(): Promise<ListResponse<ResumenPlanta>> {
    return apiRequest<ListResponse<ResumenPlanta>>(`${BASE}/plantas`);
  },

  async listarDispositivos(opts?: {
    refrescar?: boolean;
    planta_id?: string;
  }): Promise<ListResponse<DispositivoFelicity>> {
    const params = new URLSearchParams();
    if (opts?.refrescar) params.set("refrescar", "true");
    if (opts?.planta_id) params.set("planta_id", opts.planta_id);
    const qs = params.toString();
    return apiRequest<ListResponse<DispositivoFelicity>>(
      `${BASE}/dispositivos${qs ? `?${qs}` : ""}`,
    );
  },

  async obtenerDispositivo(sn: string): Promise<ItemResponse<DispositivoFelicity>> {
    return apiRequest<ItemResponse<DispositivoFelicity>>(
      `${BASE}/dispositivos/${encodeURIComponent(sn)}`,
    );
  },

  async lecturaActual(sn: string, persistir = true): Promise<ItemResponse<LecturaFelicity>> {
    return apiRequest<ItemResponse<LecturaFelicity>>(
      `${BASE}/dispositivos/${encodeURIComponent(sn)}/lectura?persistir=${persistir}`,
    );
  },

  async historicoLecturas(
    sn: string,
    opts?: { desde?: string; hasta?: string; limite?: number },
  ): Promise<ListResponse<LecturaFelicity> & { total: number }> {
    const params = new URLSearchParams();
    if (opts?.desde) params.set("desde", opts.desde);
    if (opts?.hasta) params.set("hasta", opts.hasta);
    if (opts?.limite) params.set("limite", String(opts.limite));
    const qs = params.toString();
    return apiRequest<ListResponse<LecturaFelicity> & { total: number }>(
      `${BASE}/dispositivos/${encodeURIComponent(sn)}/lecturas${qs ? `?${qs}` : ""}`,
    );
  },

  async listarParametros(sn: string): Promise<ListResponse<ParametroConfigurable>> {
    return apiRequest<ListResponse<ParametroConfigurable>>(
      `${BASE}/dispositivos/${encodeURIComponent(sn)}/parametros`,
    );
  },

  async listarAlarmas(sn?: string): Promise<ItemResponse<Record<string, unknown>>> {
    const qs = sn ? `?sn=${encodeURIComponent(sn)}` : "";
    return apiRequest<ItemResponse<Record<string, unknown>>>(`${BASE}/alarmas${qs}`);
  },

  async listarAuditoria(opts?: { sn?: string; limite?: number }): Promise<ListResponse<ComandoFelicity>> {
    const params = new URLSearchParams();
    if (opts?.sn) params.set("sn", opts.sn);
    if (opts?.limite) params.set("limite", String(opts.limite));
    const qs = params.toString();
    return apiRequest<ListResponse<ComandoFelicity>>(`${BASE}/auditoria${qs ? `?${qs}` : ""}`);
  },

  async sincronizar(): Promise<{
    success: boolean;
    message: string;
  } & SincronizacionResultado> {
    return apiRequest(`${BASE}/sincronizar`, { method: "POST" });
  },

  // ------------------------------------------------------------ escrituras

  async catalogoOperaciones(): Promise<ListResponse<OperacionCatalogoItem>> {
    return apiRequest<ListResponse<OperacionCatalogoItem>>(`${BASE}/operaciones`);
  },

  async previsualizarOperacion(
    sn: string,
    operacion: OperacionFelicity,
    parametros: Record<string, unknown> = {},
  ): Promise<ItemResponse<PrevisualizacionData>> {
    return apiRequest<ItemResponse<PrevisualizacionData>>(
      `${BASE}/dispositivos/${encodeURIComponent(sn)}/operaciones/previsualizar`,
      {
        method: "POST",
        body: JSON.stringify({ operacion, parametros }),
      },
    );
  },

  async ejecutarOperacion(
    sn: string,
    payload: {
      operacion: OperacionFelicity;
      parametros?: Record<string, unknown>;
      motivo?: string;
      confirmacion?: string;
      simular?: boolean;
    },
  ): Promise<ComandoResponse> {
    return apiRequest<ComandoResponse>(
      `${BASE}/dispositivos/${encodeURIComponent(sn)}/operaciones`,
      {
        method: "POST",
        body: JSON.stringify({
          parametros: {},
          simular: false,
          ...payload,
        }),
      },
    );
  },

  async cambiarFrecuenciaReporte(
    sn: string,
    segundos: number,
    opts?: { motivo?: string; simular?: boolean },
  ): Promise<ComandoResponse> {
    return apiRequest<ComandoResponse>(
      `${BASE}/dispositivos/${encodeURIComponent(sn)}/frecuencia-reporte`,
      {
        method: "POST",
        body: JSON.stringify({ segundos, ...opts }),
      },
    );
  },

  async estadoComando(sn: string, comandoExternoId: string): Promise<ItemResponse<Record<string, unknown>>> {
    return apiRequest<ItemResponse<Record<string, unknown>>>(
      `${BASE}/dispositivos/${encodeURIComponent(sn)}/comandos/${encodeURIComponent(comandoExternoId)}/estado`,
    );
  },

  // ------------------------------------------------------- equipo de oficina

  async obtenerEquipoOficina(): Promise<ItemResponse<EquipoOficinaConfig> & { configurado: boolean }> {
    return apiRequest<ItemResponse<EquipoOficinaConfig> & { configurado: boolean }>(
      `${BASE}/equipo-oficina`,
    );
  },

  async configurarEquipoOficina(
    sn: string,
  ): Promise<ItemResponse<EquipoOficinaConfig> & { configurado: boolean }> {
    return apiRequest<ItemResponse<EquipoOficinaConfig> & { configurado: boolean }>(
      `${BASE}/equipo-oficina`,
      { method: "PUT", body: JSON.stringify({ sn }) },
    );
  },

  async estadoEquipoOficina(): Promise<ItemResponse<EstadoOficina>> {
    return apiRequest<ItemResponse<EstadoOficina>>(`${BASE}/equipo-oficina/estado`);
  },
};

export type { NivelRiesgo };
