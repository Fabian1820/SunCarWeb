"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Ban, Loader2 } from "lucide-react";
import type { Factura } from "@/lib/types/feats/facturas/factura-types";

interface AnularFacturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factura: Factura | null;
  onConfirm: (motivo: string) => Promise<void>;
  isLoading?: boolean;
}

export function AnularFacturaDialog({
  open,
  onOpenChange,
  factura,
  onConfirm,
  isLoading = false,
}: AnularFacturaDialogProps) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (!open) setMotivo("");
  }, [open]);

  const numeroFactura = useMemo(() => {
    if (!factura?.numero_factura) return "-";
    return factura.numero_factura;
  }, [factura]);

  const motivoValido = motivo.trim().length >= 3;

  const handleConfirm = async () => {
    if (!factura?.id || !motivoValido || isLoading) return;
    await onConfirm(motivo.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-700 flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Anular Factura
          </DialogTitle>
          <DialogDescription>
            Esta accion marca la factura como anulada y desfactura sus vales de
            salida asociados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Factura:{" "}
            <span className="font-mono font-semibold">{numeroFactura}</span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="motivo-anulacion-factura">
              Motivo de anulacion <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="motivo-anulacion-factura"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Describa por que se anula la factura..."
              disabled={isLoading}
              maxLength={400}
              className="min-h-[100px]"
            />
            <p className="text-xs text-gray-500">{motivo.trim().length}/400</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!motivoValido || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Anulando...
              </>
            ) : (
              "Anular factura"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
