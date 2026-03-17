"use client";

import { useEffect, useMemo, useState } from "react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Textarea } from "@/components/shared/molecule/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Toaster } from "@/components/shared/molecule/toaster";
import { PageLoader } from "@/components/shared/atom/page-loader";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  Coins,
  Eye,
  Link2,
  Link2Off,
  Plus,
  RefreshCcw,
  Search,
  SendHorizontal,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import type {
  WalletCurrency,
  Wallet as WalletType,
  WalletTransaction,
  WalletTransactionType,
} from "@/lib/types/feats/wallet/wallet-types";

const formatMoney = (amount: number, currency = "USD"): string => {
  try {
    return new Intl.NumberFormat("es-CU", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

const formatDateTime = (value: string): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("es-CU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isTransferTransaction = (transaction: WalletTransaction): boolean => {
  return (
    transaction.categoria === "transferencia" ||
    Boolean(transaction.transferencia_id) ||
    transaction.tipo === "transferencia" ||
    transaction.tipo === "transferencia_entrada" ||
    transaction.tipo === "transferencia_salida"
  );
};

const getWalletBalanceForCurrency = (
  wallet: WalletType | null | undefined,
  currency: WalletCurrency | null,
): number => {
  if (!wallet) return 0;

  if (currency && Array.isArray(wallet.balances)) {
    const match = wallet.balances.find(
      (item) =>
        item.currency_id === currency.id ||
        item.currency_code.toUpperCase() === currency.codigo.toUpperCase(),
    );
    if (match) return Number(match.amount || 0);
    return 0;
  }

  return Number(wallet.saldo_actual || 0);
};

const TransactionTypeBadge = ({ transaction }: { transaction: WalletTransaction }) => {
  if (isTransferTransaction(transaction)) {
    return (
      <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-[11px]">
        <SendHorizontal className="h-3 w-3 mr-1" />
        Transferencia
      </Badge>
    );
  }

  const tipo = transaction.tipo;
  const ingreso = tipo === "ingreso";
  return (
    <Badge
      className={
        ingreso
          ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-[11px]"
          : "bg-rose-100 text-rose-700 border-rose-200 text-[11px]"
      }
    >
      {ingreso ? (
        <ArrowUpCircle className="h-3 w-3 mr-1" />
      ) : (
        <ArrowDownCircle className="h-3 w-3 mr-1" />
      )}
      {ingreso ? "Ingreso" : "Gasto"}
    </Badge>
  );
};

type TransactionsResponsiveListProps = {
  transactions: WalletTransaction[];
  loading: boolean;
  emptyMessage: string;
  fallbackCurrency: string;
  showWalletOwner?: boolean;
};

function TransactionsResponsiveList({
  transactions,
  loading,
  emptyMessage,
  fallbackCurrency,
  showWalletOwner = true,
}: TransactionsResponsiveListProps) {
  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-slate-400">
          <RefreshCcw className="h-4 w-4 animate-spin" />
          Cargando transacciones...
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-10 text-center">
        <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {transactions.map((transaction) => {
          const rowCurrency = transaction.currency_code || fallbackCurrency;
          const isTransfer = isTransferTransaction(transaction);
          const isIngreso = transaction.tipo === "ingreso";
          const amountColor = isTransfer
            ? "text-violet-600"
            : isIngreso
            ? "text-emerald-600"
            : "text-rose-600";
          const borderColor = isTransfer
            ? "border-l-violet-400"
            : isIngreso
            ? "border-l-emerald-400"
            : "border-l-rose-400";

          return (
            <div
              key={transaction.id}
              className={`bg-white rounded-xl border border-slate-100 border-l-4 ${borderColor} p-3 shadow-sm`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <TransactionTypeBadge transaction={transaction} />
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(transaction.created_at)}
                    </span>
                  </div>
                  <p className={`text-base font-bold ${amountColor}`}>
                    {isIngreso && !isTransfer ? "+" : isTransfer ? "" : "-"}
                    {formatMoney(transaction.monto, rowCurrency)}
                  </p>
                  {showWalletOwner && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {transaction.wallet_user_nombre} · {transaction.wallet_user_ci}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{transaction.motivo}</p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-50 grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                <span>Antes: <span className="text-slate-600 font-medium">{formatMoney(transaction.saldo_anterior, rowCurrency)}</span></span>
                <span>Después: <span className="text-slate-600 font-medium">{formatMoney(transaction.saldo_posterior, rowCurrency)}</span></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-slate-100 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs font-semibold text-slate-500">Fecha</TableHead>
              {showWalletOwner ? <TableHead className="text-xs font-semibold text-slate-500">Usuario</TableHead> : null}
              <TableHead className="text-xs font-semibold text-slate-500">Tipo</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Monto</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Motivo</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Registrado por</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Antes</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Después</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const rowCurrency = transaction.currency_code || fallbackCurrency;
              const isTransfer = isTransferTransaction(transaction);
              const isIngreso = transaction.tipo === "ingreso";
              const amountColor = isTransfer
                ? "text-violet-600"
                : isIngreso
                ? "text-emerald-600"
                : "text-rose-600";

              return (
                <TableRow key={transaction.id} className="hover:bg-slate-50/50">
                  <TableCell className="text-xs text-slate-500">
                    {formatDateTime(transaction.created_at)}
                  </TableCell>
                  {showWalletOwner ? (
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">{transaction.wallet_user_nombre}</p>
                      <p className="text-[11px] text-slate-400">{transaction.wallet_user_ci}</p>
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <TransactionTypeBadge transaction={transaction} />
                  </TableCell>
                  <TableCell className={`font-bold ${amountColor}`}>
                    {isIngreso && !isTransfer ? "+" : isTransfer ? "" : "-"}
                    {formatMoney(transaction.monto, rowCurrency)}
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    <p className="truncate text-sm text-slate-600" title={transaction.motivo}>
                      {transaction.motivo}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-700">{transaction.created_by_nombre}</p>
                    <p className="text-[11px] text-slate-400">{transaction.created_by_ci}</p>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatMoney(transaction.saldo_anterior, rowCurrency)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatMoney(transaction.saldo_posterior, rowCurrency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export default function WalletPage() {
  return (
    <RouteGuard requiredModule="wallet">
      <WalletPageContent />
    </RouteGuard>
  );
}

type ActiveAction = "ingreso" | "gasto" | "transferencia" | null;

function WalletPageContent() {
  const { toast } = useToast();
  const {
    wallet,
    wallets,
    transactions,
    selectedWallet,
    selectedWalletTransactions,
    totalTransactions,
    totalSelectedWalletTransactions,
    currencies,
    loadingWallet,
    loadingWallets,
    loadingTransactions,
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
    loadWalletDetail,
    createTransfer,
    loadCurrencies,
    createCurrency,
  } = useWallet();

  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [tipo, setTipo] = useState<WalletTransactionType>("ingreso");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | WalletTransactionType>("todos");

  const [walletSearch, setWalletSearch] = useState("");
  const [isWalletsDialogOpen, setIsWalletsDialogOpen] = useState(false);
  const [isWalletDetailDialogOpen, setIsWalletDetailDialogOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

  const [selectedCurrencyId, setSelectedCurrencyId] = useState("");
  const [transactionCurrencyId, setTransactionCurrencyId] = useState("");
  const [transferCurrencyId, setTransferCurrencyId] = useState("");
  const [newCurrencyCode, setNewCurrencyCode] = useState("");
  const [newCurrencyName, setNewCurrencyName] = useState("");
  const [newCurrencyType, setNewCurrencyType] = useState<
    "efectivo" | "transferencia" | "digital" | "otro"
  >("efectivo");

  const [transferToWalletId, setTransferToWalletId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferReason, setTransferReason] = useState("");

  // ── Estado banco (Enable Banking) ──
  const [bankSessionId, setBankSessionId] = useState<string | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankConnecting, setBankConnecting] = useState(false);
  const [selectedBankName, setSelectedBankName] = useState("Banco Santander");
  const [availableBanks, setAvailableBanks] = useState<Array<{ name: string; country: string }>>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [bankBalance, setBankBalance] = useState<{ amount: string; currency: string } | null>(null);
  const [bankTransactions, setBankTransactions] = useState<Array<{
    id: string; date: string; amount: string; currency: string; description: string; isCredit: boolean;
  }>>([]);
  const [bankError, setBankError] = useState<string | null>(null);

  const currentFilters = useMemo(
    () => ({
      limit: 200,
      tipo: filtroTipo === "todos" ? undefined : filtroTipo,
    }),
    [filtroTipo],
  );

  const filteredWallets = useMemo(() => {
    const query = walletSearch.trim().toLowerCase();
    if (!query) return wallets;
    return wallets.filter((item) => {
      const byName = item.user_nombre.toLowerCase().includes(query);
      const byCi = item.user_ci.toLowerCase().includes(query);
      return byName || byCi;
    });
  }, [walletSearch, wallets]);

  const transferTargets = useMemo(
    () => wallets.filter((item) => item.id !== wallet?.id),
    [wallets, wallet?.id],
  );

  const selectedCurrency = useMemo(
    () => currencies.find((item) => item.id === selectedCurrencyId) ?? null,
    [currencies, selectedCurrencyId],
  );

  const selectedCurrencyCode = selectedCurrency?.codigo || "USD";

  useEffect(() => {
    void loadWallet();
    void loadWallets({ limit: 500 });
    void loadCurrencies();
  }, [loadWallet, loadWallets, loadCurrencies]);

  useEffect(() => {
    if (currencies.length === 0) return;

    const defaultCurrency =
      currencies.find(
        (item) => item.codigo.toUpperCase() === "USD" && item.tipo === "efectivo",
      ) || currencies[0];

    if (!selectedCurrencyId) setSelectedCurrencyId(defaultCurrency.id);
    if (!transactionCurrencyId) setTransactionCurrencyId(defaultCurrency.id);
    if (!transferCurrencyId) setTransferCurrencyId(defaultCurrency.id);
  }, [currencies, selectedCurrencyId, transactionCurrencyId, transferCurrencyId]);

  useEffect(() => {
    void loadTransactions(currentFilters);
  }, [loadTransactions, currentFilters]);

  useEffect(() => {
    if (transferToWalletId && wallet?.id && transferToWalletId === wallet.id) {
      setTransferToWalletId("");
    }
  }, [wallet?.id, transferToWalletId]);

  useEffect(() => {
    const saved = localStorage.getItem("bank_session_id");
    if (saved) setBankSessionId(saved);
    
    // Cargar bancos disponibles
    const loadBanks = async () => {
      setLoadingBanks(true);
      try {
        const res = await fetch("/api/bank/aspsps?country=ES");
        const data = await res.json() as { success: boolean; aspsps?: Array<{ name: string; country: string }> };
        if (data.success && data.aspsps) {
          setAvailableBanks(data.aspsps);
          if (data.aspsps.length > 0 && !selectedBankName) {
            setSelectedBankName(data.aspsps[0].name);
          }
        }
      } catch (err) {
        console.error("Error cargando bancos:", err);
      } finally {
        setLoadingBanks(false);
      }
    };
    void loadBanks();
  }, []);

  const handleConnectBank = async () => {
    setBankConnecting(true);
    setBankError(null);
    try {
      const redirectUrl = `${window.location.origin}/bank-callback`;
      const res = await fetch("/api/bank/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName: selectedBankName, country: "ES", redirectUrl }),
      });
      const data = await res.json() as { success: boolean; url?: string; message?: string };
      if (!data.success || !data.url) throw new Error(data.message ?? "Error al iniciar conexión");
      window.location.href = data.url;
    } catch (err) {
      setBankError(err instanceof Error ? err.message : "Error al conectar banco");
    } finally {
      setBankConnecting(false);
    }
  };

  const handleLoadBankData = async () => {
    if (!bankSessionId) return;
    setBankLoading(true);
    setBankError(null);
    try {
      const res = await fetch(`/api/bank/data?session_id=${bankSessionId}`);
      const data = await res.json() as {
        success: boolean;
        balance?: { amount: string; currency: string };
        transactions?: Array<{ id: string; date: string; amount: string; currency: string; description: string; isCredit: boolean }>;
        message?: string;
      };
      if (!data.success) throw new Error(data.message ?? "Error al obtener datos");
      setBankBalance(data.balance ?? null);
      setBankTransactions(data.transactions ?? []);
    } catch (err) {
      setBankError(err instanceof Error ? err.message : "Error al cargar datos bancarios");
    } finally {
      setBankLoading(false);
    }
  };

  const handleDisconnectBank = () => {
    localStorage.removeItem("bank_session_id");
    setBankSessionId(null);
    setBankBalance(null);
    setBankTransactions([]);
    setBankError(null);
  };

  const getWalletViewBalance = (walletData?: WalletType | null) =>
    getWalletBalanceForCurrency(walletData, selectedCurrency);

  const handleInitializeWallet = async () => {
    try {
      await initializeWallet();
      await loadWallets({ limit: 500 });
      toast({
        title: "Billetera iniciada",
        description: "Tu billetera quedó activa para registrar movimientos.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo iniciar la billetera",
        variant: "destructive",
      });
    }
  };

  const handleCreateTransaction = async () => {
    const parsedAmount = Number(monto.replace(",", "."));
    const trimmedReason = motivo.trim();

    if (!wallet) {
      toast({ title: "Billetera no iniciada", description: "Primero debes iniciar tu billetera.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Monto inválido", description: "El monto debe ser mayor que 0.", variant: "destructive" });
      return;
    }
    if (trimmedReason.length < 5) {
      toast({ title: "Motivo requerido", description: "Escribe un motivo con al menos 5 caracteres.", variant: "destructive" });
      return;
    }
    if (!transactionCurrencyId) {
      toast({ title: "Moneda requerida", description: "Selecciona la moneda del movimiento.", variant: "destructive" });
      return;
    }

    try {
      await createTransaction({ tipo, currency_id: transactionCurrencyId, monto: parsedAmount, motivo: trimmedReason }, currentFilters);
      setMonto("");
      setMotivo("");
      await loadWallets({ limit: 500 });
      toast({
        title: tipo === "ingreso" ? "Ingreso registrado" : "Gasto registrado",
        description: `${formatMoney(parsedAmount, selectedCurrencyCode)} registrado correctamente.`,
      });
      setActiveAction(null);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo registrar la transacción", variant: "destructive" });
    }
  };

  const handleCreateCurrency = async () => {
    const code = newCurrencyCode.trim().toUpperCase();
    const name = newCurrencyName.trim();

    if (!code || code.length < 3) {
      toast({ title: "Código inválido", description: "Usa un código de moneda de al menos 3 caracteres.", variant: "destructive" });
      return;
    }
    if (!name) {
      toast({ title: "Nombre requerido", description: "Escribe el nombre de la moneda.", variant: "destructive" });
      return;
    }

    try {
      const created = await createCurrency({ codigo: code, nombre: name, tipo: newCurrencyType });
      setSelectedCurrencyId(created.id);
      setTransactionCurrencyId(created.id);
      setTransferCurrencyId(created.id);
      setNewCurrencyCode("");
      setNewCurrencyName("");
      setNewCurrencyType("efectivo");
      toast({ title: "Moneda creada", description: `${created.codigo} ya está disponible para movimientos.` });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo crear la moneda", variant: "destructive" });
    }
  };

  const handleTransfer = async () => {
    const parsedAmount = Number(transferAmount.replace(",", "."));
    const trimmedReason = transferReason.trim();
    const sourceWalletId = wallet?.id;

    if (!sourceWalletId || !transferToWalletId) {
      toast({ title: "Transferencia incompleta", description: "Debes tener tu billetera iniciada y seleccionar destino.", variant: "destructive" });
      return;
    }
    if (sourceWalletId === transferToWalletId) {
      toast({ title: "Transferencia inválida", description: "El origen y destino deben ser diferentes.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Monto inválido", description: "El monto de transferencia debe ser mayor que 0.", variant: "destructive" });
      return;
    }
    if (trimmedReason.length < 5) {
      toast({ title: "Motivo requerido", description: "Escribe un motivo con al menos 5 caracteres.", variant: "destructive" });
      return;
    }
    if (!transferCurrencyId) {
      toast({ title: "Moneda requerida", description: "Selecciona la moneda de la transferencia.", variant: "destructive" });
      return;
    }

    try {
      await createTransfer(
        { wallet_origen_id: sourceWalletId, wallet_destino_id: transferToWalletId, currency_id: transferCurrencyId, monto: parsedAmount, motivo: trimmedReason },
        { globalFilters: currentFilters, selectedWalletId: selectedWallet?.id ?? null, selectedWalletFilters: { limit: 200 } },
      );
      setTransferAmount("");
      setTransferReason("");
      toast({ title: "Transferencia registrada", description: "La transferencia se registró correctamente." });
      setActiveAction(null);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo registrar la transferencia", variant: "destructive" });
    }
  };

  const handleOpenWalletDetail = async (walletId: string) => {
    try {
      await loadWalletDetail(walletId, { limit: 200 });
      setIsWalletDetailDialogOpen(true);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo cargar el detalle de la billetera", variant: "destructive" });
    }
  };

  const handleRefresh = async () => {
    const refreshTasks: Promise<unknown>[] = [
      loadWallet(),
      loadTransactions(currentFilters),
      loadWallets({ limit: 500 }),
    ];
    if (selectedWallet?.id) {
      refreshTasks.push(loadWalletDetail(selectedWallet.id, { limit: 200 }));
    }
    await Promise.all(refreshTasks);
  };

  const handleActionToggle = (action: ActiveAction) => {
    if (activeAction === action) {
      setActiveAction(null);
    } else {
      setActiveAction(action);
      if (action === "ingreso") setTipo("ingreso");
      if (action === "gasto") setTipo("gasto");
    }
  };

  if (loadingWallet && !wallet) {
    return <PageLoader moduleName="Billetera" text="Cargando billetera..." />;
  }

  const walletBalance = getWalletViewBalance(wallet);

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster />

      <ModuleHeader
        title="Billetera"
        subtitle="Control de saldos y movimientos"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setIsCurrencyModalOpen(true)}
              className="gap-1.5 border-slate-200 bg-white hover:bg-slate-50"
              title="Gestionar monedas"
            >
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="hidden sm:inline text-sm">Monedas</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsWalletsDialogOpen(true)}
              className="gap-1.5 border-slate-200 bg-white hover:bg-slate-50"
              title="Ver billeteras del equipo"
            >
              <Users className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline text-sm">Equipo</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loadingTransactions || creatingTransaction || transferring}
              className="gap-1.5 border-slate-200 bg-white hover:bg-slate-50"
              title="Actualizar"
            >
              <RefreshCcw className={`h-4 w-4 text-slate-500 ${loadingTransactions ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline text-sm">Actualizar</span>
            </Button>
          </>
        }
      />

      <main className="content-with-fixed-header max-w-2xl mx-auto px-4 py-4 sm:py-6 space-y-4">
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Balance Hero Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-5 text-white shadow-lg">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-4 h-28 w-28 rounded-full bg-white/5" />

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Mi Billetera</p>
                {wallet && (
                  <p className="text-sm text-slate-300">{wallet.user_nombre}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {wallet && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    wallet.estado === "activa"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                  }`}>
                    {wallet.estado}
                  </span>
                )}
                <div className="bg-white/10 rounded-full p-1.5">
                  <Wallet className="h-4 w-4 text-white/70" />
                </div>
              </div>
            </div>

            {wallet ? (
              <>
                <p className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">
                  {formatMoney(walletBalance, selectedCurrencyCode)}
                </p>
                <p className="text-xs text-slate-400">Saldo disponible</p>

                {/* Currency selector inside card */}
                {currencies.length > 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Ver en:</span>
                    <Select value={selectedCurrencyId} onValueChange={setSelectedCurrencyId}>
                      <SelectTrigger className="h-7 text-xs bg-white/10 border-white/20 text-white w-auto min-w-[120px] focus:ring-0">
                        <SelectValue placeholder="Moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.codigo} · {currency.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-slate-400 mb-3">No tienes billetera creada aún.</p>
                <Button
                  onClick={handleInitializeWallet}
                  disabled={creatingWallet}
                  className="bg-white text-slate-900 hover:bg-slate-100 h-9 text-sm font-medium"
                >
                  {creatingWallet ? "Iniciando..." : "Iniciar billetera"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Action Buttons */}
        {wallet && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleActionToggle("ingreso")}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border transition-all ${
                activeAction === "ingreso"
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200"
                  : "bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              <div className={`rounded-full p-2 ${activeAction === "ingreso" ? "bg-white/20" : "bg-emerald-100"}`}>
                <TrendingUp className={`h-4 w-4 ${activeAction === "ingreso" ? "text-white" : "text-emerald-600"}`} />
              </div>
              <span className="text-xs font-medium">Ingreso</span>
            </button>

            <button
              onClick={() => handleActionToggle("gasto")}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border transition-all ${
                activeAction === "gasto"
                  ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200"
                  : "bg-white border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50"
              }`}
            >
              <div className={`rounded-full p-2 ${activeAction === "gasto" ? "bg-white/20" : "bg-rose-100"}`}>
                <TrendingDown className={`h-4 w-4 ${activeAction === "gasto" ? "text-white" : "text-rose-600"}`} />
              </div>
              <span className="text-xs font-medium">Gasto</span>
            </button>

            <button
              onClick={() => handleActionToggle("transferencia")}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border transition-all ${
                activeAction === "transferencia"
                  ? "bg-violet-500 border-violet-500 text-white shadow-md shadow-violet-200"
                  : "bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50"
              }`}
            >
              <div className={`rounded-full p-2 ${activeAction === "transferencia" ? "bg-white/20" : "bg-violet-100"}`}>
                <SendHorizontal className={`h-4 w-4 ${activeAction === "transferencia" ? "text-white" : "text-violet-600"}`} />
              </div>
              <span className="text-xs font-medium">Enviar</span>
            </button>
          </div>
        )}

        {/* Action Forms */}
        {(activeAction === "ingreso" || activeAction === "gasto") && (
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className={`pb-3 pt-4 px-4 ${activeAction === "ingreso" ? "bg-emerald-50" : "bg-rose-50"}`}>
              <div className="flex items-center justify-between">
                <CardTitle className={`text-sm font-semibold ${activeAction === "ingreso" ? "text-emerald-800" : "text-rose-800"}`}>
                  {activeAction === "ingreso" ? "Registrar Ingreso" : "Registrar Gasto"}
                </CardTitle>
                <button onClick={() => setActiveAction(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Moneda</Label>
                  <Select value={transactionCurrencyId} onValueChange={setTransactionCurrencyId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                          {currency.codigo} ({currency.tipo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Monto</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Motivo</Label>
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Describe el motivo de esta transacción..."
                  className="text-sm min-h-[80px] resize-none"
                />
              </div>
              <Button
                onClick={handleCreateTransaction}
                disabled={creatingTransaction || !transactionCurrencyId}
                className={`w-full h-10 font-medium ${
                  activeAction === "ingreso"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {creatingTransaction ? "Registrando..." : activeAction === "ingreso" ? "Registrar ingreso" : "Registrar gasto"}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeAction === "transferencia" && (
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 bg-violet-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-violet-800">Transferir a usuario</CardTitle>
                <button onClick={() => setActiveAction(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Desde</Label>
                <div className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm flex items-center text-slate-600">
                  {wallet ? `${wallet.user_nombre} (${wallet.user_ci})` : "Inicia tu billetera primero"}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Hacia</Label>
                <Select value={transferToWalletId} onValueChange={setTransferToWalletId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecciona destinatario" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferTargets.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.user_nombre} ({item.user_ci})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Moneda</Label>
                  <Select value={transferCurrencyId} onValueChange={setTransferCurrencyId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                          {currency.codigo} ({currency.tipo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Monto</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Motivo</Label>
                <Textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Motivo de la transferencia..."
                  className="text-sm min-h-[80px] resize-none"
                />
              </div>
              <Button
                onClick={handleTransfer}
                disabled={transferring || loadingWallets || wallets.length < 2 || !wallet || !transferCurrencyId}
                className="w-full h-10 bg-violet-600 hover:bg-violet-700 font-medium"
              >
                {transferring ? "Transfiriendo..." : "Confirmar transferencia"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Transactions */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-800">Historial de Transacciones</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">{totalTransactions} registros</p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(["todos", "ingreso", "gasto"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroTipo(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    filtroTipo === f
                      ? f === "ingreso"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : f === "gasto"
                        ? "bg-rose-100 text-rose-700 border-rose-200"
                        : "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {f === "todos" ? "Todos" : f === "ingreso" ? "Ingresos" : "Gastos"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <TransactionsResponsiveList
              transactions={transactions}
              loading={loadingTransactions}
              emptyMessage="No hay transacciones registradas."
              fallbackCurrency={selectedCurrencyCode}
              showWalletOwner
            />
          </CardContent>
        </Card>

        {/* ── Banco (Enable Banking) ── */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold text-slate-800">Banco</CardTitle>
                {bankSessionId && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
                    Conectado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {bankSessionId && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleLoadBankData()}
                      disabled={bankLoading}
                      className="h-7 text-xs gap-1"
                    >
                      <RefreshCcw className={`h-3 w-3 ${bankLoading ? "animate-spin" : ""}`} />
                      Actualizar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDisconnectBank}
                      className="h-7 text-xs text-slate-400 hover:text-rose-500 gap-1"
                    >
                      <Link2Off className="h-3 w-3" />
                      Desconectar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-4 pb-4 space-y-4">
            {bankError && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center justify-between">
                <p className="text-xs text-rose-700">{bankError}</p>
                <button onClick={() => setBankError(null)} className="text-rose-400 hover:text-rose-600 ml-2">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {!bankSessionId ? (
              /* ── Sin banco conectado ── */
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Conecta tu banco español para ver tu saldo y transacciones reales.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Tu banco</label>
                  <select
                    value={selectedBankName}
                    onChange={(e) => setSelectedBankName(e.target.value)}
                    disabled={loadingBanks}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
                  >
                    {loadingBanks ? (
                      <option>Cargando bancos...</option>
                    ) : availableBanks.length > 0 ? (
                      availableBanks.map((bank) => (
                        <option key={bank.name} value={bank.name}>
                          {bank.name}
                        </option>
                      ))
                    ) : (
                      <option>No hay bancos disponibles</option>
                    )}
                  </select>
                </div>
                <Button
                  onClick={() => void handleConnectBank()}
                  disabled={bankConnecting || loadingBanks}
                  className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-sm gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  {bankConnecting ? "Redirigiendo al banco..." : "Conectar banco"}
                </Button>
              </div>
            ) : (
              /* ── Banco conectado ── */
              <div className="space-y-4">
                {/* Saldo */}
                {bankBalance ? (
                  <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 p-4 text-white">
                    <p className="text-xs text-blue-200 mb-1">Saldo disponible</p>
                    <p className="text-2xl font-bold">
                      {new Intl.NumberFormat("es-ES", {
                        style: "currency",
                        currency: bankBalance.currency,
                      }).format(parseFloat(bankBalance.amount))}
                    </p>
                    <p className="text-xs text-blue-300 mt-1">{selectedBankName}</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
                    <p className="text-xs text-slate-400">
                      Pulsa "Actualizar" para cargar los datos de tu banco.
                    </p>
                  </div>
                )}

                {/* Transacciones */}
                {bankTransactions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Últimas transacciones
                    </p>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {bankTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-800 truncate">{tx.description}</p>
                            <p className="text-[11px] text-slate-400">{tx.date}</p>
                          </div>
                          <span
                            className={`text-sm font-semibold ml-3 shrink-0 ${
                              tx.isCredit ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {tx.isCredit ? "+" : ""}
                            {new Intl.NumberFormat("es-ES", {
                              style: "currency",
                              currency: tx.currency,
                            }).format(parseFloat(tx.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Currency Management Modal */}
      <Dialog open={isCurrencyModalOpen} onOpenChange={setIsCurrencyModalOpen}>
        <DialogContent className="max-w-md mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Coins className="h-5 w-5 text-amber-500" />
              Gestión de Monedas
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Currency selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Moneda de visualización</Label>
              <Select value={selectedCurrencyId} onValueChange={setSelectedCurrencyId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={loadingCurrencies ? "Cargando..." : "Selecciona moneda"} />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.codigo} · {currency.nombre} ({currency.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Existing currencies list */}
            {currencies.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Monedas disponibles</Label>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {currencies.map((currency) => (
                    <div
                      key={currency.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                        selectedCurrencyId === currency.id
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-100 bg-slate-50"
                      }`}
                    >
                      <span className="font-semibold text-slate-800">{currency.codigo}</span>
                      <span className="text-slate-500 text-xs">{currency.nombre}</span>
                      <span className="text-[11px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{currency.tipo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new currency */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Agregar nueva moneda</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600">Código</Label>
                  <Input
                    value={newCurrencyCode}
                    onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                    placeholder="USD, CUP..."
                    maxLength={10}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-600">Tipo</Label>
                  <Select
                    value={newCurrencyType}
                    onValueChange={(v) => setNewCurrencyType(v as typeof newCurrencyType)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="digital">Digital</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Nombre completo</Label>
                <Input
                  value={newCurrencyName}
                  onChange={(e) => setNewCurrencyName(e.target.value)}
                  placeholder="Dólar americano, Peso cubano..."
                  maxLength={50}
                  className="h-9 text-sm"
                />
              </div>
              <Button
                onClick={handleCreateCurrency}
                disabled={creatingCurrency}
                className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {creatingCurrency ? "Guardando..." : "Agregar moneda"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Wallets Dialog */}
      <Dialog open={isWalletsDialogOpen} onOpenChange={setIsWalletsDialogOpen}>
        <DialogContent className="max-w-lg mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-slate-500" />
              Billeteras del Equipo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={walletSearch}
                onChange={(e) => setWalletSearch(e.target.value)}
                placeholder="Buscar por nombre o CI..."
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="max-h-[55vh] overflow-auto space-y-2 pr-0.5">
              {loadingWallets ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  <RefreshCcw className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Cargando billeteras...
                </div>
              ) : filteredWallets.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">No se encontraron billeteras.</div>
              ) : (
                filteredWallets.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-3 hover:border-slate-200 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{item.user_nombre}</p>
                      <p className="text-xs text-slate-400">CI: {item.user_ci}</p>
                      <p className="text-sm font-medium text-slate-700 mt-0.5">
                        {formatMoney(getWalletViewBalance(item), selectedCurrencyCode)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleOpenWalletDetail(item.id)}
                      className="ml-3 shrink-0 h-8 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Detalle
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wallet Detail Dialog */}
      <Dialog open={isWalletDetailDialogOpen} onOpenChange={setIsWalletDetailDialogOpen}>
        <DialogContent className="max-w-2xl mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Detalle de Billetera</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedWallet && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white">
                <p className="text-xs text-slate-400">Usuario</p>
                <p className="font-semibold">{selectedWallet.user_nombre}</p>
                <p className="text-xs text-slate-500">{selectedWallet.user_ci}</p>
                <p className="text-2xl font-bold mt-2">
                  {formatMoney(getWalletViewBalance(selectedWallet), selectedCurrencyCode)}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-400 mb-2">
                {totalSelectedWalletTransactions} transacciones
              </p>
              <TransactionsResponsiveList
                transactions={selectedWalletTransactions}
                loading={loadingSelectedWalletDetail}
                emptyMessage="Esta billetera no tiene transacciones."
                fallbackCurrency={selectedCurrencyCode}
                showWalletOwner={false}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
