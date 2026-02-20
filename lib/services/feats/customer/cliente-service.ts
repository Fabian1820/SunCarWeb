import { apiRequest } from "../../../api-config";
import type {
  Cliente,
  ClienteFoto,
  ClienteResponse,
  ClienteCreateData,
  ClienteSimpleCreateData,
  ClienteUpdateData,
} from "../../../api-types";

type ClienteListParams = {
  numero?: string;
  nombre?: string;
  direccion?: string;
};

export type ClienteFotoUploadPayload = {
  file: File;
  tipo: ClienteFoto["tipo"];
};

type ClienteFotosResponse = {
  success?: boolean;
  message?: string;
  data?: ClienteFoto[] | { fotos?: ClienteFoto[] };
  fotos?: ClienteFoto[];
};

const cleanPayload = <T extends Record<string, unknown>>(
  payload: T,
): Partial<T> => {
  const cleaned: Record<string, unknown> = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") return;
      cleaned[key] = trimmed;
      return;
    }

    if (Array.isArray(value) && value.length === 0) return;

    cleaned[key] = value;
  });

  return cleaned as Partial<T>;
};

export class ClienteService {
  static async getClientes(params: ClienteListParams = {}): Promise<Cliente[]> {
    const search = new URLSearchParams();
    if (params.numero) search.append("numero", params.numero);
    if (params.nombre) search.append("nombre", params.nombre);
    if (params.direccion) search.append("direccion", params.direccion);

    const endpoint = `/clientes/${search.toString() ? `?${search.toString()}` : ""}`;
    const response = await apiRequest<ClienteResponse | Cliente[]>(endpoint);

    // Manejar ambos formatos de respuesta:
    // 1. Backend devuelve { success: true, data: [...] }
    // 2. Backend devuelve directamente [...]
    if (Array.isArray(response)) {
      console.log(
        "📦 Backend returned array directly, using it:",
        response.length,
        "clients",
      );
      return response;
    }

    if (response.data && Array.isArray(response.data)) {
      console.log(
        "📦 Backend returned wrapped response, extracting data:",
        response.data.length,
        "clients",
      );
      return response.data;
    }

    console.warn("⚠️ Unexpected response format from backend:", response);
    return [];
  }

  static async generarCodigoCliente(params: {
    marca_letra: string;
    provincia_codigo: string;
    municipio_codigo: string;
  }): Promise<string> {
    console.log("Calling generarCodigoCliente with params:", params);
    const response = await apiRequest<{
      success: boolean;
      message: string;
      codigo_generado: string;
    }>("/clientes/generar-codigo", {
      method: "POST",
      body: JSON.stringify(params),
    });
    console.log("ClienteService.generarCodigoCliente response:", response);
    if (!response.success || !response.codigo_generado) {
      throw new Error(
        response.message || "Error al generar el código de cliente",
      );
    }
    return response.codigo_generado;
  }

  static async crearCliente(data: ClienteCreateData): Promise<ClienteResponse> {
    const payload = cleanPayload(data);
    return apiRequest<ClienteResponse>(`/clientes/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  static async crearClienteSimple(
    data: ClienteSimpleCreateData,
  ): Promise<ClienteResponse> {
    const payload = cleanPayload(data);
    return apiRequest<ClienteResponse>(`/clientes/simple`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  static async verificarCliente(numero: string): Promise<ClienteResponse> {
    const endpoint = `/clientes/${encodeURIComponent(numero)}/verificar`;
    return apiRequest<ClienteResponse>(endpoint);
  }

  static async verificarClientePorIdentificador(
    identifier: string,
  ): Promise<ClienteResponse> {
    return apiRequest<ClienteResponse>(`/clientes/verificar`, {
      method: "POST",
      body: JSON.stringify({ identifier }),
    });
  }

  static async actualizarCliente(
    numero: string,
    data: ClienteUpdateData,
  ): Promise<ClienteResponse> {
    // No usar cleanPayload para elementos_personalizados
    // El backend necesita recibir el campo aunque esté vacío
    return apiRequest<ClienteResponse>(
      `/clientes/${encodeURIComponent(numero)}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  }

  static async uploadComprobante(
    numero: string,
    {
      file,
      metodo_pago,
      moneda,
    }: { file: File; metodo_pago?: string; moneda?: string },
  ): Promise<{
    comprobante_pago_url: string;
    metodo_pago?: string;
    moneda?: string;
  }> {
    const formData = new FormData();
    formData.append("comprobante", file);
    if (metodo_pago) formData.append("metodo_pago", metodo_pago);
    if (moneda) formData.append("moneda", moneda);

    const response = await apiRequest<{
      success: boolean;
      message: string;
      data?: {
        comprobante_url?: string;
        comprobante_pago_url?: string;
        metodo_pago?: string;
        moneda?: string;
      };
    }>(`/clientes/${encodeURIComponent(numero)}/comprobante`, {
      method: "POST",
      body: formData,
    });

    if (!response.success || !response.data) {
      throw new Error(
        response.message || "Error al subir el comprobante del cliente",
      );
    }

    const {
      comprobante_url,
      comprobante_pago_url,
      metodo_pago: metodo,
      moneda: currency,
    } = response.data;
    const url = comprobante_pago_url || comprobante_url;
    if (!url) {
      throw new Error("El backend no retornó la URL del comprobante");
    }

    return {
      comprobante_pago_url: url,
      metodo_pago: metodo,
      moneda: currency,
    };
  }

  static async uploadFotoCliente(
    numero: string,
    { file, tipo }: ClienteFotoUploadPayload,
  ): Promise<void> {
    const formData = new FormData();
    formData.append("archivo", file);
    formData.append("tipo", tipo);

    const response = await apiRequest<{
      success?: boolean;
      message?: string;
    }>(`/clientes/${encodeURIComponent(numero)}/fotos`, {
      method: "POST",
      body: formData,
    });

    if (response?.success === false) {
      throw new Error(
        response.message || "Error al subir foto/video del cliente",
      );
    }
  }

  static async getFotosCliente(numero: string): Promise<ClienteFoto[]> {
    const response = await apiRequest<ClienteFotosResponse | ClienteFoto[]>(
      `/clientes/${encodeURIComponent(numero)}/fotos`,
    );

    if (Array.isArray(response)) {
      return response;
    }

    if (response?.success === false) {
      throw new Error(
        response.message || "Error al obtener fotos/videos del cliente",
      );
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.fotos)) {
      return response.fotos;
    }

    if (
      response?.data &&
      !Array.isArray(response.data) &&
      Array.isArray(response.data.fotos)
    ) {
      return response.data.fotos;
    }

    return [];
  }

  static async eliminarCliente(numero: string): Promise<ClienteResponse> {
    return apiRequest<ClienteResponse>(
      `/clientes/${encodeURIComponent(numero)}`,
      {
        method: "DELETE",
      },
    );
  }

  static async getClientesConAverias(): Promise<Cliente[]> {
    const response = await apiRequest<Cliente[]>(`/clientes/con-averias`);

    if (Array.isArray(response)) {
      console.log("📦 Clientes con averías:", response.length);
      return response;
    }

    console.warn("⚠️ Unexpected response format from backend:", response);
    return [];
  }
}
