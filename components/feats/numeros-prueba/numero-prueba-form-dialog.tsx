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
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Loader2 } from "lucide-react";
import type {
  NumeroPrueba,
  NumeroPruebaCreateData,
} from "@/lib/types/feats/numeros-prueba/numeros-prueba-types";

interface NumeroPruebaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroPrueba: NumeroPrueba | null; // null = crear, con valor = editar
  isLoading?: boolean;
  onSubmit: (data: NumeroPruebaCreateData) => Promise<boolean>;
}

export function NumeroPruebaFormDialog({
  open,
  onOpenChange,
  numeroPrueba,
  isLoading = false,
  onSubmit,
}: NumeroPruebaFormDialogProps) {
  const [numero, setNumero] = useState("");
  const [nota, setNota] = useState("");
  const [activo, setActivo] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNumero(numeroPrueba?.numero || "");
      setNota(numeroPrueba?.nota || "");
      setActivo(numeroPrueba?.activo ?? true);
      setError("");
    }
  }, [open, numeroPrueba]);

  const handleSubmit = async () => {
    if (!numero.trim()) {
      setError("El numero es obligatorio.");
      return;
    }
    const success = await onSubmit({
      numero: numero.trim(),
      nota: nota.trim() || null,
      activo,
      orden: numeroPrueba?.orden ?? 0,
    });
    if (success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {numeroPrueba ? "Editar numero de prueba" : "Nuevo numero de prueba"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="numero">Numero</Label>
            <Input
              id="numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ej: 53612685 o +5353612685"
            />
          </div>

          <div>
            <Label htmlFor="nota">Nota (opcional)</Label>
            <Input
              id="nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: celular de Yany"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="activo"
              checked={activo}
              onCheckedChange={(checked) => setActivo(checked === true)}
            />
            <Label htmlFor="activo" className="!mb-0">
              Activo (el asistente responde siempre a este numero)
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
            {numeroPrueba ? "Guardar cambios" : "Agregar numero"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
