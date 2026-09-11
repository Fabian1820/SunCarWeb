import { apiRequest } from "@/lib/api-config";
import type {
  AuditoriaEstado,
  AuditoriaEvento,
  AuditoriaFacetas,
  AuditoriaFiltros,
  AuditoriaPagina,
} from "@/lib/types/feats/auditoria/auditoria-types";

const BASE = "/auditoria";

type RespuestaLista = {
  success: boolean;
  message: string;
  data: AuditoriaEvento[];
  total: number;
  pagina: number;
  por_pagina: number;
};

/**
 * Cliente de la bitácora. Todo el filtrado y la paginación se hacen en el
 * servidor: la colección crece sin techo y traérsela entera no es opción.
 */
export const AuditoriaService = {
  async listar(filtros: AuditoriaFiltros): Promise<AuditoriaPagina> {
    const params = new URLSearchParams();
    if (filtros.usuarioCi) params.set("usuario_ci", filtros.usuarioCi);
    if (filtros.usuarioNombre) params.set("usuario_nombre", filtros.usuarioNombre);
    if (filtros.recurso) params.set("recurso", filtros.recurso);
    if (filtros.accion) params.set("accion", filtros.accion);
    if (filtros.tipo) params.set("tipo", filtros.tipo);
    if (filtros.entidadId) params.set("entidad_id", filtros.entidadId);
    if (filtros.soloFallidos) params.set("solo_fallidos", "true");
    if (filtros.desde) params.set("desde", filtros.desde);
    if (filtros.hasta) params.set("hasta", filtros.hasta);
    if (filtros.texto) params.set("texto", filtros.texto);
    params.set("pagina", String(filtros.pagina));
    params.set("por_pagina", String(filtros.porPagina));

    const respuesta = await apiRequest<RespuestaLista>(`${BASE}/?${params.toString()}`);
    return {
      eventos: respuesta.data || [],
      total: respuesta.total ?? 0,
      pagina: respuesta.pagina ?? filtros.pagina,
      porPagina: respuesta.por_pagina ?? filtros.porPagina,
    };
  },

  async facetas(): Promise<AuditoriaFacetas> {
    try {
      const respuesta = await apiRequest<{ data: AuditoriaFacetas }>(`${BASE}/facetas`);
      return respuesta.data ?? { recursos: [], acciones: [], usuarios: [] };
    } catch (error) {
      console.error("[AuditoriaService] Error obteniendo facetas:", error);
      return { recursos: [], acciones: [], usuarios: [] };
    }
  },

  async estado(): Promise<AuditoriaEstado | null> {
    try {
      const respuesta = await apiRequest<{ data: AuditoriaEstado }>(`${BASE}/estado`);
      return respuesta.data ?? null;
    } catch (error) {
      console.error("[AuditoriaService] Error obteniendo estado:", error);
      return null;
    }
  },

  /** Todo lo que le ha pasado a una entidad concreta (una oferta, un pago). */
  async historialEntidad(entidadId: string, limite = 100): Promise<AuditoriaEvento[]> {
    const respuesta = await apiRequest<RespuestaLista>(
      `${BASE}/entidad/${encodeURIComponent(entidadId)}?limite=${limite}`,
    );
    return respuesta.data || [];
  },

  async detalle(eventoId: string): Promise<AuditoriaEvento | null> {
    const respuesta = await apiRequest<{ data: AuditoriaEvento }>(
      `${BASE}/${encodeURIComponent(eventoId)}`,
    );
    return respuesta.data ?? null;
  },
};
