"use client";

import { useEffect, useMemo, useState } from "react";
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
  ArrowRight,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Coins,
  Eye,
  Info,
  Landmark,
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
import { useMyWalletPermiso } from "@/hooks/use-wallet-permisos";
import { BancoGlobalSheet } from "@/components/feats/wallet/banco-global-sheet";
import { TrabajadorService, WalletService } from "@/lib/api-services";
import type { Trabajador } from "@/lib/api-types";
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
    timeZone: "America/Havana",
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

type TransferParties = {
  fromName: string;
  fromCi: string;
  toName: string;
  toCi: string;
};

const getTransferParties = (
  transaction: WalletTransaction,
): TransferParties | null => {
  if (!isTransferTransaction(transaction)) return null;
  const isOutgoing =
    transaction.tipo === "transferencia_salida" ||
    transaction.transferencia_direccion === "salida";
  if (isOutgoing) {
    return {
      fromName: transaction.wallet_user_nombre,
      fromCi: transaction.wallet_user_ci,
      toName: transaction.contraparte_user_nombre || "—",
      toCi: transaction.contraparte_user_ci || "",
    };
  }
  return {
    fromName: transaction.contraparte_user_nombre || "—",
    fromCi: transaction.contraparte_user_ci || "",
    toName: transaction.wallet_user_nombre,
    toCi: transaction.wallet_user_ci,
  };
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
  onSelect?: (transaction: WalletTransaction) => void;
};

function TransactionsResponsiveList({
  transactions,
  loading,
  emptyMessage,
  fallbackCurrency,
  showWalletOwner = true,
  onSelect,
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
          const isIncomingTransfer =
            transaction.tipo === "transferencia_entrada" ||
            transaction.transferencia_direccion === "entrada";
          const parties = getTransferParties(transaction);
          // En vista global (showWalletOwner) la transferencia es neutral — no es ni ingreso ni gasto del viewer
          const isGlobalTransfer = isTransfer && showWalletOwner;
          const amountColor = isGlobalTransfer
            ? "text-violet-600"
            : isTransfer
            ? isIncomingTransfer
              ? "text-emerald-600"
              : "text-rose-600"
            : isIngreso
            ? "text-emerald-600"
            : "text-rose-600";
          const borderColor = isTransfer
            ? "border-l-violet-400"
            : isIngreso
            ? "border-l-emerald-400"
            : "border-l-rose-400";
          const sign = isGlobalTransfer
            ? ""
            : isTransfer
            ? isIncomingTransfer
              ? "+"
              : "-"
            : isIngreso
            ? "+"
            : "-";

          return (
            <button
              key={transaction.id}
              onClick={() => onSelect?.(transaction)}
              className={`w-full text-left bg-white rounded-xl border border-slate-100 border-l-4 ${borderColor} p-3 shadow-sm hover:shadow-md hover:border-slate-200 transition-all`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <TransactionTypeBadge transaction={transaction} />
                  <span className="text-[11px] text-slate-400 truncate">
                    {formatDateTime(transaction.created_at)}
                  </span>
                </div>
                <Info className="h-3.5 w-3.5 text-slate-300 shrink-0 mt-0.5" />
              </div>

              <div className="flex items-baseline gap-1.5 mt-0.5">
                <p className={`text-base font-bold ${amountColor} tabular-nums`}>
                  {sign}{formatMoney(transaction.monto, rowCurrency)}
                </p>
                <span className="text-[10px] font-semibold px-1 rounded bg-slate-100 text-slate-500">
                  {rowCurrency}
                </span>
              </div>

              {parties ? (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                  <span className="text-slate-700 font-medium truncate min-w-0">
                    {parties.fromName}
                  </span>
                  <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-medium truncate min-w-0">
                    {parties.toName}
                  </span>
                </div>
              ) : showWalletOwner ? (
                <p className="text-xs text-slate-500 mt-1 truncate">
                  {transaction.wallet_user_nombre}
                </p>
              ) : null}

              <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                {transaction.motivo}
              </p>
            </button>
          );
        })}
      </div>

      {/* Desktop table */}
      <div
        className="hidden md:block overflow-x-auto"
        style={{ transform: "scaleY(-1)" }}
      >
      <div style={{ transform: "scaleY(-1)" }}>
      <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs font-semibold text-slate-500">Fecha</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Tipo</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Detalle</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500 text-right">Monto</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Motivo</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const rowCurrency = transaction.currency_code || fallbackCurrency;
              const isTransfer = isTransferTransaction(transaction);
              const isIngreso = transaction.tipo === "ingreso";
              const isIncomingTransfer =
                transaction.tipo === "transferencia_entrada" ||
                transaction.transferencia_direccion === "entrada";
              const parties = getTransferParties(transaction);
              const isGlobalTransfer = isTransfer && showWalletOwner;
              const amountColor = isGlobalTransfer
                ? "text-violet-600"
                : isTransfer
                ? isIncomingTransfer
                  ? "text-emerald-600"
                  : "text-rose-600"
                : isIngreso
                ? "text-emerald-600"
                : "text-rose-600";
              const sign = isGlobalTransfer
                ? ""
                : isTransfer
                ? isIncomingTransfer
                  ? "+"
                  : "-"
                : isIngreso
                ? "+"
                : "-";

              return (
                <TableRow
                  key={transaction.id}
                  className="hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => onSelect?.(transaction)}
                >
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(transaction.created_at)}
                  </TableCell>
                  <TableCell>
                    <TransactionTypeBadge transaction={transaction} />
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    {parties ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-slate-800 font-medium truncate max-w-[140px]">
                          {parties.fromName}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-800 font-medium truncate max-w-[140px]">
                          {parties.toName}
                        </span>
                      </div>
                    ) : showWalletOwner ? (
                      <div>
                        <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">
                          {transaction.wallet_user_nombre}
                        </p>
                        <p className="text-[11px] text-slate-400">{transaction.wallet_user_ci}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className={`font-bold tabular-nums text-right whitespace-nowrap ${amountColor}`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{sign}{formatMoney(transaction.monto, rowCurrency)}</span>
                      <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-slate-100 text-slate-500">
                        {rowCurrency}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <p className="truncate text-sm text-slate-600">
                      {transaction.motivo}
                    </p>
                  </TableCell>
                  <TableCell className="w-9 text-right">
                    <Info className="h-4 w-4 text-slate-300 inline" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      </div>
      </div>
    </>
  );
}

function TransactionDetailsDialog({
  transaction,
  open,
  onOpenChange,
  fallbackCurrency,
}: {
  transaction: WalletTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackCurrency: string;
}) {
  if (!transaction) return null;

  const rowCurrency = transaction.currency_code || fallbackCurrency;
  const isTransfer = isTransferTransaction(transaction);
  const isIngreso = transaction.tipo === "ingreso";
  const isIncomingTransfer =
    transaction.tipo === "transferencia_entrada" ||
    transaction.transferencia_direccion === "entrada";
  const parties = getTransferParties(transaction);
  const amountColor = isTransfer
    ? isIncomingTransfer
      ? "text-emerald-600"
      : "text-rose-600"
    : isIngreso
    ? "text-emerald-600"
    : "text-rose-600";
  const sign = isTransfer
    ? isIncomingTransfer
      ? "+"
      : "-"
    : isIngreso
    ? "+"
    : "-";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <TransactionTypeBadge transaction={transaction} />
            Detalle de la transacción
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Monto destacado */}
          <div className="text-center py-3">
            <p className={`text-3xl font-bold tabular-nums ${amountColor}`}>
              {sign}
              {formatMoney(transaction.monto, rowCurrency)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatDateTime(transaction.created_at)}
            </p>
          </div>

          {/* De → Para o usuario */}
          {parties ? (
            <div className="rounded-xl border border-slate-200 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Transferencia
              </p>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400">De</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {parties.fromName}
                  </p>
                  {parties.fromCi && (
                    <p className="text-[11px] text-slate-400">CI: {parties.fromCi}</p>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 shrink-0 mt-3" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400">Para</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {parties.toName}
                  </p>
                  {parties.toCi && (
                    <p className="text-[11px] text-slate-400">CI: {parties.toCi}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                Billetera
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {transaction.wallet_user_nombre}
              </p>
              <p className="text-[11px] text-slate-400">CI: {transaction.wallet_user_ci}</p>
            </div>
          )}

          {/* Motivo completo */}
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
              Motivo
            </p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
              {transaction.motivo || "—"}
            </p>
          </div>

          {/* Saldos */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                Saldo antes
              </p>
              <p className="text-sm font-semibold text-slate-700 tabular-nums">
                {formatMoney(transaction.saldo_anterior, rowCurrency)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                Saldo después
              </p>
              <p className="text-sm font-semibold text-slate-700 tabular-nums">
                {formatMoney(transaction.saldo_posterior, rowCurrency)}
              </p>
            </div>
          </div>

          {/* Footer info */}
          <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-100">
            <p>
              Registrado por:{" "}
              <span className="text-slate-600">
                {transaction.created_by_nombre} ({transaction.created_by_ci})
              </span>
            </p>
            {transaction.referencia_externa && (
              <p>
                Ref:{" "}
                <span className="text-slate-600 font-mono">
                  {transaction.referencia_externa}
                </span>
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WalletPage() {
  return <WalletPageContent />;
}

type ActiveAction = "ingreso" | "gasto" | "transferencia" | null;

function WalletPageContent() {
  const { toast } = useToast();
  const { permiso: walletPermiso } = useMyWalletPermiso();
  const canSeeAll = !!walletPermiso?.verTodos;
  const canManageBancoGlobal = !!walletPermiso?.gestionarBancoGlobal;
  const [isBancoGlobalOpen, setIsBancoGlobalOpen] = useState(false);
  const {
    wallet,
    wallets,
    walletsLookup,
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
    loadWalletsLookup,
    loadWalletDetail,
    createTransfer,
    loadCurrencies,
    createCurrency,
    pendingIncoming,
    pendingOutgoing,
    pendingAll,
    loadingPending,
    resolvingPendingId,
    loadPendingTransfers,
    acceptPendingTransfer,
    rejectPendingTransfer,
    cancelPendingTransfer,
    counterparts,
    loadCounterparts,
  } = useWallet();

  const TX_PAGE_SIZE = 50;

  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [tipo, setTipo] = useState<WalletTransactionType>("ingreso");
  const [montosPorMoneda, setMontosPorMoneda] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | WalletTransactionType>("todos");
  const [historyView, setHistoryView] = useState<"propias" | "todos">("todos");
  const [txPage, setTxPage] = useState(0);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [resolvingTransfer, setResolvingTransfer] = useState(false);

  const [walletSearch, setWalletSearch] = useState("");
  const [expandedTeamWalletId, setExpandedTeamWalletId] = useState<string | null>(null);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);
  const [isTransactionDetailOpen, setIsTransactionDetailOpen] = useState(false);
  const [currencyDistributionModal, setCurrencyDistributionModal] = useState<{ code: string; name: string } | null>(null);

  const openTransactionDetail = (transaction: WalletTransaction) => {
    setSelectedTransaction(transaction);
    setIsTransactionDetailOpen(true);
  };

  const [selectedCurrencyId, setSelectedCurrencyId] = useState("");
  const [transactionCurrencyId, setTransactionCurrencyId] = useState("");
  const [transferCurrencyId, setTransferCurrencyId] = useState("");
  const [newCurrencyCode, setNewCurrencyCode] = useState("");
  const [newCurrencyName, setNewCurrencyName] = useState("");
  const [newCurrencyType, setNewCurrencyType] = useState<
    "efectivo" | "transferencia" | "digital" | "otro"
  >("efectivo");

  const [transferToCi, setTransferToCi] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferTargetSearch, setTransferTargetSearch] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCounterpartCi, setSelectedCounterpartCi] = useState("");

  // Debounce de búsqueda: espera 400ms antes de disparar la consulta
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset de página cuando cambian los filtros
  useEffect(() => {
    setTxPage(0);
  }, [filtroTipo, debouncedSearch, fechaDesde, fechaHasta, historyView, selectedCounterpartCi]);

  const currentFilters = useMemo(
    () => ({
      limit: TX_PAGE_SIZE,
      skip: txPage * TX_PAGE_SIZE,
      tipo: filtroTipo === "todos" ? undefined : filtroTipo,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
      q: debouncedSearch.trim() || undefined,
      propias: canSeeAll && historyView === "propias" ? true : undefined,
      contraparte_ci: selectedCounterpartCi || undefined,
    }),
    [filtroTipo, txPage, fechaDesde, fechaHasta, debouncedSearch, historyView, canSeeAll, selectedCounterpartCi],
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

  // Fuente de destinos: TODOS los trabajadores. Si el trabajador ya tiene
  // wallet usamos su id; si no, queda con id="" y al confirmar se inicializa.
  const transferTargets = useMemo(() => {
    const walletByCi = new Map<string, { id: string; user_ci: string; user_nombre: string }>();
    const walletsSource = walletsLookup.length > 0 ? walletsLookup : wallets;
    for (const w of walletsSource) {
      walletByCi.set(w.user_ci, { id: w.id, user_ci: w.user_ci, user_nombre: w.user_nombre });
    }
    const targets: Array<{ id: string; user_ci: string; user_nombre: string; hasWallet: boolean }> = [];
    for (const t of trabajadores) {
      if (!t.CI || t.CI === wallet?.user_ci) continue;
      const existing = walletByCi.get(t.CI);
      if (existing) {
        targets.push({ ...existing, hasWallet: true });
        walletByCi.delete(t.CI);
      } else {
        targets.push({
          id: "",
          user_ci: t.CI,
          user_nombre: t.nombre,
          hasWallet: false,
        });
      }
    }
    // Añadir wallets sin trabajador asociado (raro, pero por consistencia)
    for (const w of walletByCi.values()) {
      if (w.user_ci === wallet?.user_ci) continue;
      targets.push({ ...w, hasWallet: true });
    }
    targets.sort((a, b) => a.user_nombre.localeCompare(b.user_nombre));
    return targets;
  }, [trabajadores, walletsLookup, wallets, wallet?.user_ci, wallet?.id]);

  const filteredTransferTargets = useMemo(() => {
    const q = transferTargetSearch.trim().toLowerCase();
    if (!q) return transferTargets.slice(0, 50);
    return transferTargets
      .filter(
        (item) =>
          item.user_nombre.toLowerCase().includes(q) ||
          item.user_ci.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [transferTargets, transferTargetSearch]);

  const selectedTransferTarget = useMemo(
    () => transferTargets.find((item) => item.user_ci === transferToCi) ?? null,
    [transferTargets, transferToCi],
  );

  const selectedCurrency = useMemo(
    () => currencies.find((item) => item.id === selectedCurrencyId) ?? null,
    [currencies, selectedCurrencyId],
  );

  const selectedCurrencyCode = selectedCurrency?.codigo || "USD";

  // Las transacciones ya vienen filtradas y paginadas desde el servidor
  const filteredWalletTransactions = transactions;

  useEffect(() => {
    void loadWallet();
    void loadWallets({ limit: 500 });
    void loadWalletsLookup({ limit: 1000 });
    void loadCurrencies();
    void loadPendingTransfers(canSeeAll);
    // Cargar trabajadores para permitir transferir a cualquiera (aún sin wallet)
    TrabajadorService.getAllTrabajadores()
      .then((data) => setTrabajadores(data))
      .catch((err) => console.error("[wallet] no se pudieron cargar trabajadores", err));
  }, [loadWallet, loadWallets, loadWalletsLookup, loadCurrencies, loadPendingTransfers, canSeeAll]);

  // Cargar contrapartes (personas con quien se ha transferido) — se refresca al cambiar vista
  useEffect(() => {
    void loadCounterparts(canSeeAll && historyView === "propias" ? true : !canSeeAll ? true : false);
  }, [loadCounterparts, canSeeAll, historyView]);

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
    if (transferToCi && wallet?.user_ci && transferToCi === wallet.user_ci) {
      setTransferToCi("");
    }
  }, [wallet?.user_ci, transferToCi]);

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
    const trimmedReason = motivo.trim();

    if (!wallet) {
      toast({ title: "Billetera no iniciada", description: "Primero debes iniciar tu billetera.", variant: "destructive" });
      return;
    }
    if (trimmedReason.length < 5) {
      toast({ title: "Motivo requerido", description: "Escribe un motivo con al menos 5 caracteres.", variant: "destructive" });
      return;
    }

    // Recolectar todos los montos por moneda > 0
    const entries: Array<{ currency_id: string; code: string; amount: number }> = [];
    for (const currency of currencies) {
      const raw = (montosPorMoneda[currency.id] || "").replace(",", ".").trim();
      if (!raw) continue;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) continue;
      entries.push({ currency_id: currency.id, code: currency.codigo, amount: parsed });
    }

    if (entries.length === 0) {
      toast({ title: "Monto requerido", description: "Ingresa al menos un monto mayor que 0.", variant: "destructive" });
      return;
    }

    try {
      // Crear una transacción por cada moneda con monto
      for (const entry of entries) {
        await createTransaction(
          { tipo, currency_id: entry.currency_id, monto: entry.amount, motivo: trimmedReason },
          currentFilters,
        );
      }
      setMontosPorMoneda({});
      setMotivo("");
      const resumen = entries
        .map((e) => formatMoney(e.amount, e.code))
        .join(", ");
      toast({
        title: tipo === "ingreso" ? "Ingreso registrado" : "Gasto registrado",
        description: `${resumen} registrado correctamente${entries.length > 1 ? ` (${entries.length} movimientos)` : ""}.`,
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

    if (!sourceWalletId || !selectedTransferTarget) {
      toast({ title: "Transferencia incompleta", description: "Debes tener tu billetera iniciada y seleccionar destino.", variant: "destructive" });
      return;
    }
    if (selectedTransferTarget.user_ci === wallet?.user_ci) {
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

    setResolvingTransfer(true);
    try {
      // Si el destinatario aún no tiene billetera, la inicializamos
      let destWalletId = selectedTransferTarget.id;
      if (!destWalletId) {
        const ensured = await WalletService.ensureWallet(
          selectedTransferTarget.user_ci,
          selectedTransferTarget.user_nombre,
        );
        destWalletId = ensured.id;
        void loadWalletsLookup({ limit: 1000 });
      }

      await createTransfer(
        { wallet_origen_id: sourceWalletId, wallet_destino_id: destWalletId, currency_id: transferCurrencyId, monto: parsedAmount, motivo: trimmedReason },
        { globalFilters: currentFilters, selectedWalletId: selectedWallet?.id ?? null, selectedWalletFilters: { limit: 200 } },
      );
      setTransferAmount("");
      setTransferReason("");
      setTransferToCi("");
      setTransferTargetSearch("");
      toast({
        title: "Transferencia enviada",
        description: "Esperando que el destinatario la acepte.",
      });
      setActiveAction(null);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo registrar la transferencia", variant: "destructive" });
    } finally {
      setResolvingTransfer(false);
    }
  };

  const handleToggleTeamWallet = async (walletId: string) => {
    if (expandedTeamWalletId === walletId) {
      setExpandedTeamWalletId(null);
      return;
    }
    setExpandedTeamWalletId(walletId);
    try {
      await loadWalletDetail(walletId, { limit: 100 });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "No se pudo cargar el detalle de la billetera",
        variant: "destructive",
      });
    }
  };

  // Todas las billeteras del equipo (sin filtrar por saldo).
  // Cuando no hay búsqueda, se muestran solo las 6 con más dinero acumulado
  // (suma de balances en todas las monedas); con búsqueda se muestran todas.
  const TEAM_WALLETS_TOP_LIMIT = 6;

  const allTeamWallets = useMemo(
    () => filteredWallets.filter((item) => item.id !== wallet?.id),
    [filteredWallets, wallet?.id],
  );

  const teamWallets = useMemo(() => {
    const isSearching = walletSearch.trim().length > 0;
    if (isSearching) return allTeamWallets;

    const sumBalances = (w: typeof allTeamWallets[number]) =>
      (w.balances ?? []).reduce((acc, b) => acc + Number(b.amount || 0), 0);

    return [...allTeamWallets]
      .sort((a, b) => sumBalances(b) - sumBalances(a))
      .slice(0, TEAM_WALLETS_TOP_LIMIT);
  }, [allTeamWallets, walletSearch]);

  // Totales por moneda considerando TODAS las billeteras (incluyendo la propia
  // del usuario), para que el total sea el global real.
  const teamTotalsByCurrency = useMemo(() => {
    const totals = new Map<
      string,
      { code: string; name: string; amount: number }
    >();
    // Inicializar con todas las monedas activas (para mostrar 0 si no hay)
    for (const c of currencies) {
      totals.set(c.id, { code: c.codigo, name: c.nombre, amount: 0 });
    }
    const allWalletsIncludingOwn = [
      ...(wallet ? [wallet] : []),
      ...allTeamWallets,
    ];
    for (const w of allWalletsIncludingOwn) {
      for (const b of w.balances ?? []) {
        const key = b.currency_id;
        const current = totals.get(key) || {
          code: b.currency_code,
          name: b.currency_name,
          amount: 0,
        };
        current.amount += Number(b.amount || 0);
        totals.set(key, current);
      }
    }
    return Array.from(totals.values()).filter((t) => t.amount !== 0);
  }, [allTeamWallets, currencies, wallet]);

  const currencyDistributionList = useMemo(() => {
    if (!currencyDistributionModal) return [];
    const code = currencyDistributionModal.code.toUpperCase();
    const allWalletsAll = [...(wallet ? [wallet] : []), ...allTeamWallets];
    return allWalletsAll
      .map((w) => {
        const balance = w.balances?.find((b) => b.currency_code.toUpperCase() === code);
        return {
          id: w.id,
          nombre: w.user_nombre,
          ci: w.user_ci,
          amount: Number(balance?.amount || 0),
          isOwn: w.id === wallet?.id,
        };
      })
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [currencyDistributionModal, wallet, allTeamWallets]);

  const handleAcceptPending = async (pendingId: string) => {
    try {
      await acceptPendingTransfer(pendingId);
      toast({
        title: "Transferencia aceptada",
        description: "Los fondos se acreditaron en tu billetera.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "No se pudo aceptar la transferencia",
        variant: "destructive",
      });
    }
  };

  const handleRejectPending = async (pendingId: string) => {
    if (!confirm("¿Rechazar esta transferencia?")) return;
    try {
      await rejectPendingTransfer(pendingId);
      toast({ title: "Transferencia rechazada" });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "No se pudo rechazar",
        variant: "destructive",
      });
    }
  };

  const handleCancelPending = async (pendingId: string) => {
    if (!confirm("¿Cancelar esta transferencia?")) return;
    try {
      await cancelPendingTransfer(pendingId);
      toast({ title: "Transferencia cancelada" });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "No se pudo cancelar",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    const refreshTasks: Promise<unknown>[] = [
      loadWallet(),
      loadTransactions(currentFilters),
      loadWallets({ limit: 500 }),
      loadPendingTransfers(),
    ];
    if (selectedWallet?.id) {
      refreshTasks.push(loadWalletDetail(selectedWallet.id, { limit: 200 }));
    }
    await Promise.all(refreshTasks);
  };

  const handleActionToggle = (action: ActiveAction) => {
    if (activeAction === action) {
      setActiveAction(null);
      setMontosPorMoneda({});
      setMotivo("");
    } else {
      setActiveAction(action);
      setMontosPorMoneda({});
      setMotivo("");
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

      <BancoGlobalSheet
        open={isBancoGlobalOpen}
        onOpenChange={setIsBancoGlobalOpen}
      />

      <ModuleHeader
        title="Billetera"
        subtitle="Control de saldos y movimientos"
        actions={
          <>
            {canManageBancoGlobal && (
              <Button
                variant="outline"
                onClick={() => setIsBancoGlobalOpen(true)}
                className="gap-1.5 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
                title="Banco CubespAuto"
              >
                <Landmark className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Banco Cubespauto</span>
              </Button>
            )}
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

      <main className={`content-with-fixed-header mx-auto px-4 py-4 sm:py-6 space-y-4 ${canSeeAll ? "max-w-4xl" : "max-w-2xl"}`}>
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
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Saldos disponibles</p>
                {currencies.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {currencies.map((currency) => {
                      const amount = getWalletBalanceForCurrency(wallet, currency);
                      const isActive = currency.id === selectedCurrencyId;
                      return (
                        <button
                          key={currency.id}
                          onClick={() => setSelectedCurrencyId(currency.id)}
                          className={`text-left rounded-xl px-3 py-2 transition-all border ${
                            isActive
                              ? "bg-white/15 border-white/40 shadow-sm"
                              : "bg-white/5 border-white/10 hover:bg-white/10"
                          }`}
                          title={currency.nombre}
                        >
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                            {currency.codigo}
                          </p>
                          <p className="text-base sm:text-lg font-bold tracking-tight tabular-nums truncate">
                            {formatMoney(amount, currency.codigo)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-2xl font-bold tracking-tight">—</p>
                )}
              </div>
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
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Montos por moneda
                </Label>
                <p className="text-[11px] text-slate-400">
                  Llena solo las monedas en las que quieres registrar el movimiento. Puedes hacer varios a la vez.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {currencies.map((currency) => (
                    <div
                      key={currency.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                          {currency.codigo}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate ml-1">
                          {currency.nombre}
                        </span>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={montosPorMoneda[currency.id] || ""}
                        onChange={(e) =>
                          setMontosPorMoneda((prev) => ({
                            ...prev,
                            [currency.id]: e.target.value,
                          }))
                        }
                        className="h-9 text-sm tabular-nums bg-white"
                      />
                    </div>
                  ))}
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
                disabled={creatingTransaction}
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
                {selectedTransferTarget ? (
                  <div className="flex items-center justify-between gap-2 h-9 rounded-lg border border-violet-200 bg-violet-50 px-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-slate-800 truncate block">
                        {selectedTransferTarget.user_nombre}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        CI: {selectedTransferTarget.user_ci}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferToCi("");
                        setTransferTargetSearch("");
                      }}
                      className="text-slate-400 hover:text-slate-700 shrink-0"
                      aria-label="Cambiar destinatario"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        value={transferTargetSearch}
                        onChange={(e) => setTransferTargetSearch(e.target.value)}
                        placeholder="Buscar por nombre o CI..."
                        className="h-9 pl-9 text-sm"
                        autoComplete="off"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-50">
                      {filteredTransferTargets.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-slate-400">
                          {transferTargetSearch
                            ? "Sin coincidencias"
                            : "Escribe para buscar destinatarios"}
                        </div>
                      ) : (
                        filteredTransferTargets.map((item) => (
                          <button
                            key={item.user_ci}
                            type="button"
                            onClick={() => {
                              setTransferToCi(item.user_ci);
                              setTransferTargetSearch("");
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 transition-colors flex items-center gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 truncate">
                                {item.user_nombre}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                CI: {item.user_ci}
                              </p>
                            </div>
                            {!item.hasWallet && (
                              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                Sin billetera
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                    {transferTargets.length > 50 && !transferTargetSearch && (
                      <p className="text-[11px] text-slate-400">
                        Mostrando 50 de {transferTargets.length}. Refina la búsqueda.
                      </p>
                    )}
                  </>
                )}
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
                disabled={
                  transferring ||
                  resolvingTransfer ||
                  !wallet ||
                  !selectedTransferTarget ||
                  !transferCurrencyId
                }
                className="w-full h-10 bg-violet-600 hover:bg-violet-700 font-medium"
              >
                {resolvingTransfer
                  ? "Preparando billetera..."
                  : transferring
                  ? "Enviando..."
                  : "Confirmar transferencia"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Team Wallets - solo si tiene permiso de ver todos */}
        {canSeeAll && (
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="px-4 pt-4 pb-3 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="rounded-full p-1.5 bg-slate-100 shrink-0">
                    <Users className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold text-slate-800">
                      Billeteras del Equipo
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {loadingWallets
                        ? "Cargando..."
                        : walletSearch.trim()
                          ? `${teamWallets.length} de ${allTeamWallets.length}`
                          : allTeamWallets.length > teamWallets.length
                            ? `Top ${teamWallets.length} de ${allTeamWallets.length} · busca para ver más`
                            : `${teamWallets.length} ${teamWallets.length === 1 ? "billetera" : "billeteras"}`}
                    </p>
                  </div>
                </div>

                {/* Totales por moneda - top right */}
                {teamTotalsByCurrency.length > 0 && (
                  <div className="flex flex-col items-end gap-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      Total equipo
                    </p>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {teamTotalsByCurrency.map((t) => (
                        <button
                          key={t.code}
                          onClick={() => setCurrencyDistributionModal({ code: t.code, name: t.name })}
                          className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 hover:bg-slate-100 hover:border-slate-300 transition-colors"
                          title={`Ver distribución de ${t.code} por billetera`}
                        >
                          <span className="text-[10px] font-bold text-slate-500">
                            {t.code}
                          </span>
                          <span className="text-xs font-bold text-slate-800 tabular-nums">
                            {formatMoney(t.amount, t.code)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={walletSearch}
                  onChange={(e) => setWalletSearch(e.target.value)}
                  placeholder="Buscar trabajador por nombre o CI..."
                  className="h-9 pl-9 text-sm"
                />
              </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 space-y-3">
              {loadingWallets && teamWallets.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  <RefreshCcw className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Cargando billeteras...
                </div>
              ) : teamWallets.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No se encontraron billeteras.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {teamWallets.map((item) => {
                      const isExpanded = expandedTeamWalletId === item.id;
                      const balance = getWalletViewBalance(item);
                      return (
                        <button
                          key={item.id}
                          onClick={() => void handleToggleTeamWallet(item.id)}
                          className={`text-left rounded-xl border p-3 transition-all ${
                            isExpanded
                              ? "border-slate-800 bg-slate-50 shadow-sm"
                              : "border-slate-100 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={`rounded-full p-1.5 shrink-0 ${
                                isExpanded ? "bg-slate-800" : "bg-slate-100"
                              }`}
                            >
                              <Wallet
                                className={`h-3.5 w-3.5 ${
                                  isExpanded ? "text-white" : "text-slate-500"
                                }`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {item.user_nombre}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                CI: {item.user_ci}
                              </p>
                              <p
                                className={`text-base font-bold mt-1 ${
                                  isExpanded ? "text-slate-900" : "text-slate-700"
                                }`}
                              >
                                {formatMoney(balance, selectedCurrencyCode)}
                              </p>
                            </div>
                            <Eye
                              className={`h-3.5 w-3.5 mt-1 shrink-0 ${
                                isExpanded ? "text-slate-800" : "text-slate-300"
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Detalle expandido inline */}
                  {expandedTeamWalletId && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-3">
                      {loadingSelectedWalletDetail && !selectedWallet ? (
                        <div className="py-6 text-center text-sm text-slate-400">
                          <RefreshCcw className="h-4 w-4 animate-spin mx-auto mb-2" />
                          Cargando detalle...
                        </div>
                      ) : selectedWallet ? (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-slate-400 uppercase tracking-wider">
                                Detalle
                              </p>
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {selectedWallet.user_nombre}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                CI: {selectedWallet.user_ci}
                              </p>
                            </div>
                            <button
                              onClick={() => setExpandedTeamWalletId(null)}
                              className="text-slate-400 hover:text-slate-600"
                              aria-label="Cerrar detalle"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Balances por moneda */}
                          {selectedWallet.balances && selectedWallet.balances.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedWallet.balances.map((b) => (
                                <span
                                  key={b.currency_id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs"
                                >
                                  <span className="font-semibold text-slate-700">
                                    {b.currency_code}
                                  </span>
                                  <span className="text-slate-600">
                                    {formatMoney(Number(b.amount || 0), b.currency_code)}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-slate-600">
                                Últimas transacciones
                              </p>
                              <span className="text-[11px] text-slate-400">
                                {totalSelectedWalletTransactions} en total
                              </span>
                            </div>
                            <TransactionsResponsiveList
                              transactions={selectedWalletTransactions}
                              loading={loadingSelectedWalletDetail}
                              emptyMessage="Esta billetera no tiene transacciones."
                              fallbackCurrency={selectedCurrencyCode}
                              showWalletOwner={false}
                              onSelect={openTransactionDetail}
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Transfers */}
        {(() => {
          // Para usuarios ver_todos: usar pendingAll (todas las del sistema).
          // Para el resto: combinar incoming + outgoing del propio usuario.
          const sourcePending = canSeeAll
            ? pendingAll
            : [...pendingIncoming, ...pendingOutgoing];
          // Dedupe por id por si llegan repetidos y ordenar por fecha desc.
          const seen = new Set<string>();
          const allPending = sourcePending
            .filter((p) => {
              if (seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            })
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            );
          const myCi = wallet?.user_ci;
          const incomingCount = allPending.filter(
            (p) => p.wallet_destino_user_ci === myCi,
          ).length;

          if (allPending.length === 0 && !loadingPending) return null;

          return (
            <Card className="border-amber-300 shadow-md rounded-2xl overflow-hidden ring-1 ring-amber-100">
              <CardHeader className="px-4 pt-4 pb-3 bg-gradient-to-r from-amber-50 to-amber-100/50">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="rounded-full p-1.5 bg-amber-100">
                      <SendHorizontal className="h-4 w-4 text-amber-700" />
                    </div>
                    {incomingCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                      </span>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                      Transferencias Pendientes
                      {incomingCount > 0 && (
                        <Badge className="bg-rose-500 text-white border-rose-500 text-[10px] h-4 px-1.5">
                          {incomingCount} para ti
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs text-amber-700/70 mt-0.5">
                      {allPending.length} pendiente{allPending.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {allPending.map((p) => {
                  const isResolving = resolvingPendingId === p.id;
                  const isReceiver = p.wallet_destino_user_ci === myCi;
                  const isSender = p.wallet_origen_user_ci === myCi;
                  // Color del monto desde la perspectiva del usuario
                  const amountColor = isReceiver
                    ? "text-emerald-600"
                    : isSender
                    ? "text-rose-600"
                    : "text-slate-700";
                  const sign = isReceiver ? "+" : isSender ? "-" : "";
                  const borderColor = isReceiver
                    ? "border-l-emerald-400"
                    : isSender
                    ? "border-l-rose-400"
                    : "border-l-slate-300";

                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border border-slate-100 border-l-4 ${borderColor} bg-white p-3`}
                    >
                      {/* Header: De → Para + monto */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-slate-800 font-medium truncate min-w-0">
                              {isSender ? "Tú" : p.wallet_origen_user_nombre}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-800 font-medium truncate min-w-0">
                              {isReceiver ? "Tú" : p.wallet_destino_user_nombre}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatDateTime(p.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <p className={`text-base font-bold ${amountColor} tabular-nums`}>
                            {sign}{formatMoney(Number(p.monto), p.currency_code)}
                          </p>
                          <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-slate-100 text-slate-500">
                            {p.currency_code}
                          </span>
                        </div>
                      </div>

                      {/* Motivo */}
                      <p className="text-xs text-slate-600 mb-3 whitespace-pre-wrap break-words">
                        {p.motivo}
                      </p>

                      {/* Acciones según rol */}
                      {isReceiver ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                            onClick={() => void handleRejectPending(p.id)}
                            disabled={isResolving}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Rechazar
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => void handleAcceptPending(p.id)}
                            disabled={isResolving}
                          >
                            {isResolving ? (
                              <RefreshCcw className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <ArrowDownCircle className="h-3.5 w-3.5 mr-1" />
                            )}
                            Aceptar
                          </Button>
                        </div>
                      ) : isSender ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs border-slate-300"
                          onClick={() => void handleCancelPending(p.id)}
                          disabled={isResolving}
                        >
                          {isResolving ? (
                            <RefreshCcw className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5 mr-1" />
                          )}
                          Cancelar transferencia
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Pendiente de aceptación
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}

        {/* Transactions */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="px-4 pt-4 pb-3 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-800">
                  {canSeeAll ? "Historial de Transacciones" : "Mi Historial"}
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  {loadingTransactions
                    ? "Cargando..."
                    : `${totalTransactions} registro${totalTransactions !== 1 ? "s" : ""}${
                        txPage > 0 || totalTransactions > TX_PAGE_SIZE
                          ? ` · página ${txPage + 1} de ${Math.max(1, Math.ceil(totalTransactions / TX_PAGE_SIZE))}`
                          : ""
                      }`}
                </p>
              </div>

              {/* Toggle Propias / Todos (solo cuando puede ver todas) */}
              {canSeeAll && (
                <div className="flex gap-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {(["propias", "todos"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setHistoryView(v)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        historyView === v
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {v === "propias" ? "Propias" : "Todas"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por motivo o nombre..."
                className="h-9 pl-9 text-sm"
              />
            </div>

            {/* Filtro de fechas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Desde
                </label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Hasta
                </label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            {(fechaDesde || fechaHasta) && (
              <button
                onClick={() => { setFechaDesde(""); setFechaHasta(""); }}
                className="self-start text-[11px] text-slate-400 hover:text-slate-600 underline"
              >
                Limpiar fechas
              </button>
            )}

            {/* Filtros por tipo */}
            <div className="flex gap-1.5 flex-wrap">
              {(["todos", "ingreso", "gasto", "transferencia"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroTipo(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    filtroTipo === f
                      ? f === "ingreso"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : f === "gasto"
                        ? "bg-rose-100 text-rose-700 border-rose-200"
                        : f === "transferencia"
                        ? "bg-violet-100 text-violet-700 border-violet-200"
                        : "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {f === "todos" ? "Todos" : f === "ingreso" ? "Ingresos" : f === "gasto" ? "Gastos" : "Transferencias"}
                </button>
              ))}
            </div>

            {/* Filtro por contraparte */}
            {counterparts.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Con persona
                </label>
                <Select
                  value={selectedCounterpartCi || "__all__"}
                  onValueChange={(v) => setSelectedCounterpartCi(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas las personas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las personas</SelectItem>
                    {counterparts.map((cp) => (
                      <SelectItem key={cp.ci} value={cp.ci}>
                        {cp.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <TransactionsResponsiveList
              transactions={filteredWalletTransactions}
              loading={loadingTransactions}
              emptyMessage={
                debouncedSearch || fechaDesde || fechaHasta || filtroTipo !== "todos" || selectedCounterpartCi
                  ? "No se encontraron transacciones con ese criterio."
                  : "No hay transacciones registradas."
              }
              fallbackCurrency={selectedCurrencyCode}
              showWalletOwner={canSeeAll && historyView === "todos"}
              onSelect={openTransactionDetail}
            />

            {/* Paginación */}
            {totalTransactions > TX_PAGE_SIZE && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  {txPage * TX_PAGE_SIZE + 1}–
                  {Math.min((txPage + 1) * TX_PAGE_SIZE, totalTransactions)}{" "}
                  de {totalTransactions}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTxPage((p) => p - 1)}
                    disabled={txPage === 0 || loadingTransactions}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium text-slate-600 min-w-[80px] text-center">
                    {txPage + 1} / {Math.ceil(totalTransactions / TX_PAGE_SIZE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTxPage((p) => p + 1)}
                    disabled={(txPage + 1) * TX_PAGE_SIZE >= totalTransactions || loadingTransactions}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Currency Distribution Modal */}
      <Dialog
        open={!!currencyDistributionModal}
        onOpenChange={(open) => { if (!open) setCurrencyDistributionModal(null); }}
      >
        <DialogContent className="max-w-md mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-5 w-5 text-slate-600" />
              Distribución · {currencyDistributionModal?.code}
              {currencyDistributionModal?.name && (
                <span className="text-xs font-normal text-slate-400">({currencyDistributionModal.name})</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
            {currencyDistributionList.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No hay saldos para esta moneda.
              </p>
            ) : (
              currencyDistributionList.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                    item.isOwn
                      ? "border-slate-300 bg-slate-100"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {item.nombre}
                      </p>
                      {item.isOwn && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-300 text-slate-600 shrink-0">
                          TÚ
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">CI: {item.ci}</p>
                  </div>
                  <span
                    className={`text-sm font-bold tabular-nums ml-3 ${
                      idx === 0 ? "text-emerald-600" : "text-slate-700"
                    }`}
                  >
                    {formatMoney(item.amount, currencyDistributionModal!.code)}
                  </span>
                </div>
              ))
            )}
          </div>

          {currencyDistributionList.length > 0 && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {currencyDistributionList.length}{" "}
                {currencyDistributionList.length === 1 ? "billetera" : "billeteras"}
              </p>
              <p className="text-sm font-bold text-slate-800 tabular-nums">
                Total:{" "}
                {formatMoney(
                  currencyDistributionList.reduce((sum, item) => sum + item.amount, 0),
                  currencyDistributionModal!.code,
                )}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      <TransactionDetailsDialog
        transaction={selectedTransaction}
        open={isTransactionDetailOpen}
        onOpenChange={setIsTransactionDetailOpen}
        fallbackCurrency={selectedCurrencyCode}
      />
    </div>
  );
}
