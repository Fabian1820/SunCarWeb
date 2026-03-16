import { useCallback, useState } from "react";
import { WalletService } from "@/lib/services/feats/wallet/wallet-service";
import type {
  Wallet,
  WalletTransaction,
  WalletTransactionCreateData,
  WalletTransactionsFilters,
} from "@/lib/types/feats/wallet/wallet-types";

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setLoadingWallet(true);
    setError(null);

    try {
      const data = await WalletService.getMyWallet();
      setWallet(data);
    } catch (err: unknown) {
      console.error("[useWallet] Error loading wallet:", err);
      setError(getErrorMessage(err, "Error al cargar la billetera"));
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  const initializeWallet = useCallback(async () => {
    setCreatingWallet(true);
    setError(null);

    try {
      const created = await WalletService.initializeMyWallet();
      setWallet(created);
      return created;
    } catch (err: unknown) {
      console.error("[useWallet] Error initializing wallet:", err);
      const message = getErrorMessage(err, "Error al iniciar la billetera");
      setError(message);
      throw new Error(message);
    } finally {
      setCreatingWallet(false);
    }
  }, []);

  const loadTransactions = useCallback(
    async (filters: WalletTransactionsFilters = {}) => {
      setLoadingTransactions(true);
      setError(null);

      try {
        const result = await WalletService.getGlobalTransactions(filters);
        setTransactions(result.items);
        setTotalTransactions(result.total);
      } catch (err: unknown) {
        console.error("[useWallet] Error loading transactions:", err);
        setError(getErrorMessage(err, "Error al cargar transacciones"));
      } finally {
        setLoadingTransactions(false);
      }
    },
    [],
  );

  const createTransaction = useCallback(
    async (
      data: WalletTransactionCreateData,
      refreshFilters: WalletTransactionsFilters = {},
    ) => {
      setCreatingTransaction(true);
      setError(null);

      try {
        const created = await WalletService.createTransaction(data);
        await Promise.all([loadWallet(), loadTransactions(refreshFilters)]);
        return created;
      } catch (err: unknown) {
        console.error("[useWallet] Error creating transaction:", err);
        const message = getErrorMessage(err, "Error al registrar transacción");
        setError(message);
        throw new Error(message);
      } finally {
        setCreatingTransaction(false);
      }
    },
    [loadTransactions, loadWallet],
  );

  return {
    wallet,
    transactions,
    totalTransactions,
    loadingWallet,
    loadingTransactions,
    creatingWallet,
    creatingTransaction,
    error,
    loadWallet,
    initializeWallet,
    loadTransactions,
    createTransaction,
  };
}
