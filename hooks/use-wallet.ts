import { useCallback, useState } from "react";
import { WalletService } from "@/lib/services/feats/wallet/wallet-service";
import type {
  Wallet,
  WalletTransferCreateData,
  WalletTransferResult,
  WalletsFilters,
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
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [selectedWalletTransactions, setSelectedWalletTransactions] = useState<
    WalletTransaction[]
  >([]);
  const [totalSelectedWalletTransactions, setTotalSelectedWalletTransactions] =
    useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [loadingSelectedWalletDetail, setLoadingSelectedWalletDetail] =
    useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const [transferring, setTransferring] = useState(false);
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

  const loadWallets = useCallback(async (filters: WalletsFilters = {}) => {
    setLoadingWallets(true);
    setError(null);

    try {
      const result = await WalletService.getAllWallets(filters);
      setWallets(result);
      return result;
    } catch (err: unknown) {
      console.error("[useWallet] Error loading wallets:", err);
      setError(getErrorMessage(err, "Error al cargar las billeteras"));
      return [];
    } finally {
      setLoadingWallets(false);
    }
  }, []);

  const loadWalletDetail = useCallback(
    async (
      walletId: string,
      filters: WalletTransactionsFilters = { limit: 200 },
    ): Promise<{
      wallet: Wallet;
      transactions: WalletTransaction[];
      total: number;
    }> => {
      setLoadingSelectedWalletDetail(true);
      setError(null);

      try {
        const [walletDetail, transactionsResult] = await Promise.all([
          WalletService.getWalletById(walletId),
          WalletService.getWalletTransactions(walletId, filters),
        ]);

        setSelectedWallet(walletDetail);
        setSelectedWalletTransactions(transactionsResult.items);
        setTotalSelectedWalletTransactions(transactionsResult.total);

        return {
          wallet: walletDetail,
          transactions: transactionsResult.items,
          total: transactionsResult.total,
        };
      } catch (err: unknown) {
        console.error("[useWallet] Error loading wallet detail:", err);
        const message = getErrorMessage(
          err,
          "Error al cargar detalle de la billetera",
        );
        setError(message);
        throw new Error(message);
      } finally {
        setLoadingSelectedWalletDetail(false);
      }
    },
    [],
  );

  const createTransfer = useCallback(
    async (
      data: WalletTransferCreateData,
      options: {
        globalFilters?: WalletTransactionsFilters;
        selectedWalletId?: string | null;
        selectedWalletFilters?: WalletTransactionsFilters;
      } = {},
    ): Promise<WalletTransferResult> => {
      setTransferring(true);
      setError(null);

      try {
        const result = await WalletService.createTransfer(data);

        const refreshTasks: Promise<unknown>[] = [
          loadWallet(),
          loadTransactions(options.globalFilters ?? {}),
          loadWallets(),
        ];

        if (options.selectedWalletId) {
          refreshTasks.push(
            loadWalletDetail(
              options.selectedWalletId,
              options.selectedWalletFilters ?? { limit: 200 },
            ),
          );
        }

        await Promise.all(refreshTasks);
        return result;
      } catch (err: unknown) {
        console.error("[useWallet] Error creating transfer:", err);
        const message = getErrorMessage(err, "Error al transferir entre billeteras");
        setError(message);
        throw new Error(message);
      } finally {
        setTransferring(false);
      }
    },
    [loadTransactions, loadWallet, loadWalletDetail, loadWallets],
  );

  return {
    wallet,
    transactions,
    totalTransactions,
    wallets,
    selectedWallet,
    selectedWalletTransactions,
    totalSelectedWalletTransactions,
    loadingWallet,
    loadingTransactions,
    loadingWallets,
    loadingSelectedWalletDetail,
    creatingWallet,
    creatingTransaction,
    transferring,
    error,
    loadWallet,
    initializeWallet,
    loadTransactions,
    createTransaction,
    loadWallets,
    loadWalletDetail,
    createTransfer,
  };
}
