"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/shared/atom/button";
import { Label } from "@/components/shared/atom/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Textarea } from "@/components/shared/molecule/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codigo: string;
  onConfirm: (motivo: string) => Promise<void>;
}

export function CancelarSolicitudDialog({
  open,
  onOpenChange,
  codigo,
  onConfirm,
}: Props) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMotivo("");
      setError(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!motivo.trim()) {
      setError("Debes indicar un motivo.");
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(motivo.trim());
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar {codigo}</DialogTitle>
          <DialogDescription>
            Esta acción cierra la solicitud sin generar compra.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="motivo-cancelar">Motivo</Label>
          <Textarea
            id="motivo-cancelar"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
          />
        </div>
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Cancelando…" : "Cancelar solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
