"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Ban, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import type { CancelarCompraRequest, Compra } from "@/lib/types/feats/compras/compra-types";

interface CancelarCompraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compra: Compra | null;
  onSubmit: (compraId: string, payload: CancelarCompraRequest) => Promise<void>;
  isLoading?: boolean;
}

export function CancelarCompraDialog({
  open,
  onOpenChange,
  compra,
  onSubmit,
  isLoading = false,
}: CancelarCompraDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMotivo("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!compra) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(compra.id, { motivo: motivo.trim() || undefined });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar la compra.");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isLoading || submitting;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onOpenChange(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Ban className="h-4 w-4 text-red-600" />
            Cancelar compra
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 space-y-1">
              <p className="font-medium">Acción no reversible</p>
              <p className="text-xs text-amber-800">
                Solo se puede cancelar antes de recibir. Una compra cancelada no acepta nuevas solicitudes
                de entrada y queda fuera del flujo activo.
              </p>
            </div>
          </div>

          {compra && (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <p className="text-xs text-gray-500 mb-0.5">Compra a cancelar</p>
              <p className="font-medium text-gray-800 truncate">{compra.nombre}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Motivo <span className="text-gray-400 font-normal">(opcional)</span>
            </Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: el proveedor canceló el pedido..."
              rows={3}
              className="resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Volver
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancelar compra
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
