import { apiRequest } from "../../../api-config";
import type {
  Wallet,
  WalletTransaction,
  WalletTransactionCreateData,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const pickData = <T>(response: T | WrappedResponse<T>): T => {
  if (isRecord(response) && "data" in response && response.data !== undefined) {
    return response.data as T;
  }
  return response as T;
};

export class WalletService {
  static async getMyWallet(): Promise<Wallet | null> {
    try {
      const response = await apiRequest<Wallet | WrappedResponse<Wallet>>(
        "/wallet/me",
      );
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
    const response = await apiRequest<Wallet | WrappedResponse<Wallet>>(
      "/wallet/me/inicializar",
      {
        method: "POST",
      },
    );

    return pickData<Wallet>(response);
  }

  static async createTransaction(
    data: WalletTransactionCreateData,
  ): Promise<WalletTransaction> {
    const response = await apiRequest<
      WalletTransaction | WrappedResponse<WalletTransaction>
    >("/wallet/transacciones", {
      method: "POST",
      body: JSON.stringify(data),
    });

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
      WalletTransaction[] | WrappedResponse<WalletTransaction[]>
    >(endpoint);

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
