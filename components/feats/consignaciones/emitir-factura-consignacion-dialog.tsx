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
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Loader2, FileText } from "lucide-react";
import { FacturaClienteVentaService } from "@/lib/services/feats/pagos-clientes-ventas/pago-cliente-venta-service";
import type { Consignacion, PagoResumenConsignacion } from "@/lib/types/feats/consignaciones/consignacion-types";

interface EmitirFacturaConsignacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consignacion: Consignacion | null;
  /** Pago seleccionado cuyo monto se facturará */
  pago: PagoResumenConsignacion | null;
  onSubmit: (data: {
    pago_venta_id: string;
    numero_factura: string;
    fecha_emision: string;
  }) => Promise<void>;
}

const formatMoney = (n: number, moneda: string) =>
  new Intl.NumberFormat("es-CU", {
    style: "currency",
    currency: moneda || "USD",
    minimumFractionDigits: 2,
  }).format(n || 0);

export function EmitirFacturaConsignacionDialog({
  open,
  onOpenChange,
  consignacion,
  pago,
  onSubmit,
}: EmitirFacturaConsignacionDialogProps) {
  const today = new Date().toISOString().split("T")[0];
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaEmision, setFechaEmision] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    FacturaClienteVentaService.getSiguienteNumero()
      .then((n) => { if (n) setNumeroFactura(n); })
      .catch(() => {});
  }, [open]);

  const handleClose = (next: boolean) => {
    if (!next) {
      setNumeroFactura("");
      setFechaEmision(today);
      setError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!pago?.id) return;
    if (!numeroFactura.trim()) {
      setError("El número de factura es obligatorio");
      return;
    }
    if (!fechaEmision) {
      setError("La fecha de emisión es obligatoria");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        pago_venta_id: pago.id,
        numero_factura: numeroFactura.trim(),
        fecha_emision: fechaEmision,
      });
      handleClose(false);
    } catch (e: any) {
      setError(e?.message || "No se pudo emitir la factura");
    } finally {
      setSubmitting(false);
    }
  };

  if (!consignacion || !pago) return null;

  const moneda = consignacion.moneda || "USD";
  const pendienteFacturar = Math.max(
    consignacion.monto_total - (consignacion.monto_facturado ?? 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Emitir factura
          </DialogTitle>
          <DialogDescription>
            Se emitirá una factura por el monto del pago seleccionado. Quedará
            registrada en el módulo de Solicitudes de Ventas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-gray-50 p-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Monto a facturar</div>
              <div className="text-base font-semibold text-gray-900">
                {formatMoney(pago.monto, pago.moneda || moneda)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Pendiente de facturar</div>
              <div className="text-base font-semibold text-indigo-700">
                {formatMoney(pendienteFacturar, moneda)}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="num-factura">Número de factura *</Label>
            <Input
              id="num-factura"
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              placeholder="FV-2026-000001"
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="fecha-emision">Fecha de emisión *</Label>
            <Input
              id="fecha-emision"
              type="date"
              value={fechaEmision}
              onChange={(e) => setFechaEmision(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Emitir factura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
