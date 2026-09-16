import { apiRequest } from "../../../api-config";
import type {
  TotalPorMoneda,
  Wallet,
  WalletTransaction,
  WalletTransactionCreateData,
  WalletTransactionsFilters,
} from "../../../types/feats/wallet/wallet-types";
import type {
  Banco,
  BancoCreateData,
} from "../../../types/feats/wallet/banco-types";

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
): string =>
  errorResponse.detail || errorResponse.message || fallback;

export interface BancoDetalle {
  banco: Banco;
  wallet: Wallet;
  transacciones: WalletTransaction[];
  total: number;
  totals_by_currency: TotalPorMoneda[];
}

export class BancoService {
  static async listar(): Promise<Banco[]> {
    const response = await apiRequest<
      { success: boolean; data: Banco[] } | ApiErrorResponse
    >("/wallet/bancos/");

    if (isApiErrorResponse(response)) {
      throw new Error(getApiErrorMessage(response, "No se pudieron cargar los bancos"));
    }
    return Array.isArray(response.data) ? response.data : [];
  }

  static async crear(data: BancoCreateData): Promise<Banco> {
    const response = await apiRequest<
      { success: boolean; data: Banco } | ApiErrorResponse
    >("/wallet/bancos/", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (isApiErrorResponse(response)) {
      throw new Error(getApiErrorMessage(response, "No se pudo crear el banco"));
    }
    return response.data;
  }

  static async getDetalle(
    bancoId: string,
    filters: WalletTransactionsFilters = {},
  ): Promise<BancoDetalle> {
    const search = new URLSearchParams();
    if (filters.tipo) search.append("tipo", filters.tipo);
    if (typeof filters.skip === "number") search.append("skip", String(filters.skip));
    if (typeof filters.limit === "number") search.append("limit", String(filters.limit));
    if (filters.fecha_desde) search.append("fecha_desde", filters.fecha_desde);
    if (filters.fecha_hasta) search.append("fecha_hasta", filters.fecha_hasta);
    if (filters.q) search.append("q", filters.q);
    const qs = search.toString();

    const response = await apiRequest<
      { success: boolean; data: BancoDetalle } | ApiErrorResponse
    >(`/wallet/bancos/${bancoId}${qs ? `?${qs}` : ""}`);

    if (isApiErrorResponse(response)) {
      throw new Error(getApiErrorMessage(response, "No se pudo cargar el banco"));
    }
    return response.data;
  }

  static async crearTransaccion(
    bancoId: string,
    data: WalletTransactionCreateData,
  ): Promise<WalletTransaction> {
    const response = await apiRequest<
      { success: boolean; data: WalletTransaction } | ApiErrorResponse
    >(`/wallet/bancos/${bancoId}/transacciones`, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo registrar la transacción"),
      );
    }
    return response.data;
  }
}
