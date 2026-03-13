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
import { Textarea } from "@/components/shared/molecule/textarea";
import { Label } from "@/components/shared/atom/label";
import { Loader2, Undo2 } from "lucide-react";
import type { ValeSalida } from "@/lib/api-types";

interface AnularValeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vale: ValeSalida | null;
  onConfirm: (motivo: string) => Promise<void>;
  isLoading?: boolean;
}

export function AnularValeDialog({
  open,
  onOpenChange,
  vale,
  onConfirm,
  isLoading = false,
}: AnularValeDialogProps) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (!open) setMotivo("");
  }, [open]);

  const valeCodigo = useMemo(
    () => vale?.codigo || vale?.id?.slice(-6).toUpperCase() || "-",
    [vale],
  );

  const motivoValido = motivo.trim().length >= 3;

  const handleConfirm = async () => {
    if (!motivoValido || !vale || isLoading) return;
    await onConfirm(motivo.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-red-700 flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Anular Vale de Salida
          </DialogTitle>
          <DialogDescription>
            Esta accion repone el stock y vuelve la solicitud a estado nueva
            para poder editarla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Vale: <span className="font-mono font-semibold">{valeCodigo}</span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="motivo-anulacion">
              Motivo de anulacion <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="motivo-anulacion"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Describa por que se anula el vale..."
              disabled={isLoading}
              maxLength={400}
              className="min-h-[110px]"
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
              "Anular vale"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
