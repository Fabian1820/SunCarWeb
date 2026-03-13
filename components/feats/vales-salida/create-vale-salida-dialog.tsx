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
  Search,
  Plus,
  Trash2,
  Loader2,
  Package,
  FileOutput,
  X,
} from "lucide-react";
import { Badge } from "@/components/shared/atom/badge";
import { MaterialService, ValeSalidaService } from "@/lib/api-services";
import type {
  ValeSalidaCreateData,
  ValeSolicitudPendiente,
} from "@/lib/api-types";
import { useToast } from "@/hooks/use-toast";

interface MaterialRow {
  material_id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  um: string;
  cantidad: number;
  foto?: string;
}

interface MaterialCatalogItem {
  id?: string;
  _id?: string;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  um?: string;
  foto?: string;
}

interface CreateValeSalidaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  almacenId: string;
  prefillSolicitudId?: string | null;
}

const getTipoStyles = (tipo?: string) =>
  tipo === "venta"
    ? {
        selected: "bg-indigo-50 border-indigo-200 text-indigo-800",
        dropdown: "hover:bg-indigo-50",
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      }
    : {
        selected: "bg-amber-50 border-amber-200 text-amber-800",
        dropdown: "hover:bg-amber-50",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
      };

const getSolicitudCode = (solicitud: ValeSolicitudPendiente) =>
  solicitud.codigo || solicitud.solicitud_id.slice(-6).toUpperCase();

const getSolicitudCliente = (solicitud: ValeSolicitudPendiente) =>
  solicitud.cliente_venta?.nombre || solicitud.cliente?.nombre || "Sin cliente";

export function CreateValeSalidaDialog({
  open,
  onOpenChange,
  onSuccess,
  almacenId,
  prefillSolicitudId,
}: CreateValeSalidaDialogProps) {
  const { toast } = useToast();

  const [solicitudes, setSolicitudes] = useState<ValeSolicitudPendiente[]>([]);
  const [solicitudSearch, setSolicitudSearch] = useState("");
  const [selectedSolicitud, setSelectedSolicitud] =
    useState<ValeSolicitudPendiente | null>(null);
  const [solicitudLoading, setSolicitudLoading] = useState(false);
  const [showSolicitudDropdown, setShowSolicitudDropdown] = useState(false);

  const [materiales, setMateriales] = useState<MaterialRow[]>([]);

  const [materialSearch, setMaterialSearch] = useState("");
  const [materialResults, setMaterialResults] = useState<MaterialCatalogItem[]>(
    [],
  );
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  const [allMaterials, setAllMaterials] = useState<MaterialCatalogItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const filteredSolicitudes = useMemo(() => {
    const term = solicitudSearch.trim().toLowerCase();
    if (!term) return solicitudes.slice(0, 20);

    return solicitudes
      .filter((solicitud) => {
        const searchIndex = [
          getSolicitudCode(solicitud),
          getSolicitudCliente(solicitud),
          solicitud.tipo_solicitud,
          solicitud.almacen?.nombre,
        ]
          .join(" ")
          .toLowerCase();
        return searchIndex.includes(term);
      })
      .slice(0, 20);
  }, [solicitudSearch, solicitudes]);

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setSolicitudLoading(true);
      try {
        const [solicitudesData, materialsData] = await Promise.all([
          ValeSalidaService.getSolicitudesPorAlmacen(almacenId, {
            estado: "nueva",
            incluir_con_vale: false,
            skip: 0,
            limit: 500,
          }),
          MaterialService.getAllMaterials(),
        ]);

        setSolicitudes(Array.isArray(solicitudesData) ? solicitudesData : []);
        setAllMaterials(Array.isArray(materialsData) ? materialsData : []);
      } catch (error) {
        console.error("Error loading data for vale dialog:", error);
        toast({
          title: "Error",
          description:
            "No se pudieron cargar las solicitudes pendientes y materiales",
          variant: "destructive",
        });
      } finally {
        setSolicitudLoading(false);
      }
    };

    void loadData();
  }, [open, almacenId, toast]);

  useEffect(() => {
    if (!open) {
      setSolicitudSearch("");
      setSelectedSolicitud(null);
      setMateriales([]);
      setMaterialSearch("");
      setMaterialResults([]);
      setShowSolicitudDropdown(false);
      return;
    }

    if (prefillSolicitudId) {
      const candidate = solicitudes.find(
        (solicitud) => solicitud.solicitud_id === prefillSolicitudId,
      );
      if (candidate) {
        setSelectedSolicitud(candidate);
        setSolicitudSearch(getSolicitudCode(candidate));
        setShowSolicitudDropdown(false);
      }
    }
  }, [open, prefillSolicitudId, solicitudes]);

  useEffect(() => {
    if (!selectedSolicitud) return;

    const rows: MaterialRow[] = (selectedSolicitud.materiales || []).map((item) => {
      const mat = item.material;
      return {
        material_id: item.material_id || "",
        codigo: mat?.codigo || item.material_codigo || item.codigo || "",
        nombre:
          mat?.nombre ||
          mat?.descripcion ||
          item.material_descripcion ||
          item.descripcion ||
          item.material_id,
        descripcion:
          mat?.descripcion ||
          mat?.nombre ||
          item.material_descripcion ||
          item.descripcion ||
          "",
        um: mat?.um || item.um || "U",
        cantidad: item.cantidad || 0,
        foto: mat?.foto,
      };
    });

    setMateriales(rows);
  }, [selectedSolicitud]);

  useEffect(() => {
    if (!materialSearch.trim()) {
      setMaterialResults([]);
      setShowMaterialDropdown(false);
      return;
    }

    const handler = setTimeout(() => {
      const term = materialSearch.toLowerCase();
      const filtered = allMaterials
        .filter(
          (material) =>
            (material.descripcion?.toLowerCase().includes(term) ||
              material.nombre?.toLowerCase().includes(term) ||
              material.codigo?.toString().toLowerCase().includes(term)) &&
            !materiales.some(
              (row) => row.material_id === (material.id || material._id),
            ),
        )
        .slice(0, 15);

      setMaterialResults(filtered);
      setShowMaterialDropdown(filtered.length > 0);
    }, 200);

    return () => clearTimeout(handler);
  }, [allMaterials, materialSearch, materiales]);

  const handleSelectSolicitud = (solicitud: ValeSolicitudPendiente) => {
    setSelectedSolicitud(solicitud);
    setSolicitudSearch(getSolicitudCode(solicitud));
    setShowSolicitudDropdown(false);
  };

  const handleClearSolicitud = () => {
    setSelectedSolicitud(null);
    setSolicitudSearch("");
    setMateriales([]);
  };

  const handleAddMaterial = (material: MaterialCatalogItem) => {
    const id = material.id || material._id || "";
    if (!id || materiales.some((m) => m.material_id === id)) return;

    setMateriales((prev) => [
      ...prev,
      {
        material_id: id,
        codigo: material.codigo?.toString() || "",
        nombre: material.nombre || material.descripcion || "",
        descripcion: material.descripcion || material.nombre || "",
        um: material.um || "U",
        cantidad: 1,
        foto: material.foto,
      },
    ]);
    setMaterialSearch("");
    setShowMaterialDropdown(false);
  };

  const handleRemoveMaterial = (index: number) => {
    setMateriales((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCantidadChange = (index: number, value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return;
    setMateriales((prev) =>
      prev.map((material, i) =>
        i === index ? { ...material, cantidad: num } : material,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!selectedSolicitud) return;

    const validMaterials = materiales.filter(
      (material) => material.material_id && material.cantidad > 0,
    );
    if (validMaterials.length === 0) return;

    const payload: ValeSalidaCreateData = {
      materiales: validMaterials.map((material) => ({
        material_id: material.material_id,
        cantidad: material.cantidad,
      })),
      solicitud_material_id:
        selectedSolicitud.tipo_solicitud === "material"
          ? selectedSolicitud.solicitud_id
          : undefined,
      solicitud_venta_id:
        selectedSolicitud.tipo_solicitud === "venta"
          ? selectedSolicitud.solicitud_id
          : undefined,
    };

    setSubmitting(true);
    try {
      await ValeSalidaService.createVale(payload);
      onSuccess();
      onOpenChange(false);
      toast({
        title: "Exito",
        description: "Vale de salida creado correctamente",
      });
    } catch (error) {
      console.error("Error creating vale de salida:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Error al crear el vale de salida",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const validCount = materiales.filter(
    (material) => material.material_id && material.cantidad > 0,
  ).length;
  const canSubmit = selectedSolicitud && validCount > 0 && !submitting;
  const selectedTipoStyles = getTipoStyles(selectedSolicitud?.tipo_solicitud);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileOutput className="h-5 w-5 text-orange-600" />
            Nuevo Vale de Salida
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Solicitud <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-gray-500">
              Selecciona una solicitud nueva de tipo material o venta.
            </p>
            <div className="relative">
              {selectedSolicitud ? (
                <div
                  className={`flex items-center gap-2 border rounded-md px-3 py-2 ${selectedTipoStyles.selected}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {getSolicitudCode(selectedSolicitud)}
                      </span>
                      <Badge
                        variant="outline"
                        className={selectedTipoStyles.badge}
                      >
                        {selectedSolicitud.tipo_solicitud === "venta"
                          ? "Venta"
                          : "Material"}
                      </Badge>
                    </div>
                    <span className="text-sm">
                      {getSolicitudCliente(selectedSolicitud)}
                    </span>
                    {selectedSolicitud.almacen?.nombre ? (
                      <span className="ml-2 text-xs opacity-80">
                        ({selectedSolicitud.almacen.nombre})
                      </span>
                    ) : null}
                  </div>
                  <button
                    onClick={handleClearSolicitud}
                    className="text-gray-400 hover:text-gray-700"
                    title="Quitar solicitud"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por codigo, cliente o tipo..."
                    value={solicitudSearch}
                    onChange={(e) => {
                      setSolicitudSearch(e.target.value);
                      setShowSolicitudDropdown(true);
                    }}
                    onFocus={() => setShowSolicitudDropdown(true)}
                    className="pl-10"
                  />
                  {solicitudLoading ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  ) : null}
                </>
              )}

              {showSolicitudDropdown &&
              !selectedSolicitud &&
              filteredSolicitudes.length > 0 ? (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
                  {filteredSolicitudes.map((solicitud) => {
                    const styles = getTipoStyles(solicitud.tipo_solicitud);
                    return (
                      <button
                        key={`${solicitud.tipo_solicitud}-${solicitud.solicitud_id}`}
                        className={`w-full text-left px-4 py-2 text-sm ${styles.dropdown}`}
                        onClick={() => handleSelectSolicitud(solicitud)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium font-mono">
                            {getSolicitudCode(solicitud)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={styles.badge}
                            >
                              {solicitud.tipo_solicitud === "venta"
                                ? "Venta"
                                : "Material"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                            >
                              <Package className="h-3 w-3 mr-1" />
                              {solicitud.materiales?.length || 0}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {getSolicitudCliente(solicitud)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {showSolicitudDropdown &&
              !selectedSolicitud &&
              !solicitudLoading &&
              solicitudSearch.trim() &&
              filteredSolicitudes.length === 0 ? (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-500 text-center">
                  No se encontraron solicitudes nuevas
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Materiales</Label>

            {materiales.length > 0 ? (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">
                        Material
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-20">
                        UM
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-28">
                        Cantidad
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {materiales.map((material, idx) => (
                      <tr key={idx} className="border-b last:border-b-0">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {material.foto ? (
                              <img
                                src={material.foto}
                                alt={material.nombre || material.descripcion}
                                className="h-8 w-8 rounded object-cover border border-gray-200 flex-shrink-0"
                                onError={(event) => {
                                  (
                                    event.target as HTMLImageElement
                                  ).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 leading-tight">
                                {material.nombre ||
                                  material.descripcion ||
                                  material.codigo}
                              </p>
                              {material.codigo ? (
                                <p className="text-xs text-gray-400">
                                  {material.codigo}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-500">{material.um}</td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={material.cantidad}
                            onChange={(e) =>
                              handleCantidadChange(idx, e.target.value)
                            }
                            className="h-8 w-24"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => handleRemoveMaterial(idx)}
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
            ) : null}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar material para agregar..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="pl-10"
              />
              {showMaterialDropdown && materialResults.length > 0 ? (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {materialResults.map((material) => (
                    <button
                      key={material.id || material._id}
                      className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm flex items-center gap-2"
                      onClick={() => handleAddMaterial(material)}
                    >
                      {material.foto ? (
                        <img
                          src={material.foto}
                          alt={material.nombre || material.descripcion}
                          className="h-7 w-7 rounded object-cover border border-gray-200 flex-shrink-0"
                          onError={(event) => {
                            (event.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div className="h-7 w-7 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <Package className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {material.nombre || material.descripcion}
                        </p>
                        {material.codigo ? (
                          <p className="text-xs text-gray-400">
                            {material.codigo}
                          </p>
                        ) : null}
                      </div>
                      <Plus className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {materiales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">
                {selectedSolicitud
                  ? "No se encontraron materiales en la solicitud. Agregue materiales manualmente."
                  : "Seleccione una solicitud para cargar sus materiales."}
              </p>
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
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Vale ({validCount} materiales)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
