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
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import type { SolicitudVentaSummary } from "@/lib/api-types";
import { AlertTriangle, Ban, Info, Loader2 } from "lucide-react";

interface CancelarCuentaPorCobrarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitud: SolicitudVentaSummary | null;
  /** Debe lanzar un Error con el mensaje del backend si no se pudo cancelar. */
  onConfirm: (motivo: string) => Promise<void>;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(v);

export function CancelarCuentaPorCobrarDialog({
  open,
  onOpenChange,
  solicitud,
  onConfirm,
}: CancelarCuentaPorCobrarDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMotivo("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  if (!solicitud) return null;

  const motivoValido = motivo.trim().length >= 3;
  const usada = solicitud.estado === "usada";
  const nueva = solicitud.estado === "nueva";
  const facturada = Boolean(solicitud.tiene_factura);
  const pagado = Number(solicitud.total_pagado ?? 0);
  const pendiente = Number(solicitud.monto_pendiente ?? 0);

  const handleConfirm = async () => {
    if (!motivoValido || loading || facturada) return;
    setLoading(true);
    setError(null);
    try {
      await onConfirm(motivo.trim());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cancelar la cuenta por cobrar",
      );
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-red-700 flex items-center gap-2">
            <Ban className="h-5 w-5" />
            ¿Cancelar esta cuenta por cobrar?
          </DialogTitle>
          <DialogDescription>
            La solicitud seguirá apareciendo en la lista, marcada como cancelada, y
            dejará de sumar en los totales. Se guarda la fecha, quién la canceló y el
            motivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-gray-50 p-3 text-sm space-y-1">
            <p>
              Solicitud:{" "}
              <span className="font-mono font-semibold">{solicitud.codigo || "-"}</span>
            </p>
            <p>
              Cliente:{" "}
              <span className="font-medium">
                {solicitud.cliente_venta_nombre || "Sin nombre"}
              </span>
            </p>
            <p>
              Pendiente de cobro:{" "}
              <span className="font-semibold text-red-600">{formatCurrency(pendiente)}</span>
              {pagado > 0 && (
                <span className="text-gray-500"> · ya cobrado {formatCurrency(pagado)}</span>
              )}
            </p>
          </div>

          {facturada ? (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Esta solicitud ya está facturada
                {solicitud.factura_numero ? ` (${solicitud.factura_numero})` : ""}: no se
                puede cancelar su cuenta por cobrar.
              </p>
            </div>
          ) : usada ? (
            <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                <strong>Esta solicitud ya fue USADA:</strong> el material salió del
                almacén. Cancelar la cuenta por cobrar no devuelve el material ni toca el
                inventario; solo deja de contarse como dinero por cobrar.
              </p>
            </div>
          ) : nueva ? (
            <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Esta solicitud <strong>aún no fue usada</strong>: el material todavía no ha
                salido del almacén.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="motivo-cancelar-cuenta">
              Motivo de la cancelación <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="motivo-cancelar-cuenta"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Describa por qué se cancela esta cuenta por cobrar..."
              disabled={loading || facturada}
              maxLength={400}
              className="min-h-[100px]"
            />
            <p className="text-xs text-gray-500">{motivo.trim().length}/400</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!motivoValido || loading || facturada}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              "Sí, cancelar cuenta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
