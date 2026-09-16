/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from "../../../api-config";
import type {
  DecisionItem,
  ListarPresupuestosParams,
  PresupuestoCreateData,
  PresupuestoLogistica,
  PresupuestoUpdateData,
  SugerenciasPresupuesto,
} from "../../../types/feats/presupuesto-logistica/presupuesto-logistica-types";

const BASE = "/presupuestos-logistica";
const COLLECTION = "/presupuestos-logistica/";

const extraerError = (response: any): string | null => {
  if (!response) return null;
  if (response.success === false) {
    return (
      response?.error?.message ||
      response?.message ||
      response?.detail ||
      "No se pudo completar la operación sobre el presupuesto."
    );
  }
  return response?.error?.message ?? null;
};

const desempaquetar = (response: any): any =>
  response?.data !== undefined ? response.data : response;

const num = (valor: any): number | null => {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

const texto = (valor: any): string | null => {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).trim();
  return t || null;
};

const mapItem = (raw: any) => ({
  numero: Number(raw?.numero ?? 0),
  local: texto(raw?.local),
  actividad: texto(raw?.actividad),
  material: String(raw?.material ?? ""),
  cantidad_um: texto(raw?.cantidad_um),
  importe: num(raw?.importe),
  moneda: (raw?.moneda ?? null) as any,
  estado: (raw?.estado ?? "pendiente") as any,
  comentario_rechazo: texto(raw?.comentario_rechazo),
  importe_sugerido: num(raw?.importe_sugerido),
  moneda_sugerida: (raw?.moneda_sugerida ?? null) as any,
});

const mapSede = (raw: any) => ({
  orden: Number(raw?.orden ?? 0),
  sede_id: texto(raw?.sede_id),
  sede_nombre: String(raw?.sede_nombre ?? ""),
  items: Array.isArray(raw?.items) ? raw.items.map(mapItem) : [],
});

const mapTotales = (raw: any) => ({
  por_sede: Array.isArray(raw?.por_sede)
    ? raw.por_sede.map((s: any) => ({
        orden: Number(s?.orden ?? 0),
        sede_id: texto(s?.sede_id),
        sede_nombre: String(s?.sede_nombre ?? ""),
        es_sede_registrada: Boolean(s?.es_sede_registrada),
        total_usd: Number(s?.total_usd ?? 0),
        total_cup: Number(s?.total_cup ?? 0),
        total_en_usd: Number(s?.total_en_usd ?? 0),
        cantidad_items: Number(s?.cantidad_items ?? 0),
      }))
    : [],
  total_usd: Number(raw?.total_usd ?? 0),
  total_cup: Number(raw?.total_cup ?? 0),
  total_cup_en_usd: Number(raw?.total_cup_en_usd ?? 0),
  total_general_usd: Number(raw?.total_general_usd ?? 0),
  tasa_cup_por_usd: Number(raw?.tasa_cup_por_usd ?? 0),
  layout_tabla: (raw?.layout_tabla ?? "ancha") as "ancha" | "transpuesta",
});

const mapPresupuesto = (raw: any): PresupuestoLogistica => ({
  id: String(raw?.id ?? raw?._id ?? ""),
  numero: String(raw?.numero ?? ""),
  titulo: String(raw?.titulo ?? ""),
  tipo: (raw?.tipo ?? "ordinario") as any,
  mes: Number(raw?.mes ?? 0),
  anio: Number(raw?.anio ?? 0),
  estado: (raw?.estado ?? "borrador") as any,
  tasa_cup_por_usd: Number(raw?.tasa_cup_por_usd ?? 0),
  sedes: Array.isArray(raw?.sedes) ? raw.sedes.map(mapSede) : [],

  confeccionado_por_ci: texto(raw?.confeccionado_por_ci),
  confeccionado_por_nombre: texto(raw?.confeccionado_por_nombre),
  confeccionado_por_cargo: texto(raw?.confeccionado_por_cargo),

  aprobado_por_ci: texto(raw?.aprobado_por_ci),
  aprobado_por_nombre: texto(raw?.aprobado_por_nombre),
  aprobado_por_cargo: texto(raw?.aprobado_por_cargo),
  aprobado_en: texto(raw?.aprobado_en),

  enviado_en: texto(raw?.enviado_en),
  devuelto_en: texto(raw?.devuelto_en),
  comentario_devolucion: texto(raw?.comentario_devolucion),

  anulada: Boolean(raw?.anulada),
  motivo_anulacion: texto(raw?.motivo_anulacion),
  anulada_en: texto(raw?.anulada_en),

  ronda: Number(raw?.ronda ?? 1),
  historial: Array.isArray(raw?.historial)
    ? raw.historial.map((h: any) => ({
        ronda: Number(h?.ronda ?? 1),
        accion: String(h?.accion ?? ""),
        estado_resultante: (h?.estado_resultante ?? "borrador") as any,
        por_ci: texto(h?.por_ci),
        por_nombre: texto(h?.por_nombre),
        en: String(h?.en ?? ""),
        comentario: texto(h?.comentario),
        tasa_cup_por_usd: num(h?.tasa_cup_por_usd),
      }))
    : [],

  fecha_creacion: String(raw?.fecha_creacion ?? ""),
  fecha_actualizacion: String(raw?.fecha_actualizacion ?? ""),

  totales: mapTotales(raw?.totales),
  revision: {
    pendientes: Number(raw?.revision?.pendientes ?? 0),
    aprobados: Number(raw?.revision?.aprobados ?? 0),
    rechazados: Number(raw?.revision?.rechazados ?? 0),
    total: Number(raw?.revision?.total ?? 0),
  },
  editable: Boolean(raw?.editable),
});

const ejecutar = async (
  endpoint: string,
  init?: RequestInit,
): Promise<PresupuestoLogistica> => {
  const response = await apiRequest<any>(endpoint, init);
  const error = extraerError(response);
  if (error) throw new Error(error);
  return mapPresupuesto(desempaquetar(response));
};

export const PresupuestoLogisticaService = {
  async listar(
    params: ListarPresupuestosParams = {},
  ): Promise<{ presupuestos: PresupuestoLogistica[]; total: number }> {
    const query = new URLSearchParams();
    if (params.anio !== undefined) query.set("anio", String(params.anio));
    if (params.mes !== undefined) query.set("mes", String(params.mes));
    if (params.estado) query.set("estado", params.estado);
    if (params.tipo) query.set("tipo", params.tipo);
    if (params.skip !== undefined) query.set("skip", String(params.skip));
    if (params.limit !== undefined) query.set("limit", String(params.limit));

    const sufijo = query.toString() ? `?${query.toString()}` : "";
    const response = await apiRequest<any>(`${COLLECTION}${sufijo}`);
    const error = extraerError(response);
    if (error) throw new Error(error);

    const lista = Array.isArray(response?.data) ? response.data : [];
    return {
      presupuestos: lista.map(mapPresupuesto),
      total: Number(response?.total ?? lista.length),
    };
  },

  async obtener(id: string): Promise<PresupuestoLogistica> {
    return ejecutar(`${BASE}/${id}`);
  },

  async crear(data: PresupuestoCreateData): Promise<PresupuestoLogistica> {
    return ejecutar(COLLECTION, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async actualizar(
    id: string,
    data: PresupuestoUpdateData,
  ): Promise<PresupuestoLogistica> {
    return ejecutar(`${BASE}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async enviar(id: string): Promise<PresupuestoLogistica> {
    return ejecutar(`${BASE}/${id}/enviar`, { method: "POST" });
  },

  async revisar(
    id: string,
    decisiones: DecisionItem[],
  ): Promise<PresupuestoLogistica> {
    return ejecutar(`${BASE}/${id}/revisar`, {
      method: "POST",
      body: JSON.stringify({ decisiones }),
    });
  },

  async resolver(
    id: string,
    comentario?: string | null,
  ): Promise<PresupuestoLogistica> {
    return ejecutar(`${BASE}/${id}/resolver`, {
      method: "POST",
      body: JSON.stringify({ comentario: comentario ?? null }),
    });
  },

  async anular(id: string, motivo: string): Promise<PresupuestoLogistica> {
    return ejecutar(`${BASE}/${id}/anular`, {
      method: "POST",
      body: JSON.stringify({ motivo }),
    });
  },

  async sugerencias(): Promise<SugerenciasPresupuesto> {
    const response = await apiRequest<any>(`${BASE}/sugerencias`);
    const error = extraerError(response);
    if (error) throw new Error(error);
    const data = desempaquetar(response) ?? {};
    return {
      materiales: Array.isArray(data.materiales) ? data.materiales : [],
      locales: Array.isArray(data.locales) ? data.locales : [],
      sedes_libres: Array.isArray(data.sedes_libres) ? data.sedes_libres : [],
    };
  },
};
