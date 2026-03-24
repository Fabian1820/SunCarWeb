import { apiRequest } from "@/lib/api-config";
import type { TrabajoDiarioVale } from "./instalaciones-service";
import type {
  TrabajoDiarioFiltro,
  TrabajoDiarioMaterialResumen,
  TrabajoDiarioRegistro,
} from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
import { createEmptyTrabajoDiario } from "@/lib/types/feats/instalaciones/trabajos-diarios-types";

const BASE_ENDPOINT = "/trabajos-diarios";
const SEARCH_ENDPOINT = `${BASE_ENDPOINT}/buscar`;

const VALID_TIPOS_TRABAJO = new Set([
  "AVERIA",
  "INSTALACION NUEVA",
  "INSTALACION EN PROCESO",
]);

const asString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
};

const asBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  return undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const pickFirstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return undefined;
};

const normalizeInstaladoresInput = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => normalizeInstaladoresInput(entry))
      .filter(Boolean);
  }
  const text = asString(value);
  if (!text) return [];
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildInstaladoresFilter = (filters: TrabajoDiarioFiltro): string[] => {
  const raw = [
    ...normalizeInstaladoresInput(filters.instaladores),
    ...normalizeInstaladoresInput(filters.instalador),
    ...normalizeInstaladoresInput(filters.trabajador),
  ];
  return Array.from(new Set(raw));
};

const normalizeDateOnly = (value: unknown): string => {
  const text = asString(value);
  if (!text) return "";
  return text.slice(0, 10);
};

const normalizeMomentDate = (value: unknown, fallbackFecha: string): string => {
  const text = asString(value);
  if (text) return text;
  return fallbackFecha ? `${fallbackFecha}T00:00:00` : "";
};

const toArray = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw;

  if (raw && typeof raw === "object") {
    const rawObj = raw as Record<string, unknown>;
    const data = rawObj.data;

    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      const dataObj = data as Record<string, unknown>;
      if (Array.isArray(dataObj.data)) return dataObj.data;
      if (Array.isArray(dataObj.trabajos)) return dataObj.trabajos;
      if (Array.isArray(dataObj.vales)) return dataObj.vales;
    }

    if (Array.isArray(rawObj.trabajos)) return rawObj.trabajos;
    if (Array.isArray(rawObj.vales)) return rawObj.vales;
    if (Array.isArray(rawObj.resultados)) return rawObj.resultados;
    if (Array.isArray(rawObj.items)) return rawObj.items;
  }

  return [];
};

const mapFromVale = (row: TrabajoDiarioVale): TrabajoDiarioRegistro => ({
  ...createEmptyTrabajoDiario(),
  id: row.vale_id || "",
  fecha: normalizeDateOnly(row.fecha_recogida || ""),
  fecha_trabajo: normalizeDateOnly(row.fecha_recogida || ""),
  vale_id: row.vale_id,
  id_vale_salida: row.vale_id,
  vale_codigo: row.vale_codigo,
  solicitud_id: row.solicitud_id,
  id_solicitud_materiales: row.solicitud_id,
  solicitud_codigo: row.solicitud_codigo,
  fecha_recogida: row.fecha_recogida,
  responsable_recogida: row.responsable_recogida,
  responsable_solicitud_materiales: row.responsable_recogida,
  cliente_id: row.cliente_id,
  cliente_numero: row.cliente_numero,
  cliente_nombre: row.cliente_nombre,
  cliente_telefono: row.cliente_telefono,
  cliente_direccion: row.cliente_direccion,
  instaladores: row.responsable_recogida ? [row.responsable_recogida] : [],
  materiales_utilizados: (row.items || []).map((item) => ({
    id_material: item.material_id,
    codigo_material: item.material_codigo || "",
    nombre: item.material_descripcion || item.material_codigo || "Material",
    cantidad_utilizada: Number(item.cantidad || 0),
  })),
});

const normalizeArchivos = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const file = raw as Record<string, unknown>;
      const tipoRaw = pickFirstString(file.tipo, file.mime_type) || "imagen";
      const tipo =
        tipoRaw === "video" || String(tipoRaw).startsWith("video/")
          ? "video"
          : tipoRaw === "audio" || String(tipoRaw).startsWith("audio/")
            ? "audio"
            : "imagen";
      const url = pickFirstString(file.url);
      if (!url) return null;
      return {
        id:
          pickFirstString(file.id, file._id) ||
          `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url,
        tipo,
        nombre: pickFirstString(file.nombre) || "archivo",
        tamano: asNumber(file.tamano) || 0,
        mime_type: pickFirstString(file.mime_type) || "",
        created_at: pickFirstString(file.created_at, file.fecha) || "",
      };
    })
    .filter(Boolean);
};

const normalizeMateriales = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const material = raw as Record<string, unknown>;
      const idMaterial = pickFirstString(
        material.id_material,
        material.id,
        material.codigo_material,
      );
      if (!idMaterial) return null;
      return {
        id_material: idMaterial,
        codigo_material:
          pickFirstString(material.codigo_material) || idMaterial,
        nombre: pickFirstString(material.nombre) || "Material",
        cantidad_utilizada: asNumber(material.cantidad_utilizada) || 0,
        en_servicio: asBoolean(material.en_servicio),
        cantidad_en_servicio: asNumber(material.cantidad_en_servicio),
      };
    })
    .filter(Boolean);
};

const normalizeTrabajo = (item: unknown): TrabajoDiarioRegistro | null => {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;

  if (
    typeof row.vale_id === "string" &&
    typeof row.solicitud_id === "string" &&
    !row.inicio &&
    !row.fin
  ) {
    return mapFromVale(row as unknown as TrabajoDiarioVale);
  }

  const base = createEmptyTrabajoDiario();
  const id = pickFirstString(
    row.id,
    row._id,
    row.trabajo_diario_id,
    row.trabajo_id,
    row.vale_id,
  );
  const fecha = normalizeDateOnly(
    pickFirstString(row.fecha, row.fecha_trabajo, row.fecha_recogida),
  );
  const tipoTrabajoRaw = pickFirstString(row.tipo_trabajo);
  const tipoTrabajo =
    tipoTrabajoRaw && VALID_TIPOS_TRABAJO.has(tipoTrabajoRaw)
      ? tipoTrabajoRaw
      : undefined;
  const instaladores = Array.isArray(row.instaladores)
    ? row.instaladores
        .map((entry) => asString(entry))
        .filter((entry): entry is string => Boolean(entry))
    : [];

  const inicioRaw =
    row.inicio && typeof row.inicio === "object"
      ? (row.inicio as Record<string, unknown>)
      : {};
  const finRaw =
    row.fin && typeof row.fin === "object"
      ? (row.fin as Record<string, unknown>)
      : {};

  const normalized: TrabajoDiarioRegistro = {
    ...base,
    id: id || undefined,
    fecha,
    fecha_trabajo: fecha,
    vale_id: pickFirstString(row.vale_id, row.id_vale_salida),
    id_vale_salida: pickFirstString(row.id_vale_salida, row.vale_id),
    vale_codigo: pickFirstString(row.vale_codigo),
    solicitud_id: pickFirstString(
      row.solicitud_id,
      row.id_solicitud_materiales,
    ),
    id_solicitud_materiales: pickFirstString(
      row.id_solicitud_materiales,
      row.solicitud_id,
    ),
    solicitud_codigo: pickFirstString(row.solicitud_codigo),
    fecha_recogida: pickFirstString(row.fecha_recogida) || null,
    responsable_recogida:
      pickFirstString(
        row.responsable_recogida,
        row.responsable_solicitud_materiales,
      ) || null,
    responsable_solicitud_materiales:
      pickFirstString(
        row.responsable_solicitud_materiales,
        row.responsable_recogida,
      ) || null,
    cliente_id: pickFirstString(row.cliente_id) || null,
    cliente_numero: pickFirstString(row.cliente_numero) || null,
    cliente_nombre: pickFirstString(row.cliente_nombre) || null,
    cliente_telefono: pickFirstString(row.cliente_telefono) || null,
    cliente_direccion: pickFirstString(row.cliente_direccion) || null,
    instaladores,
    brigadistas: Array.isArray(row.brigadistas)
      ? (row.brigadistas as Array<Record<string, unknown>>)
          .map((b) => {
            const ci = pickFirstString(b.ci, b.CI);
            if (!ci) return null;
            return { ci, nombre: pickFirstString(b.nombre) };
          })
          .filter(Boolean)
      : [],
    tipo_trabajo: tipoTrabajo as TrabajoDiarioRegistro["tipo_trabajo"],
    problema_encontrado: pickFirstString(row.problema_encontrado),
    solucion: pickFirstString(row.solucion),
    instalacion_terminada: asBoolean(row.instalacion_terminada),
    queda_pendiente: pickFirstString(row.queda_pendiente),
    cierre_diario_confirmado: asBoolean(row.cierre_diario_confirmado),
    cierre_diario_usuario_ci:
      pickFirstString(row.cierre_diario_usuario_ci) || null,
    cierre_diario_usuario_nombre:
      pickFirstString(row.cierre_diario_usuario_nombre) || null,
    created_at: pickFirstString(row.created_at),
    updated_at: pickFirstString(row.updated_at),
    inicio: {
      archivos: normalizeArchivos(inicioRaw.archivos),
      comentario: pickFirstString(inicioRaw.comentario) || "",
      fecha: normalizeMomentDate(inicioRaw.fecha, fecha),
    },
    fin: {
      archivos: normalizeArchivos(finRaw.archivos),
      comentario: pickFirstString(finRaw.comentario) || "",
      fecha: normalizeMomentDate(finRaw.fecha, fecha),
    },
    materiales_utilizados: normalizeMateriales(row.materiales_utilizados),
  };

  if (normalized.instaladores.length === 0 && normalized.responsable_recogida) {
    normalized.instaladores = [normalized.responsable_recogida];
  }

  normalized.inicio = {
    ...base.inicio,
    ...normalized.inicio,
  };
  normalized.fin = {
    ...base.fin,
    ...normalized.fin,
  };
  normalized.materiales_utilizados = normalized.materiales_utilizados || [];

  return normalized;
};

const looksLikeTrabajoDiario = (item: unknown): boolean => {
  if (!item || typeof item !== "object") return false;
  const row = item as Record<string, unknown>;

  return Boolean(
    row.inicio ||
      row.fin ||
      row.fecha ||
      row.fecha_trabajo ||
      row.tipo_trabajo ||
      row.cliente_numero ||
      row.id_vale_salida ||
      row.vale_id ||
      row.trabajo_diario_id ||
      row.id ||
      row._id,
  );
};

const serializeArchivos = (
  value: TrabajoDiarioRegistro["inicio"]["archivos"] | undefined,
) => {
  if (!Array.isArray(value)) return [];
  return value.map((file) => ({
    id: file.id,
    url: file.url,
    tipo: file.tipo,
    nombre: file.nombre,
    tamano: file.tamano,
    mime_type: file.mime_type,
    created_at: file.created_at,
  }));
};

const serializeMomento = (
  value: TrabajoDiarioRegistro["inicio"] | undefined,
  fallbackDate: string,
) => ({
  archivos: serializeArchivos(value?.archivos),
  comentario: value?.comentario || "",
  fecha: normalizeMomentDate(value?.fecha, fallbackDate),
});

const serializeTrabajoPayload = (
  payload: Partial<TrabajoDiarioRegistro>,
): Record<string, unknown> => {
  const fecha = normalizeDateOnly(payload.fecha_trabajo || payload.fecha);
  const instaladoresRaw = Array.isArray(payload.instaladores)
    ? payload.instaladores
    : [];
  const brigadistasRaw = Array.isArray(payload.brigadistas)
    ? payload.brigadistas
    : [];
  const instaladores = [
    ...instaladoresRaw
      .map((entry) => asString(entry))
      .filter((entry): entry is string => Boolean(entry)),
    ...brigadistasRaw
      .map((entry) => pickFirstString(entry.nombre, entry.ci))
      .filter((entry): entry is string => Boolean(entry)),
  ];
  if (instaladores.length === 0) {
    const responsable = pickFirstString(
      payload.responsable_recogida,
      payload.responsable_solicitud_materiales,
    );
    if (responsable) instaladores.push(responsable);
  }

  const materiales = Array.isArray(payload.materiales_utilizados)
    ? payload.materiales_utilizados.map((material) => {
        const serialized: Record<string, unknown> = {
          id_material: material.id_material,
          nombre: material.nombre,
          cantidad_utilizada: material.cantidad_utilizada,
        };
        if (material.codigo_material) {
          serialized.codigo_material = material.codigo_material;
        }
        if (typeof material.en_servicio === "boolean") {
          serialized.en_servicio = material.en_servicio;
        }
        if (typeof material.cantidad_en_servicio === "number") {
          serialized.cantidad_en_servicio = material.cantidad_en_servicio;
        }
        return serialized;
      })
    : [];

  const body: Record<string, unknown> = {
    inicio: serializeMomento(payload.inicio, fecha),
    fin: serializeMomento(payload.fin, fecha),
  };

  const clienteNumero = pickFirstString(payload.cliente_numero);
  if (clienteNumero) body.cliente_numero = clienteNumero;
  if (fecha) body.fecha = fecha;
  if (instaladores.length > 0)
    body.instaladores = Array.from(new Set(instaladores));
  if (payload.tipo_trabajo) body.tipo_trabajo = payload.tipo_trabajo;

  if (payload.tipo_trabajo === "AVERIA") {
    if (payload.problema_encontrado) {
      body.problema_encontrado = payload.problema_encontrado;
    }
    if (payload.solucion) {
      body.solucion = payload.solucion;
    }
  } else if (
    payload.tipo_trabajo === "INSTALACION NUEVA" ||
    payload.tipo_trabajo === "INSTALACION EN PROCESO"
  ) {
    if (typeof payload.instalacion_terminada === "boolean") {
      body.instalacion_terminada = payload.instalacion_terminada;
    }
    if (payload.instalacion_terminada === false && payload.queda_pendiente) {
      body.queda_pendiente = payload.queda_pendiente;
    }
  }

  const idValeSalida = pickFirstString(payload.id_vale_salida, payload.vale_id);
  if (idValeSalida) body.id_vale_salida = idValeSalida;

  const idSolicitud = pickFirstString(
    payload.id_solicitud_materiales,
    payload.solicitud_id,
  );
  if (idSolicitud) body.id_solicitud_materiales = idSolicitud;

  const responsableSolicitud = pickFirstString(
    payload.responsable_solicitud_materiales,
    payload.responsable_recogida,
  );
  if (responsableSolicitud) {
    body.responsable_solicitud_materiales = responsableSolicitud;
  }
  if (typeof payload.cierre_diario_confirmado === "boolean") {
    body.cierre_diario_confirmado = payload.cierre_diario_confirmado;
  }

  body.materiales_utilizados = materiales;
  return body;
};

const extractResponseError = (raw: unknown): string | null => {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const success = row.success;
  const httpStatus = asNumber(row._httpStatus);
  if (success !== false && (!httpStatus || httpStatus < 400)) {
    return null;
  }
  return (
    pickFirstString(
      row.detail,
      row.message,
      (row.error as Record<string, unknown> | undefined)?.message,
    ) || "Error en la operación de trabajo diario"
  );
};

const normalizeMaterialResumen = (
  item: unknown,
): TrabajoDiarioMaterialResumen | null => {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const materialId = pickFirstString(row.material_id, row.id_material, row.id);
  if (!materialId) return null;
  const codigoMaterialRaw = pickFirstString(
    row.codigo_material,
    row.material_codigo,
    row.codigo,
    row.materialCode,
    row.codigoMaterial,
  );
  const codigoMaterial = codigoMaterialRaw
    ? String(codigoMaterialRaw).trim()
    : undefined;
  return {
    material_id: materialId,
    codigo_material: codigoMaterial || undefined,
    nombre: pickFirstString(row.nombre) || "Material",
    cantidad_total_vales: asNumber(row.cantidad_total_vales) || 0,
    cantidad_usada_hasta_ayer: asNumber(row.cantidad_usada_hasta_ayer) || 0,
    cantidad_usada_hoy: asNumber(row.cantidad_usada_hoy) || 0,
    disponible_hoy: asNumber(row.disponible_hoy) || 0,
    saldo_despues_de_hoy: asNumber(row.saldo_despues_de_hoy) || 0,
  };
};

const extractMaterialesResumenArray = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];

  const root = raw as Record<string, unknown>;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;

  const candidates: unknown[] = [
    root.data,
    root.items,
    root.resultados,
    root.materiales,
    root.materiales_resumen,
    data?.data,
    data?.items,
    data?.resultados,
    data?.materiales,
    data?.materiales_resumen,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

const isNotFoundError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("no encontrado")
  );
};

export class TrabajosDiariosService {
  static async getTrabajos(
    filters: TrabajoDiarioFiltro = {},
  ): Promise<TrabajoDiarioRegistro[]> {
    const fecha = (filters.fecha || "").trim();
    if (!fecha) return [];

    const query = new URLSearchParams();
    query.append("fecha", fecha);
    const instaladores = buildInstaladoresFilter(filters);
    instaladores.forEach((instalador) =>
      query.append("instalador", instalador),
    );
    const clienteNumero = asString(filters.cliente_numero);
    const clienteId = asString(filters.cliente_id);
    const qCliente = asString(filters.q_cliente);
    if (clienteNumero) query.append("cliente_numero", clienteNumero);
    if (clienteId) query.append("cliente_id", clienteId);
    if (qCliente) query.append("q_cliente", qCliente);
    if (filters.skip != null) query.append("skip", String(filters.skip));
    if (filters.limit != null) query.append("limit", String(filters.limit));

    const endpoint = `${SEARCH_ENDPOINT}?${query.toString()}`;

    const raw = await apiRequest<unknown>(endpoint, { method: "GET" });
    const rows = toArray(raw);
    if (rows.length === 0) {
      if (raw && typeof raw === "object") {
        const rawObj = raw as Record<string, unknown>;
        if (
          "success" in rawObj ||
          "message" in rawObj ||
          "error" in rawObj ||
          "data" in rawObj
        ) {
          return [];
        }
      }
      if (!looksLikeTrabajoDiario(raw)) return [];
      const parsed = normalizeTrabajo(raw);
      return parsed ? [parsed] : [];
    }
    return rows
      .map(normalizeTrabajo)
      .filter(Boolean) as TrabajoDiarioRegistro[];
  }

  static async getTrabajoById(id: string): Promise<TrabajoDiarioRegistro> {
    const trabajoId = asString(id);
    if (!trabajoId) {
      throw new Error("ID de trabajo diario inválido");
    }

    const raw = await apiRequest<unknown>(
      `${BASE_ENDPOINT}/${encodeURIComponent(trabajoId)}`,
      {
        method: "GET",
      },
    );
    const errorMessage = extractResponseError(raw);
    if (errorMessage) {
      throw new Error(errorMessage);
    }

    const rows = toArray(raw);
    if (rows.length > 0) {
      const first = normalizeTrabajo(rows[0]);
      if (first) return first;
    }

    const parsed = normalizeTrabajo(raw);
    if (parsed) return parsed;

    throw new Error("No se pudo interpretar el detalle del trabajo diario");
  }

  static async getMaterialesResumen(
    trabajoId: string,
  ): Promise<TrabajoDiarioMaterialResumen[]> {
    const id = asString(trabajoId);
    if (!id) return [];

    const idEncoded = encodeURIComponent(id);
    const endpoints = [
      `${BASE_ENDPOINT}/${idEncoded}/materiales-resumen`,
      `${BASE_ENDPOINT}/${idEncoded}/materiales_resumen`,
      `${BASE_ENDPOINT}/${idEncoded}/resumen-materiales`,
      `/operaciones/trabajos-diarios/${idEncoded}/materiales-resumen`,
      `/operaciones/trabajos-diarios/${idEncoded}/materiales_resumen`,
      `/operaciones/trabajos-diarios/${idEncoded}/resumen-materiales`,
    ];

    let lastError: unknown = null;

    for (const endpoint of endpoints) {
      try {
        const raw = await apiRequest<unknown>(endpoint, { method: "GET" });
        const errorMessage = extractResponseError(raw);
        if (errorMessage) {
          throw new Error(errorMessage);
        }
        const rows = extractMaterialesResumenArray(raw);
        return rows
          .map(normalizeMaterialResumen)
          .filter(Boolean) as TrabajoDiarioMaterialResumen[];
      } catch (error) {
        lastError = error;
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }

    if (lastError) {
      throw lastError instanceof Error
        ? lastError
        : new Error("No se pudo cargar el resumen de materiales");
    }
    return [];
  }

  static async createTrabajo(
    payload: TrabajoDiarioRegistro,
  ): Promise<TrabajoDiarioRegistro> {
    const body = serializeTrabajoPayload(payload);
    const raw = await apiRequest<unknown>(`${BASE_ENDPOINT}/`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const rows = toArray(raw);
    if (rows.length > 0) {
      const first = normalizeTrabajo(rows[0]);
      if (first) return first;
    }
    const parsed = normalizeTrabajo(raw);
    if (parsed) return parsed;

    if (raw && typeof raw === "object") {
      const rawObj = raw as Record<string, unknown>;
      const createdId = pickFirstString(
        rawObj.trabajo_diario_id,
        rawObj.id,
        rawObj._id,
      );
      if (createdId) {
        return {
          ...payload,
          id: createdId,
          fecha: normalizeDateOnly(payload.fecha_trabajo || payload.fecha),
          fecha_trabajo: normalizeDateOnly(
            payload.fecha_trabajo || payload.fecha,
          ),
        };
      }
    }
    return payload;
  }

  static async updateTrabajo(
    trabajoId: string,
    payload: Partial<TrabajoDiarioRegistro>,
  ): Promise<TrabajoDiarioRegistro> {
    const body = serializeTrabajoPayload(payload);
    const raw = await apiRequest<unknown>(
      `${BASE_ENDPOINT}/${encodeURIComponent(trabajoId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    const errorMessage = extractResponseError(raw);
    if (errorMessage) {
      throw new Error(errorMessage);
    }
    const parsed = normalizeTrabajo(raw);
    if (parsed) return parsed;
    return {
      ...createEmptyTrabajoDiario(),
      ...payload,
      id: trabajoId,
      fecha: normalizeDateOnly(payload.fecha_trabajo || payload.fecha),
      fecha_trabajo: normalizeDateOnly(payload.fecha_trabajo || payload.fecha),
    } as TrabajoDiarioRegistro;
  }
}
