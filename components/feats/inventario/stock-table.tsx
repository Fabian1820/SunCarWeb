"use client";

import { useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Package, MapPin, Loader2 } from "lucide-react";
import type { StockItem } from "@/lib/inventario-types";
import type { Material } from "@/lib/material-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shared/molecule/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Label } from "@/components/shared/atom/label";
import { Input } from "@/components/shared/molecule/input";

interface MarcaItem {
  id: string;
  nombre: string;
}

interface StockTableProps {
  stock: StockItem[];
  onEditStock?: (item: StockItem) => void;
  onUpdateUbicacion?: (item: StockItem, ubicacion: string | null) => Promise<void>;
  detailed?: boolean;
  materials?: Material[];
  marcas?: MarcaItem[];
  almacenNombreFallback?: string;
}

const normalizarCodigo = (codigo: string) => codigo.trim().toLowerCase();

export function StockTable({
  stock,
  onEditStock,
  onUpdateUbicacion,
  detailed = false,
  materials = [],
  marcas = [],
  almacenNombreFallback,
}: StockTableProps) {
  const [isUbicacionDialogOpen, setIsUbicacionDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [ubicacionInput, setUbicacionInput] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenUbicacionDialog = (item: StockItem) => {
    setSelectedItem(item);
    setUbicacionInput(item.ubicacion_en_almacen ?? "");
    setError(null);
    setIsUbicacionDialogOpen(true);
  };

  const handleCloseUbicacionDialog = () => {
    setIsUbicacionDialogOpen(false);
    setSelectedItem(null);
    setUbicacionInput("");
    setError(null);
  };

  const handleUpdateUbicacion = async () => {
    if (!selectedItem || !onUpdateUbicacion) return;

    setIsUpdating(true);
    setError(null);
    try {
      await onUpdateUbicacion(selectedItem, ubicacionInput.trim() || null);
      handleCloseUbicacionDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar ubicación");
    } finally {
      setIsUpdating(false);
    }
  };

  if (stock.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Sin stock disponible
        </h3>
        <p className="text-gray-600">
          Registra movimientos para ver el inventario actualizado.
        </p>
      </div>
    );
  }

  const materialPorCodigo = new Map<string, Material>();
  for (const material of materials) {
    materialPorCodigo.set(normalizarCodigo(String(material.codigo)), material);
  }

  const marcaPorId = new Map<string, string>();
  for (const marca of marcas) {
    marcaPorId.set(marca.id, marca.nombre);
  }

  if (detailed) {
    return (
      <TooltipProvider>
        <>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[80px]">
                Foto
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900">
                Nombre
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[140px]">
                Código
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[110px]">
                Potencia
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[130px]">
                Marca
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[140px]">
                Categoría
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[150px]">
                Cantidad en stock
              </th>
              {(onEditStock || onUpdateUbicacion) ? (
                <th className="text-right py-3 px-2 font-semibold text-gray-900 w-[130px]">
                  Acciones
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {stock.map((item, index) => {
              const material = materialPorCodigo.get(
                normalizarCodigo(String(item.material_codigo || "")),
              );
              const marcaNombre = material?.marca_id
                ? (marcaPorId.get(material.marca_id) ??
                  `ID: ${material.marca_id.slice(0, 6)}`)
                : null;
              const nombreMaterial =
                material?.nombre ||
                material?.descripcion ||
                item.material_descripcion ||
                "Sin nombre";

              return (
                <tr
                  key={
                    item.id ||
                    `${item.almacen_id}-${item.material_codigo}-${index}`
                  }
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-2">
                    {material?.foto ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                        <img
                          src={material.foto}
                          alt={nombreMaterial}
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center border border-amber-200">
                        <Package className="h-5 w-5 text-amber-700" />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-sm font-medium text-gray-900 truncate cursor-help">
                          {nombreMaterial}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{nombreMaterial}</p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="py-3 px-2">
                    <div className="text-sm font-semibold text-gray-900">
                      {item.material_codigo}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-700">
                      {material?.potenciaKW ? `${material.potenciaKW} KW` : "-"}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-700">
                      {marcaNombre || "-"}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-700">
                      {material?.categoria || item.categoria || "-"}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-sm font-semibold">
                      {item.cantidad}
                      {item.um ? ` ${item.um}` : ""}
                    </span>
                  </td>
                  {(onEditStock || onUpdateUbicacion) ? (
                    <td className="py-3 px-2 text-right">
                      {onUpdateUbicacion ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenUbicacionDialog(item)}
                          title="Editar ubicación"
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Ubicación
                        </Button>
                      ) : onEditStock ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onEditStock(item)}
                        >
                          Editar stock
                        </Button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={isUbicacionDialogOpen} onOpenChange={handleCloseUbicacionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar ubicación en almacén</DialogTitle>
            <DialogDescription>
              {selectedItem
                ? `Material: ${selectedItem.material_codigo} - ${selectedItem.material_descripcion || "Sin descripción"}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ubicacion-input" className="text-sm font-medium text-gray-700 mb-2 block">
                Ubicación actual
              </Label>
              <div className="text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded border">
                {selectedItem?.ubicacion_en_almacen || "Sin ubicación"}
              </div>
            </div>

            <div>
              <Label htmlFor="ubicacion-input" className="text-sm font-medium text-gray-700 mb-2 block">
                Nueva ubicación
              </Label>
              <Input
                id="ubicacion-input"
                value={ubicacionInput}
                onChange={(e) => setUbicacionInput(e.target.value)}
                placeholder="Ej: Pasillo 3, Estante B"
                disabled={isUpdating}
              />
              <p className="text-xs text-gray-500 mt-1">
                Deja el campo vacío para quitar la ubicación
              </p>
            </div>

            {error ? (
              <div className="text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseUbicacionDialog}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleUpdateUbicacion}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </>
      </TooltipProvider>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Almacen
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Material
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Unidad
            </th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">
              Cantidad
            </th>
            {onEditStock ? (
              <th className="text-right py-3 px-4 font-semibold text-gray-900">
                Acciones
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {stock.map((item, index) => (
            <tr
              key={
                item.id || `${item.almacen_id}-${item.material_codigo}-${index}`
              }
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-4 px-4">
                <div className="font-semibold text-gray-900">
                  {item.almacen_nombre ||
                    almacenNombreFallback ||
                    item.almacen_id}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="font-semibold text-gray-900">
                  {item.material_codigo}
                </div>
                <div className="text-sm text-gray-600">
                  {item.material_descripcion || "Sin descripcion"}
                </div>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm text-gray-700">{item.um || "-"}</span>
              </td>
              <td className="py-4 px-4">
                <span className="text-sm font-semibold text-gray-900">
                  {item.cantidad}
                </span>
              </td>
              {onEditStock ? (
                <td className="py-4 px-4 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onEditStock(item)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar stock
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <Dialog open={isUbicacionDialogOpen} onOpenChange={handleCloseUbicacionDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar ubicación en almacén</DialogTitle>
          <DialogDescription>
            {selectedItem
              ? `Material: ${selectedItem.material_codigo} - ${selectedItem.material_descripcion || "Sin descripción"}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ubicacion-input-simple" className="text-sm font-medium text-gray-700 mb-2 block">
              Ubicación actual
            </Label>
            <div className="text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded border">
              {selectedItem?.ubicacion_en_almacen || "Sin ubicación"}
            </div>
          </div>

          <div>
            <Label htmlFor="ubicacion-input-simple" className="text-sm font-medium text-gray-700 mb-2 block">
              Nueva ubicación
            </Label>
            <Input
              id="ubicacion-input-simple"
              value={ubicacionInput}
              onChange={(e) => setUbicacionInput(e.target.value)}
              placeholder="Ej: Pasillo 3, Estante B"
              disabled={isUpdating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Deja el campo vacío para quitar la ubicación
            </p>
          </div>

          {error ? (
            <div className="text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseUbicacionDialog}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUpdateUbicacion}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
        </>
      </TooltipProvider>
    );
  }
