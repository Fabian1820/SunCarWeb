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
import { Toaster } from "@/components/shared/molecule/toaster";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { RefreshCcw, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import type { WalletTransactionType } from "@/lib/types/feats/wallet/wallet-types";

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
  } = useWallet();

  const [tipo, setTipo] = useState<WalletTransactionType>("ingreso");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | WalletTransactionType>(
    "todos",
  );

  const currentFilters = useMemo(
    () => ({
      limit: 200,
      tipo: filtroTipo === "todos" ? undefined : filtroTipo,
    }),
    [filtroTipo],
  );

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    void loadTransactions(currentFilters);
  }, [loadTransactions, currentFilters]);

  const handleInitializeWallet = async () => {
    try {
      await initializeWallet();
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

  const handleRefresh = async () => {
    await Promise.all([loadWallet(), loadTransactions(currentFilters)]);
  };

  if (loadingWallet && !wallet) {
    return <PageLoader moduleName="Billetera" text="Cargando billetera..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <Toaster />

      <ModuleHeader
        title="Billetera"
        subtitle="Registro manual de ingresos y gastos con trazabilidad completa."
        actions={
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loadingTransactions || creatingTransaction}
            aria-label="Actualizar transacciones"
            title="Actualizar transacciones"
          >
            <RefreshCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-600" />
                Mi Billetera
              </CardTitle>
              <CardDescription>
                Se crea una sola vez usando tu usuario autenticado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {wallet ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500">Saldo actual</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatMoney(wallet.saldo_actual, wallet.moneda || "USD")}
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
                    Propietario: {wallet.user_nombre} ({wallet.user_ci})
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
                Cada movimiento exige motivo y queda en el historial sin opción
                de borrado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1 space-y-2">
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
                  className="min-h-[110px]"
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
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Transacciones Globales</CardTitle>
              <CardDescription>
                Todos los usuarios con acceso ven el historial completo.
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
            <div className="rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Billetera</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Registrado por</TableHead>
                    <TableHead>Saldo Anterior</TableHead>
                    <TableHead>Saldo Posterior</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTransactions ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Cargando transacciones...
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No hay transacciones registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-xs sm:text-sm">
                          {formatDateTime(transaction.created_at)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {transaction.wallet_user_nombre}
                          <p className="text-[11px] text-gray-500">
                            {transaction.wallet_user_ci}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              transaction.tipo === "ingreso"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : "bg-red-100 text-red-700 border-red-200"
                            }
                          >
                            {transaction.tipo === "ingreso" ? (
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                            )}
                            {transaction.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatMoney(transaction.monto, wallet?.moneda || "USD")}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate" title={transaction.motivo}>
                            {transaction.motivo}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {transaction.created_by_nombre}
                          <p className="text-[11px] text-gray-500">
                            {transaction.created_by_ci}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {formatMoney(
                            transaction.saldo_anterior,
                            wallet?.moneda || "USD",
                          )}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {formatMoney(
                            transaction.saldo_posterior,
                            wallet?.moneda || "USD",
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
