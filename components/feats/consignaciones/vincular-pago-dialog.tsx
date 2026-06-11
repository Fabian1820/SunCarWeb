"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { PagoVentaService } from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";
import type { Consignacion } from "@/lib/types/feats/consignaciones/consignacion-types";
import type { PagoVenta } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

interface VincularPagoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consignacion: Consignacion | null;
  onSubmit: (pagoVentaId: string) => Promise<void>;
}

const METODO_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia_bancaria: "Transferencia",
  stripe: "Stripe",
  zelle: "Zelle",
  financiacion: "Financiación",
};

const formatMoney = (n: number, moneda: string) =>
  new Intl.NumberFormat("es-CU", {
    style: "currency",
    currency: moneda || "USD",
    minimumFractionDigits: 2,
  }).format(n || 0);

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

export function VincularPagoDialog({
  open,
  onOpenChange,
  consignacion,
  onSubmit,
}: VincularPagoDialogProps) {
  const [pagos, setPagos] = useState<PagoVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !consignacion) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    PagoVentaService.getTodosPagos({
      solicitud_venta_id: consignacion.solicitud_venta_id,
      limit: 100,
    })
      .then((res) => {
        if (cancelled) return;
        setPagos(res.data || []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "No se pudieron cargar los pagos");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, consignacion]);

  const yaVinculados = new Set(consignacion?.pagos_ids ?? []);

  const handleVincular = async (pagoId: string) => {
    setSubmittingId(pagoId);
    setError(null);
    try {
      await onSubmit(pagoId);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "No se pudo vincular el pago");
    } finally {
      setSubmittingId(null);
    }
  };

  if (!consignacion) return null;

  const pagosVinculables = pagos.filter((p) => !yaVinculados.has(p.id ?? ""));
  const todosVinculados =
    pagos.length > 0 && pagosVinculables.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular un pago a esta consignación</DialogTitle>
          <DialogDescription>
            Selecciona el pago que el cliente entregó. Se descontará del saldo
            pendiente automáticamente. Si todavía no registraste el pago,
            hazlo primero en el módulo <b>Pagos de Ventas</b> y vuelve aquí.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : pagos.length === 0 ? (
          <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                Aún no hay pagos registrados para esta solicitud.
              </p>
              <p className="mt-1 text-xs">
                Ve al módulo <b>Pagos de Ventas</b>, registra el pago que
                entregó el cliente y vuelve aquí — aparecerá en esta lista para
                vincular en un clic.
              </p>
            </div>
          </div>
        ) : todosVinculados ? (
          <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                Todos los pagos de esta solicitud ya están vinculados.
              </p>
              <p className="mt-1 text-xs">
                Si necesitas vincular un pago nuevo, regístralo primero en{" "}
                <b>Pagos de Ventas</b>.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {pagosVinculables.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => p.id && handleVincular(p.id)}
                disabled={!!submittingId}
                className="flex w-full items-center justify-between rounded-lg border bg-white p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {formatMoney(Number(p.monto), p.moneda || "USD")}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {formatDate(p.fecha)} ·{" "}
                    {p.metodo_pago
                      ? METODO_LABELS[p.metodo_pago] ?? p.metodo_pago
                      : "—"}
                    {p.recibido_por && ` · recibido por ${p.recibido_por}`}
                  </div>
                </div>
                {submittingId === p.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                ) : (
                  <span className="text-xs font-medium text-indigo-600">
                    Vincular →
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={!!submittingId}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
