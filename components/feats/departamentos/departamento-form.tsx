"use client";

import { useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import type { DepartamentoUpsertRequest } from "@/lib/api-types";

interface DepartamentoFormProps {
  initialData?: Partial<DepartamentoUpsertRequest>;
  onSubmit: (data: DepartamentoUpsertRequest) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitText?: string;
}

export function DepartamentoForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitText = "Guardar",
}: DepartamentoFormProps) {
  const [nombre, setNombre] = useState(initialData?.nombre ?? "");
  const [activo, setActivo] = useState(initialData?.activo ?? true);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => nombre.trim().length > 0, [nombre]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setError("");
    await onSubmit({
      nombre: nombre.trim(),
      activo,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="departamento-nombre">Nombre *</Label>
        <Input
          id="departamento-nombre"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          placeholder="Ej: Comercial"
          disabled={isSubmitting}
          className={error ? "border-red-500" : ""}
        />
        {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="departamento-activo"
          checked={activo}
          onCheckedChange={(checked) => setActivo(Boolean(checked))}
          disabled={isSubmitting}
        />
        <Label htmlFor="departamento-activo" className="font-normal">
          Departamento activo
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !canSubmit}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? "Guardando..." : submitText}
        </Button>
      </div>
    </form>
  );
}
