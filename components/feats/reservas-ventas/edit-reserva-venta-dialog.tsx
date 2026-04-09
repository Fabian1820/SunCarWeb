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
import { Badge } from "@/components/shared/atom/badge";
import {
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { SolicitudVentaService } from "@/lib/api-services";
import type {
  MaterialVentaWeb,
  Reserva,
  ReservaUpdateData,
} from "@/lib/api-types";

interface MaterialRow {
  material_id: string;
  cantidad_reservada: number;
  cantidad_consumida: number;
  codigo: string;
  nombre: string;
  um?: string;
}

interface EditReservaVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: Reserva | null;
  onSubmit: (id: string, data: ReservaUpdateData) => Promise<void>;
  isLoading?: boolean;
}

export function EditReservaVentaDialog({
  open,
  onOpenChange,
  reserva,
  onSubmit,
  isLoading = false,
}: EditReservaVentaDialogProps) {
  const [fechaExpiracion, setFechaExpiracion] = useState("");
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [materialesWeb, setMaterialesWeb] = useState<MaterialVentaWeb[]>([]);
  const [loadingMateriales, setLoadingMateriales] = useState(false);
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load materials catalog once
  useEffect(() => {
    if (!open) return;
    setLoadingMateriales(true);
    SolicitudVentaService.getMaterialesVendiblesWeb()
      .then((data) => setMaterialesWeb(data))
      .catch(() => setMaterialesWeb([]))
      .finally(() => setLoadingMateriales(false));
  }, [open]);

  // Populate from reserva when opened
  useEffect(() => {
    if (!open || !reserva) return;

    // Fecha: format to YYYY-MM-DD for date input
    if (reserva.fecha_expiracion) {
      setFechaExpiracion(
        new Date(reserva.fecha_expiracion).toISOString().split("T")[0],
      );
    }

    // Materiales: map existing rows (use populated name/codigo if available)
    setMaterialRows(
      (reserva.materiales ?? []).map((m) => ({
        material_id: m.material_id,
        cantidad_reservada: m.cantidad_reservada,
        cantidad_consumida: m.cantidad_consumida ?? 0,
        codigo: m.codigo ?? m.material_id.slice(-6).toUpperCase(),
        nombre: m.nombre ?? m.material_id,
        um: undefined,
      })),
    );

    setErrors({});
    setShowMaterialSearch(false);
    setMaterialSearch("");
  }, [open, reserva]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setFechaExpiracion("");
      setMaterialRows([]);
      setErrors({});
      setShowMaterialSearch(false);
      setMaterialSearch("");
    }
  }, [open]);

  const filteredMateriales = useMemo(() => {
    if (!materialSearch.trim()) return materialesWeb.slice(0, 50);
    const term = materialSearch.toLowerCase();
    return materialesWeb
      .filter(
        (m) =>
          m.nombre.toLowerCase().includes(term) ||
          m.codigo.toLowerCase().includes(term),
      )
      .slice(0, 30);
  }, [materialesWeb, materialSearch]);

  const addMaterial = (mat: MaterialVentaWeb) => {
    const existing = materialRows.find((r) => r.material_id === mat.id);
    if (existing) return;
    setMaterialRows((prev) => [
      ...prev,
      {
        material_id: mat.id,
        cantidad_reservada: 1,
        cantidad_consumida: 0,
        codigo: mat.codigo,
        nombre: mat.nombre,
        um: mat.um,
      },
    ]);
    setShowMaterialSearch(false);
    setMaterialSearch("");
  };

  const removeMaterial = (materialId: string) => {
    setMaterialRows((prev) => prev.filter((r) => r.material_id !== materialId));
  };

  const updateCantidad = (materialId: string, value: number) => {
    setMaterialRows((prev) =>
      prev.map((r) =>
        r.material_id === materialId
          ? { ...r, cantidad_reservada: Math.max(r.cantidad_consumida + 1, value) }
          : r,
      ),
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!fechaExpiracion)
      newErrors.fechaExpiracion = "Ingresa la fecha de expiración";
    else if (new Date(fechaExpiracion) <= new Date())
      newErrors.fechaExpiracion = "La fecha de expiración debe ser futura";
    if (materialRows.length === 0)
      newErrors.materiales = "Debe haber al menos un material";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!reserva || !validate()) return;
    const data: ReservaUpdateData = {
      fecha_expiracion: new Date(fechaExpiracion).toISOString(),
      materiales: materialRows.map((r) => ({
        material_id: r.material_id,
        cantidad_reservada: r.cantidad_reservada,
        cantidad_consumida: r.cantidad_consumida,
      })),
    };
    await onSubmit(reserva.id, data);
  };

  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  if (!reserva) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-indigo-600" />
            Editar Reserva{" "}
            <span className="font-mono text-indigo-600">
              {reserva.reserva_id || reserva.id.slice(-8).toUpperCase()}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Info readonly */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-md text-sm">
            <div>
              <span className="text-xs text-gray-500">Cliente</span>
              <p className="font-medium text-gray-800">
                {reserva.cliente_nombre || reserva.cliente_id.slice(-6).toUpperCase()}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Almacén</span>
              <p className="font-medium text-gray-800">
                {reserva.almacen_nombre || reserva.almacen_id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Fecha Expiración */}
          <div className="space-y-1.5">
            <Label>
              Fecha de Expiración <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              min={minDate}
              value={fechaExpiracion}
              onChange={(e) => setFechaExpiracion(e.target.value)}
              className={errors.fechaExpiracion ? "border-red-500" : ""}
            />
            {errors.fechaExpiracion && (
              <p className="text-xs text-red-500">{errors.fechaExpiracion}</p>
            )}
          </div>

          {/* Materiales */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Materiales <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMaterialSearch((v) => !v)}
                disabled={loadingMateriales}
              >
                {loadingMateriales ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Agregar material
              </Button>
            </div>

            {/* Material search */}
            {showMaterialSearch && (
              <div className="border rounded-md p-3 bg-gray-50 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar material..."
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredMateriales.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No se encontraron materiales
                    </p>
                  ) : (
                    filteredMateriales.map((m) => {
                      const alreadyAdded = materialRows.some(
                        (r) => r.material_id === m.id,
                      );
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={alreadyAdded}
                          className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
                            alreadyAdded
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "hover:bg-white border hover:border-indigo-200"
                          }`}
                          onClick={() => !alreadyAdded && addMaterial(m)}
                        >
                          <span>
                            <span className="font-mono text-xs text-gray-500 mr-2">
                              {m.codigo}
                            </span>
                            {m.nombre}
                          </span>
                          {m.um && (
                            <Badge variant="outline" className="text-xs ml-2 shrink-0">
                              {m.um}
                            </Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Material rows */}
            {materialRows.length > 0 && (
              <div className="border rounded-md divide-y">
                {materialRows.map((row) => (
                  <div
                    key={row.material_id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <Package className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{row.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {row.codigo}
                        {row.um && ` · ${row.um}`}
                        {row.cantidad_consumida > 0 && (
                          <span className="ml-2 text-blue-600">
                            Consumido: {row.cantidad_consumida}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-xs text-gray-500 whitespace-nowrap">
                        Cant.
                      </Label>
                      <Input
                        type="number"
                        min={Math.max(1, row.cantidad_consumida + 1)}
                        value={row.cantidad_reservada}
                        onChange={(e) =>
                          updateCantidad(
                            row.material_id,
                            parseInt(e.target.value, 10) || 1,
                          )
                        }
                        className="w-20 text-center h-8"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMaterial(row.material_id)}
                      disabled={row.cantidad_consumida > 0}
                      title={
                        row.cantidad_consumida > 0
                          ? "No se puede eliminar un material con consumo registrado"
                          : "Eliminar material"
                      }
                      className="text-red-500 hover:text-red-600 shrink-0 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {errors.materiales && (
              <p className="text-xs text-red-500">{errors.materiales}</p>
            )}
            <p className="text-xs text-gray-400">
              * La lista completa de materiales reemplazará la existente. Los materiales con consumo registrado no pueden eliminarse.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
