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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Badge } from "@/components/shared/atom/badge";
import {
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { InventarioService, SolicitudVentaService } from "@/lib/api-services";
import type {
  Almacen,
  MaterialVentaWeb,
  SolicitudVenta,
  SolicitudVentaCreateData,
  SolicitudVentaUpdateData,
} from "@/lib/api-types";

interface MaterialRow {
  material_id: string;
  cantidad: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  um?: string;
  foto?: string;
}

interface UpsertSolicitudVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    data: SolicitudVentaCreateData | SolicitudVentaUpdateData,
  ) => Promise<void>;
  solicitud?: SolicitudVenta | null;
  isLoading?: boolean;
}

export function UpsertSolicitudVentaDialog({
  open,
  onOpenChange,
  onSubmit,
  solicitud,
  isLoading = false,
}: UpsertSolicitudVentaDialogProps) {
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteCi, setClienteCi] = useState("");
  const [selectedAlmacenId, setSelectedAlmacenId] = useState("");

  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [materialesVendibles, setMaterialesVendibles] = useState<
    MaterialVentaWeb[]
  >([]);
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);

  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(solicitud?.id);

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setLoadingData(true);
      setLoadError(null);
      try {
        const [almacenesData, materialesData] = await Promise.all([
          InventarioService.getAlmacenes(),
          SolicitudVentaService.getMaterialesVendiblesWeb(),
        ]);

        setAlmacenes(Array.isArray(almacenesData) ? almacenesData : []);
        setMaterialesVendibles(
          Array.isArray(materialesData) ? materialesData : [],
        );
      } catch (error) {
        console.error("Error loading solicitud venta dialog data:", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar almacenes y materiales vendibles",
        );
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setClienteNombre(solicitud?.cliente_venta?.nombre || "");
    setClienteDireccion(solicitud?.cliente_venta?.direccion || "");
    setClienteTelefono(solicitud?.cliente_venta?.telefono || "");
    setClienteCi(solicitud?.cliente_venta?.ci || "");
    setSelectedAlmacenId(solicitud?.almacen_id || solicitud?.almacen?.id || "");

    const initialRows: MaterialRow[] = (solicitud?.materiales || []).map(
      (item) => ({
        material_id: item.material_id,
        cantidad: item.cantidad,
        codigo:
          item.material?.codigo || item.material_codigo || item.codigo || "",
        nombre:
          item.material?.nombre ||
          item.material?.descripcion ||
          item.material_descripcion ||
          item.descripcion ||
          item.material_id,
        descripcion:
          item.material?.descripcion ||
          item.material_descripcion ||
          item.descripcion ||
          item.material?.nombre,
        um: item.material?.um || item.um,
        foto: item.material?.foto,
      }),
    );

    setMaterialRows(initialRows);
    setMaterialSearch("");
    setShowMaterialDropdown(false);
  }, [open, solicitud]);

  const filteredMateriales = useMemo(() => {
    const term = materialSearch.trim().toLowerCase();
    if (!term) return [];

    return materialesVendibles
      .filter((material) => {
        if (materialRows.some((row) => row.material_id === material.id)) {
          return false;
        }

        const searchIndex = [
          material.codigo,
          material.nombre,
          material.descripcion,
          material.categoria,
        ]
          .join(" ")
          .toLowerCase();

        return searchIndex.includes(term);
      })
      .slice(0, 20);
  }, [materialSearch, materialesVendibles, materialRows]);

  useEffect(() => {
    setShowMaterialDropdown(filteredMateriales.length > 0);
  }, [filteredMateriales]);

  const validMaterials = useMemo(
    () =>
      materialRows.filter(
        (item) => item.material_id.trim().length > 0 && item.cantidad > 0,
      ),
    [materialRows],
  );

  const canSubmit = useMemo(() => {
    if (!clienteNombre.trim()) return false;
    if (!selectedAlmacenId.trim()) return false;
    if (validMaterials.length === 0) return false;
    if (submitting || isLoading || loadingData) return false;
    return true;
  }, [
    clienteNombre,
    selectedAlmacenId,
    validMaterials.length,
    submitting,
    isLoading,
    loadingData,
  ]);

  const handleAddMaterial = (material: MaterialVentaWeb) => {
    if (materialRows.some((row) => row.material_id === material.id)) return;

    setMaterialRows((prev) => [
      ...prev,
      {
        material_id: material.id,
        cantidad: 1,
        codigo: material.codigo,
        nombre: material.nombre,
        descripcion: material.descripcion,
        um: material.um,
        foto: material.foto,
      },
    ]);
    setMaterialSearch("");
    setShowMaterialDropdown(false);
  };

  const handleCantidadChange = (index: number, value: string) => {
    const cantidad = Number(value);
    if (!Number.isFinite(cantidad) || cantidad < 0) return;

    setMaterialRows((prev) =>
      prev.map((item, rowIndex) =>
        rowIndex === index ? { ...item, cantidad } : item,
      ),
    );
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterialRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const payload: SolicitudVentaCreateData | SolicitudVentaUpdateData = {
      cliente_venta: {
        nombre: clienteNombre.trim(),
        direccion: clienteDireccion.trim() || undefined,
        telefono: clienteTelefono.trim() || undefined,
        ci: clienteCi.trim() || undefined,
      },
      almacen_id: selectedAlmacenId,
      materiales: validMaterials.map((material) => ({
        material_id: material.material_id,
        cantidad: material.cantidad,
      })),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      // El padre muestra el mensaje de error y mantiene el dialogo abierto.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            {isEdit ? "Editar solicitud de venta" : "Nueva solicitud de venta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {loadingData ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando almacenes y materiales vendibles...
            </div>
          ) : null}

          {loadError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {loadError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="solicitud-venta-cliente-nombre">
                Nombre cliente venta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="solicitud-venta-cliente-nombre"
                value={clienteNombre}
                onChange={(event) => setClienteNombre(event.target.value)}
                placeholder="Nombre del cliente"
                maxLength={120}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="solicitud-venta-cliente-direccion">
                Direccion
              </Label>
              <Input
                id="solicitud-venta-cliente-direccion"
                value={clienteDireccion}
                onChange={(event) => setClienteDireccion(event.target.value)}
                placeholder="Direccion del cliente"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="solicitud-venta-cliente-telefono">Telefono</Label>
              <Input
                id="solicitud-venta-cliente-telefono"
                value={clienteTelefono}
                onChange={(event) => setClienteTelefono(event.target.value)}
                placeholder="Ej: 5551234"
                maxLength={40}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="solicitud-venta-cliente-ci">CI</Label>
              <Input
                id="solicitud-venta-cliente-ci"
                value={clienteCi}
                onChange={(event) => setClienteCi(event.target.value)}
                placeholder="Carnet de identidad"
                maxLength={40}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Almacen <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedAlmacenId}
              onValueChange={setSelectedAlmacenId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un almacen" />
              </SelectTrigger>
              <SelectContent>
                {almacenes
                  .filter((almacen) => Boolean(almacen.id))
                  .map((almacen) => (
                    <SelectItem key={almacen.id} value={almacen.id!}>
                      {almacen.nombre}
                      {almacen.codigo ? ` (${almacen.codigo})` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Materiales <span className="text-red-500">*</span>
            </Label>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar material vendible por codigo o nombre..."
                value={materialSearch}
                onChange={(event) => setMaterialSearch(event.target.value)}
                className="pl-10"
              />

              {showMaterialDropdown && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                  {filteredMateriales.map((material) => (
                    <button
                      key={material.id}
                      className="w-full px-3 py-2 text-left hover:bg-indigo-50 text-sm flex items-center justify-between gap-2"
                      onClick={() => handleAddMaterial(material)}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {material.nombre}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {material.codigo}
                          {material.um ? ` - ${material.um}` : ""}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {materialRows.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">
                        Material
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-24">
                        UM
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-28">
                        Cantidad
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {materialRows.map((material, index) => (
                      <tr
                        key={`${material.material_id}-${index}`}
                        className="border-b last:border-b-0"
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {material.foto ? (
                              <img
                                src={material.foto}
                                alt={material.nombre}
                                className="h-8 w-8 rounded object-cover border border-gray-200"
                                onError={(event) => {
                                  (
                                    event.target as HTMLImageElement
                                  ).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 leading-tight truncate">
                                {material.nombre}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {material.codigo}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-600">
                          {material.um || "-"}
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={material.cantidad}
                            onChange={(event) =>
                              handleCantidadChange(index, event.target.value)
                            }
                            className="h-8 w-24"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => handleRemoveMaterial(index)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-2">
                Agrega al menos un material vendible para enviar la solicitud.
              </p>
            )}

            {validMaterials.length > 0 ? (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                {validMaterials.length} material
                {validMaterials.length !== 1 ? "es" : ""} seleccionado
              </Badge>
            ) : null}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
                "Guardar cambios"
              ) : (
                "Crear solicitud"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
