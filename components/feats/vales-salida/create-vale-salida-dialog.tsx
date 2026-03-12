"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  SolicitudMaterialService,
  MaterialService,
  ValeSalidaService,
} from "@/lib/api-services";
import type { SolicitudMaterial, ValeSalidaCreateData } from "@/lib/api-types";
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
  prefillSolicitudCode?: string | null;
}

export function CreateValeSalidaDialog({
  open,
  onOpenChange,
  onSuccess,
  prefillSolicitudCode,
}: CreateValeSalidaDialogProps) {
  const { toast } = useToast();

  const [solicitudSearch, setSolicitudSearch] = useState("");
  const [solicitudResults, setSolicitudResults] = useState<SolicitudMaterial[]>([]);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudMaterial | null>(null);
  const [solicitudLoading, setSolicitudLoading] = useState(false);
  const [showSolicitudDropdown, setShowSolicitudDropdown] = useState(false);
  const [autoSelectSolicitudCode, setAutoSelectSolicitudCode] = useState<string | null>(null);

  const [materiales, setMateriales] = useState<MaterialRow[]>([]);
  const [loadingMateriales, setLoadingMateriales] = useState(false);

  const [materialSearch, setMaterialSearch] = useState("");
  const [materialResults, setMaterialResults] = useState<MaterialCatalogItem[]>([]);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  const [allMaterials, setAllMaterials] = useState<MaterialCatalogItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadCatalog = async () => {
      try {
        const data = await MaterialService.getAllMaterials();
        setAllMaterials(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading materials catalog:", error);
      }
    };

    loadCatalog();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSolicitudSearch("");
      setSolicitudResults([]);
      setSelectedSolicitud(null);
      setMateriales([]);
      setMaterialSearch("");
      setMaterialResults([]);
      setAutoSelectSolicitudCode(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !prefillSolicitudCode?.trim()) return;
    setSelectedSolicitud(null);
    setSolicitudSearch(prefillSolicitudCode.trim());
    setAutoSelectSolicitudCode(prefillSolicitudCode.trim());
  }, [open, prefillSolicitudCode]);

  const loadMaterialesFromSolicitud = useCallback(
    (solicitud: SolicitudMaterial) => {
      setLoadingMateriales(true);
      try {
        const rows: MaterialRow[] = (solicitud.materiales || []).map((s) => {
          const mat = s.material;
          const catalogMat = !mat
            ? allMaterials.find((m) => (m.id || m._id) === s.material_id)
            : null;
          const src = mat || catalogMat;

          return {
            material_id: s.material_id || "",
            codigo: src?.codigo || s.material_codigo || s.codigo || "",
            nombre:
              src?.nombre ||
              src?.descripcion ||
              s.material_descripcion ||
              s.descripcion ||
              "",
            descripcion:
              src?.descripcion ||
              src?.nombre ||
              s.material_descripcion ||
              s.descripcion ||
              "",
            um: src?.um || s.um || "U",
            cantidad: s.cantidad || 0,
            foto: src?.foto,
          };
        });

        setMateriales(rows);
      } finally {
        setLoadingMateriales(false);
      }
    },
    [allMaterials],
  );

  const handleSelectSolicitud = useCallback(
    async (solicitud: SolicitudMaterial) => {
      setShowSolicitudDropdown(false);
      setSolicitudLoading(true);
      try {
        const detail =
          (await SolicitudMaterialService.getSolicitudById(solicitud.id)) || solicitud;
        setSelectedSolicitud(detail);
        setSolicitudSearch(detail.codigo || detail.id.slice(-6).toUpperCase());
        loadMaterialesFromSolicitud(detail);
      } catch (error) {
        console.error("Error loading solicitud detail:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar el detalle de la solicitud",
          variant: "destructive",
        });
      } finally {
        setSolicitudLoading(false);
      }
    },
    [loadMaterialesFromSolicitud, toast],
  );

  useEffect(() => {
    if (!solicitudSearch.trim() || selectedSolicitud) {
      setSolicitudResults([]);
      setShowSolicitudDropdown(false);
      return;
    }

    const handler = setTimeout(async () => {
      setSolicitudLoading(true);
      try {
        const data = await SolicitudMaterialService.getSolicitudes({
          estado: "nueva",
          codigo: solicitudSearch,
        });

        if (autoSelectSolicitudCode) {
          const normalized = autoSelectSolicitudCode.toLowerCase();
          const exact = data.find(
            (s) =>
              (s.codigo || s.id.slice(-6).toUpperCase()).toLowerCase() === normalized,
          );
          const candidate = exact || data[0];

          if (candidate) {
            setAutoSelectSolicitudCode(null);
            await handleSelectSolicitud(candidate);
            return;
          }

          setAutoSelectSolicitudCode(null);
        }

        setSolicitudResults(data);
        setShowSolicitudDropdown(true);
      } catch {
        setSolicitudResults([]);
      } finally {
        setSolicitudLoading(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [
    autoSelectSolicitudCode,
    handleSelectSolicitud,
    selectedSolicitud,
    solicitudSearch,
  ]);

  const handleClearSolicitud = () => {
    setSelectedSolicitud(null);
    setSolicitudSearch("");
    setMateriales([]);
  };

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
          (m) =>
            (m.descripcion?.toLowerCase().includes(term) ||
              m.nombre?.toLowerCase().includes(term) ||
              m.codigo?.toString().toLowerCase().includes(term)) &&
            !materiales.some((row) => row.material_id === (m.id || m._id)),
        )
        .slice(0, 15);

      setMaterialResults(filtered);
      setShowMaterialDropdown(filtered.length > 0);
    }, 200);

    return () => clearTimeout(handler);
  }, [allMaterials, materialSearch, materiales]);

  const handleAddMaterial = (material: MaterialCatalogItem) => {
    const id = material.id || material._id || "";
    if (materiales.some((m) => m.material_id === id)) return;

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
    const num = parseFloat(value);
    if (Number.isNaN(num) || num < 0) return;
    setMateriales((prev) =>
      prev.map((m, i) => (i === index ? { ...m, cantidad: num } : m)),
    );
  };

  const handleSubmit = async () => {
    if (!selectedSolicitud) return;

    const validMaterials = materiales.filter((m) => m.material_id && m.cantidad > 0);
    if (validMaterials.length === 0) return;

    setSubmitting(true);
    try {
      const payload: ValeSalidaCreateData = {
        solicitud_material_id: selectedSolicitud.id,
        materiales: validMaterials.map((m) => ({
          material_id: m.material_id,
          cantidad: m.cantidad,
        })),
      };

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
          error instanceof Error ? error.message : "Error al crear el vale de salida",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const validCount = materiales.filter((m) => m.material_id && m.cantidad > 0).length;
  const canSubmit = selectedSolicitud && validCount > 0 && !submitting;

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
              Solicitud de Materiales <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-gray-500">
              Solo se muestran solicitudes con estado &quot;nueva&quot;
            </p>
            <div className="relative">
              {selectedSolicitud ? (
                <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-orange-50 border-orange-200">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-orange-800">
                      {selectedSolicitud.codigo || selectedSolicitud.id.slice(-6).toUpperCase()}
                    </span>
                    {selectedSolicitud.cliente?.nombre && (
                      <span className="ml-2 text-orange-600 text-sm">
                        - {selectedSolicitud.cliente.nombre}
                      </span>
                    )}
                    {selectedSolicitud.almacen?.nombre && (
                      <span className="ml-2 text-orange-500 text-xs">
                        ({selectedSolicitud.almacen.nombre})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleClearSolicitud}
                    className="text-orange-400 hover:text-orange-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar solicitud por codigo..."
                    value={solicitudSearch}
                    onChange={(e) => setSolicitudSearch(e.target.value)}
                    className="pl-10"
                  />
                  {solicitudLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </>
              )}

              {showSolicitudDropdown && solicitudResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {solicitudResults.map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-4 py-2 hover:bg-orange-50 text-sm"
                      onClick={() => handleSelectSolicitud(s)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium font-mono">
                          {s.codigo || s.id.slice(-6).toUpperCase()}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {s.materiales?.length || 0}
                        </Badge>
                      </div>
                      <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                        {s.cliente?.nombre && <span>{s.cliente.nombre}</span>}
                        {s.almacen?.nombre && <span>- {s.almacen.nombre}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showSolicitudDropdown &&
                solicitudResults.length === 0 &&
                !solicitudLoading &&
                solicitudSearch.trim() && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-500 text-center">
                    No se encontraron solicitudes nuevas
                  </div>
                )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Materiales</Label>

            {loadingMateriales && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando materiales de la solicitud...
              </div>
            )}

            {materiales.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Material</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-20">UM</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 w-28">Cantidad</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {materiales.map((mat, idx) => (
                      <tr key={idx} className="border-b last:border-b-0">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {mat.foto ? (
                              <img
                                src={mat.foto}
                                alt={mat.nombre || mat.descripcion}
                                className="h-8 w-8 rounded object-cover border border-gray-200 flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 leading-tight">
                                {mat.nombre || mat.descripcion || mat.codigo}
                              </p>
                              {mat.codigo && <p className="text-xs text-gray-400">{mat.codigo}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-500">{mat.um}</td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={mat.cantidad}
                            onChange={(e) => handleCantidadChange(idx, e.target.value)}
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
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar material para agregar..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="pl-10"
              />
              {showMaterialDropdown && materialResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {materialResults.map((m) => (
                    <button
                      key={m.id || m._id}
                      className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm flex items-center gap-2"
                      onClick={() => handleAddMaterial(m)}
                    >
                      {m.foto ? (
                        <img
                          src={m.foto}
                          alt={m.nombre || m.descripcion}
                          className="h-7 w-7 rounded object-cover border border-gray-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-7 w-7 rounded bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <Package className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{m.nombre || m.descripcion}</p>
                        {m.codigo && <p className="text-xs text-gray-400">{m.codigo}</p>}
                      </div>
                      <Plus className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {materiales.length === 0 && !loadingMateriales && (
              <p className="text-sm text-gray-400 text-center py-2">
                {selectedSolicitud
                  ? "No se encontraron materiales en la solicitud. Agregue materiales manualmente."
                  : "Seleccione una solicitud para cargar sus materiales."}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
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
