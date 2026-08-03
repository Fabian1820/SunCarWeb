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

interface IgnorarAlertaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialNombre: string;
  materialCodigo: string;
  onConfirm: (motivo: string) => Promise<void>;
}

const MOTIVOS_SUGERIDOS = [
  "Material descontinuado",
  "Salió defectuoso, no se pedirá más",
  "Reemplazado por otro material",
  "Uso ocasional, no requiere reposición",
];

export function IgnorarAlertaDialog({
  open,
  onOpenChange,
  materialNombre,
  materialCodigo,
  onConfirm,
}: IgnorarAlertaDialogProps) {
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setMotivo("");
  }, [open]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(motivo.trim());
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Silenciar alerta</DialogTitle>
          <DialogDescription>
            {materialCodigo} — {materialNombre}
            <br />
            Este material dejará de aparecer en la lista de alertas hasta que lo
            reactives desde &quot;Ver ignoradas&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {MOTIVOS_SUGERIDOS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                className="text-xs rounded-full border px-3 py-1 bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
              >
                {m}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-ignorar">Motivo (opcional)</Label>
            <Textarea
              id="motivo-ignorar"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: el material no se usará más"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Silenciando…" : "Silenciar alerta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
