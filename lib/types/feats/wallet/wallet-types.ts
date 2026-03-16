export type WalletTransactionType = "ingreso" | "gasto";

export interface Wallet {
  id: string;
  user_ci: string;
  user_nombre: string;
  saldo_actual: number;
  moneda: string;
  estado: "activa" | "bloqueada";
  created_at: string;
  updated_at?: string;
  initialized_by_ci?: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  wallet_user_ci: string;
  wallet_user_nombre: string;
  tipo: WalletTransactionType;
  monto: number;
  motivo: string;
  saldo_anterior: number;
  saldo_posterior: number;
  created_at: string;
  created_by_ci: string;
  created_by_nombre: string;
  referencia_externa?: string | null;
  es_manual?: boolean;
}

export interface WalletTransactionCreateData {
  tipo: WalletTransactionType;
  monto: number;
  motivo: string;
  referencia_externa?: string;
}

export interface WalletTransactionsFilters {
  tipo?: WalletTransactionType;
  skip?: number;
  limit?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface WalletTransactionsResult {
  items: WalletTransaction[];
  total: number;
  skip: number;
  limit: number;
}
