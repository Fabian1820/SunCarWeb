"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { CalendarDays, CalendarCheck } from "lucide-react";

interface FechaInstalacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (fechaISO: string) => void;
}

function getLastDayPrevMonth(): Date {
  const now = new Date();
  // Día 0 del mes actual = último día del mes anterior
  const d = new Date(now.getFullYear(), now.getMonth(), 0);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

function formatFecha(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function FechaInstalacionDialog({
  open,
  onOpenChange,
  onConfirm,
}: FechaInstalacionDialogProps) {
  const hoy = new Date();
  hoy.setUTCHours(12, 0, 0, 0);
  const ultimoDiaMesAnterior = getLastDayPrevMonth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>¿En qué fecha registrar la instalación?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          Selecciona la fecha que quedará registrada como{" "}
          <span className="font-medium">fecha de equipo instalado</span>.
        </p>

        <div className="flex flex-col gap-3 mt-1">
          <button
            onClick={() => onConfirm(ultimoDiaMesAnterior.toISOString())}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left hover:bg-accent transition-colors"
          >
            <CalendarDays className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Último día del mes anterior</p>
              <p className="text-xs text-muted-foreground">
                {formatFecha(ultimoDiaMesAnterior)}
              </p>
            </div>
          </button>

          <button
            onClick={() => onConfirm(hoy.toISOString())}
            className="flex items-center gap-3 rounded-lg border border-border p-4 text-left hover:bg-accent transition-colors"
          >
            <CalendarCheck className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Fecha de hoy</p>
              <p className="text-xs text-muted-foreground">
                {formatFecha(hoy)}
              </p>
            </div>
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-1"
          onClick={() => onOpenChange(false)}
        >
          Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
