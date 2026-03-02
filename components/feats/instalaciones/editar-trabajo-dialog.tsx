"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/shared/atom/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import type { TrabajoOperacion } from "@/lib/services/feats/instalaciones/planificacion-diaria-service";
import { PlanificacionDiariaService } from "@/lib/services/feats/instalaciones/planificacion-diaria-service";
import { BrigadaService } from "@/lib/api-services";
import type { Brigada } from "@/lib/api-types";
import { useToast } from "@/hooks/use-toast";

interface EditarTrabajoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trabajo: TrabajoOperacion | null;
  onGuardado: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  visita: "Visita",
  entrega_equipamiento: "Entrega de Equipamiento",
  instalacion_nueva: "Instalación Nueva",
  instalacion_en_proceso: "Instalación en Proceso",
  averia: "Avería",
};

export function EditarTrabajoDialog({
  open,
  onOpenChange,
  trabajo,
  onGuardado,
}: EditarTrabajoDialogProps) {
  const { toast } = useToast();
  const [guardando, setGuardando] = useState(false);
  const [brigadas, setBrigadas] = useState<Brigada[]>([]);
  const [brigadaActualNombre, setBrigadaActualNombre] = useState<string>("");
  const [formData, setFormData] = useState({
    tipo_trabajo: "",
    brigada_id: "",
    comentario: "",
  });

  useEffect(() => {
    const cargarBrigadas = async () => {
      try {
        const response = await BrigadaService.getAllBrigadas();
        setBrigadas(response);
      } catch (error) {
        console.error("Error cargando brigadas:", error);
      }
    };

    if (open) {
      void cargarBrigadas();
    }
  }, [open]);

  useEffect(() => {
    const cargarDatosTrabajo = async () => {
      if (trabajo) {
        setFormData({
          tipo_trabajo: trabajo.tipo_trabajo || "",
          brigada_id: trabajo.brigada_id || "",
          comentario: trabajo.comentario || "",
        });

        // Cargar el nombre de la brigada actual
        if (trabajo.brigada_id) {
          try {
            const brigada = await BrigadaService.getBrigadaById(trabajo.brigada_id);
            if (brigada?.lider?.nombre) {
              setBrigadaActualNombre(`Brigada de ${brigada.lider.nombre}`);
            } else {
              setBrigadaActualNombre(`Brigada ${trabajo.brigada_id}`);
            }
          } catch (error) {
            console.error("Error cargando brigada actual:", error);
            setBrigadaActualNombre(`Brigada ${trabajo.brigada_id}`);
          }
        }
      } else {
        setFormData({
          tipo_trabajo: "",
          brigada_id: "",
          comentario: "",
        });
        setBrigadaActualNombre("");
      }
    };

    void cargarDatosTrabajo();
  }, [trabajo]);

  const handleGuardar = async () => {
    if (!trabajo?.id) return;

    if (!formData.brigada_id) {
      toast({
        title: "Error",
        description: "Debes seleccionar una brigada",
        variant: "destructive",
      });
      return;
    }

    setGuardando(true);
    try {
      const response = await PlanificacionDiariaService.actualizarTrabajoOperacion(
        trabajo.id,
        {
          brigada_id: formData.brigada_id,
          comentario: formData.comentario || undefined,
        }
      );

      if (response.success) {
        toast({
          title: "Trabajo actualizado",
          description: "Los datos del trabajo se actualizaron correctamente",
        });
        onGuardado();
      } else {
        throw new Error(response.message || "Error al actualizar el trabajo");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el trabajo",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  if (!trabajo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Trabajo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Contacto</Label>
            <Input
              value={`${trabajo.contacto_tipo === "cliente" ? "Cliente" : "Lead"} - ${trabajo.contacto_id}`}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Trabajo</Label>
            <Input
              value={TYPE_LABEL[formData.tipo_trabajo] || formData.tipo_trabajo}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">El tipo de trabajo no se puede modificar</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brigada_id">Brigada</Label>
            {brigadaActualNombre && (
              <div className="text-sm text-gray-600 mb-2 p-2 bg-gray-50 rounded border">
                <strong>Brigada actual:</strong> {brigadaActualNombre}
              </div>
            )}
            <Select
              value={formData.brigada_id}
              onValueChange={(value) =>
                setFormData({ ...formData, brigada_id: value })
              }
            >
              <SelectTrigger id="brigada_id">
                <SelectValue placeholder="Selecciona una brigada" />
              </SelectTrigger>
              <SelectContent>
                {brigadas.map((brigada) => {
                  const brigadaId = String(brigada.id || brigada._id || brigada.lider_ci || "");
                  const nombreLider = String(brigada.lider?.nombre || "");
                  const nombre = nombreLider
                    ? `Brigada de ${nombreLider}`
                    : `Brigada ${brigadaId}`;
                  
                  return (
                    <SelectItem key={brigadaId} value={brigadaId}>
                      {nombre}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentario">Comentario (opcional)</Label>
            <Textarea
              id="comentario"
              value={formData.comentario}
              onChange={(e) =>
                setFormData({ ...formData, comentario: e.target.value })
              }
              placeholder="Agrega un comentario sobre este trabajo..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="bg-purple-700 hover:bg-purple-800"
          >
            {guardando ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
