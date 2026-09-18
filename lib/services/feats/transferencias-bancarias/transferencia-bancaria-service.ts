import { apiRequest } from "@/lib/api-config";
import type {
  AceptarTransferenciaBancariaData,
  TransferenciaBancariaBackend,
  TransferenciaBancariaCreateData,
  TransferenciaBancariaUpdateData,
  UploadComprobanteTransferenciaResponse,
} from "@/lib/types/feats/transferencias-bancarias/transferencia-bancaria-types";

type ApiErrorResponse = {
  success?: boolean;
  message?: string;
  detail?: string;
  _httpStatus?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  if (!isRecord(value)) return false;
  const status =
    typeof value._httpStatus === "number" ? value._httpStatus : undefined;
  const success =
    typeof value.success === "boolean" ? value.success : undefined;
  return status !== undefined || success === false;
};

const getApiErrorMessage = (
  errorResponse: ApiErrorResponse,
  fallback: string,
): string => errorResponse.detail || errorResponse.message || fallback;

interface TransferenciaBancariaResponse {
  success: boolean;
  message: string;
  data: TransferenciaBancariaBackend;
}

interface TransferenciaBancariaListResponse {
  success: boolean;
  message: string;
  data: TransferenciaBancariaBackend[];
  total?: number;
}

/**
 * Cliente de `/api/transferencias-bancarias` — flujo de doble confirmación:
 * la comercial crea/edita/cancela su propia transferencia (estado
 * "pendiente"); el admin de wallet del banco correspondiente la acepta o
 * rechaza. Ver plan de implementación para el modelo de datos completo.
 */
export class TransferenciaBancariaService {
  static async crear(
    data: TransferenciaBancariaCreateData,
  ): Promise<TransferenciaBancariaBackend> {
    const response = await apiRequest<
      TransferenciaBancariaResponse | ApiErrorResponse
    >("/transferencias-bancarias/", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo crear la transferencia bancaria"),
      );
    }
    return response.data;
  }

  static async actualizar(
    id: string,
    data: TransferenciaBancariaUpdateData,
  ): Promise<TransferenciaBancariaBackend> {
    const response = await apiRequest<
      TransferenciaBancariaResponse | ApiErrorResponse
    >(`/transferencias-bancarias/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo actualizar la transferencia bancaria"),
      );
    }
    return response.data;
  }

  /**
   * Cancela la propia transferencia mientras siga "pendiente". Tras
   * cancelar, se puede volver a crear una nueva para la misma oferta.
   */
  static async cancelar(id: string): Promise<TransferenciaBancariaBackend> {
    const response = await apiRequest<
      TransferenciaBancariaResponse | ApiErrorResponse
    >(`/transferencias-bancarias/${encodeURIComponent(id)}/cancelar`, {
      method: "POST",
    });

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo cancelar la transferencia bancaria"),
      );
    }
    return response.data;
  }

  static async getById(id: string): Promise<TransferenciaBancariaBackend> {
    const response = await apiRequest<
      TransferenciaBancariaResponse | ApiErrorResponse
    >(`/transferencias-bancarias/${encodeURIComponent(id)}`);

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo cargar la transferencia bancaria"),
      );
    }
    return response.data;
  }

  /**
   * Busca si la oferta ya tiene una transferencia bancaria asociada (en
   * cualquier estado), para reabrir el diálogo de la comercial en modo
   * edición/consulta en lugar de creación.
   *
   * NOTA DE IMPLEMENTACIÓN: el plan no enumera un endpoint dedicado para esta
   * búsqueda entre los 8 endpoints del router (`find_pendiente_by_oferta` es,
   * tal como está descrito, un método interno del repositorio usado por
   * `crear()` para bloquear duplicados). Se asume aquí `GET
   * /transferencias-bancarias/oferta/{oferta_id}` siguiendo la misma
   * convención REST que el resto de rutas — a confirmar/ajustar cuando el
   * backend quede implementado. Si el endpoint no existe, esta llamada
   * devuelve null en vez de romper el diálogo.
   */
  static async getPendienteDeOferta(
    ofertaId: string,
  ): Promise<TransferenciaBancariaBackend | null> {
    const response = await apiRequest<
      TransferenciaBancariaResponse | ApiErrorResponse
    >(`/transferencias-bancarias/oferta/${encodeURIComponent(ofertaId)}`);

    if (isApiErrorResponse(response)) {
      if (response._httpStatus === 404) return null;
      throw new Error(
        getApiErrorMessage(
          response,
          "No se pudo verificar si la oferta ya tiene una transferencia bancaria",
        ),
      );
    }
    return response.data ?? null;
  }

  /**
   * Listado para la alerta en Wallet — requiere permiso de admin de wallet
   * (`WalletPermiso.es_admin` o superAdmin), igual que el resto de Wallet.
   */
  static async listarPendientesPorBanco(
    bancoId: string,
    params: { skip?: number; limit?: number } = {},
  ): Promise<TransferenciaBancariaBackend[]> {
    const search = new URLSearchParams();
    if (typeof params.skip === "number") search.append("skip", String(params.skip));
    if (typeof params.limit === "number") search.append("limit", String(params.limit));
    const qs = search.toString();

    const response = await apiRequest<
      TransferenciaBancariaListResponse | ApiErrorResponse
    >(
      `/transferencias-bancarias/banco/${encodeURIComponent(bancoId)}/pendientes${qs ? `?${qs}` : ""}`,
    );

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudieron cargar las transferencias pendientes"),
      );
    }
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Acepta la transferencia: crea el ingreso real en la wallet del banco y
   * el `Pago` correspondiente en Cobros Clientes. `comprobanteAdmin` es
   * opcional (comprobante propio del admin, distinto del del cliente).
   */
  static async aceptar(
    id: string,
    comprobanteAdmin?: AceptarTransferenciaBancariaData,
  ): Promise<TransferenciaBancariaBackend> {
    const response = await apiRequest<
      TransferenciaBancariaResponse | ApiErrorResponse
    >(`/transferencias-bancarias/${encodeURIComponent(id)}/aceptar`, {
      method: "POST",
      body: JSON.stringify(comprobanteAdmin ?? {}),
    });

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo aceptar la transferencia bancaria"),
      );
    }
    return response.data;
  }

  /** `motivo` es obligatorio (mínimo 5 caracteres, validado por el backend). */
  static async rechazar(
    id: string,
    motivo: string,
  ): Promise<TransferenciaBancariaBackend> {
    const response = await apiRequest<
      TransferenciaBancariaResponse | ApiErrorResponse
    >(`/transferencias-bancarias/${encodeURIComponent(id)}/rechazar`, {
      method: "POST",
      body: JSON.stringify({ motivo }),
    });

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo rechazar la transferencia bancaria"),
      );
    }
    return response.data;
  }

  /**
   * Sube el comprobante (imagen o PDF, máx. 5MB) a MinIO y devuelve su URL.
   * Mismo contrato que `/pagos/upload-comprobante` (campo `archivo`).
   */
  static async subirComprobante(
    file: File,
  ): Promise<UploadComprobanteTransferenciaResponse> {
    const formData = new FormData();
    formData.append("archivo", file);

    const response = await apiRequest<
      UploadComprobanteTransferenciaResponse | ApiErrorResponse
    >("/transferencias-bancarias/upload-comprobante", {
      method: "POST",
      body: formData,
    });

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo subir el comprobante"),
      );
    }
    return response;
  }
}
