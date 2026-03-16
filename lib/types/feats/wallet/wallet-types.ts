export type WalletTransactionType =
  | "ingreso"
  | "gasto"
  | "transferencia"
  | "transferencia_entrada"
  | "transferencia_salida";

export interface WalletBalance {
  currency_id: string;
  currency_code: string;
  currency_name: string;
  amount: number;
}

export interface WalletCurrency {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "efectivo" | "transferencia" | "digital" | "otro";
  activa?: boolean;
  created_at?: string;
}

export interface Wallet {
  id: string;
  user_ci: string;
  user_nombre: string;
  saldo_actual: number;
  moneda: string;
  balances?: WalletBalance[];
  default_currency_id?: string;
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
  currency_id?: string;
  currency_code?: string;
  currency_name?: string;
  categoria?: "manual" | "transferencia";
  transferencia_id?: string | null;
  transferencia_direccion?: "entrada" | "salida";
  contraparte_wallet_id?: string | null;
  contraparte_user_ci?: string | null;
  contraparte_user_nombre?: string | null;
}

export interface WalletTransactionCreateData {
  tipo: WalletTransactionType;
  currency_id: string;
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

export interface WalletsFilters {
  q?: string;
  skip?: number;
  limit?: number;
}

export interface WalletTransferCreateData {
  wallet_origen_id: string;
  wallet_destino_id: string;
  currency_id: string;
  monto: number;
  motivo: string;
  referencia_externa?: string;
}

export interface WalletTransferResult {
  id: string;
  wallet_origen_id: string;
  wallet_destino_id: string;
  monto: number;
  motivo: string;
  created_at: string;
  created_by_ci: string;
  created_by_nombre: string;
  currency_id?: string;
  currency_code?: string;
  currency_name?: string;
  transaccion_origen_id?: string;
  transaccion_destino_id?: string;
}

export interface WalletCurrencyCreateData {
  codigo: string;
  nombre: string;
  tipo: "efectivo" | "transferencia" | "digital" | "otro";
}
