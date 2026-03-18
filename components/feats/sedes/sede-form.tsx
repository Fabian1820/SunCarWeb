"use client";

import { useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import type { SedeTipo, SedeUpsertRequest } from "@/lib/api-types";

interface SedeFormProps {
  initialData?: Partial<SedeUpsertRequest>;
  onSubmit: (data: SedeUpsertRequest) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitText?: string;
}

type FormState = {
  nombre: string;
  tipo: SedeTipo;
  provincia_codigo: string;
  provincia_nombre: string;
  activo: boolean;
};

const buildInitialState = (initialData?: Partial<SedeUpsertRequest>): FormState => ({
  nombre: initialData?.nombre ?? "",
  tipo: (initialData?.tipo as SedeTipo) ?? "nacional",
  provincia_codigo: initialData?.provincia_codigo ?? "",
  provincia_nombre: initialData?.provincia_nombre ?? "",
  activo: initialData?.activo ?? true,
});

export function SedeForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitText = "Guardar",
}: SedeFormProps) {
  const [formData, setFormData] = useState<FormState>(() =>
    buildInitialState(initialData),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isProvincial = formData.tipo === "provincial";

  const canSubmit = useMemo(() => {
    if (!formData.nombre.trim()) return false;
    if (isProvincial && !formData.provincia_codigo.trim()) return false;
    return true;
  }, [formData.nombre, formData.provincia_codigo, isProvincial]);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      nextErrors.nombre = "El nombre es obligatorio.";
    }

    if (isProvincial && !formData.provincia_codigo.trim()) {
      nextErrors.provincia_codigo =
        "El código de provincia es obligatorio para sedes provinciales.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const payload: SedeUpsertRequest = {
      nombre: formData.nombre.trim(),
      tipo: formData.tipo,
      activo: formData.activo,
      provincia_codigo: isProvincial
        ? formData.provincia_codigo.trim() || null
        : null,
      provincia_nombre: isProvincial
        ? formData.provincia_nombre.trim() || null
        : null,
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="sede-nombre">Nombre *</Label>
        <Input
          id="sede-nombre"
          value={formData.nombre}
          onChange={(event) =>
            setFormData((current) => ({ ...current, nombre: event.target.value }))
          }
          placeholder="Ej: Sede Habana"
          disabled={isSubmitting}
          className={errors.nombre ? "border-red-500" : ""}
        />
        {errors.nombre ? (
          <p className="text-sm text-red-600 mt-1">{errors.nombre}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="sede-tipo">Tipo</Label>
        <Select
          value={formData.tipo}
          onValueChange={(value) =>
            setFormData((current) => {
              const nextTipo = value as SedeTipo;
              if (nextTipo === "nacional") {
                return {
                  ...current,
                  tipo: nextTipo,
                  provincia_codigo: "",
                  provincia_nombre: "",
                };
              }
              return { ...current, tipo: nextTipo };
            })
          }
        >
          <SelectTrigger id="sede-tipo" disabled={isSubmitting}>
            <SelectValue placeholder="Seleccione tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nacional">Nacional</SelectItem>
            <SelectItem value="provincial">Provincial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isProvincial ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="sede-provincia-codigo">Código provincia *</Label>
            <Input
              id="sede-provincia-codigo"
              value={formData.provincia_codigo}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  provincia_codigo: event.target.value,
                }))
              }
              placeholder="03"
              disabled={isSubmitting}
              className={errors.provincia_codigo ? "border-red-500" : ""}
            />
            {errors.provincia_codigo ? (
              <p className="text-sm text-red-600 mt-1">{errors.provincia_codigo}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="sede-provincia-nombre">Nombre provincia</Label>
            <Input
              id="sede-provincia-nombre"
              value={formData.provincia_nombre}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  provincia_nombre: event.target.value,
                }))
              }
              placeholder="La Habana"
              disabled={isSubmitting}
            />
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Checkbox
          id="sede-activo"
          checked={formData.activo}
          onCheckedChange={(checked) =>
            setFormData((current) => ({
              ...current,
              activo: Boolean(checked),
            }))
          }
          disabled={isSubmitting}
        />
        <Label htmlFor="sede-activo" className="font-normal">
          Sede activa
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
