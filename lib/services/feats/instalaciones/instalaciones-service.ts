import { apiRequest } from "@/lib/api-config";
import {
  extractContactoEntregaKeysFromResumen,
  extractOfertaId,
  normalizeOfertaId,
} from "@/lib/utils/oferta-id";

// Tipos para el endpoint de pendientes de instalación
export interface OfertaInstalacion {
  inversor_codigo: string | null;
  inversor_cantidad: number;
  inversor_nombre: string | null;
  bateria_codigo: string | null;
  bateria_cantidad: number;
  bateria_nombre: string | null;
  panel_codigo: string | null;
  panel_cantidad: number;
  panel_nombre: string | null;
  costo_oferta: number;
  costo_extra: number;
  costo_transporte: number;
  aprobada: boolean;
  pagada: boolean;
  elementos_personalizados: string | null;
  razon_costo_extra: string | null;
}

export interface LeadPendienteInstalacion {
  id: string;
  fecha_contacto: string;
  nombre: string;
  telefono: string;
  telefono_adicional: string | null;
  estado: string;
  fuente: string | null;
  referencia: string | null;
  direccion: string | null;
  pais_contacto: string | null;
  comentario: string | null;
  provincia_montaje: string | null;
  municipio: string | null;
  comercial: string | null;
  ofertas: OfertaInstalacion[];
  comprobante_pago_url: string | null;
  metodo_pago: string | null;
  moneda: string | null;
}

export interface ClientePendienteInstalacion {
  id: string;
  numero: string;
  nombre: string;
  telefono: string | null;
  telefono_adicional: string | null;
  direccion: string;
  fecha_contacto: string | null;
  estado: string | null;
  falta_instalacion: string | null;
  fuente: string | null;
  referencia: string | null;
  pais_contacto: string | null;
  comentario: string | null;
  provincia_montaje: string | null;
  municipio: string | null;
  comercial: string | null;
  ofertas: OfertaInstalacion[];
  latitud: string | null;
  longitud: string | null;
  carnet_identidad: string | null;
  fecha_instalacion: string | null;
  fecha_montaje: string | null;
  comprobante_pago_url: string | null;
  metodo_pago: string | null;
  moneda: string | null;
}

export interface PendientesInstalacionResponse {
  leads: LeadPendienteInstalacion[];
  clientes: ClientePendienteInstalacion[];
  total_leads: number;
  total_clientes: number;
  total_general: number;
}

export interface OfertasMaterialesEntregadosFiltros {
  ids_con_materiales_pendientes?: Array<string | number>;
  por_estado?: Record<string, number>;
  por_tipo_oferta?: Record<string, number>;
  por_tipo_contacto?: Record<string, number>;
}

export interface OfertaMaterialesEntregadosResumen {
  id?: string | number;
  _id?: string | number;
  oferta_id?: string | number;
  numero_oferta?: string | number;
  [key: string]: unknown;
}

export interface OfertasMaterialesEntregadosIndex {
  ofertaIds: Set<string>;
  idsConMaterialesPendientes: Set<string>;
  contactoKeysConEntregas: Set<string>;
  filtros: OfertasMaterialesEntregadosFiltros | null;
  ofertas: OfertaMaterialesEntregadosResumen[];
  sourceEndpoint: string | null;
}

export interface ResumenEquiposEnServicioCliente {
  numero_cliente: string;
  oferta_id: string | null;
  numero_oferta: string | null;
  inversores_en_servicio: number;
  paneles_en_servicio: number;
  baterias_en_servicio: number;
  tiene_alguno_en_servicio: boolean;
}

export interface TrabajoDiarioItem {
  material_id: string;
  material_codigo?: string | null;
  material_descripcion?: string | null;
  um?: string | null;
  cantidad: number;
}

export interface TrabajoDiarioVale {
  vale_id: string;
  vale_codigo: string;
  vale_estado: string;
  fecha_creacion?: string | null;
  solicitud_id: string;
  solicitud_codigo: string;
  fecha_recogida?: string | null;
  responsable_recogida?: string | null;
  almacen?: {
    id?: string | null;
    nombre?: string | null;
    codigo?: string | null;
  } | null;
  cliente_id?: string | null;
  cliente_numero?: string | null;
  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  cliente_direccion?: string | null;
  cliente_provincia_montaje?: string | null;
  items: TrabajoDiarioItem[];
}

const parseArrayToIdSet = (values: unknown): Set<string> => {
  const ids = new Set<string>();
  if (!Array.isArray(values)) return ids;

  values.forEach((value) => {
    const normalized = normalizeOfertaId(value);
    if (normalized) ids.add(normalized);
  });
  return ids;
};

const ENDPOINTS_MATERIALES_ENTREGADOS_DEFAULT = [
  "/ofertas/confeccion/materiales-entregados/ids",
  "/ofertas/confeccion/materiales-entregados/ids/",
  "/ofertas/confeccion/materiales-entregados",
  "/ofertas/confeccion/materiales-entregados/resumen",
  "/ofertas/confeccion/materiales-entregados/index",
  "/ofertas/confeccion/ofertas-con-materiales-entregados",
];

const parsePositiveInt = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
};

const buildResumenServicioDefault = (
  numeroCliente: string,
): ResumenEquiposEnServicioCliente => ({
  numero_cliente: numeroCliente,
  oferta_id: null,
  numero_oferta: null,
  inversores_en_servicio: 0,
  paneles_en_servicio: 0,
  baterias_en_servicio: 0,
  tiene_alguno_en_servicio: false,
});

export const InstalacionesService = {
  async getTrabajosDiarios(fecha: string): Promise<TrabajoDiarioVale[]> {
    const fechaNormalizada = String(fecha || "").trim();
    if (!fechaNormalizada) return [];

    const response = await apiRequest<unknown>(
      `/operaciones/trabajos-diarios?fecha=${encodeURIComponent(fechaNormalizada)}`,
      { method: "GET" },
    );

    if (Array.isArray(response)) {
      return response as TrabajoDiarioVale[];
    }

    const responseObj =
      response && typeof response === "object"
        ? (response as Record<string, unknown>)
        : null;

    const payload = responseObj?.data ?? responseObj;
    if (Array.isArray(payload)) {
      return payload as TrabajoDiarioVale[];
    }

    const payloadObj =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : null;

    if (Array.isArray(payloadObj?.vales)) {
      return payloadObj.vales as TrabajoDiarioVale[];
    }

    if (Array.isArray(payloadObj?.data)) {
      return payloadObj.data as TrabajoDiarioVale[];
    }

    return [];
  },

  async getEntregasSinInstalar(fecha: string): Promise<TrabajoDiarioVale[]> {
    const fechaNormalizada = String(fecha || "").trim();
    if (!fechaNormalizada) return [];

    const endpoints = [
      `/entregas-materiales/sin-salida-brigada?fecha=${encodeURIComponent(fechaNormalizada)}`,
      // fallback por compatibilidad temporal
      `/entregas-materiales/sin-salida-brigada/?fecha=${encodeURIComponent(fechaNormalizada)}`,
      `/entregas-materiales/pendientes-salida?fecha=${encodeURIComponent(fechaNormalizada)}`,
      `/entregas-materiales/pendientes-salida/?fecha=${encodeURIComponent(fechaNormalizada)}`,
      `/entregas-materiales?fecha=${encodeURIComponent(fechaNormalizada)}&salida_brigada=false`,
      `/entregas-materiales?salida_brigada=false&fecha=${encodeURIComponent(fechaNormalizada)}`,
      `/operaciones/entregas-materiales/sin-salida-brigada?fecha=${encodeURIComponent(fechaNormalizada)}`,
      `/operaciones/entregas-materiales/pendientes-salida?fecha=${encodeURIComponent(fechaNormalizada)}`,
      `/operaciones/trabajos-diarios/entregas-sin-instalar?fecha=${encodeURIComponent(fechaNormalizada)}`,
      `/operaciones/trabajos-diarios/entregas-sin-instalar/?fecha=${encodeURIComponent(fechaNormalizada)}`,
    ];

    const toArray = (response: unknown): unknown[] => {
      if (Array.isArray(response)) return response;
      const responseObj =
        response && typeof response === "object"
          ? (response as Record<string, unknown>)
          : null;
      const payload = responseObj?.data ?? responseObj;
      if (Array.isArray(payload)) return payload;
      const payloadObj =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : null;
      if (Array.isArray(payloadObj?.entregas)) return payloadObj.entregas;
      if (Array.isArray(payloadObj?.items)) return payloadObj.items;
      if (Array.isArray(payloadObj?.data)) return payloadObj.data;
      if (
        payloadObj?.data &&
        typeof payloadObj.data === "object" &&
        !Array.isArray(payloadObj.data)
      ) {
        const deep = payloadObj.data as Record<string, unknown>;
        if (Array.isArray(deep.entregas)) return deep.entregas;
        if (Array.isArray(deep.items)) return deep.items;
        if (Array.isArray(deep.data)) return deep.data;
      }
      return [];
    };

    const asString = (value: unknown) => {
      if (typeof value === "string") return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
      return "";
    };
    const asNumber = (value: unknown) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const mapEntregaToVale = (raw: unknown): TrabajoDiarioVale | null => {
      if (!raw || typeof raw !== "object") return null;
      const row = raw as Record<string, unknown>;
      const itemRows = Array.isArray(row.items)
        ? row.items
        : Array.isArray(row.materiales)
          ? row.materiales
          : [];
      const items = itemRows
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const mat = item as Record<string, unknown>;
          const materialId = asString(
            mat.material_id ?? mat.id_material ?? mat.id ?? mat.material_codigo,
          );
          if (!materialId) return null;
          return {
            material_id: materialId,
            material_codigo: asString(
              mat.material_codigo ?? mat.codigo_material ?? mat.codigo,
            ),
            material_descripcion: asString(
              mat.material_descripcion ?? mat.descripcion ?? mat.nombre,
            ),
            um: asString(mat.um),
            cantidad: asNumber(
              mat.cantidad ??
                mat.cantidad_entregada ??
                mat.cantidad_utilizada ??
                mat.cantidad_en_servicio,
            ),
          };
        })
        .filter(Boolean) as TrabajoDiarioItem[];

      const valeId = asString(
        row.id_vale_salida ??
          row.vale_id ??
          row.id_vale ??
          row.vale?.id ??
          row.vale_salida_id ??
          row.id_valeSalida,
      );
      if (!valeId) return null;

      return {
        vale_id: valeId,
        vale_codigo: asString(
          row.vale_codigo ?? row.codigo_vale ?? row.vale?.codigo ?? valeId,
        ),
        vale_estado: asString(row.vale_estado ?? row.estado ?? "entregado"),
        fecha_creacion: asString(row.created_at ?? row.fecha_creacion) || null,
        solicitud_id: asString(
          row.id_solicitud_materiales ?? row.solicitud_id ?? row.id_solicitud,
        ),
        solicitud_codigo: asString(
          row.solicitud_codigo ?? row.codigo_solicitud ?? row.id_solicitud_materiales,
        ),
        fecha_recogida: asString(row.fecha ?? row.fecha_recogida) || null,
        responsable_recogida: asString(
          row.responsable_solicitud_materiales ??
            row.responsable_recogida ??
            row.usuario_nombre,
        ),
        cliente_id: asString(row.cliente_id) || null,
        cliente_numero: asString(row.cliente_numero) || null,
        cliente_nombre: asString(row.cliente_nombre) || null,
        cliente_telefono: asString(row.cliente_telefono) || null,
        cliente_direccion: asString(row.cliente_direccion) || null,
        items,
      };
    };

    let hasAnyRows = false;
    let lastError: unknown = null;
    for (const endpoint of endpoints) {
      try {
        const response = await apiRequest<unknown>(endpoint, { method: "GET" });
        if (response && typeof response === "object") {
          const responseObj = response as Record<string, unknown>;
          if (responseObj.success === false || responseObj.error) {
            const message =
              (typeof responseObj.message === "string" && responseObj.message) ||
              (typeof responseObj.detail === "string" && responseObj.detail) ||
              "No se pudieron cargar entregas sin instalar";
            throw new Error(message);
          }
        }
        const rows = toArray(response);
        if (rows.length > 0) hasAnyRows = true;
        const mapped = rows.map(mapEntregaToVale).filter(Boolean) as TrabajoDiarioVale[];
        if (mapped.length > 0) return mapped;
      } catch (error) {
        lastError = error;
        // probar siguiente endpoint
      }
    }

    if (lastError) {
      console.warn(
        "No se pudo cargar entregas sin instalar con endpoints conocidos.",
        lastError,
      );
    }
    if (hasAnyRows) {
      console.warn(
        "Se recibieron filas de entregas sin instalar, pero no pudieron mapearse al formato de vale.",
      );
    }
    return [];
  },

  /**
   * Obtiene todos los leads y clientes con estado "Pendiente de Instalación"
   */
  async getPendientesInstalacion(): Promise<PendientesInstalacionResponse> {
    return apiRequest<PendientesInstalacionResponse>(
      "/pendientes-instalacion/",
      {
        method: "GET",
      },
    );
  },

  async getOfertasConMaterialesEntregadosIndex(): Promise<OfertasMaterialesEntregadosIndex> {
    const endpointOverride = (
      process.env.NEXT_PUBLIC_OFERTAS_MATERIALES_ENTREGADOS_ENDPOINT || ""
    ).trim();

    const endpoints = Array.from(
      new Set(
        [
          endpointOverride.startsWith("/")
            ? endpointOverride
            : endpointOverride
              ? `/${endpointOverride}`
              : "",
          ...ENDPOINTS_MATERIALES_ENTREGADOS_DEFAULT,
        ].filter(Boolean),
      ),
    );

    for (const endpoint of endpoints) {
      try {
        const response = await apiRequest<unknown>(endpoint, { method: "GET" });
        const payload =
          response && typeof response === "object"
            ? (response as Record<string, unknown>)
            : null;
        if (!payload) continue;
        const payloadData =
          payload.data && typeof payload.data === "object"
            ? (payload.data as Record<string, unknown>)
            : {};

        const ofertaIds = parseArrayToIdSet(
          payload.oferta_ids ?? payloadData.oferta_ids,
        );
        const filtros =
          (payload.filtros && typeof payload.filtros === "object"
            ? payload.filtros
            : payloadData.filtros) &&
          typeof (payload.filtros ?? payloadData.filtros) === "object"
            ? ((payload.filtros ??
                payloadData.filtros) as OfertasMaterialesEntregadosFiltros)
            : null;
        const idsConMaterialesPendientes = parseArrayToIdSet(
          filtros?.ids_con_materiales_pendientes,
        );
        const ofertasRaw = Array.isArray(payload.ofertas)
          ? payload.ofertas
          : Array.isArray(payloadData.ofertas)
            ? payloadData.ofertas
            : [];
        const ofertas = Array.isArray(ofertasRaw)
          ? (ofertasRaw as OfertaMaterialesEntregadosResumen[])
          : [];
        const contactoKeysConEntregas = new Set<string>();

        // Fallback: si no llega oferta_ids, intentamos construirlo desde data.ofertas
        if (ofertaIds.size === 0 && ofertas.length > 0) {
          ofertas.forEach((oferta) => {
            const id = extractOfertaId(oferta);
            if (id) ofertaIds.add(id);
          });
        }
        ofertas.forEach((oferta) => {
          extractContactoEntregaKeysFromResumen(oferta).forEach((key) => {
            contactoKeysConEntregas.add(key);
          });
        });

        if (
          ofertaIds.size > 0 ||
          contactoKeysConEntregas.size > 0 ||
          idsConMaterialesPendientes.size > 0 ||
          (filtros && Object.keys(filtros).length > 0) ||
          ofertas.length > 0
        ) {
          return {
            ofertaIds,
            idsConMaterialesPendientes,
            contactoKeysConEntregas,
            filtros,
            ofertas,
            sourceEndpoint: endpoint,
          };
        }
      } catch {
        // Intentar siguiente endpoint candidato
      }
    }

    return {
      ofertaIds: new Set<string>(),
      idsConMaterialesPendientes: new Set<string>(),
      contactoKeysConEntregas: new Set<string>(),
      filtros: null,
      ofertas: [],
      sourceEndpoint: null,
    };
  },

  async getResumenEnServicioPorCliente(
    clienteNumero: string,
  ): Promise<ResumenEquiposEnServicioCliente> {
    const numeroCliente = String(clienteNumero || "").trim();
    if (!numeroCliente) {
      return buildResumenServicioDefault("");
    }

    try {
      const response = await apiRequest<unknown>(
        `/ofertas/confeccion/cliente/${encodeURIComponent(numeroCliente)}/resumen-en-servicio`,
        { method: "GET" },
      );

      const responseObj =
        response && typeof response === "object"
          ? (response as Record<string, unknown>)
          : null;
      const payload = responseObj?.data ?? responseObj;
      const payloadObj =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : null;
      const rawData =
        payloadObj?.data && typeof payloadObj.data === "object"
          ? payloadObj.data
          : payload;

      if (
        responseObj?.success === false ||
        responseObj?.error ||
        !rawData ||
        typeof rawData !== "object"
      ) {
        return buildResumenServicioDefault(numeroCliente);
      }

      const data = rawData as Record<string, unknown>;
      const inversores = parsePositiveInt(data.inversores_en_servicio);
      const paneles = parsePositiveInt(data.paneles_en_servicio);
      const baterias = parsePositiveInt(data.baterias_en_servicio);
      const tieneAlguno =
        data.tiene_alguno_en_servicio === true ||
        inversores > 0 ||
        paneles > 0 ||
        baterias > 0;

      return {
        numero_cliente: String(data.numero_cliente || numeroCliente),
        oferta_id: data.oferta_id ? String(data.oferta_id) : null,
        numero_oferta: data.numero_oferta ? String(data.numero_oferta) : null,
        inversores_en_servicio: inversores,
        paneles_en_servicio: paneles,
        baterias_en_servicio: baterias,
        tiene_alguno_en_servicio: tieneAlguno,
      };
    } catch {
      return buildResumenServicioDefault(numeroCliente);
    }
  },
};
