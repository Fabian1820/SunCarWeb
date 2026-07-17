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
import { Loader2, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PagoService, type Pago } from "@/lib/services/feats/pagos/pago-service";

interface CancelarPagoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago: Pago | null;
  onSuccess?: () => void | Promise<void>;
}

export function CancelarPagoDialog({
  open,
  onOpenChange,
  pago,
  onSuccess,
}: CancelarPagoDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(false);
    setMotivo("");
    setError(null);
  }, [open, pago?.id]);

  const formatCurrency = (value: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);

  const handleSubmit = async () => {
    if (!pago) return;

    if (motivo.trim().length < 3) {
      setError("Debe indicar un motivo de cancelación (mínimo 3 caracteres).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await PagoService.cancelarPago(pago.id, motivo.trim());

      toast({
        title: "Pago cancelado",
        description: "El pago se canceló correctamente.",
      });

      if (onSuccess) {
        await onSuccess();
      }

      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo cancelar el pago.";
      setError(message);
      toast({
        title: "Error al cancelar pago",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Ban className="h-5 w-5" />
            Cancelar pago
          </DialogTitle>
          <DialogDescription>
            Esta acción revierte el monto pendiente de la oferta (y el depósito
            en wallet si el pago fue en efectivo). El pago queda marcado como
            cancelado, no se elimina.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {pago && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">
                <span className="font-semibold">Monto del pago:</span>{" "}
                {formatCurrency(Number(pago.monto || 0), pago.moneda)}{" "}
                {pago.moneda}
              </p>
              <p className="mt-1 text-xs text-red-700">
                Método: {pago.metodo_pago} · Tipo: {pago.tipo_pago}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="motivo-cancelacion">
              Motivo de cancelación <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="motivo-cancelacion"
              value={motivo}
              onChange={(event) => {
                setMotivo(event.target.value);
                setError(null);
              }}
              disabled={loading}
              maxLength={400}
              placeholder="Describa por qué se cancela este pago..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-gray-500">{motivo.trim().length}/400</p>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Volver
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              "Cancelar pago"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
