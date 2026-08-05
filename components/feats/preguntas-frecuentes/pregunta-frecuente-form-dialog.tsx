"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Loader2 } from "lucide-react";
import type {
  PreguntaFrecuente,
  PreguntaFrecuenteCreateData,
} from "@/lib/types/feats/preguntas-frecuentes/preguntas-frecuentes-types";

interface PreguntaFrecuenteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pregunta: PreguntaFrecuente | null; // null = crear, con valor = editar
  isLoading?: boolean;
  onSubmit: (data: PreguntaFrecuenteCreateData) => Promise<boolean>;
}

export function PreguntaFrecuenteFormDialog({
  open,
  onOpenChange,
  pregunta,
  isLoading = false,
  onSubmit,
}: PreguntaFrecuenteFormDialogProps) {
  const [preguntaTexto, setPreguntaTexto] = useState("");
  const [respuestaTexto, setRespuestaTexto] = useState("");
  const [activa, setActiva] = useState(true);
  const [orden, setOrden] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPreguntaTexto(pregunta?.pregunta || "");
      setRespuestaTexto(pregunta?.respuesta || "");
      setActiva(pregunta?.activa ?? true);
      setOrden(pregunta?.orden ?? 0);
      setError("");
    }
  }, [open, pregunta]);

  const handleSubmit = async () => {
    if (!preguntaTexto.trim() || !respuestaTexto.trim()) {
      setError("La pregunta y la respuesta son obligatorias.");
      return;
    }
    const success = await onSubmit({
      pregunta: preguntaTexto.trim(),
      respuesta: respuestaTexto.trim(),
      activa,
      orden,
    });
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {pregunta ? "Editar pregunta frecuente" : "Nueva pregunta frecuente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="pregunta">Pregunta</Label>
            <Input
              id="pregunta"
              value={preguntaTexto}
              onChange={(e) => setPreguntaTexto(e.target.value)}
              placeholder="Ej: ¿Cuánto dura la garantía de los equipos?"
            />
          </div>

          <div>
            <Label htmlFor="respuesta">Respuesta</Label>
            <Textarea
              id="respuesta"
              value={respuestaTexto}
              onChange={(e) => setRespuestaTexto(e.target.value)}
              placeholder="Respuesta oficial que debe dar el asistente..."
              rows={5}
            />
          </div>

          <div>
            <Label htmlFor="orden">Orden</Label>
            <Input
              id="orden"
              type="number"
              value={orden}
              onChange={(e) => setOrden(Number(e.target.value) || 0)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="activa"
              checked={activa}
              onCheckedChange={(checked) => setActiva(checked === true)}
            />
            <Label htmlFor="activa" className="!mb-0">
              Activa (el asistente la usa)
            </Label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {pregunta ? "Guardar cambios" : "Crear pregunta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
