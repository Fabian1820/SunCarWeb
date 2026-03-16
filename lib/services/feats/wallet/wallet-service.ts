import { apiRequest } from "../../../api-config";
import type {
  WalletBalance,
  WalletCurrency,
  WalletCurrencyCreateData,
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

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeCurrencyCode = (value: unknown): string => {
  if (typeof value === "string" && value.trim()) return value.trim().toUpperCase();
  return "USD";
};

const normalizeBalance = (value: unknown): WalletBalance | null => {
  if (!isRecord(value)) return null;

  const currencyIdRaw =
    typeof value.currency_id === "string"
      ? value.currency_id
      : typeof value.moneda_id === "string"
        ? value.moneda_id
        : "";

  const currencyCodeRaw =
    typeof value.currency_code === "string"
      ? value.currency_code
      : typeof value.codigo === "string"
        ? value.codigo
        : typeof value.moneda === "string"
          ? value.moneda
          : "USD";

  const currencyNameRaw =
    typeof value.currency_name === "string"
      ? value.currency_name
      : typeof value.nombre === "string"
        ? value.nombre
        : currencyCodeRaw;

  const amountRaw =
    value.amount ??
    value.saldo ??
    value.balance ??
    value.saldo_actual ??
    0;

  return {
    currency_id: currencyIdRaw || normalizeCurrencyCode(currencyCodeRaw),
    currency_code: normalizeCurrencyCode(currencyCodeRaw),
    currency_name:
      typeof currencyNameRaw === "string" && currencyNameRaw.trim()
        ? currencyNameRaw.trim()
        : normalizeCurrencyCode(currencyCodeRaw),
    amount: toNumber(amountRaw),
  };
};

const normalizeWallet = (wallet: Wallet): Wallet => {
  const record = wallet as unknown;
  if (!isRecord(record)) return wallet;

  const candidateBalances = Array.isArray(record.balances)
    ? record.balances
    : Array.isArray(record.saldos_por_moneda)
      ? record.saldos_por_moneda
      : [];

  const balances = candidateBalances
    .map((item) => normalizeBalance(item))
    .filter((item): item is WalletBalance => Boolean(item));

  if (balances.length > 0) {
    return {
      ...wallet,
      balances,
    };
  }

  const fallbackCode = normalizeCurrencyCode(wallet.moneda);
  return {
    ...wallet,
    balances: [
      {
        currency_id: wallet.default_currency_id || fallbackCode,
        currency_code: fallbackCode,
        currency_name: fallbackCode,
        amount: toNumber(wallet.saldo_actual),
      },
    ],
  };
};

const normalizeCurrency = (value: WalletCurrency): WalletCurrency => ({
  ...value,
  codigo: normalizeCurrencyCode(value.codigo),
  nombre: typeof value.nombre === "string" && value.nombre.trim()
    ? value.nombre.trim()
    : normalizeCurrencyCode(value.codigo),
  tipo: value.tipo || "efectivo",
});

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

const isNotFoundErrorResponse = (errorResponse: ApiErrorResponse): boolean => {
  const status = errorResponse._httpStatus;
  if (status === 404) return true;

  const detail = typeof errorResponse.detail === "string"
    ? errorResponse.detail.toLowerCase()
    : "";
  const message = typeof errorResponse.message === "string"
    ? errorResponse.message.toLowerCase()
    : "";

  const text = `${detail} ${message}`;
  return (
    text.includes("not found") ||
    text.includes("no existe") ||
    text.includes("no hay")
  );
};

export class WalletService {
  private static async requestWalletEndpoint<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    try {
      return await apiRequest<T>(endpoint, options);
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : "";
      const isNetworkLikeError =
        message.includes("failed to fetch") ||
        message.includes("load failed") ||
        message.includes("no se pudo conectar con el backend");

      // Fallback defensivo para edge cases de routing/proxy con slash final.
      if (isNetworkLikeError && !endpoint.endsWith("/")) {
        return apiRequest<T>(`${endpoint}/`, options);
      }

      throw error;
    }
  }

  static async getMyWallet(): Promise<Wallet | null> {
    try {
      const response = await this.requestWalletEndpoint<
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

      return normalizeWallet(pickData<Wallet>(response));
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
    const response = await this.requestWalletEndpoint<
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

    return normalizeWallet(pickData<Wallet>(response));
  }

  static async createTransaction(
    data: WalletTransactionCreateData,
  ): Promise<WalletTransaction> {
    const response = await this.requestWalletEndpoint<
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
    const response = await this.requestWalletEndpoint<
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
    const response = await this.requestWalletEndpoint<Wallet[] | WrappedResponse<Wallet[]> | ApiErrorResponse>(
      endpoint,
    );

    if (isApiErrorResponse(response)) {
      if (isNotFoundErrorResponse(response)) {
        return [];
      }
      throw new Error(
        getApiErrorMessage(response, "No se pudieron cargar las billeteras"),
      );
    }

    if (Array.isArray(response)) return response.map((item) => normalizeWallet(item));

    return Array.isArray(response.data)
      ? response.data.map((item) => normalizeWallet(item))
      : [];
  }

  static async getWalletById(walletId: string): Promise<Wallet> {
    const response = await this.requestWalletEndpoint<
      Wallet | WrappedResponse<Wallet> | ApiErrorResponse
    >(`/wallet/wallets/${walletId}`);

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo cargar la billetera seleccionada"),
      );
    }

    return normalizeWallet(pickData<Wallet>(response));
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
    const response = await this.requestWalletEndpoint<
      WalletTransaction[] | WrappedResponse<WalletTransaction[]> | ApiErrorResponse
    >(endpoint);

    return this.parseTransactionsResponse(response, filters);
  }

  static async createTransfer(
    data: WalletTransferCreateData,
  ): Promise<WalletTransferResult> {
    const response = await this.requestWalletEndpoint<
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

  static async getCurrencies(): Promise<WalletCurrency[]> {
    const response = await this.requestWalletEndpoint<
      WalletCurrency[] | WrappedResponse<WalletCurrency[]> | ApiErrorResponse
    >("/wallet/monedas");

    if (isApiErrorResponse(response)) {
      if (isNotFoundErrorResponse(response)) {
        return [];
      }
      throw new Error(
        getApiErrorMessage(response, "No se pudieron cargar las monedas"),
      );
    }

    if (Array.isArray(response)) {
      return response.map((item) => normalizeCurrency(item));
    }

    return Array.isArray(response.data)
      ? response.data.map((item) => normalizeCurrency(item))
      : [];
  }

  static async createCurrency(
    data: WalletCurrencyCreateData,
  ): Promise<WalletCurrency> {
    const response = await this.requestWalletEndpoint<
      WalletCurrency | WrappedResponse<WalletCurrency> | ApiErrorResponse
    >("/wallet/monedas", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (isApiErrorResponse(response)) {
      throw new Error(
        getApiErrorMessage(response, "No se pudo crear la moneda"),
      );
    }

    return normalizeCurrency(pickData<WalletCurrency>(response));
  }

  private static parseTransactionsResponse(
    response:
      | WalletTransaction[]
      | WrappedResponse<WalletTransaction[]>
      | ApiErrorResponse,
    filters: WalletTransactionsFilters,
  ): WalletTransactionsResult {
    if (isApiErrorResponse(response)) {
      if (isNotFoundErrorResponse(response)) {
        return {
          items: [],
          total: 0,
          skip: filters.skip ?? 0,
          limit: filters.limit ?? 0,
        };
      }
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
