import { useState, useEffect, useCallback } from "react";
import { useToast } from "./use-toast";
import { apiRequest } from "@/lib/api-config";
import {
  OFERTAS_CONFECCION_ENDPOINTS,
  buildApiUrl,
  getCommonHeaders,
} from "@/lib/api-endpoints";

export interface OfertaConfeccion {
  id: string;
  nombre: string;
  nombre_completo?: string; // Nombre largo descriptivo para exportaciones
  numero_oferta?: string;
  tipo: "generica" | "personalizada";
  estado:
    | "en_revision"
    | "aprobada_para_enviar"
    | "enviada_a_cliente"
    | "confirmada_por_cliente"
    | "reservada"
    | "rechazada"
    | "cancelada";
  almacen_id?: string;
  almacen_nombre?: string;
  cliente_id?: string;
  cliente_numero?: string;
  cliente_nombre?: string;
  lead_id?: string;
  lead_nombre?: string;
  nombre_lead_sin_agregar?: string;
  foto_portada?: string;
  precio_final: number;
  monto_pendiente?: number;
  total_materiales: number;
  margen_comercial: number;
  margen_instalacion?: number;
  costo_transportacion: number;
  subtotal_con_margen?: number;
  descuento_porcentaje?: number;
  monto_descuento?: number;
  subtotal_con_descuento?: number;
  total_elementos_personalizados?: number;
  total_costos_extras?: number;
  items?: OfertaConfeccionItem[];
  elementos_personalizados?: {
    material_codigo: string;
    descripcion: string;
    precio: number;
    cantidad: number;
    categoria: string;
  }[];
  secciones_personalizadas?: {
    id: string;
    label: string;
    tipo: "materiales" | "extra";
    tipo_extra?: "escritura" | "costo";
    categorias_materiales?: string[];
    contenido_escritura?: string;
    costos_extras?: {
      id: string;
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
    }[];
  }[];
  componentes_principales?: {
    inversor_seleccionado?: string;
    bateria_seleccionada?: string;
    panel_seleccionado?: string;
  };
  moneda_pago?: "USD" | "EUR" | "CUP";
  tasa_cambio?: number;
  pago_transferencia?: boolean;
  datos_cuenta?: string;
  formas_pago_acordadas?: boolean;
  cantidad_pagos_acordados?: number;
  pagos_acordados?: PagoAcordadoOferta[];
  aplica_contribucion?: boolean;
  porcentaje_contribucion?: number;
  compensacion?: {
    monto_usd: number;
    justificacion: string;
    fecha?: string;
    aprobado_por?: string;
  };
  asumido_por_empresa?: {
    monto_usd: number;
    justificacion: string;
    fecha?: string;
    aprobado_por?: string;
  };
  notas?: string;
  comentario_contabilidad?: string;
  cliente_listo_para_pagar?: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface OfertaConfeccionEntregaItem {
  cantidad: number;
  fecha: string;
}

export interface OfertaConfeccionItem {
  material_codigo: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  categoria: string;
  seccion: string;
  entregas?: OfertaConfeccionEntregaItem[];
  cantidad_pendiente_por_entregar?: number;
  [key: string]: unknown;
}

export type MetodoPagoAcordado = "efectivo" | "transferencia" | "stripe";

export interface PagoAcordadoOferta {
  monto_usd: number;
  metodo_pago: MetodoPagoAcordado;
  fecha_estimada: string;
}

export interface EstadoOfertaCliente {
  success: boolean;
  tiene_oferta_confirmada_por_cliente: boolean;
  oferta_id_confirmada: string | null;
  numero_oferta_confirmada: string | null;
  codigo_oferta_confirmada: string | null;
  error: boolean;
}

const normalizeOfertaConfeccion = (raw: any): OfertaConfeccion => {
  const tipo =
    raw.tipo ??
    raw.tipo_oferta ??
    (raw.es_generica ? "generica" : "personalizada");
  const formasPagoAcordadas = Boolean(raw.formas_pago_acordadas);
  const pagosAcordadosRaw = Array.isArray(raw.pagos_acordados)
    ? raw.pagos_acordados
    : [];
  const pagosAcordados: PagoAcordadoOferta[] = pagosAcordadosRaw.map(
    (pago: any) => ({
      monto_usd: Number(pago?.monto_usd ?? 0),
      metodo_pago:
        pago?.metodo_pago === "transferencia" || pago?.metodo_pago === "stripe"
          ? pago.metodo_pago
          : "efectivo",
      fecha_estimada:
        typeof pago?.fecha_estimada === "string" ? pago.fecha_estimada : "",
    }),
  );
  const cantidadPagosAcordadosRaw = Number(raw.cantidad_pagos_acordados);
  const cantidadPagosAcordados = Number.isFinite(cantidadPagosAcordadosRaw)
    ? cantidadPagosAcordadosRaw
    : pagosAcordados.length;
  const itemsRaw = Array.isArray(raw.items ?? raw.materiales)
    ? (raw.items ?? raw.materiales)
    : [];
  const items: OfertaConfeccionItem[] = itemsRaw.map((item: any) => ({
    ...item,
    material_codigo: item?.material_codigo ?? "",
    descripcion: item?.descripcion ?? "",
    precio: Number(item?.precio ?? 0),
    cantidad: Number(item?.cantidad ?? 0),
    categoria: item?.categoria ?? "",
    seccion: item?.seccion ?? "",
    entregas: Array.isArray(item?.entregas)
      ? item.entregas.map((entrega: any) => ({
          cantidad: Number(entrega?.cantidad ?? 0),
          fecha: typeof entrega?.fecha === "string" ? entrega.fecha : "",
        }))
      : [],
    cantidad_pendiente_por_entregar: Number.isFinite(
      Number(item?.cantidad_pendiente_por_entregar),
    )
      ? Number(item.cantidad_pendiente_por_entregar)
      : undefined,
  }));
  const montoPendienteRaw = raw.monto_pendiente ?? raw.saldo_pendiente;
  const montoPendiente =
    montoPendienteRaw !== undefined && montoPendienteRaw !== null
      ? Number(montoPendienteRaw)
      : undefined;

  return {
    id: raw.id ?? raw._id ?? raw.oferta_id ?? "",
    nombre:
      raw.nombre ??
      raw.nombre_automatico ??
      raw.nombre_oferta ??
      "Oferta sin nombre",
    nombre_completo: raw.nombre_completo, // Nombre largo descriptivo
    numero_oferta: raw.numero_oferta,
    tipo: tipo === "personalizada" ? "personalizada" : "generica",
    estado: raw.estado ?? "en_revision",
    almacen_id: raw.almacen_id ?? raw.almacen?.id ?? raw.almacen?._id,
    almacen_nombre: raw.almacen_nombre ?? raw.almacen?.nombre,
    cliente_id: raw.cliente_id ?? raw.cliente?.id ?? raw.cliente?._id,
    cliente_numero: raw.cliente_numero ?? raw.cliente?.numero,
    cliente_nombre:
      raw.cliente_nombre ?? raw.cliente?.nombre ?? raw.cliente?.nombre_completo,
    lead_id: raw.lead_id ?? raw.lead?.id ?? raw.lead?._id,
    lead_nombre:
      raw.lead_nombre ?? raw.lead?.nombre_completo ?? raw.lead?.nombre,
    nombre_lead_sin_agregar: raw.nombre_lead_sin_agregar,
    foto_portada: raw.foto_portada ?? raw.foto_portada_url ?? raw.foto,
    precio_final: raw.precio_final ?? raw.precio ?? 0,
    monto_pendiente: Number.isFinite(montoPendiente)
      ? montoPendiente
      : undefined,
    total_materiales: raw.total_materiales ?? 0,
    margen_comercial: raw.margen_comercial ?? 0,
    margen_instalacion: raw.margen_instalacion ?? 0,
    costo_transportacion: raw.costo_transportacion ?? 0,
    subtotal_con_margen: raw.subtotal_con_margen ?? 0,
    descuento_porcentaje: raw.descuento_porcentaje ?? 0,
    monto_descuento: raw.monto_descuento ?? 0,
    subtotal_con_descuento: raw.subtotal_con_descuento ?? 0,
    total_elementos_personalizados: raw.total_elementos_personalizados ?? 0,
    total_costos_extras: raw.total_costos_extras ?? 0,
    items,
    elementos_personalizados: raw.elementos_personalizados ?? [],
    secciones_personalizadas: raw.secciones_personalizadas ?? [],
    componentes_principales: raw.componentes_principales ?? {},
    moneda_pago: raw.moneda_pago ?? "USD",
    tasa_cambio: raw.tasa_cambio ?? 0,
    pago_transferencia: raw.pago_transferencia ?? false,
    datos_cuenta: raw.datos_cuenta ?? "",
    formas_pago_acordadas: formasPagoAcordadas,
    cantidad_pagos_acordados: formasPagoAcordadas
      ? Math.max(0, cantidadPagosAcordados)
      : 0,
    pagos_acordados: formasPagoAcordadas ? pagosAcordados : [],
    aplica_contribucion: raw.aplica_contribucion ?? false,
    porcentaje_contribucion: raw.porcentaje_contribucion ?? 0,
    compensacion: raw.compensacion
      ? {
          monto_usd: Number(raw.compensacion.monto_usd ?? 0),
          justificacion: raw.compensacion.justificacion ?? "",
          fecha: raw.compensacion.fecha,
          aprobado_por: raw.compensacion.aprobado_por,
        }
      : undefined,
    asumido_por_empresa: raw.asumido_por_empresa
      ? {
          monto_usd: Number(raw.asumido_por_empresa.monto_usd ?? 0),
          justificacion: raw.asumido_por_empresa.justificacion ?? "",
          fecha: raw.asumido_por_empresa.fecha,
          aprobado_por: raw.asumido_por_empresa.aprobado_por,
        }
      : undefined,
    notas: raw.notas,
    comentario_contabilidad:
      raw.comentario_contabilidad ?? raw.comentarioContabilidad,
    cliente_listo_para_pagar: Boolean(
      raw.cliente_listo_para_pagar ?? raw.clienteListoParaPagar,
    ),
    fecha_creacion: raw.fecha_creacion ?? raw.created_at ?? "",
    fecha_actualizacion: raw.fecha_actualizacion ?? raw.updated_at ?? "",
  };
};

const normalizeClienteNumero = (value: string | null | undefined) =>
  (value ?? "")
    .toString()
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const CLIENTES_CON_OFERTA_CACHE_KEY = "clientes_con_ofertas_cache_v2";
const CLIENTES_CON_OFERTA_CACHE_TTL_MS = 5 * 60 * 1000;

const extractNumerosClientes = (payload: unknown): string[] | null => {
  if (!payload) return null;

  if (Array.isArray(payload)) {
    const numeros = payload
      .map((value: unknown) => {
        if (typeof value === "string" || typeof value === "number") {
          return normalizeClienteNumero(String(value));
        }

        if (value && typeof value === "object") {
          const obj = value as Record<string, unknown>;
          return normalizeClienteNumero(
            (obj.cliente_numero as string | number | undefined)?.toString() ??
              (obj.codigo_cliente as string | number | undefined)?.toString() ??
              (obj.numero as string | number | undefined)?.toString() ??
              (
                obj.cliente as { numero?: string | number } | undefined
              )?.numero?.toString() ??
              (obj.clienteNumero as string | number | undefined)?.toString() ??
              (obj.cliente_codigo as string | number | undefined)?.toString() ??
              "",
          );
        }

        return "";
      })
      .filter(Boolean);

    return Array.from(new Set(numeros));
  }

  const data = payload as Record<string, unknown>;

  const rawCandidates = [
    (data.data as Record<string, unknown> | undefined)?.numeros_clientes,
    data.numeros_clientes,
    (data.data as Record<string, unknown> | undefined)?.clientes,
    data.clientes,
    (data.data as Record<string, unknown> | undefined)?.items,
    data.items,
    data.data,
  ];

  const rawArray = rawCandidates.find((candidate) => Array.isArray(candidate));
  if (!Array.isArray(rawArray)) return null;

  const numeros = rawArray
    .map((value: unknown) => {
      if (typeof value === "string" || typeof value === "number") {
        return normalizeClienteNumero(String(value));
      }

      if (value && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        return normalizeClienteNumero(
          (obj.cliente_numero as string | number | undefined)?.toString() ??
            (obj.codigo_cliente as string | number | undefined)?.toString() ??
            (obj.numero as string | number | undefined)?.toString() ??
            (
              obj.cliente as { numero?: string | number } | undefined
            )?.numero?.toString() ??
            (obj.clienteNumero as string | number | undefined)?.toString() ??
            (obj.cliente_codigo as string | number | undefined)?.toString() ??
            "",
        );
      }

      return "";
    })
    .filter(Boolean);

  return Array.from(new Set(numeros));
};

export function useOfertasConfeccion() {
  const [ofertas, setOfertas] = useState<OfertaConfeccion[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchOfertas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRequest<any>("/ofertas/confeccion/", {
        method: "GET",
      });
      const rawOfertas = Array.isArray(response)
        ? response
        : (response?.data ?? response?.results ?? []);
      setOfertas(
        Array.isArray(rawOfertas)
          ? rawOfertas.map(normalizeOfertaConfeccion)
          : [],
      );
    } catch (error: any) {
      console.error("Error fetching ofertas:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar las ofertas",
        variant: "destructive",
      });
      setOfertas([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const eliminarOferta = useCallback(
    async (id: string) => {
      try {
        await apiRequest(`/ofertas/confeccion/${id}`, { method: "DELETE" });

        toast({
          title: "Oferta eliminada",
          description: "La oferta se eliminó correctamente",
        });

        // Disparar evento global para que otros componentes se enteren
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ofertaEliminada", { detail: { ofertaId: id } }),
          );
        }

        await fetchOfertas();
      } catch (error: any) {
        console.error("Error deleting oferta:", error);
        toast({
          title: "Error",
          description: error.message || "No se pudo eliminar la oferta",
          variant: "destructive",
        });
      }
    },
    [toast, fetchOfertas],
  );

  const fetchOfertasGenericasAprobadas = useCallback(async () => {
    try {
      const response = await apiRequest<any>(
        "/ofertas/confeccion/genericas/aprobadas",
        { method: "GET" },
      );
      const rawOfertas = Array.isArray(response)
        ? response
        : (response?.data ?? response?.results ?? response?.ofertas ?? []);
      return Array.isArray(rawOfertas)
        ? rawOfertas.map(normalizeOfertaConfeccion)
        : [];
    } catch (error: any) {
      console.error("Error fetching ofertas genéricas aprobadas:", error);
      toast({
        title: "Error",
        description:
          error.message || "No se pudieron cargar las ofertas genéricas",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  const asignarOfertaACliente = useCallback(
    async (ofertaGenericaId: string, clienteNumero: string) => {
      try {
        const response = await apiRequest<any>(
          "/ofertas/confeccion/asignar-a-cliente",
          {
            method: "POST",
            body: JSON.stringify({
              oferta_generica_id: ofertaGenericaId,
              cliente_numero: clienteNumero,
            }),
          },
        );

        if (response?.success) {
          toast({
            title: "Oferta asignada",
            description:
              response.message ||
              "La oferta se asignó correctamente al cliente",
          });

          await fetchOfertas();
          return {
            success: true,
            ofertaNuevaId: response.oferta_nueva_id,
            ofertaNueva: response.oferta_nueva,
          };
        } else {
          throw new Error(response?.message || "No se pudo asignar la oferta");
        }
      } catch (error: any) {
        console.error("Error asignando oferta:", error);
        toast({
          title: "Error",
          description:
            error.message || "No se pudo asignar la oferta al cliente",
          variant: "destructive",
        });
        return { success: false };
      }
    },
    [toast, fetchOfertas],
  );

  const obtenerNumerosClientesConOfertas = useCallback(
    async (options?: { skipCache?: boolean }) => {
      try {
        const skipCache = options?.skipCache === true;

        if (skipCache) {
          console.log("🔄 Ignorando cache - consultando servidor directamente");
        }

        if (typeof window !== "undefined" && !skipCache) {
          const cachedRaw = localStorage.getItem(CLIENTES_CON_OFERTA_CACHE_KEY);
          if (cachedRaw) {
            try {
              const cached = JSON.parse(cachedRaw) as {
                ts?: number;
                numeros?: unknown;
              };
              const isFresh =
                typeof cached.ts === "number" &&
                Date.now() - cached.ts < CLIENTES_CON_OFERTA_CACHE_TTL_MS;
              const cachedNumeros = extractNumerosClientes(cached.numeros);

              if (isFresh && cachedNumeros) {
                console.log(
                  "✅ Usando cache de clientes con ofertas:",
                  cachedNumeros.length,
                );
                return {
                  success: true as const,
                  numeros_clientes: cachedNumeros,
                };
              } else {
                console.log(
                  "⏰ Cache expirado o inválido - consultando servidor",
                );
              }
            } catch {
              console.log("⚠️ Cache corrupto - consultando servidor");
            }
          }
        }

        const url = buildApiUrl(
          OFERTAS_CONFECCION_ENDPOINTS.CLIENTES_CON_OFERTAS,
        );
        console.log("🌐 Fetching clientes con ofertas desde:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: getCommonHeaders(),
        });

        if (!response.ok) {
          console.error(
            "❌ Error en endpoint clientes-con-ofertas:",
            response.status,
            response.statusText,
          );
          return { success: false as const, numeros_clientes: [] as string[] };
        }

        const data = await response.json();
        const numeros = extractNumerosClientes(data);

        if (!numeros) {
          console.error("❌ Respuesta sin array parseable");
          return { success: false as const, numeros_clientes: [] as string[] };
        }

        console.log(
          "✅ Clientes con oferta cargados desde servidor:",
          numeros.length,
        );

        // Cachear resultado exitoso
        if (typeof window !== "undefined") {
          localStorage.setItem(
            CLIENTES_CON_OFERTA_CACHE_KEY,
            JSON.stringify({
              ts: Date.now(),
              numeros,
            }),
          );
          console.log("💾 Cache actualizado con", numeros.length, "clientes");
        }

        return { success: true as const, numeros_clientes: numeros };
      } catch (error) {
        console.error(
          "💥 Error obteniendo numeros de clientes con ofertas:",
          error,
        );
        return { success: false as const, numeros_clientes: [] as string[] };
      }
    },
    [],
  );

  const obtenerOfertaPorCliente = useCallback(async (clienteNumero: string) => {
    try {
      const numeroNormalizado = normalizeClienteNumero(clienteNumero);
      if (!numeroNormalizado) {
        return {
          success: false,
          oferta: null,
          ofertas: [] as OfertaConfeccion[],
          total: 0,
          error: false as const,
        };
      }

      const url = buildApiUrl(
        OFERTAS_CONFECCION_ENDPOINTS.OFERTAS_CLIENTE(numeroNormalizado),
      );
      console.log("🌐 Fetching oferta para cliente:", numeroNormalizado);
      console.log("🔗 URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: getCommonHeaders(),
      });

      console.log("📡 Response status:", response.status, response.statusText);

      if (response.status === 404) {
        console.log("ℹ️ Cliente sin oferta asignada");
        return {
          success: false,
          oferta: null,
          ofertas: [] as OfertaConfeccion[],
          total: 0,
          error: false as const,
        };
      }

      if (!response.ok) {
        console.error("❌ Error en endpoint oferta cliente:", response.status);
        return {
          success: false,
          oferta: null,
          ofertas: [] as OfertaConfeccion[],
          total: 0,
          error: true as const,
        };
      }

      const data = await response.json();
      console.log("📦 Response data:", data);

      const payload = data?.data ?? data;
      const ofertasRaw = Array.isArray(payload?.ofertas)
        ? payload.ofertas
        : Array.isArray(data?.ofertas)
          ? data.ofertas
          : [];

      if (Array.isArray(ofertasRaw) && ofertasRaw.length > 0) {
        const ofertas = ofertasRaw.map(normalizeOfertaConfeccion);
        const total = payload?.total_ofertas ?? ofertas.length;
        console.log(
          "✅ Oferta encontrada para cliente:",
          numeroNormalizado,
          "- Total:",
          total,
        );
        return {
          success: true,
          oferta: ofertas[0] ?? null,
          ofertas,
          total,
          error: false as const,
        };
      }

      // Compatibilidad: backend antiguo con una sola oferta
      const singleOferta = payload?.oferta ?? payload?.data ?? payload;
      const hasSingleOfertaPayload =
        !!singleOferta &&
        typeof singleOferta === "object" &&
        (!!singleOferta.id ||
          !!singleOferta._id ||
          !!singleOferta.oferta_id ||
          !!singleOferta.numero_oferta ||
          Array.isArray(singleOferta.items));

      if (hasSingleOfertaPayload) {
        const oferta = normalizeOfertaConfeccion(singleOferta);
        console.log(
          "✅ Oferta única encontrada para cliente:",
          numeroNormalizado,
        );
        return {
          success: true,
          oferta,
          ofertas: [oferta],
          total: 1,
          error: false as const,
        };
      }

      console.log(
        "ℹ️ Sin ofertas en respuesta para cliente:",
        numeroNormalizado,
      );
      return {
        success: false,
        oferta: null,
        ofertas: [] as OfertaConfeccion[],
        total: 0,
        error: false as const,
      };
    } catch (error: any) {
      console.error("💥 Error en obtenerOfertaPorCliente:", error);
      return {
        success: false,
        oferta: null,
        ofertas: [] as OfertaConfeccion[],
        total: 0,
        error: true as const,
      };
    }
  }, []);

  const obtenerIdsLeadsConOfertas = useCallback(
    async (options?: { skipCache?: boolean }) => {
      try {
        const skipCache = options?.skipCache === true;

        if (skipCache) {
          console.log("🔄 Ignorando cache - consultando servidor directamente");
        }

        const url = buildApiUrl(OFERTAS_CONFECCION_ENDPOINTS.LEADS_CON_OFERTAS);
        console.log("🌐 Fetching leads con ofertas desde:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: getCommonHeaders(),
        });

        if (!response.ok) {
          console.error(
            "❌ Error en endpoint leads-con-ofertas:",
            response.status,
            response.statusText,
          );
          return { success: false as const, ids_leads: [] as string[] };
        }

        const data = await response.json();
        const idsLeads = data?.data?.ids_leads ?? data?.ids_leads ?? [];

        if (!Array.isArray(idsLeads)) {
          console.error("❌ Respuesta sin array de IDs");
          return { success: false as const, ids_leads: [] as string[] };
        }

        console.log(
          "✅ Leads con oferta cargados desde servidor:",
          idsLeads.length,
        );

        return { success: true as const, ids_leads: idsLeads };
      } catch (error) {
        console.error("💥 Error obteniendo IDs de leads con ofertas:", error);
        return { success: false as const, ids_leads: [] as string[] };
      }
    },
    [],
  );

  const obtenerOfertaPorLead = useCallback(async (leadId: string) => {
    try {
      if (!leadId) {
        return {
          success: false,
          oferta: null,
          ofertas: [] as OfertaConfeccion[],
          total: 0,
          error: false as const,
        };
      }

      const url = buildApiUrl(
        OFERTAS_CONFECCION_ENDPOINTS.OFERTAS_LEAD(leadId),
      );
      console.log("🌐 Fetching oferta para lead:", leadId);
      console.log("🔗 URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: getCommonHeaders(),
      });

      console.log("📡 Response status:", response.status, response.statusText);

      if (response.status === 404) {
        console.log("ℹ️ Lead sin oferta asignada");
        return {
          success: false,
          oferta: null,
          ofertas: [] as OfertaConfeccion[],
          total: 0,
          error: false as const,
        };
      }

      if (!response.ok) {
        console.error("❌ Error en endpoint oferta lead:", response.status);
        return {
          success: false,
          oferta: null,
          ofertas: [] as OfertaConfeccion[],
          total: 0,
          error: true as const,
        };
      }

      const data = await response.json();
      console.log("📦 Response data:", data);

      const payload = data?.data ?? data;
      const ofertasRaw = Array.isArray(payload?.ofertas)
        ? payload.ofertas
        : Array.isArray(data?.ofertas)
          ? data.ofertas
          : [];

      if (Array.isArray(ofertasRaw) && ofertasRaw.length > 0) {
        const ofertas = ofertasRaw.map(normalizeOfertaConfeccion);
        const total = payload?.total_ofertas ?? ofertas.length;
        console.log(
          "✅ Oferta encontrada para lead:",
          leadId,
          "- Total:",
          total,
        );
        return {
          success: true,
          oferta: ofertas[0] ?? null,
          ofertas,
          total,
          error: false as const,
        };
      }

      console.log("ℹ️ Sin ofertas en respuesta para lead:", leadId);
      return {
        success: false,
        oferta: null,
        ofertas: [] as OfertaConfeccion[],
        total: 0,
        error: false as const,
      };
    } catch (error: any) {
      console.error("💥 Error en obtenerOfertaPorLead:", error);
      return {
        success: false,
        oferta: null,
        ofertas: [] as OfertaConfeccion[],
        total: 0,
        error: true as const,
      };
    }
  }, []);

  const obtenerEstadoOfertaCliente = useCallback(
    async (clienteNumero: string): Promise<EstadoOfertaCliente> => {
      try {
        const numeroNormalizado = normalizeClienteNumero(clienteNumero);
        if (!numeroNormalizado) {
          return {
            success: false,
            tiene_oferta_confirmada_por_cliente: false,
            oferta_id_confirmada: null,
            numero_oferta_confirmada: null,
            codigo_oferta_confirmada: null,
            error: false,
          };
        }

        const url = buildApiUrl(
          OFERTAS_CONFECCION_ENDPOINTS.ESTADO_OFERTA_CLIENTE(numeroNormalizado),
        );
        console.log(
          "🌐 Fetching estado de oferta para cliente:",
          numeroNormalizado,
        );
        console.log("🔗 URL:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: getCommonHeaders(),
        });

        if (response.status === 404) {
          return {
            success: true,
            tiene_oferta_confirmada_por_cliente: false,
            oferta_id_confirmada: null,
            numero_oferta_confirmada: null,
            codigo_oferta_confirmada: null,
            error: false,
          };
        }

        if (!response.ok) {
          console.error(
            "❌ Error en endpoint estado-oferta cliente:",
            response.status,
          );
          return {
            success: false,
            tiene_oferta_confirmada_por_cliente: false,
            oferta_id_confirmada: null,
            numero_oferta_confirmada: null,
            codigo_oferta_confirmada: null,
            error: true,
          };
        }

        const data = await response.json();
        const payload = data?.data ?? data ?? {};

        const tieneConfirmada = Boolean(
          payload.tiene_oferta_confirmada_por_cliente ??
          payload.tieneOfertaConfirmadaPorCliente,
        );

        return {
          success: true,
          tiene_oferta_confirmada_por_cliente: tieneConfirmada,
          oferta_id_confirmada:
            payload.oferta_id_confirmada ??
            payload.ofertaIdConfirmada ??
            payload.id_oferta_confirmada ??
            null,
          numero_oferta_confirmada:
            payload.numero_oferta_confirmada ??
            payload.numeroOfertaConfirmada ??
            null,
          codigo_oferta_confirmada:
            payload.codigo_oferta_confirmada ??
            payload.codigoOfertaConfirmada ??
            null,
          error: false,
        };
      } catch (error) {
        console.error("💥 Error en obtenerEstadoOfertaCliente:", error);
        return {
          success: false,
          tiene_oferta_confirmada_por_cliente: false,
          oferta_id_confirmada: null,
          numero_oferta_confirmada: null,
          codigo_oferta_confirmada: null,
          error: true,
        };
      }
    },
    [],
  );

  const asignarOfertaALead = useCallback(
    async (ofertaGenericaId: string, leadId: string) => {
      try {
        const response = await apiRequest<any>(
          "/ofertas/confeccion/asignar-a-lead",
          {
            method: "POST",
            body: JSON.stringify({
              oferta_generica_id: ofertaGenericaId,
              lead_id: leadId,
            }),
          },
        );

        if (response?.success) {
          toast({
            title: "Oferta asignada",
            description:
              response.message || "La oferta se asignó correctamente al lead",
          });

          await fetchOfertas();
          return {
            success: true,
            ofertaNuevaId: response.oferta_nueva_id,
            ofertaNueva: response.oferta_nueva,
          };
        } else {
          throw new Error(response?.message || "No se pudo asignar la oferta");
        }
      } catch (error: any) {
        console.error("Error asignando oferta:", error);
        toast({
          title: "Error",
          description: error.message || "No se pudo asignar la oferta al lead",
          variant: "destructive",
        });
        return { success: false };
      }
    },
    [toast, fetchOfertas],
  );

  useEffect(() => {
    fetchOfertas();
  }, [fetchOfertas]);

  return {
    ofertas,
    loading,
    refetch: fetchOfertas,
    eliminarOferta,
    fetchOfertasGenericasAprobadas,
    asignarOfertaACliente,
    obtenerNumerosClientesConOfertas,
    obtenerOfertaPorCliente,
    obtenerEstadoOfertaCliente,
    obtenerIdsLeadsConOfertas,
    obtenerOfertaPorLead,
    asignarOfertaALead,
  };
}
