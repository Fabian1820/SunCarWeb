"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Loader2 } from "lucide-react";
import type { ConsignacionCreateData } from "@/lib/types/feats/consignaciones/consignacion-types";

interface CrearConsignacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ConsignacionCreateData) => Promise<void>;
  /** Pre-cargar id de solicitud (cuando se viene desde el flujo de pago). */
  solicitudVentaIdInicial?: string;
  /** Id de un PagoVenta ya creado para asociar como pago inicial parcial. */
  pagoInicialId?: string;
}

export function CrearConsignacionDialog({
  open,
  onOpenChange,
  onSubmit,
  solicitudVentaIdInicial = "",
  pagoInicialId,
}: CrearConsignacionDialogProps) {
  const [solicitudVentaId, setSolicitudVentaId] = useState(
    solicitudVentaIdInicial,
  );
  const [moneda, setMoneda] = useState<"USD" | "CUP" | "EUR">("USD");
  const [notas, setNotas] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSolicitudVentaId(solicitudVentaIdInicial);
    setMoneda("USD");
    setNotas("");
    setError(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!solicitudVentaId.trim()) {
      setError("Debes indicar la solicitud de venta");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        solicitud_venta_id: solicitudVentaId.trim(),
        moneda,
        pago_inicial_id: pagoInicialId || null,
        notas: notas.trim() || null,
      });
      handleClose(false);
    } catch (e: any) {
      setError(e?.message || "No se pudo crear la consignación");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear consignación</DialogTitle>
          <DialogDescription>
            Convierte una solicitud de venta existente en consignación. Los
            precios de los materiales se congelan en este momento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="solicitud-id">ID de Solicitud de Venta *</Label>
            <Input
              id="solicitud-id"
              value={solicitudVentaId}
              onChange={(e) => setSolicitudVentaId(e.target.value)}
              placeholder="ObjectId de la solicitud"
              disabled={!!solicitudVentaIdInicial || submitting}
            />
          </div>

          <div>
            <Label>Moneda</Label>
            <Select
              value={moneda}
              onValueChange={(v) => setMoneda(v as "USD" | "CUP" | "EUR")}
              disabled={submitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CUP">CUP</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pagoInicialId && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
              Se vinculará el pago{" "}
              <span className="font-mono">{pagoInicialId}</span> como pago
              inicial.
            </div>
          )}

          <div>
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Input
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones"
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
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear consignación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
