"use client";

import { useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { CATEGORIAS_CONTABILIDAD } from "@/lib/api-types";
import type { PersonaCategoriaUpsertRequest } from "@/lib/api-types";

interface PersonaCategoriaFormProps {
  initialData?: Partial<PersonaCategoriaUpsertRequest>;
  onSubmit: (data: PersonaCategoriaUpsertRequest) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitText?: string;
}

export function PersonaCategoriaForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitText = "Guardar",
}: PersonaCategoriaFormProps) {
  const [personaNombre, setPersonaNombre] = useState(initialData?.persona_nombre ?? "");
  const [personaCi, setPersonaCi] = useState(initialData?.persona_ci ?? "");
  const [categoria, setCategoria] = useState(initialData?.categoria ?? CATEGORIAS_CONTABILIDAD[0].value);
  const [activo, setActivo] = useState(initialData?.activo ?? true);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => personaNombre.trim().length > 0, [personaNombre]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!personaNombre.trim()) {
      setError("El nombre de la persona es obligatorio.");
      return;
    }

    setError("");
    await onSubmit({
      persona_nombre: personaNombre.trim(),
      persona_ci: personaCi.trim() || null,
      categoria,
      activo,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="persona-categoria-nombre">Nombre *</Label>
        <Input
          id="persona-categoria-nombre"
          value={personaNombre}
          onChange={(event) => setPersonaNombre(event.target.value)}
          placeholder="Tal como aparece en pagos o wallet"
          disabled={isSubmitting}
          className={error ? "border-red-500" : ""}
        />
        {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : null}
      </div>

      <div>
        <Label htmlFor="persona-categoria-ci">CI (opcional, respaldo por nombre si se omite)</Label>
        <Input
          id="persona-categoria-ci"
          value={personaCi ?? ""}
          onChange={(event) => setPersonaCi(event.target.value)}
          placeholder="Ej: 12345678901"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor="persona-categoria-categoria">Categoría *</Label>
        <Select value={categoria} onValueChange={(value) => setCategoria(value as typeof categoria)}>
          <SelectTrigger id="persona-categoria-categoria">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS_CONTABILIDAD.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="persona-categoria-activo"
          checked={activo}
          onCheckedChange={(checked) => setActivo(Boolean(checked))}
          disabled={isSubmitting}
        />
        <Label htmlFor="persona-categoria-activo" className="font-normal">
          Mapeo activo
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
