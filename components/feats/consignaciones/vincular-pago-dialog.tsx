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
import { Loader2, AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/shared/molecule/input";
import { PagoVentaService } from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";
import type { Consignacion } from "@/lib/types/feats/consignaciones/consignacion-types";
import type { PagoVenta } from "@/lib/types/feats/pagos-clientes-ventas/pago-cliente-venta-types";

interface VincularPagoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consignacion: Consignacion | null;
  onSubmit: (pagoVentaId: string) => Promise<void>;
}

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
      month: "2-digit",
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
  const [manualId, setManualId] = useState("");
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
      setManualId("");
    } catch (e: any) {
      setError(e?.message || "No se pudo vincular el pago");
    } finally {
      setSubmittingId(null);
    }
  };

  const pagosVinculables = pagos.filter((p) => !yaVinculados.has(p.id ?? ""));

  if (!consignacion) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular pago a consignación</DialogTitle>
          <DialogDescription>
            Selecciona uno de los pagos ya registrados para la solicitud{" "}
            <span className="font-mono text-xs">
              {consignacion.solicitud_venta_id}
            </span>
            . Si aún no existe, regístralo desde el módulo de Pagos y vuelve
            aquí.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : pagosVinculables.length === 0 && yaVinculados.size === pagos.length ? (
          <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-800">
            Todos los pagos existentes ya están vinculados a esta consignación.
            Registra un nuevo pago en el módulo de Pagos de Ventas y vuelve.
          </div>
        ) : pagosVinculables.length === 0 ? (
          <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-600">
            No hay pagos registrados para esta solicitud.
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
                  <div className="text-sm font-medium">
                    {formatMoney(Number(p.monto), p.moneda || "USD")}{" "}
                    <span className="text-xs text-gray-500">
                      · {p.metodo_pago}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(p.fecha)} · ID:{" "}
                    <span className="font-mono">{p.id}</span>
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

        <div className="mt-2 rounded-md border border-dashed border-gray-300 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            ¿Otro pago? Pegar id manualmente
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="ObjectId del pago"
                className="pl-8"
                disabled={!!submittingId}
              />
            </div>
            <Button
              onClick={() => manualId.trim() && handleVincular(manualId.trim())}
              disabled={!manualId.trim() || !!submittingId}
            >
              {submittingId === manualId.trim() && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Vincular
            </Button>
          </div>
        </div>

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
