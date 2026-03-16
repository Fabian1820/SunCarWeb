import { apiRequest } from "../../../api-config";
import type {
  Wallet,
  WalletTransaction,
  WalletTransactionCreateData,
  WalletTransferCreateData,
  WalletTransferResult,
  WalletsFilters,
  WalletTransactionsFilters,
  WalletTransactionsResult,
} from "../../../types/feats/wallet/wallet-types";

type WrappedResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  items?: T extends Array<infer U> ? U[] : never;
  total?: number;
  skip?: number;
  limit?: number;
};

type ApiErrorResponse = {
  success?: boolean;
  message?: string;
  detail?: string;
  error?: unknown;
  _httpStatus?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const pickData = <T>(response: T | WrappedResponse<T>): T => {
  if (isRecord(response) && "data" in response && response.data !== undefined) {
    return response.data as T;
  }
  return response as T;
};

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  if (!isRecord(value)) return false;

  const status =
    typeof value._httpStatus === "number" ? value._httpStatus : undefined;
  const success =
    typeof value.success === "boolean" ? value.success : undefined;
  const hasErrorField = "error" in value;
  const hasDetail = typeof value.detail === "string";

  return status !== undefined || success === false || hasErrorField || hasDetail;
};

const getApiErrorMessage = (
  errorResponse: ApiErrorResponse,
  fallback: string,
): string => {
  const detail =
    typeof errorResponse.detail === "string" ? errorResponse.detail : "";
  const message =
    typeof errorResponse.message === "string" ? errorResponse.message : "";
  const status = errorResponse._httpStatus;

  if (status === 403) {
    return (
      detail ||
      message ||
      "No tienes permiso para acceder al módulo wallet en el backend."
    );
  }

  if (status === 404) {
    return detail || message || "Recurso no encontrado.";
  }

  return detail || message || fallback;
};

export class WalletService {
  static async getMyWallet(): Promise<Wallet | null> {
    try {
      const response = await apiRequest<
        Wallet | WrappedResponse<Wallet> | ApiErrorResponse
      >(
        "/wallet/me",
      );

      if (isApiErrorResponse(response)) {
        const status = response._httpStatus;
        const message = getApiErrorMessage(
          response,
          "Error al consultar la billetera",
        ).toLowerCase();

        if (
          status === 404 ||
          message.includes("no existe") ||
          message.includes("not found")
        ) {
          return null;
        }

        throw new Error(getApiErrorMessage(response, "Error al consultar la billetera"));
      }

      return pickData<Wallet>(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message.toLowerCase() : "";
      if (
        errorMessage.includes("404") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("no existe")
      ) {
        return null;
      }
      throw error;
    }
  }

  static async initializeMyWallet(): Promise<Wallet> {
    const response = await apiRequest<
      Wallet | WrappedResponse<Wallet> | ApiErrorResponse
    >(
      "/wallet/me/inicializar",
      {
        method: "POST",
      },
    );

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo iniciar la billetera"),
      );
    }

    return pickData<Wallet>(response);
  }

  static async createTransaction(
    data: WalletTransactionCreateData,
  ): Promise<WalletTransaction> {
    const response = await apiRequest<
      WalletTransaction | WrappedResponse<WalletTransaction> | ApiErrorResponse
    >("/wallet/transacciones", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo registrar la transacción"),
      );
    }

    return pickData<WalletTransaction>(response);
  }

  static async getGlobalTransactions(
    filters: WalletTransactionsFilters = {},
  ): Promise<WalletTransactionsResult> {
    const search = new URLSearchParams();
    if (filters.tipo) search.append("tipo", filters.tipo);
    if (typeof filters.skip === "number")
      search.append("skip", String(filters.skip));
    if (typeof filters.limit === "number")
      search.append("limit", String(filters.limit));
    if (filters.fecha_desde) search.append("fecha_desde", filters.fecha_desde);
    if (filters.fecha_hasta) search.append("fecha_hasta", filters.fecha_hasta);

    const endpoint = `/wallet/transacciones${search.toString() ? `?${search.toString()}` : ""}`;
    const response = await apiRequest<
      WalletTransaction[] | WrappedResponse<WalletTransaction[]> | ApiErrorResponse
    >(endpoint);

    return this.parseTransactionsResponse(response, filters);
  }

  static async getAllWallets(filters: WalletsFilters = {}): Promise<Wallet[]> {
    const search = new URLSearchParams();
    if (filters.q) search.append("q", filters.q);
    if (typeof filters.skip === "number")
      search.append("skip", String(filters.skip));
    if (typeof filters.limit === "number")
      search.append("limit", String(filters.limit));

    const endpoint = `/wallet/wallets${search.toString() ? `?${search.toString()}` : ""}`;
    const response = await apiRequest<Wallet[] | WrappedResponse<Wallet[]> | ApiErrorResponse>(
      endpoint,
    );

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudieron cargar las billeteras"),
      );
    }

    if (Array.isArray(response)) return response;

    return Array.isArray(response.data) ? response.data : [];
  }

  static async getWalletById(walletId: string): Promise<Wallet> {
    const response = await apiRequest<
      Wallet | WrappedResponse<Wallet> | ApiErrorResponse
    >(`/wallet/wallets/${walletId}`);

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo cargar la billetera seleccionada"),
      );
    }

    return pickData<Wallet>(response);
  }

  static async getWalletTransactions(
    walletId: string,
    filters: WalletTransactionsFilters = {},
  ): Promise<WalletTransactionsResult> {
    const search = new URLSearchParams();
    if (filters.tipo) search.append("tipo", filters.tipo);
    if (typeof filters.skip === "number")
      search.append("skip", String(filters.skip));
    if (typeof filters.limit === "number")
      search.append("limit", String(filters.limit));
    if (filters.fecha_desde) search.append("fecha_desde", filters.fecha_desde);
    if (filters.fecha_hasta) search.append("fecha_hasta", filters.fecha_hasta);

    const endpoint = `/wallet/wallets/${walletId}/transacciones${search.toString() ? `?${search.toString()}` : ""}`;
    const response = await apiRequest<
      WalletTransaction[] | WrappedResponse<WalletTransaction[]> | ApiErrorResponse
    >(endpoint);

    return this.parseTransactionsResponse(response, filters);
  }

  static async createTransfer(
    data: WalletTransferCreateData,
  ): Promise<WalletTransferResult> {
    const response = await apiRequest<
      WalletTransferResult | WrappedResponse<WalletTransferResult> | ApiErrorResponse
    >("/wallet/transferencias", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo registrar la transferencia"),
      );
    }

    return pickData<WalletTransferResult>(response);
  }

  private static parseTransactionsResponse(
    response:
      | WalletTransaction[]
      | WrappedResponse<WalletTransaction[]>
      | ApiErrorResponse,
    filters: WalletTransactionsFilters,
  ): WalletTransactionsResult {
    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudieron cargar las transacciones"),
      );
    }

    if (Array.isArray(response)) {
      return {
        items: response,
        total: response.length,
        skip: filters.skip ?? 0,
        limit: filters.limit ?? response.length,
      };
    }

    const data = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.items)
        ? response.items
        : [];

    return {
      items: data,
      total: response.total ?? data.length,
      skip: response.skip ?? filters.skip ?? 0,
      limit: response.limit ?? filters.limit ?? data.length,
    };
  }
}
