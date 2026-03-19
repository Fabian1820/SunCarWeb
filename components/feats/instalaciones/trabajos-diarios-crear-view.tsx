"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { useToast } from "@/hooks/use-toast";
import { TrabajosDiariosService } from "@/lib/api-services";
import { createEmptyTrabajoDiario } from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
import type { TrabajoDiarioRegistro } from "@/lib/types/feats/instalaciones/trabajos-diarios-types";
import { TrabajoDiarioForm } from "./trabajo-diario-form";

interface TrabajosDiariosCrearViewProps {
  onCreated?: (trabajo: TrabajoDiarioRegistro) => void;
}

const toDateInput = (value: Date) => {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const createDraft = (): TrabajoDiarioRegistro => ({
  ...createEmptyTrabajoDiario(),
  fecha_trabajo: toDateInput(new Date()),
});

export function TrabajosDiariosCrearView({ onCreated }: TrabajosDiariosCrearViewProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<TrabajoDiarioRegistro>(createDraft);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const saved = await TrabajosDiariosService.createTrabajo(draft);
      toast({
        title: "Trabajo creado",
        description: "El trabajo diario fue creado correctamente.",
      });
      onCreated?.(saved);
      setDraft(createDraft());
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el trabajo";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear trabajo diario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vale ID (opcional)</Label>
              <Input
                value={draft.vale_id || ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, vale_id: e.target.value }))}
                placeholder="ID del vale asociado"
              />
            </div>
            <div className="space-y-2">
              <Label>Código vale (opcional)</Label>
              <Input
                value={draft.vale_codigo || ""}
                onChange={(e) => setDraft((prev) => ({ ...prev, vale_codigo: e.target.value }))}
                placeholder="Código del vale"
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente número (opcional)</Label>
              <Input
                value={draft.cliente_numero || ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, cliente_numero: e.target.value }))
                }
                placeholder="Número de cliente"
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente nombre (opcional)</Label>
              <Input
                value={draft.cliente_nombre || ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, cliente_nombre: e.target.value }))
                }
                placeholder="Nombre del cliente"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <TrabajoDiarioForm
        value={draft}
        onChange={setDraft}
        onSubmit={() => void handleCreate()}
        submitLabel="Crear trabajo diario"
        isSaving={saving}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => setDraft(createDraft())}
          disabled={saving}
        >
          Limpiar formulario
        </Button>
      </div>
    </div>
  );
}
