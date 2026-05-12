"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Loader2, Package } from "lucide-react";
import type { Material } from "@/lib/material-types";
import { useMarcas } from "@/hooks/use-marcas";

const CATEGORIAS_ESPECIALES = ["BATERÍAS", "INVERSORES", "PANELES"];

export interface QuickMaterialData {
  codigo: string;
  categoria: string;
  descripcion: string;
  um: string;
  nombre?: string;
  marca_id?: string;
  potenciaKW?: number;
}

interface QuickMaterialCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  units: string[];
  onSubmit: (data: QuickMaterialData) => Promise<Material>;
  onCreated: (material: Material) => void;
}

const DEFAULT_UNITS = ["u", "m", "kg", "L"];

export function QuickMaterialCreateDialog({
  open,
  onOpenChange,
  categories,
  units,
  onSubmit,
  onCreated,
}: QuickMaterialCreateDialogProps) {
  const { marcasSimplificadas, loading: loadingMarcas } = useMarcas();

  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nombre, setNombre] = useState("");
  const [um, setUm] = useState("");
  const [marcaId, setMarcaId] = useState<string | undefined>(undefined);
  const [potenciaKW, setPotenciaKW] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requiereTecnica = CATEGORIAS_ESPECIALES.includes(categoria);

  const unidades = (() => {
    const all = new Set<string>([...DEFAULT_UNITS, ...units.filter(Boolean)]);
    return Array.from(all).sort();
  })();

  const marcasFiltradas = marcasSimplificadas.filter((marca) =>
    marca.tipos_material.includes(categoria as any),
  );

  useEffect(() => {
    if (!open) return;
    setCodigo("");
    setCategoria("");
    setDescripcion("");
    setNombre("");
    setUm("");
    setMarcaId(undefined);
    setPotenciaKW("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!requiereTecnica) {
      setMarcaId(undefined);
      setPotenciaKW("");
    }
  }, [requiereTecnica]);

  const handleSubmit = async () => {
    setError(null);
    if (!codigo.trim()) { setError("El código es obligatorio."); return; }
    if (!categoria)     { setError("Selecciona una categoría."); return; }
    if (!descripcion.trim()) { setError("La descripción es obligatoria."); return; }
    if (!um.trim())     { setError("La unidad de medida es obligatoria."); return; }
    if (requiereTecnica) {
      if (!marcaId) { setError("La marca es obligatoria para esta categoría."); return; }
      const pot = parseFloat(potenciaKW);
      if (!Number.isFinite(pot) || pot <= 0) {
        setError("La potencia (kW) es obligatoria.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const material = await onSubmit({
        codigo: codigo.trim(),
        categoria,
        descripcion: descripcion.trim(),
        um: um.trim(),
        nombre: nombre.trim() || undefined,
        marca_id: requiereTecnica ? marcaId : undefined,
        potenciaKW: requiereTecnica ? parseFloat(potenciaKW) : undefined,
      });
      onCreated(material);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el material.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 shrink-0">
              <Package className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">
                Crear material rápido
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Solo campos obligatorios. Quedará agregado al envío al crearlo.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qm-codigo" className="text-sm font-medium text-gray-700">
                Código <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qm-codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej: 5401090096"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qm-nombre" className="text-sm font-medium text-gray-700">
                Nombre
              </Label>
              <Input
                id="qm-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Opcional"
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qm-desc" className="text-sm font-medium text-gray-700">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="qm-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="resize-none"
              placeholder="Descripción del material"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Categoría <span className="text-red-500">*</span>
              </Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">Sin categorías</div>
                  ) : (
                    categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Unidad de medida <span className="text-red-500">*</span>
              </Label>
              <Select value={um} onValueChange={setUm}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {requiereTecnica && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Información técnica requerida para {categoria}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    Potencia (kW) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={potenciaKW}
                    onChange={(e) => setPotenciaKW(e.target.value)}
                    placeholder="Ej: 10.0"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    Marca <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={marcaId}
                    onValueChange={setMarcaId}
                    disabled={loadingMarcas}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue
                        placeholder={loadingMarcas ? "Cargando..." : "Seleccionar..."}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {marcasFiltradas.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          No hay marcas disponibles
                        </div>
                      ) : (
                        marcasFiltradas.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200">
              <span className="text-red-500 shrink-0">⚠</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="px-5"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear material
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
