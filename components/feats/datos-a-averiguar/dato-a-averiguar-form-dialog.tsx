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
  DatoAAveriguar,
  DatoAAveriguarCreateData,
  MomentoDato,
} from "@/lib/types/feats/datos-a-averiguar/datos-a-averiguar-types";

interface DatoAAveriguarFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dato: DatoAAveriguar | null; // null = crear, con valor = editar
  isLoading?: boolean;
  onSubmit: (data: DatoAAveriguarCreateData) => Promise<boolean>;
}

export function DatoAAveriguarFormDialog({
  open,
  onOpenChange,
  dato,
  isLoading = false,
  onSubmit,
}: DatoAAveriguarFormDialogProps) {
  const [datoTexto, setDatoTexto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [momento, setMomento] = useState<MomentoDato>("despues");
  const [activo, setActivo] = useState(true);
  const [orden, setOrden] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDatoTexto(dato?.dato || "");
      setMotivo(dato?.motivo || "");
      setMomento(dato?.momento || "despues");
      setActivo(dato?.activo ?? true);
      setOrden(dato?.orden ?? 0);
      setError("");
    }
  }, [open, dato]);

  const handleSubmit = async () => {
    if (!datoTexto.trim()) {
      setError("Debes indicar qué debe averiguar el asistente.");
      return;
    }
    const success = await onSubmit({
      dato: datoTexto.trim(),
      motivo: motivo.trim() || null,
      momento,
      activo,
      orden,
    });
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{dato ? "Editar dato" : "Nuevo dato"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="dato">¿Qué debe averiguar?</Label>
            <Input
              id="dato"
              value={datoTexto}
              onChange={(e) => setDatoTexto(e.target.value)}
              placeholder="Ej: si es una casa o un edificio, y en qué piso"
            />
          </div>

          <div>
            <Label htmlFor="motivo">Motivo (se lo explica al cliente)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: el equipamiento es muy pesado y hay que saber cuántos pisos hay que subirlo"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="momento">¿Cuándo lo pregunta?</Label>
            <select
              id="momento"
              value={momento}
              onChange={(e) => setMomento(e.target.value as MomentoDato)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="antes_de_ofertas">
                Antes de mostrar ofertas (sirve para recomendar)
              </option>
              <option value="despues">
                Después (dato para el comercial)
              </option>
            </select>
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
              id="activo"
              checked={activo}
              onCheckedChange={(checked) => setActivo(checked === true)}
            />
            <Label htmlFor="activo" className="!mb-0">
              Activo (el asistente lo pregunta)
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
            {dato ? "Guardar cambios" : "Crear dato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
