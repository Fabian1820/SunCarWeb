import { apiRequest } from "@/lib/api-config";

export interface FacturaContabilidad {
  id: string;
  numero_factura: string;
  fecha_emision: string;
  emitida_por: string;
  id_oferta_confeccion: string;
  numero_cliente: string;
  fecha_creacion: string;
  fecha_actualizacion?: string | null;
}

export interface CrearFacturaContabilidadPayload {
  numero_factura: string;
  fecha_emision: string;
  emitida_por: string;
  id_oferta_confeccion: string;
}

export interface CrearFacturaContabilidadResponse {
  message?: string;
  detail?: string;
  id?: string;
  numero_factura?: string;
  numero_cliente?: string;
  success?: boolean;
  error?: {
    message?: string;
  };
}

export class FacturaContabilidadService {
  private static readonly ENDPOINT_CANDIDATES = [
    "/facturas-contabilidad/",
    "/facturas-contabilidad",
    "/factura-contabilidad/",
    "/factura-contabilidad",
  ] as const;

  private static isNotFoundError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.message.includes("404") ||
        error.message.toLowerCase().includes("not found") ||
        error.message.toLowerCase().includes("no encontrado"))
    );
  }

  private static async requestWithFallback<T>(options: {
    method: "GET" | "POST";
    query?: string;
    body?: string;
  }): Promise<T> {
    let lastError: unknown = null;

    for (const endpointBase of this.ENDPOINT_CANDIDATES) {
      const endpoint = options.query
        ? `${endpointBase}${endpointBase.includes("?") ? "&" : "?"}${options.query}`
        : endpointBase;

      try {
        return await apiRequest<T>(endpoint, {
          method: options.method,
          ...(options.body ? { body: options.body } : {}),
        });
      } catch (error) {
        lastError = error;
        if (!this.isNotFoundError(error)) {
          throw error;
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error(
      "No se encontró un endpoint válido para facturas contabilidad.",
    );
  }

  static async listarFacturas(
    skip: number = 0,
    limit: number = 500,
  ): Promise<FacturaContabilidad[]> {
    const query = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    }).toString();

    const response = await this.requestWithFallback<FacturaContabilidad[]>({
      method: "GET",
      query,
    });

    return Array.isArray(response) ? response : [];
  }

  static async crearFactura(
    payload: CrearFacturaContabilidadPayload,
  ): Promise<CrearFacturaContabilidadResponse> {
    const response =
      await this.requestWithFallback<CrearFacturaContabilidadResponse>({
        method: "POST",
        body: JSON.stringify(payload),
      });

    return response || {};
  }

  static async listarTodasFacturas(
    batchSize: number = 500,
    maxBatches: number = 50,
  ): Promise<FacturaContabilidad[]> {
    const allFacturas: FacturaContabilidad[] = [];
    let skip = 0;

    for (let batch = 0; batch < maxBatches; batch += 1) {
      const page = await this.listarFacturas(skip, batchSize);
      allFacturas.push(...page);

      if (page.length < batchSize) {
        break;
      }

      skip += batchSize;
    }

    return allFacturas;
  }
}
