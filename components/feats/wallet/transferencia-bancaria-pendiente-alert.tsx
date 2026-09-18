"use client";

import { useState } from "react";
import { AlertTriangle, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { useTransferenciasBancariasPendientes } from "@/hooks/use-transferencias-bancarias-pendientes";
import type { TransferenciaBancaria } from "@/lib/types/feats/transferencias-bancarias/transferencia-bancaria-types";
import { TransferenciaBancariaDetalleAdminDialog } from "@/components/feats/wallet/transferencia-bancaria-detalle-admin-dialog";

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

const formatFecha = (date: Date): string => {
  try {
    return new Intl.DateTimeFormat("es-CU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

/**
 * Alerta que aparece en el detalle de un banco (`app/wallet/page.tsx`) cuando
 * hay transferencias bancarias generadas por comerciales desde Leads/Clientes
 * que están esperando ser aceptadas o rechazadas por el admin de wallet. Si
 * no hay pendientes no renderiza nada.
 */
export function TransferenciaBancariaPendienteAlert({
  bancoId,
}: {
  bancoId: string;
}) {
  const { pendientes, loading, error, reload } =
    useTransferenciasBancariasPendientes(bancoId, !!bancoId);
  const [seleccionada, setSeleccionada] = useState<TransferenciaBancaria | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleVerDetalle = (transferencia: TransferenciaBancaria) => {
    setSeleccionada(transferencia);
    setDialogOpen(true);
  };

  if (!loading && pendientes.length === 0 && !error) {
    return null;
  }

  return (
    <>
      <Card className="border-2 border-amber-300 bg-amber-50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <CardTitle className="text-sm font-semibold text-amber-900">
              Transferencias bancarias pendientes de aprobación
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {loading && pendientes.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-amber-700 py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cargando transferencias pendientes...
            </div>
          ) : error ? (
            <p className="text-xs text-amber-800">{error}</p>
          ) : (
            pendientes.map((transferencia) => (
              <div
                key={transferencia.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {transferencia.nombreCompletoCliente}
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {formatMoney(transferencia.monto, transferencia.moneda)}
                    </span>
                    {" · "}
                    Oferta {transferencia.ofertaId}
                    {" · "}
                    {formatFecha(transferencia.createdAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={() => handleVerDetalle(transferencia)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver detalle
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <TransferenciaBancariaDetalleAdminDialog
        transferencia={seleccionada}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onResuelto={() => {
          void reload();
        }}
      />
    </>
  );
}
