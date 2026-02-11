"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import { Switch } from "@/components/shared/molecule/switch";
import { Card, CardContent } from "@/components/shared/molecule/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Package,
  Search,
  Globe,
  FileText,
  DollarSign,
  Plus,
  X,
  Save,
  Loader2,
} from "lucide-react";
import type { Material } from "@/lib/material-types";

interface VistaWebProps {
  materials: Material[];
  categories: string[];
  marcas: any[];
  onUpdateMaterial: (
    productoId: string,
    materialCodigo: string,
    data: any,
    categoria: string,
  ) => Promise<boolean>;
}

export function VistaWeb({
  materials,
  categories,
  marcas,
  onUpdateMaterial,
}: VistaWebProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMarca, setSelectedMarca] = useState("all");
  const [webFilter, setWebFilter] = useState<"all" | "enabled" | "disabled">(
    "all",
  );

  // Dialogs
  const [specsDialogOpen, setSpecsDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null,
  );

  // Specs form
  const [editSpecs, setEditSpecs] = useState<
    { clave: string; valor: string }[]
  >([]);
  const [savingSpecs, setSavingSpecs] = useState(false);

  // Price form
  const [editPrices, setEditPrices] = useState<
    { cantidad: string; precio: string }[]
  >([]);
  const [savingPrices, setSavingPrices] = useState(false);

  // Toggle loading state per material
  const [togglingWeb, setTogglingWeb] = useState<string | null>(null);

  const getMarcaNombre = (marcaId: string | undefined): string | null => {
    if (!marcaId || marcas.length === 0) return null;
    const marca = marcas.find((m: any) => m.id === marcaId);
    return marca?.nombre || null;
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const matchesSearch =
        !searchTerm ||
        (material.nombre || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        material.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.codigo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || material.categoria === selectedCategory;
      const matchesMarca =
        selectedMarca === "all" || material.marca_id === selectedMarca;
      const matchesWeb =
        webFilter === "all" ||
        (webFilter === "enabled" && material.habilitar_venta_web) ||
        (webFilter === "disabled" && !material.habilitar_venta_web);
      return matchesSearch && matchesCategory && matchesMarca && matchesWeb;
    });
  }, [materials, searchTerm, selectedCategory, selectedMarca, webFilter]);

  const handleToggleWeb = async (material: Material) => {
    const key = `${material.producto_id}_${material.codigo}`;
    setTogglingWeb(key);
    try {
      const productoId = material.producto_id || material.id.split("_")[0];
      await onUpdateMaterial(
        productoId,
        String(material.codigo),
        {
          codigo: material.codigo,
          descripcion: material.descripcion,
          um: material.um,
          precio: material.precio,
          nombre: material.nombre,
          foto: material.foto,
          marca_id: material.marca_id,
          potenciaKW: material.potenciaKW,
          habilitar_venta_web: !material.habilitar_venta_web,
          precio_por_cantidad: material.precio_por_cantidad,
          especificaciones: material.especificaciones,
        },
        material.categoria,
      );
    } catch (err) {
      console.error("Error toggling web:", err);
    } finally {
      setTogglingWeb(null);
    }
  };

  const openSpecsDialog = (material: Material) => {
    setSelectedMaterial(material);
    setEditSpecs(
      material.especificaciones
        ? Object.entries(material.especificaciones).map(([clave, valor]) => ({
            clave,
            valor,
          }))
        : [],
    );
    setSpecsDialogOpen(true);
  };

  const saveSpecs = async () => {
    if (!selectedMaterial) return;
    setSavingSpecs(true);
    try {
      const especificacionesObj =
        editSpecs.length > 0
          ? editSpecs.reduce(
              (acc, { clave, valor }) => {
                if (clave.trim() && valor.trim()) {
                  acc[clave.trim()] = valor.trim();
                }
                return acc;
              },
              {} as Record<string, string>,
            )
          : null;

      const productoId =
        selectedMaterial.producto_id || selectedMaterial.id.split("_")[0];
      await onUpdateMaterial(
        productoId,
        String(selectedMaterial.codigo),
        {
          codigo: selectedMaterial.codigo,
          descripcion: selectedMaterial.descripcion,
          um: selectedMaterial.um,
          precio: selectedMaterial.precio,
          nombre: selectedMaterial.nombre,
          foto: selectedMaterial.foto,
          marca_id: selectedMaterial.marca_id,
          potenciaKW: selectedMaterial.potenciaKW,
          habilitar_venta_web: selectedMaterial.habilitar_venta_web,
          precio_por_cantidad: selectedMaterial.precio_por_cantidad,
          especificaciones:
            Object.keys(especificacionesObj || {}).length > 0
              ? especificacionesObj
              : null,
        },
        selectedMaterial.categoria,
      );
      setSpecsDialogOpen(false);
    } catch (err) {
      console.error("Error saving specs:", err);
    } finally {
      setSavingSpecs(false);
    }
  };

  const openPriceDialog = (material: Material) => {
    setSelectedMaterial(material);
    setEditPrices(
      material.precio_por_cantidad
        ? Object.entries(material.precio_por_cantidad).map(
            ([cantidad, precio]) => ({ cantidad, precio: String(precio) }),
          )
        : [],
    );
    setPriceDialogOpen(true);
  };

  const savePrices = async () => {
    if (!selectedMaterial) return;
    setSavingPrices(true);
    try {
      const preciosObj =
        editPrices.length > 0
          ? editPrices.reduce(
              (acc, { cantidad, precio }) => {
                if (cantidad.trim() && precio.trim()) {
                  acc[cantidad.trim()] = parseFloat(precio);
                }
                return acc;
              },
              {} as Record<string, number>,
            )
          : null;

      const productoId =
        selectedMaterial.producto_id || selectedMaterial.id.split("_")[0];
      await onUpdateMaterial(
        productoId,
        String(selectedMaterial.codigo),
        {
          codigo: selectedMaterial.codigo,
          descripcion: selectedMaterial.descripcion,
          um: selectedMaterial.um,
          precio: selectedMaterial.precio,
          nombre: selectedMaterial.nombre,
          foto: selectedMaterial.foto,
          marca_id: selectedMaterial.marca_id,
          potenciaKW: selectedMaterial.potenciaKW,
          habilitar_venta_web: selectedMaterial.habilitar_venta_web,
          precio_por_cantidad:
            Object.keys(preciosObj || {}).length > 0 ? preciosObj : null,
          especificaciones: selectedMaterial.especificaciones,
        },
        selectedMaterial.categoria,
      );
      setPriceDialogOpen(false);
    } catch (err) {
      console.error("Error saving prices:", err);
    } finally {
      setSavingPrices(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-0 shadow-md border-l-4 border-l-sky-600">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Label
                htmlFor="web-search"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                Buscar Material
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="web-search"
                  placeholder="Buscar por nombre, descripcion o codigo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="lg:w-48">
              <Label
                htmlFor="web-category-filter"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                Categoría
              </Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((cat, idx) => (
                    <SelectItem key={cat || idx} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:w-48">
              <Label
                htmlFor="web-marca-filter"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                Marca
              </Label>
              <Select value={selectedMarca} onValueChange={setSelectedMarca}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {marcas.map((marca: any) => (
                    <SelectItem key={marca.id} value={marca.id}>
                      {marca.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:w-48">
              <Label
                htmlFor="web-status-filter"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                Estado Web
              </Label>
              <Select
                value={webFilter}
                onValueChange={(v) => setWebFilter(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="enabled">Habilitados</SelectItem>
                  <SelectItem value="disabled">No habilitados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <p className="text-sm text-gray-600">
        Mostrando {filteredMaterials.length} de {materials.length} materiales
      </p>

      {/* Cards grid */}
      {filteredMaterials.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron materiales
          </h3>
          <p className="text-gray-600">
            No hay materiales que coincidan con los filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMaterials.map((material) => {
            const key = `${material.producto_id || material.id.split("_")[0]}_${material.codigo}`;
            const isToggling = togglingWeb === key;
            const marcaNombre = getMarcaNombre(material.marca_id);
            const specsCount = material.especificaciones
              ? Object.keys(material.especificaciones).length
              : 0;
            const pricesCount = material.precio_por_cantidad
              ? Object.keys(material.precio_por_cantidad).length
              : 0;

            return (
              <Card
                key={`${material.codigo}-${material.categoria}`}
                className={`border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
                  material.habilitar_venta_web
                    ? "border-l-4 border-l-green-500 border-b-4 border-b-green-500"
                    : "border-l-4 border-l-gray-300"
                }`}
              >
                <CardContent className="p-4">
                  {/* Photo */}
                  <div className="w-full h-40 rounded-lg overflow-hidden bg-gray-100 mb-3 flex items-center justify-center">
                    {material.foto ? (
                      <img
                        src={material.foto}
                        alt={material.nombre || material.descripcion}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          const fallback = (e.target as HTMLImageElement)
                            .nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={`${material.foto ? "hidden" : "flex"} items-center justify-center w-full h-full`}
                    >
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  </div>

                  {/* Name */}
                  <h3
                    className="font-semibold text-gray-900 text-sm truncate mb-1"
                    title={material.nombre || material.descripcion}
                  >
                    {material.nombre || material.descripcion}
                  </h3>

                  {/* Precio base */}
                  <div className="flex items-center gap-1 mb-2">
                    <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {material.precio
                        ? `$${material.precio.toFixed(2)}`
                        : "Sin precio"}
                    </span>
                  </div>

                  {/* Category & Brand badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                    >
                      {material.categoria}
                    </Badge>
                    {marcaNombre && (
                      <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
                      >
                        {marcaNombre}
                      </Badge>
                    )}
                    {material.habilitar_venta_web && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200 text-xs"
                      >
                        Web
                      </Badge>
                    )}
                  </div>

                  {/* Info badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {specsCount > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
                      >
                        {specsCount} espec.
                      </Badge>
                    )}
                    {pricesCount > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                      >
                        {pricesCount} precios
                      </Badge>
                    )}
                  </div>

                  {/* Action icons */}
                  <div className="flex items-center justify-between border-t pt-3">
                    {/* Toggle web */}
                    <button
                      onClick={() => handleToggleWeb(material)}
                      disabled={isToggling}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        material.habilitar_venta_web
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                      title={
                        material.habilitar_venta_web
                          ? "Deshabilitar venta web"
                          : "Habilitar venta web"
                      }
                    >
                      {isToggling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Globe className="h-3.5 w-3.5" />
                      )}
                      {material.habilitar_venta_web ? "On" : "Off"}
                    </button>

                    {/* Specifications */}
                    <button
                      onClick={() => openSpecsDialog(material)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                      title="Especificaciones"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Espec.
                    </button>

                    {/* Price by quantity */}
                    <button
                      onClick={() => openPriceDialog(material)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      title="Precio por cantidad"
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      Precios
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Specifications Dialog */}
      <Dialog open={specsDialogOpen} onOpenChange={setSpecsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Especificaciones -{" "}
              {selectedMaterial?.nombre || selectedMaterial?.descripcion}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editSpecs.map((spec, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Clave (ej: Voltaje)"
                  value={spec.clave}
                  onChange={(e) => {
                    const updated = [...editSpecs];
                    updated[index].clave = e.target.value;
                    setEditSpecs(updated);
                  }}
                  disabled={savingSpecs}
                  className="flex-1"
                />
                <Input
                  placeholder="Valor (ej: 48V)"
                  value={spec.valor}
                  onChange={(e) => {
                    const updated = [...editSpecs];
                    updated[index].valor = e.target.value;
                    setEditSpecs(updated);
                  }}
                  disabled={savingSpecs}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditSpecs(editSpecs.filter((_, i) => i !== index))
                  }
                  disabled={savingSpecs}
                  className="text-red-600 border-red-300 hover:bg-red-50 h-10 w-10 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setEditSpecs([...editSpecs, { clave: "", valor: "" }])
              }
              disabled={savingSpecs}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSpecsDialogOpen(false)}
                disabled={savingSpecs}
              >
                Cancelar
              </Button>
              <Button onClick={saveSpecs} disabled={savingSpecs}>
                {savingSpecs ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price by Quantity Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Precio por Cantidad -{" "}
              {selectedMaterial?.nombre || selectedMaterial?.descripcion}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMaterial?.precio !== undefined && (
              <p className="text-sm text-gray-600">
                Precio base:{" "}
                <strong>${selectedMaterial.precio?.toFixed(2) || "N/A"}</strong>
              </p>
            )}
            {editPrices.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="Cantidad (ej: 10)"
                  value={item.cantidad}
                  onChange={(e) => {
                    const updated = [...editPrices];
                    updated[index].cantidad = e.target.value;
                    setEditPrices(updated);
                  }}
                  disabled={savingPrices}
                  className="flex-1"
                  type="number"
                  min="1"
                />
                <Input
                  placeholder="Precio (ej: 1400.00)"
                  value={item.precio}
                  onChange={(e) => {
                    const updated = [...editPrices];
                    updated[index].precio = e.target.value;
                    setEditPrices(updated);
                  }}
                  disabled={savingPrices}
                  className="flex-1"
                  type="number"
                  step="0.01"
                  min="0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditPrices(editPrices.filter((_, i) => i !== index))
                  }
                  disabled={savingPrices}
                  className="text-red-600 border-red-300 hover:bg-red-50 h-10 w-10 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setEditPrices([...editPrices, { cantidad: "", precio: "" }])
              }
              disabled={savingPrices}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setPriceDialogOpen(false)}
                disabled={savingPrices}
              >
                Cancelar
              </Button>
              <Button onClick={savePrices} disabled={savingPrices}>
                {savingPrices ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
