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
import { Loader2, Ban } from "lucide-react";

interface AnularSolicitudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitudCodigo?: string | null;
  solicitudTipo: "material" | "venta";
  onConfirm: (motivo: string) => Promise<void>;
  isLoading?: boolean;
}

const tipoLabelByValue = {
  material: "materiales",
  venta: "ventas",
} as const;

export function AnularSolicitudDialog({
  open,
  onOpenChange,
  solicitudCodigo,
  solicitudTipo,
  onConfirm,
  isLoading = false,
}: AnularSolicitudDialogProps) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    if (!open) setMotivo("");
  }, [open]);

  const motivoValido = motivo.trim().length >= 3;
  const tipoLabel = useMemo(
    () => tipoLabelByValue[solicitudTipo],
    [solicitudTipo],
  );

  const handleConfirm = async () => {
    if (!motivoValido || isLoading) return;
    await onConfirm(motivo.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-red-700 flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Anular Solicitud de {tipoLabel}
          </DialogTitle>
          <DialogDescription>
            Esta accion cambia el estado a anulada y guarda el motivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Solicitud:{" "}
            <span className="font-mono font-semibold">
              {solicitudCodigo || "-"}
            </span>
          </p>
          <div className="space-y-2">
            <Label htmlFor="motivo-anulacion-solicitud">
              Motivo de anulacion <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="motivo-anulacion-solicitud"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Describa por que se anula la solicitud..."
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
              "Anular solicitud"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
