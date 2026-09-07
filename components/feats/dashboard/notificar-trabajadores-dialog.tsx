"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/shared/atom/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { TrabajadoresMultiSelector } from "@/components/feats/worker/trabajadores-multi-selector";
import { useToast } from "@/hooks/use-toast";
import { NotificacionService } from "@/lib/services/feats/notificaciones/notificacion-service";
import { TrabajadorService } from "@/lib/services/feats/worker/trabajador-service";
import type { Trabajador } from "@/lib/api-types";
import type { ActualizacionSistema } from "@/lib/types/feats/actualizaciones-sistema/actualizaciones-sistema-types";

interface NotificarTrabajadoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actualizacion: ActualizacionSistema | null;
}

export function NotificarTrabajadoresDialog({
  open,
  onOpenChange,
  actualizacion,
}: NotificarTrabajadoresDialogProps) {
  const { toast } = useToast();
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [cargandoTrabajadores, setCargandoTrabajadores] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Carga perezosa: solo al abrir, y solo la primera vez.
  useEffect(() => {
    if (!open || trabajadores.length > 0 || cargandoTrabajadores) return;
    setCargandoTrabajadores(true);
    TrabajadorService.getAllTrabajadores()
      .then(setTrabajadores)
      .catch(() =>
        toast({
          title: "No se pudo cargar la lista de trabajadores",
          variant: "destructive",
        }),
      )
      .finally(() => setCargandoTrabajadores(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) setSeleccionados([]);
  }, [open, actualizacion?.id]);

  const handleEnviar = async () => {
    if (!actualizacion || seleccionados.length === 0) return;
    setEnviando(true);
    try {
      const enviadas = await NotificacionService.enviarManual(
        seleccionados,
        actualizacion.titulo,
        actualizacion.mensaje,
      );
      toast({
        title: "Notificación enviada",
        description: `Le llegó a ${enviadas} trabajador${enviadas === 1 ? "" : "es"}.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "No se pudo enviar la notificación",
        description:
          error instanceof Error ? error.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Notificar actualización</DialogTitle>
          <DialogDescription>
            {actualizacion
              ? `"${actualizacion.titulo}" les llegará por la campana de notificaciones.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <TrabajadoresMultiSelector
          label="Trabajadores a notificar"
          trabajadores={trabajadores}
          value={seleccionados}
          onChange={setSeleccionados}
          loading={cargandoTrabajadores}
          disabled={enviando}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={enviando || seleccionados.length === 0}
          >
            {enviando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar{seleccionados.length > 0 ? ` a ${seleccionados.length}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
