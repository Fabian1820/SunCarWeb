import { apiRequest } from "@/lib/api-config";

export interface PagoCreateData {
  oferta_id: string;
  monto: number;
  fecha: string;
  tipo_pago: "anticipo" | "pendiente" | "completo";
  metodo_pago: "efectivo" | "transferencia_bancaria" | "stripe";
  moneda?: "USD" | "EUR" | "CUP";
  tasa_cambio?: number;
  pago_cliente?: boolean;
  nombre_pagador?: string;
  carnet_pagador?: string;
  desglose_billetes?: Record<string, number>;
  comprobante_transferencia?: string;
  recibido_por?: string;
  notas?: string;
  creado_por?: string;
  diferencia?: {
    justificacion: string;
  };
}

export interface Pago {
  id: string;
  oferta_id: string;
  monto: number;
  moneda: "USD" | "EUR" | "CUP";
  tasa_cambio: number;
  monto_usd: number;
  pago_cliente: boolean;
  nombre_pagador: string | null;
  carnet_pagador: string | null;
  desglose_billetes: Record<string, number> | null;
  fecha: string;
  tipo_pago: "anticipo" | "pendiente" | "completo";
  metodo_pago: "efectivo" | "transferencia_bancaria" | "stripe";
  comprobante_transferencia?: string;
  recibido_por?: string;
  notas?: string;
  creado_por?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  diferencia?: {
    monto: number;
    justificacion: string;
  };
}

export interface PagoConDetalles extends Pago {
  oferta: {
    numero_oferta: string;
    nombre_oferta: string;
    precio_final: number;
    monto_pendiente: number;
    estado: string;
  };
  contacto: {
    nombre: string;
    telefono?: string;
    carnet?: string;
    direccion?: string;
    codigo: string;
    tipo_contacto: "cliente" | "lead" | "lead_sin_agregar";
  };
}

export interface PagoCreateResponse {
  success: boolean;
  message: string;
  pago_id: string;
  pago: Pago;
  monto_pendiente_actualizado: number;
}

export interface PagosResponse {
  success: boolean;
  message: string;
  data: Pago[];
  total: number;
}

export interface PagosConDetallesResponse {
  success: boolean;
  message: string;
  data: PagoConDetalles[];
  total: number;
}

export interface Contacto {
  nombre: string | null;
  telefono: string | null;
  carnet: string | null;
  direccion: string | null;
  codigo: string | null;
  tipo_contacto: "cliente" | "lead" | "lead_sin_agregar" | null;
  estado?: string | null;
  estado_cliente?: string | null;
}

export interface OfertaConPagos {
  oferta_id: string;
  numero_oferta: string;
  nombre_automatico: string;
  nombre_completo: string;
  tipo_oferta: string;
  estado: string;
  cliente_numero?: string | null;
  total_materiales?: number | string | null;
  totalMateriales?: number | string | null;
  precio_final: number;
  monto_pendiente: number;
  almacen_id: string;
  almacen_nombre: string | null;
  pagos: Pago[];
  total_pagado: number;
  cantidad_pagos: number;
  contacto: Contacto;
  estado_cliente?: string | null;
  cliente_estado?: string | null;
  cliente?: {
    estado?: string | null;
  } | null;
  lead?: {
    estado?: string | null;
  } | null;
}

export interface OfertasConPagosResponse {
  success: boolean;
  message: string;
  data: OfertaConPagos[];
  total: number;
}

export interface ResumenPagosPendientes {
  suma_montos_pagos: number;
  suma_montos_pagos_usd: number;
  suma_montos_pendientes_ofertas_con_pagos: number;
  [key: string]: unknown;
}

export interface OfertaEstadoPendienteItem {
  oferta_id?: string;
  numero_oferta?: string;
  monto_pendiente?: number;
  tiene_monto_pendiente?: boolean;
  fechas_pagos?: string[];
  pagos_en_rango?: Array<{
    fecha: string;
    monto_usd: number;
  }>;
  [key: string]: unknown;
}

export interface OfertasEstadoPendienteData {
  ofertas: OfertaEstadoPendienteItem[];
  total_ofertas_con_pendiente: number;
  total_ofertas_sin_pendiente: number;
  total_ofertas_filtradas: number;
  [key: string]: unknown;
}

interface ResumenPagosPendientesResponse {
  success: boolean;
  message: string;
  data: ResumenPagosPendientes;
}

interface OfertasEstadoPendienteResponse {
  success: boolean;
  message: string;
  data: OfertasEstadoPendienteData;
}

export class PagoService {
  /**
   * Crear un nuevo pago
   */
  static async crearPago(data: PagoCreateData): Promise<PagoCreateResponse> {
    try {
      console.log("🚀 [PagoService.crearPago] Iniciando creación de pago");
      console.log("📦 Datos recibidos:", JSON.stringify(data, null, 2));

      // Validar estructura de diferencia si existe
      if (data.diferencia) {
        console.log("🔍 Campo diferencia detectado:", data.diferencia);
        if (
          !data.diferencia.justificacion ||
          data.diferencia.justificacion.trim() === ""
        ) {
          console.error("❌ ERROR: diferencia.justificacion está vacío");
        } else {
          console.log(
            "✅ diferencia.justificacion válido:",
            data.diferencia.justificacion,
          );
        }
      }

      const response = await apiRequest<PagoCreateResponse>("/pagos/", {
        method: "POST",
        body: JSON.stringify(data),
      });

      console.log("✅ [PagoService.crearPago] Respuesta exitosa:", response);
      return response;
    } catch (error: any) {
      console.error("❌ [PagoService.crearPago] Error al crear pago:", error);
      console.error("📋 Detalles del error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new Error(error.response?.data?.message || "Error al crear pago");
    }
  }

  /**
   * Obtener pagos de una oferta
   */
  static async getPagosByOferta(ofertaId: string): Promise<Pago[]> {
    try {
      const response = await apiRequest<PagosResponse>(
        `/pagos/oferta/${ofertaId}`,
        {
          method: "GET",
        },
      );
      return response.data || [];
    } catch (error: any) {
      console.error("[PagoService] Error al obtener pagos:", error);
      throw new Error(error.response?.data?.message || "Error al cargar pagos");
    }
  }

  /**
   * Obtener todos los pagos con detalles completos
   */
  static async getAllPagosConDetalles(filters?: {
    tipo_pago?: "anticipo" | "pendiente" | "completo";
    metodo_pago?: "efectivo" | "transferencia_bancaria" | "stripe";
  }): Promise<PagoConDetalles[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.tipo_pago) params.append("tipo_pago", filters.tipo_pago);
      if (filters?.metodo_pago)
        params.append("metodo_pago", filters.metodo_pago);

      const url = `/pagos/completos/con-detalles${params.toString() ? `?${params.toString()}` : ""}`;

      const response = await apiRequest<PagosConDetallesResponse>(url, {
        method: "GET",
      });
      return response.data || [];
    } catch (error: any) {
      console.error(
        "[PagoService] Error al obtener pagos con detalles:",
        error,
      );
      throw new Error(error.response?.data?.message || "Error al cargar pagos");
    }
  }

  /**
   * Actualizar un pago existente
   */
  static async actualizarPago(
    pagoId: string,
    data: Partial<PagoCreateData>,
  ): Promise<{
    success: boolean;
    message: string;
    pago_id: string;
    monto_pendiente_actualizado: number;
  }> {
    try {
      console.log(
        "🚀 [PagoService.actualizarPago] Iniciando actualización de pago",
      );
      console.log("🆔 Pago ID:", pagoId);
      console.log("📦 Datos recibidos:", JSON.stringify(data, null, 2));

      // Validar estructura de diferencia si existe
      if (data.diferencia) {
        console.log("🔍 Campo diferencia detectado:", data.diferencia);
        if (
          !data.diferencia.justificacion ||
          data.diferencia.justificacion.trim() === ""
        ) {
          console.error("❌ ERROR: diferencia.justificacion está vacío");
        } else {
          console.log(
            "✅ diferencia.justificacion válido:",
            data.diferencia.justificacion,
          );
        }
      }

      const response = await apiRequest<{
        success: boolean;
        message: string;
        pago_id: string;
        monto_pendiente_actualizado: number;
      }>(`/pagos/${pagoId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });

      console.log(
        "✅ [PagoService.actualizarPago] Respuesta exitosa:",
        response,
      );
      console.log(
        "💰 Monto pendiente actualizado:",
        response.monto_pendiente_actualizado,
      );
      return response;
    } catch (error: any) {
      console.error(
        "❌ [PagoService.actualizarPago] Error al actualizar pago:",
        error,
      );
      console.error("📋 Detalles del error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw new Error(
        error.response?.data?.message || "Error al actualizar pago",
      );
    }
  }

  /**
   * Eliminar un pago
   */
  static async eliminarPago(
    pagoId: string,
  ): Promise<{ success: boolean; monto_pendiente_actualizado: number }> {
    try {
      const response = await apiRequest<{
        success: boolean;
        message: string;
        monto_pendiente_actualizado: number;
      }>(`/pagos/${pagoId}`, {
        method: "DELETE",
      });
      return {
        success: response.success,
        monto_pendiente_actualizado: response.monto_pendiente_actualizado,
      };
    } catch (error: any) {
      console.error("[PagoService] Error al eliminar pago:", error);
      throw new Error(
        error.response?.data?.message || "Error al eliminar pago",
      );
    }
  }

  /**
   * Obtener todas las ofertas con pagos
   */
  static async getOfertasConPagos(): Promise<OfertaConPagos[]> {
    try {
      const response = await apiRequest<OfertasConPagosResponse>(
        "/pagos/ofertas-con-pagos",
        {
          method: "GET",
        },
      );
      return response.data || [];
    } catch (error: any) {
      console.error("[PagoService] Error al obtener ofertas con pagos:", error);
      throw new Error(
        error.response?.data?.message || "Error al cargar ofertas con pagos",
      );
    }
  }

  /**
   * Obtener resumen agregado de pagos y pendientes por rango de fecha.
   */
  static async getResumenPagosPendientes(filters?: {
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Promise<ResumenPagosPendientes> {
    try {
      const params = new URLSearchParams();
      if (filters?.fecha_inicio)
        params.append("fecha_inicio", filters.fecha_inicio);
      if (filters?.fecha_fin) params.append("fecha_fin", filters.fecha_fin);

      const url = `/pagos/resumen-pagos-pendientes${params.toString() ? `?${params.toString()}` : ""}`;

      const response = await apiRequest<ResumenPagosPendientesResponse>(url, {
        method: "GET",
      });

      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error(
        "[PagoService] Error al obtener resumen de pagos y pendientes:",
        error,
      );
      throw new Error(
        err.response?.data?.message ||
          "Error al cargar resumen de pagos y pendientes",
      );
    }
  }

  /**
   * Obtener ofertas con pagos por rango y estado de pendiente.
   */
  static async getOfertasEstadoPendiente(filters?: {
    fecha_inicio?: string;
    fecha_fin?: string;
    estado_pendiente?: "con_pendiente" | "sin_pendiente" | "todos";
  }): Promise<OfertasEstadoPendienteData> {
    try {
      const params = new URLSearchParams();
      if (filters?.fecha_inicio)
        params.append("fecha_inicio", filters.fecha_inicio);
      if (filters?.fecha_fin) params.append("fecha_fin", filters.fecha_fin);
      if (filters?.estado_pendiente)
        params.append("estado_pendiente", filters.estado_pendiente);

      const url = `/pagos/ofertas-estado-pendiente${params.toString() ? `?${params.toString()}` : ""}`;

      const response = await apiRequest<OfertasEstadoPendienteResponse>(url, {
        method: "GET",
      });

      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error(
        "[PagoService] Error al obtener ofertas por estado de pendiente:",
        error,
      );
      throw new Error(
        err.response?.data?.message ||
          "Error al cargar ofertas por estado de pendiente",
      );
    }
  }
}
