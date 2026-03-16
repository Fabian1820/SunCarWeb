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
  CardDescription,
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
  Eye,
  RefreshCcw,
  Search,
  SendHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import type {
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

const TransactionTypeBadge = ({ tipo }: { tipo: WalletTransactionType }) => (
  <Badge
    className={
      tipo === "ingreso"
        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
        : "bg-red-100 text-red-700 border-red-200"
    }
  >
    {tipo === "ingreso" ? (
      <ArrowUpCircle className="h-3 w-3 mr-1" />
    ) : (
      <ArrowDownCircle className="h-3 w-3 mr-1" />
    )}
    {tipo}
  </Badge>
);

type TransactionsResponsiveListProps = {
  transactions: WalletTransaction[];
  loading: boolean;
  emptyMessage: string;
  currency: string;
  showWalletOwner?: boolean;
};

function TransactionsResponsiveList({
  transactions,
  loading,
  emptyMessage,
  currency,
  showWalletOwner = true,
}: TransactionsResponsiveListProps) {
  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">Cargando transacciones...</div>
    );
  }

  if (transactions.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-500">{emptyMessage}</div>;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="border border-gray-200 shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  {formatDateTime(transaction.created_at)}
                </p>
                <TransactionTypeBadge tipo={transaction.tipo} />
              </div>
              <p className="text-base font-semibold text-gray-900">
                {formatMoney(transaction.monto, currency)}
              </p>
              {showWalletOwner ? (
                <p className="text-xs text-gray-600">
                  Billetera: {transaction.wallet_user_nombre} ({transaction.wallet_user_ci})
                </p>
              ) : null}
              <p className="text-sm text-gray-700">{transaction.motivo}</p>
              <p className="text-xs text-gray-600">
                Registrado por: {transaction.created_by_nombre} ({transaction.created_by_ci})
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <p>
                  Antes:{" "}
                  <span className="font-medium text-gray-800">
                    {formatMoney(transaction.saldo_anterior, currency)}
                  </span>
                </p>
                <p>
                  Después:{" "}
                  <span className="font-medium text-gray-800">
                    {formatMoney(transaction.saldo_posterior, currency)}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden md:block rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              {showWalletOwner ? <TableHead>Billetera</TableHead> : null}
              <TableHead>Tipo</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Registrado por</TableHead>
              <TableHead>Saldo Anterior</TableHead>
              <TableHead>Saldo Posterior</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="text-xs lg:text-sm">
                  {formatDateTime(transaction.created_at)}
                </TableCell>
                {showWalletOwner ? (
                  <TableCell className="text-xs lg:text-sm">
                    {transaction.wallet_user_nombre}
                    <p className="text-[11px] text-gray-500">
                      {transaction.wallet_user_ci}
                    </p>
                  </TableCell>
                ) : null}
                <TableCell>
                  <TransactionTypeBadge tipo={transaction.tipo} />
                </TableCell>
                <TableCell className="font-medium">
                  {formatMoney(transaction.monto, currency)}
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="truncate" title={transaction.motivo}>
                    {transaction.motivo}
                  </p>
                </TableCell>
                <TableCell className="text-xs lg:text-sm">
                  {transaction.created_by_nombre}
                  <p className="text-[11px] text-gray-500">
                    {transaction.created_by_ci}
                  </p>
                </TableCell>
                <TableCell className="text-xs lg:text-sm">
                  {formatMoney(transaction.saldo_anterior, currency)}
                </TableCell>
                <TableCell className="text-xs lg:text-sm">
                  {formatMoney(transaction.saldo_posterior, currency)}
                </TableCell>
              </TableRow>
            ))}
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
    loadingWallet,
    loadingWallets,
    loadingTransactions,
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
  } = useWallet();

  const [tipo, setTipo] = useState<WalletTransactionType>("ingreso");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | WalletTransactionType>(
    "todos",
  );

  const [walletSearch, setWalletSearch] = useState("");
  const [isWalletsDialogOpen, setIsWalletsDialogOpen] = useState(false);
  const [isWalletDetailDialogOpen, setIsWalletDetailDialogOpen] = useState(false);

  const [transferFromWalletId, setTransferFromWalletId] = useState("");
  const [transferToWalletId, setTransferToWalletId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferReason, setTransferReason] = useState("");

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
    () => wallets.filter((item) => item.id !== transferFromWalletId),
    [wallets, transferFromWalletId],
  );

  useEffect(() => {
    void loadWallet();
    void loadWallets({ limit: 500 });
  }, [loadWallet, loadWallets]);

  useEffect(() => {
    void loadTransactions(currentFilters);
  }, [loadTransactions, currentFilters]);

  useEffect(() => {
    if (wallet?.id && !transferFromWalletId) {
      setTransferFromWalletId(wallet.id);
    }
  }, [wallet?.id, transferFromWalletId]);

  useEffect(() => {
    if (
      transferToWalletId &&
      transferFromWalletId &&
      transferToWalletId === transferFromWalletId
    ) {
      setTransferToWalletId("");
    }
  }, [transferFromWalletId, transferToWalletId]);

  const getWalletCurrency = (walletData?: WalletType | null) =>
    walletData?.moneda || wallet?.moneda || "USD";

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
        description:
          err instanceof Error ? err.message : "No se pudo iniciar la billetera",
        variant: "destructive",
      });
    }
  };

  const handleCreateTransaction = async () => {
    const parsedAmount = Number(monto.replace(",", "."));
    const trimmedReason = motivo.trim();

    if (!wallet) {
      toast({
        title: "Billetera no iniciada",
        description: "Primero debes iniciar tu billetera.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Monto inválido",
        description: "El monto debe ser mayor que 0.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedReason.length < 5) {
      toast({
        title: "Motivo requerido",
        description: "Escribe un motivo con al menos 5 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTransaction(
        {
          tipo,
          monto: parsedAmount,
          motivo: trimmedReason,
        },
        currentFilters,
      );

      setMonto("");
      setMotivo("");
      await loadWallets({ limit: 500 });

      toast({
        title: "Transacción registrada",
        description:
          tipo === "ingreso"
            ? "Ingreso creado correctamente."
            : "Gasto creado correctamente.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "No se pudo registrar la transacción",
        variant: "destructive",
      });
    }
  };

  const handleTransfer = async () => {
    const parsedAmount = Number(transferAmount.replace(",", "."));
    const trimmedReason = transferReason.trim();

    if (!transferFromWalletId || !transferToWalletId) {
      toast({
        title: "Transferencia incompleta",
        description: "Selecciona billetera origen y destino.",
        variant: "destructive",
      });
      return;
    }

    if (transferFromWalletId === transferToWalletId) {
      toast({
        title: "Transferencia inválida",
        description: "El origen y destino deben ser diferentes.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Monto inválido",
        description: "El monto de transferencia debe ser mayor que 0.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedReason.length < 5) {
      toast({
        title: "Motivo requerido",
        description: "Escribe un motivo con al menos 5 caracteres.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTransfer(
        {
          wallet_origen_id: transferFromWalletId,
          wallet_destino_id: transferToWalletId,
          monto: parsedAmount,
          motivo: trimmedReason,
        },
        {
          globalFilters: currentFilters,
          selectedWalletId: selectedWallet?.id ?? null,
          selectedWalletFilters: { limit: 200 },
        },
      );

      setTransferAmount("");
      setTransferReason("");

      toast({
        title: "Transferencia registrada",
        description: "La transferencia entre usuarios se registró correctamente.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "No se pudo registrar la transferencia",
        variant: "destructive",
      });
    }
  };

  const handleOpenWalletDetail = async (walletId: string) => {
    try {
      await loadWalletDetail(walletId, { limit: 200 });
      setIsWalletDetailDialogOpen(true);
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

  if (loadingWallet && !wallet) {
    return <PageLoader moduleName="Billetera" text="Cargando billetera..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <Toaster />

      <ModuleHeader
        title="Billetera"
        subtitle="Control manual de saldos, movimientos y transferencias entre usuarios."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setIsWalletsDialogOpen(true)}
              aria-label="Ver billeteras"
              title="Ver billeteras"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Billeteras</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={loadingTransactions || creatingTransaction || transferring}
              aria-label="Actualizar billeteras y transacciones"
              title="Actualizar"
            >
              <RefreshCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-3">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-600" />
                Mi Billetera
              </CardTitle>
              <CardDescription>
                Tu saldo actual y estado de billetera.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {wallet ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500">Saldo actual</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatMoney(wallet.saldo_actual, getWalletCurrency(wallet))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Estado:</span>
                    <Badge
                      className={
                        wallet.estado === "activa"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-gray-200 text-gray-700 border-gray-300"
                      }
                    >
                      {wallet.estado}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Usuario: {wallet.user_nombre} ({wallet.user_ci})
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Aún no tienes billetera creada.
                  </p>
                  <Button
                    onClick={handleInitializeWallet}
                    disabled={creatingWallet}
                    className="w-full"
                  >
                    {creatingWallet ? "Iniciando..." : "Iniciar billetera"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Registrar Transacción Manual</CardTitle>
              <CardDescription>
                Ingreso o gasto con motivo obligatorio y trazabilidad completa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wallet-tipo">Tipo</Label>
                  <Select
                    value={tipo}
                    onValueChange={(value) => setTipo(value as WalletTransactionType)}
                  >
                    <SelectTrigger id="wallet-tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ingreso">Ingreso</SelectItem>
                      <SelectItem value="gasto">Gasto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="wallet-monto">Monto</Label>
                  <Input
                    id="wallet-monto"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={monto}
                    onChange={(event) => setMonto(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wallet-motivo">Motivo</Label>
                <Textarea
                  id="wallet-motivo"
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  placeholder="Explica por qué se hizo esta transacción..."
                  className="min-h-[100px]"
                />
              </div>

              <Button
                onClick={handleCreateTransaction}
                disabled={creatingTransaction || creatingWallet || !wallet}
              >
                {creatingTransaction ? "Registrando..." : "Registrar transacción"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SendHorizontal className="h-5 w-5 text-indigo-600" />
              Transferir Entre Usuarios
            </CardTitle>
            <CardDescription>
              Transferencia entre billeteras internas con registro automático.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="transfer-from">Desde</Label>
                <Select
                  value={transferFromWalletId}
                  onValueChange={setTransferFromWalletId}
                >
                  <SelectTrigger id="transfer-from">
                    <SelectValue placeholder="Seleccione origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.user_nombre} ({item.user_ci})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer-to">Hacia</Label>
                <Select value={transferToWalletId} onValueChange={setTransferToWalletId}>
                  <SelectTrigger id="transfer-to">
                    <SelectValue placeholder="Seleccione destino" />
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="sm:col-span-1 space-y-2">
                <Label htmlFor="transfer-amount">Monto</Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="transfer-reason">Motivo</Label>
                <Textarea
                  id="transfer-reason"
                  value={transferReason}
                  onChange={(event) => setTransferReason(event.target.value)}
                  placeholder="Motivo de la transferencia..."
                  className="min-h-[88px]"
                />
              </div>
            </div>

            <Button
              onClick={handleTransfer}
              disabled={transferring || loadingWallets || wallets.length < 2}
            >
              {transferring ? "Transfiriendo..." : "Transferir"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3">
            <div>
              <CardTitle>Transacciones Globales</CardTitle>
              <CardDescription>
                Historial global visible para todos los usuarios con acceso.
              </CardDescription>
            </div>
            <div className="w-full sm:w-56">
              <Select
                value={filtroTipo}
                onValueChange={(value) =>
                  setFiltroTipo(value as "todos" | WalletTransactionType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ingreso">Solo ingresos</SelectItem>
                  <SelectItem value="gasto">Solo gastos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">
              Total registros visibles: {totalTransactions}
            </p>

            <TransactionsResponsiveList
              transactions={transactions}
              loading={loadingTransactions}
              emptyMessage="No hay transacciones registradas."
              currency={getWalletCurrency()}
              showWalletOwner
            />
          </CardContent>
        </Card>
      </main>

      <Dialog open={isWalletsDialogOpen} onOpenChange={setIsWalletsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Billeteras del Equipo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={walletSearch}
                onChange={(event) => setWalletSearch(event.target.value)}
                placeholder="Buscar por nombre o CI..."
                className="pl-9"
              />
            </div>

            <div className="max-h-[55vh] overflow-auto space-y-3 pr-1">
              {loadingWallets ? (
                <p className="text-sm text-gray-500 py-4 text-center">Cargando billeteras...</p>
              ) : filteredWallets.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No se encontraron billeteras.
                </p>
              ) : (
                filteredWallets.map((item) => (
                  <Card key={item.id} className="border border-gray-200">
                    <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{item.user_nombre}</p>
                        <p className="text-xs text-gray-500">CI: {item.user_ci}</p>
                        <p className="text-sm text-gray-700 mt-1">
                          Saldo: {formatMoney(item.saldo_actual, getWalletCurrency(item))}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => void handleOpenWalletDetail(item.id)}
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalle
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isWalletDetailDialogOpen}
        onOpenChange={setIsWalletDetailDialogOpen}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle de Billetera</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedWallet ? (
              <Card className="border border-gray-200">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">
                    Usuario:{" "}
                    <span className="font-medium text-gray-900">
                      {selectedWallet.user_nombre} ({selectedWallet.user_ci})
                    </span>
                  </p>
                  <p className="text-xl font-bold text-gray-900 mt-2">
                    {formatMoney(
                      selectedWallet.saldo_actual,
                      getWalletCurrency(selectedWallet),
                    )}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <div>
              <p className="text-xs text-gray-500 mb-2">
                Total transacciones de esta billetera: {totalSelectedWalletTransactions}
              </p>
              <TransactionsResponsiveList
                transactions={selectedWalletTransactions}
                loading={loadingSelectedWalletDetail}
                emptyMessage="Esta billetera no tiene transacciones."
                currency={getWalletCurrency(selectedWallet)}
                showWalletOwner={false}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
