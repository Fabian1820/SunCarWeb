import { useCallback, useState } from "react";
import { WalletService } from "@/lib/services/feats/wallet/wallet-service";
import type {
  WalletCurrency,
  WalletCurrencyCreateData,
  WalletCounterpart,
  Wallet,
  WalletTransferCreateData,
  WalletTransferResult,
  WalletsFilters,
  WalletTransaction,
  WalletTransactionCreateData,
  WalletTransactionsFilters,
  WalletPendingTransfer,
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
  const [walletsLookup, setWalletsLookup] = useState<
    Array<{ id: string; user_ci: string; user_nombre: string }>
  >([]);
  const [loadingWalletsLookup, setLoadingWalletsLookup] = useState(false);
  const [pendingIncoming, setPendingIncoming] = useState<WalletPendingTransfer[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<WalletPendingTransfer[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [resolvingPendingId, setResolvingPendingId] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [selectedWalletTransactions, setSelectedWalletTransactions] = useState<
    WalletTransaction[]
  >([]);
  const [totalSelectedWalletTransactions, setTotalSelectedWalletTransactions] =
    useState(0);
  const [currencies, setCurrencies] = useState<WalletCurrency[]>([]);
  const [counterparts, setCounterparts] = useState<WalletCounterpart[]>([]);
  const [loadingCounterparts, setLoadingCounterparts] = useState(false);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [loadingSelectedWalletDetail, setLoadingSelectedWalletDetail] =
    useState(false);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [creatingCurrency, setCreatingCurrency] = useState(false);
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

  const loadWalletsLookup = useCallback(
    async (filters: WalletsFilters = {}) => {
      setLoadingWalletsLookup(true);
      try {
        const result = await WalletService.getWalletsLookup(filters);
        setWalletsLookup(result);
        return result;
      } catch (err: unknown) {
        console.error("[useWallet] Error loading wallets lookup:", err);
        return [];
      } finally {
        setLoadingWalletsLookup(false);
      }
    },
    [],
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

  const loadPendingTransfers = useCallback(async () => {
    setLoadingPending(true);
    try {
      const [incoming, outgoing] = await Promise.all([
        WalletService.getPendingTransfers("incoming"),
        WalletService.getPendingTransfers("outgoing"),
      ]);
      setPendingIncoming(incoming);
      setPendingOutgoing(outgoing);
    } catch (err: unknown) {
      console.error("[useWallet] Error loading pending transfers:", err);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const acceptPendingTransfer = useCallback(
    async (pendingId: string) => {
      setResolvingPendingId(pendingId);
      try {
        const result = await WalletService.acceptPendingTransfer(pendingId);
        await Promise.all([
          loadWallet(),
          loadWallets(),
          loadPendingTransfers(),
        ]);
        return result;
      } finally {
        setResolvingPendingId(null);
      }
    },
    [loadPendingTransfers],
  );

  const rejectPendingTransfer = useCallback(
    async (pendingId: string) => {
      setResolvingPendingId(pendingId);
      try {
        const result = await WalletService.rejectPendingTransfer(pendingId);
        await loadPendingTransfers();
        return result;
      } finally {
        setResolvingPendingId(null);
      }
    },
    [loadPendingTransfers],
  );

  const cancelPendingTransfer = useCallback(
    async (pendingId: string) => {
      setResolvingPendingId(pendingId);
      try {
        const result = await WalletService.cancelPendingTransfer(pendingId);
        await loadPendingTransfers();
        return result;
      } finally {
        setResolvingPendingId(null);
      }
    },
    [loadPendingTransfers],
  );

  const createTransfer = useCallback(
    async (
      data: WalletTransferCreateData,
      options: {
        globalFilters?: WalletTransactionsFilters;
        selectedWalletId?: string | null;
        selectedWalletFilters?: WalletTransactionsFilters;
      } = {},
    ): Promise<WalletPendingTransfer> => {
      setTransferring(true);
      setError(null);

      try {
        const result = await WalletService.createTransfer(data);
        await loadPendingTransfers();

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
    [loadPendingTransfers, loadTransactions, loadWallet, loadWalletDetail, loadWallets],
  );

  const loadCounterparts = useCallback(async (propias?: boolean) => {
    setLoadingCounterparts(true);
    try {
      const result = await WalletService.getDistinctCounterparts(propias);
      setCounterparts(result);
      return result;
    } catch (err: unknown) {
      console.error("[useWallet] Error loading counterparts:", err);
      return [];
    } finally {
      setLoadingCounterparts(false);
    }
  }, []);

  const loadCurrencies = useCallback(async () => {
    setLoadingCurrencies(true);
    setError(null);

    try {
      const result = await WalletService.getCurrencies();
      setCurrencies(result);
      return result;
    } catch (err: unknown) {
      console.error("[useWallet] Error loading currencies:", err);
      setError(getErrorMessage(err, "Error al cargar monedas"));
      return [];
    } finally {
      setLoadingCurrencies(false);
    }
  }, []);

  const createCurrency = useCallback(
    async (data: WalletCurrencyCreateData): Promise<WalletCurrency> => {
      setCreatingCurrency(true);
      setError(null);

      try {
        const result = await WalletService.createCurrency(data);
        await Promise.all([loadCurrencies(), loadWallet(), loadWallets()]);
        return result;
      } catch (err: unknown) {
        console.error("[useWallet] Error creating currency:", err);
        const message = getErrorMessage(err, "Error al crear moneda");
        setError(message);
        throw new Error(message);
      } finally {
        setCreatingCurrency(false);
      }
    },
    [loadCurrencies, loadWallet, loadWallets],
  );

  return {
    wallet,
    transactions,
    totalTransactions,
    wallets,
    walletsLookup,
    loadingWalletsLookup,
    selectedWallet,
    selectedWalletTransactions,
    totalSelectedWalletTransactions,
    currencies,
    loadingWallet,
    loadingTransactions,
    loadingWallets,
    loadingSelectedWalletDetail,
    loadingCurrencies,
    creatingWallet,
    creatingTransaction,
    transferring,
    creatingCurrency,
    error,
    loadWallet,
    initializeWallet,
    loadTransactions,
    createTransaction,
    loadWallets,
    loadWalletsLookup,
    loadWalletDetail,
    createTransfer,
    loadCurrencies,
    createCurrency,
    pendingIncoming,
    pendingOutgoing,
    loadingPending,
    resolvingPendingId,
    loadPendingTransfers,
    acceptPendingTransfer,
    rejectPendingTransfer,
    cancelPendingTransfer,
    counterparts,
    loadingCounterparts,
    loadCounterparts,
  };
}
