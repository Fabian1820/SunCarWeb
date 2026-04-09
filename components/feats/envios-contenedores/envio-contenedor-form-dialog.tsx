"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import { SearchableSelect } from "@/components/shared/molecule/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Loader2, Package, Plus, Trash2 } from "lucide-react";
import type { Material } from "@/lib/material-types";
import type { EnvioContenedorCreateData } from "@/lib/types/feats/envios-contenedores/envio-contenedor-types";

interface MaterialSeleccionado {
  material_id: string;
  material_codigo: string;
  material_nombre: string;
  cantidad: number;
}

interface EnvioContenedorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EnvioContenedorCreateData) => Promise<void>;
  materials: Material[];
  isLoading?: boolean;
}

const getTodayISO = () => new Date().toISOString().slice(0, 10);

const getEstimatedArrivalDefault = () => {
  const value = new Date();
  value.setDate(value.getDate() + 30);
  return value.toISOString().slice(0, 10);
};

export function EnvioContenedorFormDialog({
  open,
  onOpenChange,
  onSubmit,
  materials,
  isLoading = false,
}: EnvioContenedorFormDialogProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaEnvio, setFechaEnvio] = useState(getTodayISO());
  const [fechaLlegadaAprox, setFechaLlegadaAprox] = useState(
    getEstimatedArrivalDefault(),
  );
  const [estado, setEstado] = useState<"despachado" | "recibido" | "cancelado">(
    "despachado",
  );
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [cantidadMaterial, setCantidadMaterial] = useState("1");
  const [materiales, setMateriales] = useState<MaterialSeleccionado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setNombre("");
    setDescripcion("");
    setFechaEnvio(getTodayISO());
    setFechaLlegadaAprox(getEstimatedArrivalDefault());
    setEstado("despachado");
    setSelectedMaterialId("");
    setCantidadMaterial("1");
    setMateriales([]);
    setError(null);
  }, [open]);

  const materialOptions = useMemo(
    () =>
      materials.map((material) => ({
        value: material.id,
        label: `${material.codigo} - ${material.nombre || material.descripcion}`,
      })),
    [materials],
  );

  const addMaterial = () => {
    setError(null);

    if (!selectedMaterialId) {
      setError("Debe seleccionar un material.");
      return;
    }

    const cantidad = Number(cantidadMaterial);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setError("La cantidad debe ser mayor que 0.");
      return;
    }

    const material = materials.find((item) => item.id === selectedMaterialId);
    if (!material) {
      setError("El material seleccionado no es válido.");
      return;
    }

    setMateriales((prev) => {
      const existing = prev.find((item) => item.material_id === material.id);
      if (existing) {
        return prev.map((item) =>
          item.material_id === material.id
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item,
        );
      }

      return [
        ...prev,
        {
          material_id: material.id,
          material_codigo: material.codigo,
          material_nombre: material.nombre || material.descripcion,
          cantidad,
        },
      ];
    });

    setSelectedMaterialId("");
    setCantidadMaterial("1");
  };

  const removeMaterial = (materialId: string) => {
    setMateriales((prev) => prev.filter((item) => item.material_id !== materialId));
  };

  const updateCantidad = (materialId: string, value: string) => {
    const cantidad = Number(value);
    if (!Number.isFinite(cantidad) || cantidad <= 0) return;

    setMateriales((prev) =>
      prev.map((item) =>
        item.material_id === materialId ? { ...item, cantidad } : item,
      ),
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!nombre.trim()) {
      setError("El nombre del contenedor es obligatorio.");
      return;
    }

    if (!fechaEnvio || !fechaLlegadaAprox) {
      setError("Debe indicar ambas fechas.");
      return;
    }

    if (new Date(fechaLlegadaAprox) < new Date(fechaEnvio)) {
      setError("La llegada aproximada no puede ser anterior al envío.");
      return;
    }

    if (materiales.length === 0) {
      setError("Debe agregar al menos un material.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        fecha_envio: fechaEnvio,
        fecha_llegada_aproximada: fechaLlegadaAprox,
        estado,
        materiales,
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo registrar el envío",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const disabledSubmit = isLoading || submitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Envío de Contenedor</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre-contenedor">Nombre del contenedor</Label>
              <Input
                id="nombre-contenedor"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Contenedor Solar Abril 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado-envio">Estado</Label>
              <Select
                value={estado}
                onValueChange={(value) =>
                  setEstado(value as "despachado" | "recibido" | "cancelado")
                }
              >
                <SelectTrigger id="estado-envio">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despachado">Despachado</SelectItem>
                  <SelectItem value="recibido">Recibido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion-envio">Descripción (opcional)</Label>
            <Textarea
              id="descripcion-envio"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Notas del envío, naviera, observaciones, etc."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-envio">Fecha de envío</Label>
              <Input
                id="fecha-envio"
                type="date"
                value={fechaEnvio}
                onChange={(e) => setFechaEnvio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha-llegada">Fecha aproximada de llegada</Label>
              <Input
                id="fecha-llegada"
                type="date"
                value={fechaLlegadaAprox}
                onChange={(e) => setFechaLlegadaAprox(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
              <Package className="h-4 w-4 text-orange-600" />
              Materiales del contenedor
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3 items-end">
              <div className="space-y-2">
                <Label>Material</Label>
                <SearchableSelect
                  options={materialOptions}
                  value={selectedMaterialId}
                  onValueChange={setSelectedMaterialId}
                  placeholder="Buscar material..."
                  searchPlaceholder="Escriba código o nombre..."
                  disablePortal
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cantidad-material">Cantidad</Label>
                <Input
                  id="cantidad-material"
                  type="number"
                  min="1"
                  value={cantidadMaterial}
                  onChange={(e) => setCantidadMaterial(e.target.value)}
                />
              </div>

              <Button type="button" onClick={addMaterial} className="md:mb-0.5">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>

            {materiales.length === 0 ? (
              <p className="text-sm text-gray-500">
                Todavía no se agregaron materiales.
              </p>
            ) : (
              <div className="space-y-2">
                {materiales.map((item) => (
                  <div
                    key={item.material_id}
                    className="flex items-center gap-3 p-3 border rounded-md bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.material_codigo} - {item.material_nombre}
                      </p>
                    </div>

                    <Input
                      type="number"
                      min="1"
                      className="w-24"
                      value={item.cantidad}
                      onChange={(e) => updateCantidad(item.material_id, e.target.value)}
                    />

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeMaterial(item.material_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={disabledSubmit}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={disabledSubmit}>
              {disabledSubmit ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Registrar envío"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
