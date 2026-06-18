"use client";

import { useState } from "react";
import { Button } from "@/components/shared/atom/button";
import { Package, MapPin, Loader2, Pencil } from "lucide-react";
import type { StockItem } from "@/lib/inventario-types";
import { POOLS_STOCK, POOL_STOCK_LABELS } from "@/lib/types/feats/inventario/inventario-types";
import { PoolsDistributionDialog } from "@/components/feats/inventario/pools-distribution-dialog";
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
import { ReservasPorMaterialDialog } from "@/components/feats/inventario/reservas-por-material-dialog";

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
  loading?: boolean;
  /**
   * Si está definido, el dialog de pools muestra el botón "Transferir entre
   * pools" y al confirmar invoca este callback para refrescar el stock.
   */
  onTraspasoCompleto?: () => void | Promise<void>;
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
  loading = false,
  onTraspasoCompleto,
}: StockTableProps) {
  const [isUbicacionDialogOpen, setIsUbicacionDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [ubicacionInput, setUbicacionInput] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reservasDialog, setReservasDialog] = useState<{
    open: boolean;
    almacenId: string;
    materialId: string;
    materialNombre?: string;
    pools?: StockItem["pools"];
    um?: string;
  }>({ open: false, almacenId: "", materialId: "" });

  const [poolsDialog, setPoolsDialog] = useState<{
    open: boolean;
    titulo: string;
    contexto?: string;
    pools?: StockItem["pools"];
    cantidadTotal?: number;
    um?: string;
    mostrarReserva: boolean;
    material_id?: string;
    almacen_id?: string;
  }>({ open: false, titulo: "", mostrarReserva: false });

  const handleOpenPoolsDialog = (item: StockItem, nombreMaterial: string, mostrarReserva: boolean) => {
    setPoolsDialog({
      open: true,
      titulo: nombreMaterial,
      contexto: item.almacen_nombre ?? almacenNombreFallback,
      pools: item.pools,
      cantidadTotal: item.cantidad,
      um: item.um,
      mostrarReserva,
      material_id: item.material_id,
      almacen_id: item.almacen_id,
    });
  };

  const handleOpenReservasDialog = (item: StockItem, nombreMaterial: string) => {
    if (!item.material_id) return;
    setReservasDialog({
      open: true,
      almacenId: item.almacen_id,
      materialId: item.material_id,
      materialNombre: nombreMaterial,
      pools: item.pools,
      um: item.um,
    });
  };

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
          <div className={`overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 relative ${loading ? "opacity-60 pointer-events-none" : ""}`}>
            <table className="w-full min-w-[900px] sm:min-w-0 sm:table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[56px]">
                Foto
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 min-w-[160px]">
                Nombre
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[110px]">
                Código
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[85px]">
                Potencia
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[100px]">
                Marca
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[100px]">
                Categoría
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[90px]">
                En stock
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[90px]">
                Reservada
              </th>
              <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[160px]">
                Ubicación
              </th>
              {(onEditStock || onUpdateUbicacion) ? (
                <th className="text-center py-3 px-2 font-semibold text-gray-900 w-[72px]">
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
                          loading="lazy"
                          decoding="async"
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
                  <td className="py-3 px-2 max-w-[110px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-default min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {item.material_codigo}
                          </div>
                          {material?.numero_serie && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                              N/S: {material.numero_serie}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.material_codigo}</p>
                        {material?.numero_serie && (
                          <p className="text-xs">N/S: {material.numero_serie}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-700">
                      {material?.potenciaKW ? `${material.potenciaKW} KW` : "-"}
                    </span>
                  </td>
                  <td className="py-3 px-2 max-w-[100px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm text-gray-700 truncate block cursor-default">
                          {marcaNombre || "-"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{marcaNombre || "-"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="py-3 px-2 max-w-[100px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm text-gray-700 truncate block cursor-default">
                          {material?.categoria || item.categoria || "-"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{material?.categoria || item.categoria || "-"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="py-3 px-2">
                    {item.material_id ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleOpenPoolsDialog(item, nombreMaterial, false)}
                            className="inline-flex rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-sm font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            {item.cantidad}
                            {item.um ? ` ${item.um}` : ""}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ver distribución por sector y transferir</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-sm font-semibold">
                        {item.cantidad}
                        {item.um ? ` ${item.um}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    {(item.cantidad_reservada ?? 0) > 0 && item.material_id ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => handleOpenReservasDialog(item, nombreMaterial)}
                            className="inline-flex rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 text-sm font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            {item.cantidad_reservada}
                            {item.um ? ` ${item.um}` : ""}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.pools && POOLS_STOCK.some((p) => (item.pools![p]?.cantidad_reservada ?? 0) > 0) ? (
                            <div className="text-xs space-y-0.5">
                              <p className="font-semibold mb-1">Reservas por sector:</p>
                              {POOLS_STOCK.map((p) => (
                                <div key={p} className="flex justify-between gap-3">
                                  <span className="text-gray-300">{POOL_STOCK_LABELS[p]}:</span>
                                  <span className="font-mono">{item.pools![p]?.cantidad_reservada ?? 0}</span>
                                </div>
                              ))}
                              <p className="pt-1 border-t border-gray-700 text-[10px] text-gray-400">Click para ver reservas activas</p>
                            </div>
                          ) : (
                            <p>Ver reservas activas</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-50 text-gray-400 border border-gray-200 px-2 py-1 text-sm font-semibold">
                        0{item.um ? ` ${item.um}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 max-w-[160px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm text-gray-700 truncate block cursor-default">
                          {item.ubicacion_en_almacen || "-"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.ubicacion_en_almacen || "-"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  {(onEditStock || onUpdateUbicacion) ? (
                    <td className="py-3 px-2 text-center">
                      {onUpdateUbicacion ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenUbicacionDialog(item)}
                              className="h-8 w-8 p-0"
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar ubicación</p>
                          </TooltipContent>
                        </Tooltip>
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

      <ReservasPorMaterialDialog
        open={reservasDialog.open}
        onOpenChange={(open) => setReservasDialog((prev) => ({ ...prev, open }))}
        almacenId={reservasDialog.almacenId}
        materialId={reservasDialog.materialId}
        materialNombre={reservasDialog.materialNombre}
        pools={reservasDialog.pools}
        um={reservasDialog.um}
      />

      <PoolsDistributionDialog
        open={poolsDialog.open}
        onOpenChange={(open) => setPoolsDialog((prev) => ({ ...prev, open }))}
        titulo={poolsDialog.titulo}
        contexto={poolsDialog.contexto}
        pools={poolsDialog.pools}
        cantidadTotal={poolsDialog.cantidadTotal}
        um={poolsDialog.um}
        mostrarReserva={poolsDialog.mostrarReserva}
        material_id={poolsDialog.material_id}
        almacen_id={poolsDialog.almacen_id}
        onTraspasoCompleto={onTraspasoCompleto ? async () => {
          await onTraspasoCompleto();
          // Cerrar el dialog para que el caller decida si re-mostrarlo con
          // los nuevos pools tras el refetch.
          setPoolsDialog((prev) => ({ ...prev, open: false }));
        } : undefined}
      />
        </>
      </TooltipProvider>
    );
  }

  return (
    <>
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
  );
}
