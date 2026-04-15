"use client";

import { useCallback, useEffect, useState } from "react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  ClienteService,
  BrigadaService,
  TrabajadorService,
} from "@/lib/api-services";
import { apiRequest } from "@/lib/api-config";
import {
  InstalacionesService,
  type PendientesInstalacionResponse,
} from "@/lib/services/feats/instalaciones/instalaciones-service";
import type { Cliente, Brigada, Trabajador } from "@/lib/api-types";
import type { Averia } from "@/lib/types/feats/averias/averia-types";
import { PlanificacionDiariaTrabajosTable } from "@/components/feats/instalaciones/planificacion-diaria-trabajos-table";
import { ListaPlanificacionesTable } from "@/components/feats/instalaciones/lista-planificaciones-table";
import { VerPlanificacionDialog } from "@/components/feats/instalaciones/ver-planificacion-dialog";
import type {
  BrigadaPlanificacionOption,
  TecnicoPlanificacionOption,
  TrabajoPlanificable,
} from "@/lib/types/feats/instalaciones/planificacion-trabajos-types";
import type { PlanificacionDiaria } from "@/lib/services/feats/instalaciones/planificacion-diaria-service";
import { PlanificacionDiariaService } from "@/lib/services/feats/instalaciones/planificacion-diaria-service";

interface PendientesVisitaRawResponse {
  clientes?: Array<Record<string, unknown>>;
  leads?: Array<Record<string, unknown>>;
}

interface VisitaPendienteEnriquecida {
  motivo?: string;
  comentario?: string;
}

interface VisitaResumenEnriquecido {
  total: number;
  realizadas: number;
  media: unknown[];
}

interface VisitasMetadata {
  pendientes: Map<string, VisitaPendienteEnriquecida>;
  resumen: Map<string, VisitaResumenEnriquecido>;
}

const EMPTY_PENDIENTES: PendientesInstalacionResponse = {
  leads: [],
  clientes: [],
  total_leads: 0,
  total_clientes: 0,
  total_general: 0,
};

const safeText = (value: unknown, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const parsePositiveNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const parsePowerFromTextKw = (value: unknown): number | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = value
    .replace(",", ".")
    .match(/(\d+(?:\.\d+)?)\s*k(?:w|W)\b/);
  if (!match) return null;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const parseDateValue = (value: unknown): number => {
  if (!value) return 0;
  const parsed = new Date(String(value));
  const time = parsed.getTime();
  return Number.isFinite(time) ? time : 0;
};

const isOfertaConfirmadaPorCliente = (ofertaRaw: unknown): boolean => {
  if (!ofertaRaw || typeof ofertaRaw !== "object") return false;
  const oferta = ofertaRaw as Record<string, unknown>;
  if (oferta.confirmada_por_cliente === true) return true;
  if (oferta.confirmada === true) return true;

  const estado = safeText(oferta.estado || oferta.status).toLowerCase();
  return (
    estado.includes("confirm") ||
    estado.includes("aceptad") ||
    estado.includes("aprob")
  );
};

const getOfertaTexto = (ofertaRaw: unknown): string => {
  if (!ofertaRaw || typeof ofertaRaw !== "object") return "";
  const oferta = ofertaRaw as Record<string, unknown>;
  return (
    safeText(oferta.nombre_completo) ||
    safeText(oferta.nombre_oferta) ||
    safeText(oferta.descripcion) ||
    safeText(oferta.nombre) ||
    ""
  );
};

const getOfertaResumen = (entityRaw: unknown): string | undefined => {
  if (!entityRaw || typeof entityRaw !== "object") return undefined;
  const entity = entityRaw as Record<string, unknown>;

  const ofertasRaw = Array.isArray(entity.ofertas) ? entity.ofertas : [];
  if (ofertasRaw.length > 0) {
    const confirmadas = ofertasRaw.filter(isOfertaConfirmadaPorCliente);
    const candidatas = (confirmadas.length > 0 ? confirmadas : ofertasRaw).slice();

    candidatas.sort((a, b) => {
      const aRecord = (a as Record<string, unknown>) || {};
      const bRecord = (b as Record<string, unknown>) || {};
      const aDate =
        parseDateValue(aRecord.fecha_confirmacion) ||
        parseDateValue(aRecord.updated_at) ||
        parseDateValue(aRecord.created_at) ||
        parseDateValue(aRecord.fecha);
      const bDate =
        parseDateValue(bRecord.fecha_confirmacion) ||
        parseDateValue(bRecord.updated_at) ||
        parseDateValue(bRecord.created_at) ||
        parseDateValue(bRecord.fecha);
      return bDate - aDate;
    });

    const texto = getOfertaTexto(candidatas[0]);
    if (texto) return texto;
  }

  // Fallback solicitado: usar campo "oferta" del cliente/lead si existe
  const ofertaFallback = entity.oferta;
  if (typeof ofertaFallback === "string") {
    const text = ofertaFallback.trim();
    if (text) return text;
  }
  if (ofertaFallback && typeof ofertaFallback === "object") {
    const text = getOfertaTexto(ofertaFallback);
    if (text) return text;
  }

  return undefined;
};

const extractInverterPowerKw = (
  entityRaw: unknown,
): number | undefined => {
  if (!entityRaw || typeof entityRaw !== "object") return undefined;
  const entity = entityRaw as Record<string, unknown>;

  const directPower =
    parsePositiveNumber(entity.potencia_inversor_principal_kw) ??
    parsePositiveNumber(entity.inversor_potencia_kw) ??
    parsePositiveNumber(entity.potencia_inversor_kw) ??
    parsePositiveNumber(entity.potencia_inversor);
  if (directPower) return directPower;

  const ofertasRaw = entity.ofertas;
  if (!Array.isArray(ofertasRaw)) return undefined;

  for (const ofertaRaw of ofertasRaw) {
    if (!ofertaRaw || typeof ofertaRaw !== "object") continue;
    const oferta = ofertaRaw as Record<string, unknown>;
    const inversorCantidad = Number(oferta.inversor_cantidad || 0);
    if (!Number.isFinite(inversorCantidad) || inversorCantidad <= 0) continue;

    const potencia =
      parsePositiveNumber(oferta.inversor_potencia_kw) ??
      parsePositiveNumber(oferta.potencia_inversor_kw) ??
      parsePositiveNumber(oferta.potencia_inversor) ??
      parsePowerFromTextKw(oferta.inversor_nombre);

    if (potencia) return potencia;
  }

  return undefined;
};

const isVisitaRealizada = (estadoRaw: unknown) => {
  const estado = safeText(estadoRaw).toLowerCase();
  return (
    estado.includes("complet") ||
    estado.includes("realiz") ||
    estado.includes("finaliz") ||
    estado.includes("cerrad")
  );
};

const extractVisitaMedia = (visita: Record<string, unknown>): unknown[] => {
  const media: unknown[] = [];
  const seen = new Set<string>();

  const push = (item: unknown) => {
    if (!item) return;
    if (typeof item === "string") {
      const url = item.trim();
      if (!url || seen.has(url)) return;
      seen.add(url);
      media.push(url);
      return;
    }
    if (typeof item === "object") {
      const record = item as Record<string, unknown>;
      const url = String(record.url || record.path || "").trim();
      if (!url || seen.has(url)) return;
      seen.add(url);
      media.push(item);
    }
  };

  const pushMany = (raw: unknown) => {
    if (!Array.isArray(raw)) return;
    raw.forEach((item) => push(item));
  };

  pushMany(visita.fotos);
  pushMany(visita.archivos);
  pushMany((visita.archivos_guardados as Record<string, unknown> | undefined)?.estudio_energetico);
  pushMany((visita.archivos_guardados as Record<string, unknown> | undefined)?.evidencia);
  pushMany((visita.visita_completada as Record<string, unknown> | undefined)?.estudio_energetico);
  pushMany((visita.visita_completada as Record<string, unknown> | undefined)?.evidencia_archivos);

  return media;
};

const getArrayFromPayload = (
  payload: unknown,
): Array<Record<string, unknown>> => {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const data = record.data;
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === "object") {
    const dataRecord = data as Record<string, unknown>;
    if (Array.isArray(dataRecord.visitas)) {
      return dataRecord.visitas as Array<Record<string, unknown>>;
    }
  }
  if (Array.isArray(record.visitas)) {
    return record.visitas as Array<Record<string, unknown>>;
  }
  return [];
};

const fetchVisitasMetadata = async (): Promise<VisitasMetadata> => {
  const pendientes = new Map<string, VisitaPendienteEnriquecida>();
  const resumen = new Map<string, VisitaResumenEnriquecido>();
  const pageSize = 200;
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;
  let safety = 0;

  while (skip < total && safety < 50) {
    const response = await apiRequest<Record<string, unknown>>(
      `/visitas/?skip=${skip}&limit=${pageSize}`,
    );
    const pageData = getArrayFromPayload(response);
    const responseTotal = Number(
      (response?.data as Record<string, unknown> | undefined)?.total ??
        response?.total ??
        pageData.length,
    );
    if (Number.isFinite(responseTotal)) {
      total = responseTotal;
    }

    pageData.forEach((visita) => {
      const tipoRaw = safeText(
        visita.tipo ||
          visita.tipo_entidad ||
          (visita.lead_id ? "lead" : visita.cliente_numero ? "cliente" : ""),
      ).toLowerCase();
      const tipo: "lead" | "cliente" = tipoRaw.includes("cliente")
        ? "cliente"
        : "lead";
      const entidadId = safeText(
        visita.entidad_id ||
          visita.lead_id ||
          visita.cliente_numero ||
          visita.numero ||
          visita.numero_cliente,
      );
      if (!entidadId) return;

      const motivo =
        safeText(visita.motivo) ||
        safeText(visita.motivo_visita) ||
        safeText(visita.razon) ||
        safeText(visita.comentario) ||
        safeText(visita.notas) ||
        safeText(visita.evidencia_texto) ||
        undefined;
      const comentario =
        safeText(visita.comentario) ||
        safeText(visita.notas) ||
        safeText(visita.evidencia_texto) ||
        undefined;

      const key = `${tipo}:${entidadId}`;
      const current = resumen.get(key) || {
        total: 0,
        realizadas: 0,
        media: [],
      };
      current.total += 1;

      if (isVisitaRealizada(visita.estado)) {
        current.realizadas += 1;
        current.media.push(...extractVisitaMedia(visita));
      } else {
        const estado = safeText(visita.estado).toLowerCase();
        if (!estado.includes("cancel") && !pendientes.has(key)) {
          pendientes.set(key, { motivo, comentario });
        }
      }
      resumen.set(key, current);
    });

    if (pageData.length < pageSize) break;
    skip += pageSize;
    safety += 1;
  }

  return { pendientes, resumen };
};

const isAveriaPendiente = (averia: Averia) =>
  String(averia.estado || "").toLowerCase() !== "solucionada";

const getBrigadaOption = (
  brigada: Brigada,
): BrigadaPlanificacionOption | null => {
  const id = safeText(brigada.id || brigada._id || brigada.lider_ci);
  if (!id) return null;

  const nombreLider = safeText(brigada.lider?.nombre);
  const nombre = nombreLider
    ? `Brigada ${nombreLider}`
    : `Brigada ${safeText(brigada.lider_ci, id)}`;

  return { id, nombre };
};

const getTecnicoOption = (
  trabajador: Trabajador,
): TecnicoPlanificacionOption | null => {
  const id = safeText(trabajador.id || trabajador.CI);
  if (!id) return null;
  const nombre = safeText(trabajador.nombre, `Técnico ${id}`);
  return { id, nombre };
};

const buildVisitas = (
  response: PendientesVisitaRawResponse,
  visitasPendientesMap: Map<string, VisitaPendienteEnriquecida>,
  visitasResumenMap: Map<string, VisitaResumenEnriquecido>,
): TrabajoPlanificable[] => {
  const visitas: TrabajoPlanificable[] = [];
  const clientes = Array.isArray(response.clientes) ? response.clientes : [];
  const leads = Array.isArray(response.leads) ? response.leads : [];

  clientes.forEach((cliente) => {
    const numero = safeText(cliente.numero);
    const contactoId = numero || safeText(cliente.id);
    if (!contactoId) return;
    const visitaAsociada = [
      numero ? `cliente:${numero}` : "",
      `cliente:${contactoId}`,
    ]
      .filter(Boolean)
      .map((key) => visitasPendientesMap.get(key))
      .find(Boolean);
    const visitasResumen = [
      numero ? `cliente:${numero}` : "",
      `cliente:${contactoId}`,
    ]
      .filter(Boolean)
      .map((key) => visitasResumenMap.get(key))
      .find(Boolean);

    visitas.push({
      uid: `visita:cliente:${contactoId}`,
      tipo: "visita",
      contactoTipo: "cliente",
      contactoId,
      contactoNumero: numero || undefined,
      nombre: safeText(cliente.nombre, "Cliente sin nombre"),
      telefono: safeText(cliente.telefono, "Sin teléfono"),
      direccion: safeText(cliente.direccion, "Sin dirección"),
      provincia: safeText(cliente.provincia_montaje) || undefined,
      municipio: safeText(cliente.municipio) || undefined,
      potenciaInversorKw: extractInverterPowerKw(cliente),
      estado: safeText(cliente.estado) || undefined,
      prioridad: safeText(cliente.prioridad) || undefined,
      descripcionTrabajo: "Visita técnica pendiente",
      fechaReferencia: safeText(cliente.fecha_contacto) || undefined,
      comentarioModulo:
        safeText(cliente.comentario) ||
        safeText(visitaAsociada?.comentario) ||
        safeText(cliente.notas) ||
        safeText(cliente.evidencia_texto) ||
        undefined,
      motivo:
        safeText(visitaAsociada?.motivo) ||
        safeText(cliente.motivo) ||
        safeText(cliente.motivo_visita) ||
        safeText(cliente.razon) ||
        undefined,
      comercial: safeText(cliente.comercial) || undefined,
      ofertas: Array.isArray(cliente.ofertas)
        ? (cliente.ofertas as unknown[])
        : undefined,
      ofertaResumen: getOfertaResumen(cliente),
      fotos: Array.isArray(cliente.fotos)
        ? (cliente.fotos as unknown[])
        : undefined,
      fotosVisitas:
        visitasResumen && visitasResumen.media.length > 0
          ? visitasResumen.media
          : undefined,
      tieneVisitasRealizadas:
        !!visitasResumen && visitasResumen.realizadas > 0,
      totalVisitasRealizadas: visitasResumen?.realizadas || 0,
    });
  });

  leads.forEach((lead) => {
    const contactoId = safeText(lead.id || lead._id);
    if (!contactoId) return;
    const visitaAsociada = visitasPendientesMap.get(`lead:${contactoId}`);
    const visitasResumen = visitasResumenMap.get(`lead:${contactoId}`);

    visitas.push({
      uid: `visita:lead:${contactoId}`,
      tipo: "visita",
      contactoTipo: "lead",
      contactoId,
      nombre: safeText(lead.nombre, "Lead sin nombre"),
      telefono: safeText(lead.telefono, "Sin teléfono"),
      direccion: safeText(lead.direccion, "Sin dirección"),
      provincia: safeText(lead.provincia_montaje) || undefined,
      municipio: safeText(lead.municipio) || undefined,
      potenciaInversorKw: extractInverterPowerKw(lead),
      estado: safeText(lead.estado) || undefined,
      prioridad: safeText(lead.prioridad) || undefined,
      descripcionTrabajo: "Visita a lead pendiente",
      fechaReferencia: safeText(lead.fecha_contacto) || undefined,
      comentarioModulo:
        safeText(lead.comentario) ||
        safeText(visitaAsociada?.comentario) ||
        safeText(lead.notas) ||
        safeText(lead.evidencia_texto) ||
        undefined,
      motivo:
        safeText(visitaAsociada?.motivo) ||
        safeText(lead.motivo) ||
        safeText(lead.motivo_visita) ||
        safeText(lead.razon) ||
        undefined,
      comercial: safeText(lead.comercial) || undefined,
      ofertas: Array.isArray(lead.ofertas)
        ? (lead.ofertas as unknown[])
        : undefined,
      ofertaResumen: getOfertaResumen(lead),
      fotos: Array.isArray(lead.fotos) ? (lead.fotos as unknown[]) : undefined,
      fotosVisitas:
        visitasResumen && visitasResumen.media.length > 0
          ? visitasResumen.media
          : undefined,
      tieneVisitasRealizadas:
        !!visitasResumen && visitasResumen.realizadas > 0,
      totalVisitasRealizadas: visitasResumen?.realizadas || 0,
    });
  });

  return visitas;
};

const buildInstalacionesNuevas = (
  response: PendientesInstalacionResponse,
  visitasResumenMap: Map<string, VisitaResumenEnriquecido>,
): TrabajoPlanificable[] => {
  const trabajos: TrabajoPlanificable[] = [];

  (response.clientes || []).forEach((cliente) => {
    const numero = safeText(cliente.numero);
    const contactoId = numero || safeText(cliente.id);
    if (!contactoId) return;

    const visitasResumen = [
      numero ? `cliente:${numero}` : "",
      `cliente:${contactoId}`,
    ]
      .filter(Boolean)
      .map((key) => visitasResumenMap.get(key))
      .find(Boolean);

    trabajos.push({
      uid: `instalacion_nueva:cliente:${contactoId}`,
      tipo: "instalacion_nueva",
      contactoTipo: "cliente",
      contactoId,
      contactoNumero: numero || undefined,
      nombre: safeText(cliente.nombre, "Cliente sin nombre"),
      telefono: safeText(cliente.telefono, "Sin teléfono"),
      direccion: safeText(cliente.direccion, "Sin dirección"),
      provincia: safeText(cliente.provincia_montaje) || undefined,
      municipio: safeText(cliente.municipio) || undefined,
      potenciaInversorKw: extractInverterPowerKw(cliente),
      estado: safeText(cliente.estado) || undefined,
      descripcionTrabajo: "Instalación nueva programable",
      fechaReferencia: safeText(cliente.fecha_contacto) || undefined,
      ofertas: Array.isArray(cliente.ofertas)
        ? (cliente.ofertas as unknown[])
        : undefined,
      ofertaResumen: getOfertaResumen(cliente),
      fotos: Array.isArray(cliente.fotos)
        ? (cliente.fotos as unknown[])
        : undefined,
      fotosVisitas:
        visitasResumen && visitasResumen.media.length > 0
          ? visitasResumen.media
          : undefined,
      tieneVisitasRealizadas:
        !!visitasResumen && visitasResumen.realizadas > 0,
      totalVisitasRealizadas: visitasResumen?.realizadas || 0,
    });
  });

  (response.leads || []).forEach((lead) => {
    const contactoId = safeText(lead.id);
    if (!contactoId) return;
    const visitasResumen = visitasResumenMap.get(`lead:${contactoId}`);

    trabajos.push({
      uid: `instalacion_nueva:lead:${contactoId}`,
      tipo: "instalacion_nueva",
      contactoTipo: "lead",
      contactoId,
      nombre: safeText(lead.nombre, "Lead sin nombre"),
      telefono: safeText(lead.telefono, "Sin teléfono"),
      direccion: safeText(lead.direccion, "Sin dirección"),
      provincia: safeText(lead.provincia_montaje) || undefined,
      municipio: safeText(lead.municipio) || undefined,
      potenciaInversorKw: extractInverterPowerKw(lead),
      estado: safeText(lead.estado) || undefined,
      descripcionTrabajo: "Instalación nueva de lead",
      fechaReferencia: safeText(lead.fecha_contacto) || undefined,
      ofertas: Array.isArray(lead.ofertas)
        ? (lead.ofertas as unknown[])
        : undefined,
      ofertaResumen: getOfertaResumen(lead),
      fotos: Array.isArray(lead.fotos) ? (lead.fotos as unknown[]) : undefined,
      fotosVisitas:
        visitasResumen && visitasResumen.media.length > 0
          ? visitasResumen.media
          : undefined,
      tieneVisitasRealizadas:
        !!visitasResumen && visitasResumen.realizadas > 0,
      totalVisitasRealizadas: visitasResumen?.realizadas || 0,
    });
  });

  return trabajos;
};

const buildInstalacionesEnProceso = (
  clientes: Cliente[],
  visitasResumenMap: Map<string, VisitaResumenEnriquecido>,
): TrabajoPlanificable[] =>
  clientes
    .filter((cliente) => safeText(cliente.estado) === "Instalación en Proceso")
    .map((cliente) => {
      const numero = safeText(cliente.numero);
      const contactoId = numero || safeText(cliente.id);
      const visitasResumen = [
        numero ? `cliente:${numero}` : "",
        `cliente:${contactoId}`,
      ]
        .filter(Boolean)
        .map((key) => visitasResumenMap.get(key))
        .find(Boolean);
      return {
        uid: `instalacion_en_proceso:cliente:${contactoId}`,
        tipo: "instalacion_en_proceso" as const,
        contactoTipo: "cliente" as const,
        contactoId,
        contactoNumero: numero || undefined,
        nombre: safeText(cliente.nombre, "Cliente sin nombre"),
        telefono: safeText(cliente.telefono, "Sin teléfono"),
        direccion: safeText(cliente.direccion, "Sin dirección"),
        provincia: safeText(cliente.provincia_montaje) || undefined,
        municipio: safeText(cliente.municipio) || undefined,
        potenciaInversorKw: extractInverterPowerKw(cliente),
        estado: safeText(cliente.estado) || undefined,
        descripcionTrabajo: safeText(cliente.falta_instalacion)
          ? `Instalación en proceso: ${safeText(cliente.falta_instalacion)}`
          : "Instalación en proceso",
        fechaReferencia: safeText(cliente.fecha_contacto) || undefined,
        faltaInstalacion: safeText(cliente.falta_instalacion) || undefined,
        ofertas: Array.isArray(cliente.ofertas)
          ? (cliente.ofertas as unknown[])
          : undefined,
        ofertaResumen: getOfertaResumen(cliente),
        fotos: Array.isArray(cliente.fotos)
          ? (cliente.fotos as unknown[])
          : undefined,
        fotosVisitas:
          visitasResumen && visitasResumen.media.length > 0
            ? visitasResumen.media
            : undefined,
        tieneVisitasRealizadas:
          !!visitasResumen && visitasResumen.realizadas > 0,
        totalVisitasRealizadas: visitasResumen?.realizadas || 0,
      };
    })
    .filter((item) => Boolean(item.contactoId));

const buildAverias = (
  clientes: Cliente[],
  visitasResumenMap: Map<string, VisitaResumenEnriquecido>,
): TrabajoPlanificable[] => {
  const trabajos: TrabajoPlanificable[] = [];

  clientes.forEach((cliente) => {
    const numero = safeText(cliente.numero);
    const contactoId = numero || safeText(cliente.id);
    if (!contactoId) return;

    const visitasResumen = [
      numero ? `cliente:${numero}` : "",
      `cliente:${contactoId}`,
    ]
      .filter(Boolean)
      .map((key) => visitasResumenMap.get(key))
      .find(Boolean);

    const averiasRaw = Array.isArray(cliente.averias) ? cliente.averias : [];
    const averiasPendientes = averiasRaw.filter(isAveriaPendiente);
    averiasPendientes.forEach((averia, index) => {
      const averiaId = safeText(averia.id, String(index + 1));
      trabajos.push({
        uid: `averia:cliente:${contactoId}:${averiaId}`,
        tipo: "averia",
        contactoTipo: "cliente",
        contactoId,
        contactoNumero: numero || undefined,
        nombre: safeText(cliente.nombre, "Cliente sin nombre"),
        telefono: safeText(cliente.telefono, "Sin teléfono"),
        direccion: safeText(cliente.direccion, "Sin dirección"),
        provincia: safeText(cliente.provincia_montaje) || undefined,
        municipio: safeText(cliente.municipio) || undefined,
        potenciaInversorKw: extractInverterPowerKw(cliente),
        estado: safeText(averia.estado) || undefined,
        descripcionTrabajo: safeText(
          averia.descripcion,
          "Atención de avería pendiente",
        ),
        fechaReferencia:
          safeText(averia.fecha_reporte || averia.created_at) || undefined,
        fotos: Array.isArray(cliente.fotos)
          ? (cliente.fotos as unknown[])
          : undefined,
        ofertaResumen: getOfertaResumen(cliente),
        fotosVisitas:
          visitasResumen && visitasResumen.media.length > 0
            ? visitasResumen.media
            : undefined,
        tieneVisitasRealizadas:
          !!visitasResumen && visitasResumen.realizadas > 0,
        totalVisitasRealizadas: visitasResumen?.realizadas || 0,
      });
    });
  });

  return trabajos;
};

const buildEntregasEquipamientoDesdeNuevas = (
  instalacionesNuevas: TrabajoPlanificable[],
): TrabajoPlanificable[] => {
  return instalacionesNuevas.map((instalacion) => ({
    ...instalacion,
    uid: `entrega_equipamiento:${instalacion.contactoTipo}:${instalacion.contactoNumero || instalacion.contactoId}`,
    tipo: "entrega_equipamiento" as const,
    descripcionTrabajo: "Entrega de equipamiento para instalación nueva",
  }));
};

const TYPE_ORDER: Record<TrabajoPlanificable["tipo"], number> = {
  visita: 1,
  entrega_equipamiento: 2,
  instalacion_nueva: 3,
  instalacion_en_proceso: 4,
  averia: 5,
};

export default function PlanificacionDiariaTrabajosPage() {
  const { toast } = useToast();
  const [trabajos, setTrabajos] = useState<TrabajoPlanificable[]>([]);
  const [brigadas, setBrigadas] = useState<BrigadaPlanificacionOption[]>([]);
  const [tecnicos, setTecnicos] = useState<TecnicoPlanificacionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [modo, setModo] = useState<"lista" | "crear">("lista");
  const [planificaciones, setPlanificaciones] = useState<PlanificacionDiaria[]>([]);
  const [planificacionSeleccionada, setPlanificacionSeleccionada] = useState<PlanificacionDiaria | null>(null);
  const [planificacionAEditar, setPlanificacionAEditar] =
    useState<PlanificacionDiaria | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiRequest<PendientesVisitaRawResponse>("/pendientes-visita/"),
        fetchVisitasMetadata(),
        InstalacionesService.getPendientesInstalacion(),
        ClienteService.getClientes({}),
        ClienteService.getClientesConAverias(),
        BrigadaService.getAllBrigadas(),
        TrabajadorService.getAllTrabajadores(),
      ]);

      const [
        visitasResult,
        visitasPendientesMapResult,
        pendientesInstalacionResult,
        clientesResult,
        averiasResult,
        brigadasResult,
        trabajadoresResult,
      ] = results;

      const visitasRaw =
        visitasResult.status === "fulfilled" ? visitasResult.value : {};
      const visitasMetadata =
        visitasPendientesMapResult.status === "fulfilled"
          ? visitasPendientesMapResult.value
          : ({
              pendientes: new Map<string, VisitaPendienteEnriquecida>(),
              resumen: new Map<string, VisitaResumenEnriquecido>(),
            } as VisitasMetadata);
      const pendientesInstalacion =
        pendientesInstalacionResult.status === "fulfilled"
          ? pendientesInstalacionResult.value
          : EMPTY_PENDIENTES;
      const clientes =
        clientesResult.status === "fulfilled"
          ? clientesResult.value.clients
          : [];
      const clientesAverias =
        averiasResult.status === "fulfilled" ? averiasResult.value : [];
      const brigadasRaw =
        brigadasResult.status === "fulfilled" ? brigadasResult.value : [];
      const trabajadoresRaw =
        trabajadoresResult.status === "fulfilled"
          ? trabajadoresResult.value.filter(
              (trabajador) => trabajador.activo !== false,
            )
          : [];
      const clientesEnProceso = clientes.filter(
        (cliente) => safeText(cliente.estado) === "Instalación en Proceso",
      );

      const visitas = buildVisitas(
        visitasRaw,
        visitasMetadata.pendientes,
        visitasMetadata.resumen,
      );
      const instalacionesNuevas = buildInstalacionesNuevas(
        pendientesInstalacion,
        visitasMetadata.resumen,
      );
      const instalacionesEnProceso =
        buildInstalacionesEnProceso(clientesEnProceso, visitasMetadata.resumen);
      const averias = buildAverias(clientesAverias, visitasMetadata.resumen);
      const entregasMateriales =
        buildEntregasEquipamientoDesdeNuevas(instalacionesNuevas);

      const trabajosConsolidados = [
        ...visitas,
        ...entregasMateriales,
        ...instalacionesNuevas,
        ...instalacionesEnProceso,
        ...averias,
      ].sort((a, b) => {
        const byType = TYPE_ORDER[a.tipo] - TYPE_ORDER[b.tipo];
        if (byType !== 0) return byType;
        return a.nombre.localeCompare(b.nombre, "es");
      });

      const brigadasOptions = brigadasRaw
        .map(getBrigadaOption)
        .filter((item): item is BrigadaPlanificacionOption => Boolean(item))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      const tecnicosMap = new Map<string, TecnicoPlanificacionOption>();
      trabajadoresRaw.forEach((trabajador) => {
        const option = getTecnicoOption(trabajador);
        if (!option) return;
        if (!tecnicosMap.has(option.id)) {
          tecnicosMap.set(option.id, option);
        }
      });
      const tecnicosOptions = Array.from(tecnicosMap.values()).sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es"),
      );

      setTrabajos(trabajosConsolidados);
      setBrigadas(brigadasOptions);
      setTecnicos(tecnicosOptions);

      const failedSources = results.filter(
        (result) => result.status === "rejected",
      ).length;
      if (failedSources > 0) {
        toast({
          title: "Datos parciales",
          description: `Se cargó la planificación con ${failedSources} fuente(s) con error.`,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error cargando planificación";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setTrabajos([]);
      setBrigadas([]);
      setTecnicos([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const recargarPlanificaciones = async () => {
    const response = await PlanificacionDiariaService.obtenerTodasPlanificaciones();
    if (response.success && response.data) {
      setPlanificaciones(response.data);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      try {
        if (modo === "lista") {
          // Cargar lista de planificaciones
          const response = await PlanificacionDiariaService.obtenerTodasPlanificaciones();
          if (response.success && response.data) {
            setPlanificaciones(response.data);
          }
        } else {
          // Cargar datos para crear planificación
          await fetchData();
        }
      } finally {
        setInitialLoading(false);
      }
    };

    void loadInitialData();
  }, [modo]);

  if (initialLoading) {
    return (
      <PageLoader
        moduleName="Planificación Diaria de Trabajos"
        text="Cargando datos de planificación..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <ModuleHeader
        title="Planificación Diaria de Trabajos"
        subtitle="Planifica las instalaciones y trabajos del día siguiente por brigadas"
        backHref="/instalaciones"
        backLabel="Volver a Operaciones"
        badge={{
          text: "Operaciones",
          className: "bg-purple-100 text-purple-800",
        }}
      />

      <main className="content-with-fixed-header max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8 space-y-6">
        {modo === "lista" ? (
          <ListaPlanificacionesTable
            planificaciones={planificaciones}
            loading={initialLoading}
            onVerPlanificacion={(planificacion) => {
              setPlanificacionSeleccionada(planificacion);
            }}
            onEditarPlanificacion={(planificacion) => {
              setPlanificacionAEditar(planificacion);
              setModo("crear");
            }}
            onCrearNueva={() => {
              setPlanificacionAEditar(null);
              setModo("crear");
            }}
            onRecargar={recargarPlanificaciones}
          />
        ) : (
          <PlanificacionDiariaTrabajosTable
            trabajos={trabajos}
            brigadas={brigadas}
            tecnicos={tecnicos}
            loading={loading}
            initialPlanificacion={planificacionAEditar}
            onGuardadoExitoso={async () => {
              // Recargar lista y volver al modo lista
              const response = await PlanificacionDiariaService.obtenerTodasPlanificaciones();
              if (response.success && response.data) {
                setPlanificaciones(response.data);
              }
              setPlanificacionAEditar(null);
              setModo("lista");
            }}
            onCancelar={() => {
              setPlanificacionAEditar(null);
              setModo("lista");
            }}
          />
        )}
      </main>

      <VerPlanificacionDialog
        open={!!planificacionSeleccionada}
        onOpenChange={(open) => {
          if (!open) setPlanificacionSeleccionada(null);
        }}
        planificacion={planificacionSeleccionada}
        onActualizar={async () => {
          // Recargar la planificación actualizada
          if (planificacionSeleccionada?.id) {
            const response = await PlanificacionDiariaService.obtenerPlanificacionDiaria(
              planificacionSeleccionada.id
            );
            if (response.success && response.data) {
              setPlanificacionSeleccionada(response.data);
              // También actualizar la lista
              const listResponse = await PlanificacionDiariaService.obtenerTodasPlanificaciones();
              if (listResponse.success && listResponse.data) {
                setPlanificaciones(listResponse.data);
              }
            }
          }
        }}
      />

      <Toaster />
    </div>
  );
}
