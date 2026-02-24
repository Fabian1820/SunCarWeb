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

export const InstalacionesService = {
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
        const response = await apiRequest<any>(endpoint, { method: "GET" });
        const payload = response?.data ?? response;
        const payloadData =
          payload?.data && typeof payload.data === "object" ? payload.data : {};

        if (!payload || typeof payload !== "object") continue;

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
};
