import { API_BASE_URL, apiRequest } from "@/lib/api-config";
import type {
  Factura,
  FacturaConsolidada,
  FacturaFilters,
  FacturaStats,
  NumeroFacturaSugerido,
  Vale,
} from "@/lib/types/feats/facturas/factura-types";
import type { ValeSalida } from "@/lib/api-types";

interface ValesDisponiblesResponse {
  success?: boolean;
  message?: string;
  detail?: string;
  data?: ValeSalida[] | { data?: ValeSalida[]; vales?: ValeSalida[] };
  vales?: ValeSalida[];
}

interface ValeNoFacturadoApiItem extends ValeSalida {
  solicitud?: {
    id?: string;
    codigo?: string;
    estado?: string;
    cliente?: {
      id?: string;
      numero?: string;
      nombre?: string;
    } | null;
    cliente_venta?: {
      id?: string;
      numero?: string;
      nombre?: string;
    } | null;
  } | null;
  cliente?: {
    id?: string;
    numero?: string;
    nombre?: string;
  } | null;
}

interface ValesNoFacturadosResponse {
  success?: boolean;
  message?: string;
  detail?: string;
  data?:
    | ValeNoFacturadoApiItem[]
    | {
        data?: ValeNoFacturadoApiItem[];
        vales?: ValeNoFacturadoApiItem[];
      };
  vales?: ValeNoFacturadoApiItem[];
}

interface AnularFacturaResponse {
  success?: boolean;
  message?: string;
  detail?: string;
}

const normalizeValeNoFacturado = (vale: ValeNoFacturadoApiItem): ValeSalida => {
  const solicitudBase =
    vale.solicitud || vale.solicitud_material || vale.solicitud_venta || null;
  const clienteBase =
    vale.cliente ||
    solicitudBase?.cliente ||
    solicitudBase?.cliente_venta ||
    null;

  const solicitudNormalizada = solicitudBase
    ? {
        ...solicitudBase,
        cliente: solicitudBase.cliente || clienteBase,
        cliente_venta: solicitudBase.cliente_venta || clienteBase,
      }
    : null;

  return {
    ...vale,
    solicitud: solicitudNormalizada,
    solicitud_material: vale.solicitud_material || solicitudNormalizada,
    solicitud_venta: vale.solicitud_venta || null,
    solicitud_tipo: vale.solicitud_tipo || "material",
    materiales: Array.isArray(vale.materiales) ? vale.materiales : [],
  };
};

/**
 * Servicio para interactuar con la API de Facturas
 */
export class FacturaService {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/facturas`;
    this.token = null;
  }

  /**
   * Establece el token de autenticación
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Obtiene los headers para las peticiones
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Extrae un mensaje de error útil desde la respuesta HTTP.
   */
  private async extractErrorMessage(
    response: Response,
    fallback: string,
  ): Promise<string> {
    try {
      const raw = await response.text();
      console.error(`❌ [FacturaService] HTTP ${response.status} raw body:`, raw);
      if (!raw) return `${fallback} (HTTP ${response.status})`;

      const parsed = JSON.parse(raw) as
        | { detail?: unknown; message?: string; error?: string }
        | string;

      if (typeof parsed === "string" && parsed.trim()) {
        return parsed;
      }

      if (typeof parsed === "object") {
        const detail = parsed?.detail;

        // FastAPI validation error: detail es un array de objetos con loc/msg/type
        if (Array.isArray(detail)) {
          const msgs = detail
            .map((d: { loc?: string[]; msg?: string }) => {
              const loc = Array.isArray(d?.loc) ? d.loc.join(" → ") : "";
              const msg = d?.msg || "";
              return loc ? `${loc}: ${msg}` : msg;
            })
            .filter(Boolean);
          const joined = msgs.join(" | ");
          console.error("❌ [FacturaService] Validation detail:", detail);
          return joined || `${fallback} (HTTP ${response.status})`;
        }

        // Mensaje plano de error
        const msg =
          (typeof detail === "string" && detail) ||
          parsed?.message ||
          parsed?.error ||
          "";
        if (msg && String(msg).trim()) return String(msg);
      }

      return `${fallback} (HTTP ${response.status})`;
    } catch {
      return `${fallback} (HTTP ${response.status})`;
    }
  }

  /**
   * Obtiene un número de factura sugerido
   */
  async obtenerNumeroSugerido(): Promise<NumeroFacturaSugerido> {
    const response = await fetch(`${this.baseUrl}/numero-sugerido`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Error obteniendo número sugerido");
    }

    return response.json();
  }

  /**
   * Crea una nueva factura
   */
  async crearFactura(
    factura: Omit<Factura, "id" | "fecha_creacion" | "total">,
  ): Promise<{ message: string; id: string; numero_factura: string }> {
    // Limpiar vales: quitar id interno (solo conservar id_vale_salida para referencias)
    // y filtrar items con cantidad 0 o negativa
    const valesLimpios = (factura.vales || []).map((vale) => ({
      id_vale_salida: vale.id_vale_salida ?? vale.id ?? null,
      fecha: vale.fecha,
      items: (vale.items || []).filter((item) => item.cantidad > 0),
    }));

    // Construir payload limpio sin campos que el backend de creación no acepta
    const payload: Record<string, unknown> = {
      numero_factura: factura.numero_factura,
      tipo: factura.tipo,
      subtipo: factura.subtipo ?? null,
      cliente_id: factura.cliente_id ?? null,
      trabajador_ci: factura.trabajador_ci ?? null,
      nombre_responsable: factura.nombre_responsable ?? null,
      nombre_cliente: factura.nombre_cliente ?? null,
      vales: valesLimpios,
      pagada: factura.pagada,
      terminada: factura.terminada,
    };

    console.log("📤 [FacturaService] Creando factura - payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await this.extractErrorMessage(response, "Error creando factura"));
    }

    return response.json();
  }

  /**
   * Lista facturas con filtros opcionales
   */
  async listarFacturas(
    filters?: FacturaFilters,
    skip: number = 0,
    limit: number = 500,
  ): Promise<Factura[]> {
    const params = new URLSearchParams();

    if (filters?.mes_vale)
      params.append("mes_vale", filters.mes_vale.toString());
    if (filters?.anio_vale)
      params.append("anio_vale", filters.anio_vale.toString());
    if (filters?.fecha_vale) params.append("fecha_vale", filters.fecha_vale);
    if (filters?.nombre_cliente)
      params.append("nombre_cliente", filters.nombre_cliente);
    if (filters?.estado) params.append("estado", filters.estado);
    params.append("skip", skip.toString());
    params.append("limit", limit.toString());

    const url = `${this.baseUrl}?${params}`;
    console.log("📡 Listando facturas:", url);
    console.log("🔐 Headers:", this.getHeaders());

    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    console.log("📨 Response status:", response.status);

    if (!response.ok) {
      throw new Error(await this.extractErrorMessage(response, "Error listando facturas"));
    }

    const data = await response.json();
    console.log("✅ Facturas recibidas:", data?.length || 0);
    return data;
  }

  /**
   * Obtiene una factura por su ID
   */
  async obtenerFactura(id: string): Promise<Factura> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Error obteniendo factura");
    }

    return response.json();
  }

  /**
   * Obtiene una factura por su número de factura
   */
  async obtenerFacturaPorNumero(numeroFactura: string): Promise<Factura> {
    try {
      // Usar el endpoint de listar con filtro por nombre de cliente (que también busca por número)
      const params = new URLSearchParams();
      params.append("nombre_cliente", numeroFactura);
      params.append("skip", "0");
      params.append("limit", "1");

      const url = `${this.baseUrl}?${params}`;
      console.log("📡 Obteniendo factura por número:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Error obteniendo factura");
      }

      const facturas = await response.json();

      if (!facturas || facturas.length === 0) {
        throw new Error("Factura no encontrada");
      }

      // Buscar la factura exacta por número
      const factura = facturas.find(
        (f: Factura) => f.numero_factura === numeroFactura,
      );

      if (!factura) {
        throw new Error("Factura no encontrada");
      }

      console.log("✅ Factura encontrada:", factura);
      return factura;
    } catch (error) {
      console.error("❌ Error obteniendo factura por número:", error);
      throw error;
    }
  }

  /**
   * Actualiza una factura existente
   */
  async actualizarFactura(
    id: string,
    factura: Omit<Factura, "id" | "fecha_creacion" | "total">,
  ): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(factura),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Error actualizando factura");
    }

    return response.json();
  }

  /**
   * Anula una factura
   * PATCH /api/facturas/{factura_id}/anular
   */
  async anularFactura(
    id: string,
    motivo_anulacion: string,
    nombre_responsable?: string,
  ): Promise<{ message: string }> {
    const raw = await apiRequest<AnularFacturaResponse | { message: string }>(
      `/facturas/${encodeURIComponent(id)}/anular`,
      {
        method: "PATCH",
        body: JSON.stringify({
          anulada: true,
          motivo_anulacion,
          nombre_responsable: nombre_responsable?.trim() || null,
        }),
      },
    );

    if (
      !Array.isArray(raw) &&
      (raw as AnularFacturaResponse)?.success === false
    ) {
      const response = raw as AnularFacturaResponse;
      throw new Error(
        response.message || response.detail || "Error anulando factura",
      );
    }

    const message =
      (raw as AnularFacturaResponse)?.message ||
      "Factura anulada correctamente";
    return { message };
  }

  /**
   * Elimina una factura
   */
  async eliminarFactura(id: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error("Error eliminando factura");
    }

    return response.json();
  }

  /**
   * Agrega un vale a una factura
   */
  async agregarVale(
    facturaId: string,
    vale: Omit<Vale, "id" | "total">,
  ): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/${facturaId}/vales`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(vale),
    });

    if (!response.ok) {
      throw new Error("Error agregando vale");
    }

    return response.json();
  }

  /**
   * Obtiene vales de salida disponibles por cliente para facturación
   * GET /api/facturas/vales-disponibles
   */
  async obtenerValesDisponibles(params: {
    cliente_id?: string;
    cliente_numero?: string;
    skip?: number;
    limit?: number;
  }): Promise<ValeSalida[]> {
    const search = new URLSearchParams();
    if (params.cliente_id) search.append("cliente_id", params.cliente_id);
    if (params.cliente_numero)
      search.append("cliente_numero", params.cliente_numero);
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));

    const endpoint = search.toString()
      ? `/facturas/vales-disponibles?${search.toString()}`
      : "/facturas/vales-disponibles";

    const raw = await apiRequest<ValesDisponiblesResponse | ValeSalida[]>(
      endpoint,
      { method: "GET" },
    );

    if (!Array.isArray(raw) && raw?.success === false) {
      throw new Error(
        raw?.message || raw?.detail || "Error cargando vales disponibles",
      );
    }

    const payload = Array.isArray(raw) ? raw : (raw?.data ?? raw);
    if (Array.isArray(payload)) return payload;
    return payload?.vales || payload?.data || [];
  }

  /**
   * Obtiene vales no facturados para la pestaña de facturación
   * GET /api/facturas/vales-no-facturados
   */
  async obtenerValesNoFacturados(
    params: {
      skip?: number;
      limit?: number;
      cliente_id?: string;
      cliente_numero?: string;
      q?: string;
    } = {},
  ): Promise<ValeSalida[]> {
    const search = new URLSearchParams();
    if (params.skip != null) search.append("skip", String(params.skip));
    if (params.limit != null) search.append("limit", String(params.limit));
    if (params.cliente_id) search.append("cliente_id", params.cliente_id);
    if (params.cliente_numero)
      search.append("cliente_numero", params.cliente_numero);
    if (params.q) search.append("q", params.q);

    const endpoint = search.toString()
      ? `/facturas/vales-no-facturados?${search.toString()}`
      : "/facturas/vales-no-facturados";

    const raw = await apiRequest<
      ValesNoFacturadosResponse | ValeNoFacturadoApiItem[]
    >(endpoint, { method: "GET" });

    if (!Array.isArray(raw) && raw?.success === false) {
      throw new Error(
        raw?.message || raw?.detail || "Error cargando vales no facturados",
      );
    }

    const payload = Array.isArray(raw) ? raw : (raw?.data ?? raw);
    const valesRaw = Array.isArray(payload)
      ? payload
      : payload?.vales || payload?.data || [];

    return valesRaw.map(normalizeValeNoFacturado);
  }

  /**
   * Actualiza un vale existente
   */
  async actualizarVale(
    facturaId: string,
    valeId: string,
    vale: Omit<Vale, "total">,
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${this.baseUrl}/${facturaId}/vales/${valeId}`,
      {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(vale),
      },
    );

    if (!response.ok) {
      throw new Error("Error actualizando vale");
    }

    return response.json();
  }

  /**
   * Elimina un vale de una factura
   */
  async eliminarVale(
    facturaId: string,
    valeId: string,
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${this.baseUrl}/${facturaId}/vales/${valeId}`,
      {
        method: "DELETE",
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Error eliminando vale");
    }

    return response.json();
  }

  /**
   * Obtiene estadísticas de facturas
   */
  async obtenerStats(filters?: FacturaFilters): Promise<FacturaStats> {
    const params = new URLSearchParams();

    if (filters?.mes_vale)
      params.append("mes_vale", filters.mes_vale.toString());
    if (filters?.anio_vale)
      params.append("anio_vale", filters.anio_vale.toString());
    if (filters?.fecha_vale) params.append("fecha_vale", filters.fecha_vale);
    if (filters?.nombre_cliente)
      params.append("nombre_cliente", filters.nombre_cliente);
    if (filters?.estado) params.append("estado", filters.estado);

    const url = `${this.baseUrl}/stats?${params}`;
    console.log("📡 Obteniendo stats:", url);
    console.log("🔐 Headers:", this.getHeaders());

    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    console.log("📨 Response status:", response.status);

    if (!response.ok) {
      throw new Error(
        await this.extractErrorMessage(response, "Error obteniendo estadísticas"),
      );
    }

    const data = await response.json();
    console.log("✅ Stats recibidas:", data);
    return data;
  }

  /**
   * Obtiene facturas consolidadas con información de ofertas y pagos
   */
  async obtenerFacturasConsolidadas(): Promise<FacturaConsolidada[]> {
    const url = `/facturas/consolidadas`;
    console.log("📡 Obteniendo facturas consolidadas:", url);

    try {
      const data = await apiRequest<FacturaConsolidada[]>(url, {
        method: "GET",
      });
      console.log("✅ Facturas consolidadas recibidas:", data?.length || 0);
      return data;
    } catch (error) {
      console.error("❌ Error obteniendo facturas consolidadas:", error);
      throw error;
    }
  }
}

// Exportar instancia singleton
export const facturaService = new FacturaService();
