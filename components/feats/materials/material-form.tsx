"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shared/molecule/dialog";
import { Switch } from "@/components/shared/molecule/switch";
import {
  Save,
  X,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import type { Material, MaterialFormData } from "@/lib/material-types";
import { useToast } from "@/hooks/use-toast";
import { useMarcas } from "@/hooks/use-marcas";
import { useUploadFoto } from "@/hooks/use-upload-foto";

interface MaterialFormProps {
  initialData?: Material;
  onSubmit?: (material: Material | Omit<Material, "id">) => void;
  onCancel: () => void;
  onClose?: () => void;
  existingCategories: string[];
  existingUnits: string[];
  isEditing?: boolean;
}

export function MaterialForm({
  initialData,
  onSubmit,
  onCancel,
  onClose,
  existingCategories,
  existingUnits,
  isEditing = false,
}: MaterialFormProps) {
  const { toast } = useToast();
  const { marcasSimplificadas, loading: loadingMarcas } = useMarcas();
  const {
    uploadFoto,
    uploading: uploadingFoto,
    error: uploadError,
  } = useUploadFoto();

  const [formData, setFormData] = useState<MaterialFormData>({
    codigo: initialData?.codigo.toString() || "",
    categoria: initialData?.categoria || "",
    descripcion: initialData?.descripcion || "",
    um: initialData?.um || "",
    precio: initialData?.precio ?? undefined,
    nombre: initialData?.nombre || "",
    marca_id: initialData?.marca_id || undefined,
    foto: null,
    potenciaKW: initialData?.potenciaKW ?? undefined,
  });

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(
    initialData?.foto || null,
  );
  const [fotoUrl, setFotoUrl] = useState<string | null>(
    initialData?.foto || null,
  );
  const [cambiarFoto, setCambiarFoto] = useState(false);

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddUnitDialogOpen, setIsAddUnitDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [localCategories, setLocalCategories] = useState(existingCategories);
  const [localUnits, setLocalUnits] = useState(existingUnits);
  const [isNewCategory, setIsNewCategory] = useState(false);

  // Campos opcionales para web
  const [habilitarVentaWeb, setHabilitarVentaWeb] = useState(
    initialData?.habilitar_venta_web ?? false,
  );
  const [precioPorCantidad, setPrecioPorCantidad] = useState<
    { cantidad: string; precio: string }[]
  >(
    initialData?.precio_por_cantidad
      ? Object.entries(initialData.precio_por_cantidad).map(
          ([cantidad, precio]) => ({ cantidad, precio: String(precio) }),
        )
      : [],
  );
  const [especificaciones, setEspecificaciones] = useState<
    { clave: string; valor: string }[]
  >(
    initialData?.especificaciones
      ? Object.entries(initialData.especificaciones).map(([clave, valor]) => ({
          clave,
          valor,
        }))
      : [],
  );

  useEffect(() => {
    if (!initialData) return;

    setFormData({
      codigo: initialData.codigo?.toString() || "",
      categoria: initialData.categoria || "",
      descripcion: initialData.descripcion || "",
      um: initialData.um || "",
      precio: initialData.precio ?? undefined,
      nombre: initialData.nombre || "",
      marca_id: initialData.marca_id || undefined,
      foto: null,
      potenciaKW: initialData.potenciaKW ?? undefined,
    });
    setFotoUrl(initialData.foto || null);
    setFotoPreview(initialData.foto || null);
    setCambiarFoto(false);
    setHabilitarVentaWeb(initialData.habilitar_venta_web ?? false);
    setPrecioPorCantidad(
      initialData.precio_por_cantidad
        ? Object.entries(initialData.precio_por_cantidad).map(
            ([cantidad, precio]) => ({ cantidad, precio: String(precio) }),
          )
        : [],
    );
    setEspecificaciones(
      initialData.especificaciones
        ? Object.entries(initialData.especificaciones).map(
            ([clave, valor]) => ({ clave, valor }),
          )
        : [],
    );
  }, [initialData]);

  // Sincronizar categorías cuando cambien desde el padre
  useEffect(() => {
    setLocalCategories(existingCategories);
  }, [existingCategories]);

  // Sincronizar unidades cuando cambien desde el padre
  useEffect(() => {
    setLocalUnits(existingUnits);
  }, [existingUnits]);

  // Categorías que requieren marca y potencia
  const categoriasEspeciales = ["BATERÍAS", "INVERSORES", "PANELES"];
  const requiereMarcaYPotencia = categoriasEspeciales.includes(
    formData.categoria,
  );

  // Filtrar marcas según la categoría seleccionada
  const marcasFiltradas = marcasSimplificadas.filter((marca) =>
    marca.tipos_material.includes(formData.categoria as any),
  );

  // Manejar cambio de archivo de foto
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setFotoFile(null);
      setFotoPreview(fotoUrl);
      return;
    }

    // Validar que sea imagen
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen");
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no debe superar 5MB");
      return;
    }

    setFotoFile(file);
    setError(null);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.codigo.trim()) {
      newErrors.codigo = "El código es requerido";
    }
    if (!formData.categoria) {
      newErrors.categoria = "Selecciona una categoría";
    }
    if (!formData.descripcion.trim()) {
      newErrors.descripcion = "La descripción es requerida";
    }
    if (!formData.um) {
      newErrors.um = "Selecciona una unidad de medida";
    }

    // Validar marca y potencia solo para categorías especiales
    if (requiereMarcaYPotencia) {
      if (!formData.marca_id) {
        newErrors.marca_id = "La marca es requerida para esta categoría";
      }
      if (!formData.potenciaKW || formData.potenciaKW <= 0) {
        newErrors.potenciaKW =
          "La potencia en KW es requerida para esta categoría";
      }
    }

    setError(null);
    return Object.keys(newErrors).length === 0 ? null : newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    const errors = validateForm();
    if (errors) {
      setError("Por favor completa todos los campos correctamente.");
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Subir foto si hay un archivo nuevo
      let finalFotoUrl = fotoUrl;
      if (fotoFile) {
        try {
          finalFotoUrl = await uploadFoto(fotoFile);
          setFotoUrl(finalFotoUrl);
        } catch (uploadErr: any) {
          throw new Error(`Error al subir la foto: ${uploadErr.message}`);
        }
      }

      // 2. Preparar datos del material
      if (onSubmit) {
        // Construir precio_por_cantidad como Record o null
        const precioPorCantidadObj =
          precioPorCantidad.length > 0
            ? precioPorCantidad.reduce(
                (acc, { cantidad, precio }) => {
                  if (cantidad.trim() && precio.trim()) {
                    acc[cantidad.trim()] = parseFloat(precio);
                  }
                  return acc;
                },
                {} as Record<string, number>,
              )
            : null;

        // Construir especificaciones como Record o null
        const especificacionesObj =
          especificaciones.length > 0
            ? especificaciones.reduce(
                (acc, { clave, valor }) => {
                  if (clave.trim() && valor.trim()) {
                    acc[clave.trim()] = valor.trim();
                  }
                  return acc;
                },
                {} as Record<string, string>,
              )
            : null;

        const materialData = {
          codigo: formData.codigo,
          categoria: formData.categoria,
          descripcion: formData.descripcion,
          um: formData.um,
          precio: formData.precio,
          nombre: formData.nombre,
          foto: finalFotoUrl || undefined,
          ...(requiereMarcaYPotencia && {
            marca_id: formData.marca_id,
            potenciaKW: formData.potenciaKW,
          }),
          // Campos opcionales para web
          habilitar_venta_web: habilitarVentaWeb,
          precio_por_cantidad:
            Object.keys(precioPorCantidadObj || {}).length > 0
              ? precioPorCantidadObj
              : null,
          especificaciones:
            Object.keys(especificacionesObj || {}).length > 0
              ? especificacionesObj
              : null,
          // Datos adicionales para nueva categoría
          ...(isNewCategory && {
            isNewCategory: true,
          }),
        };
        await onSubmit(materialData as any);
        if (!isEditing) {
          setFormData({
            codigo: "",
            categoria: "",
            descripcion: "",
            um: "",
            precio: undefined,
            nombre: "",
            marca_id: undefined,
            foto: null,
            potenciaKW: undefined,
          });
          setFotoFile(null);
          setFotoPreview(null);
          setFotoUrl(null);
          setIsNewCategory(false);
          setHabilitarVentaWeb(false);
          setPrecioPorCantidad([]);
          setEspecificaciones([]);
        }
        if (onClose) onClose();
      }
    } catch (err: any) {
      const errorMessage =
        err.message ||
        (isEditing
          ? "Error al actualizar el material"
          : "Error al guardar el material");
      setError(errorMessage);
      // Solo mostrar toast si no es edición (el padre ya maneja los toasts para edición)
      if (!isEditing) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addNewCategory = async () => {
    if (newCategory.trim() && !localCategories.includes(newCategory.trim())) {
      setIsCreatingCategory(true);
      try {
        // Actualizar localmente y marcar como nueva categoría
        const trimmedCategory = newCategory.trim();
        setLocalCategories([...localCategories, trimmedCategory]);
        setFormData({ ...formData, categoria: trimmedCategory });
        setNewCategory("");
        setIsAddCategoryDialogOpen(false);
        setIsNewCategory(true); // Marcar como nueva categoría
      } catch (err: any) {
        setError(err.message || "Error al crear la categoría");
      } finally {
        setIsCreatingCategory(false);
      }
    }
  };

  const addNewUnit = () => {
    if (newUnit.trim() && !localUnits.includes(newUnit.trim())) {
      const trimmedUnit = newUnit.trim();
      const updatedUnits = [...localUnits, trimmedUnit];
      setLocalUnits(updatedUnits);
      setFormData({ ...formData, um: trimmedUnit });
      setNewUnit("");
      setIsAddUnitDialogOpen(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Código */}
            <div>
              <Label
                htmlFor="material-codigo"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                Código *
              </Label>
              <Input
                id="material-codigo"
                value={formData.codigo}
                onChange={(e) =>
                  setFormData({ ...formData, codigo: e.target.value })
                }
                placeholder="Ej: ABC123 o 5401090096"
                className={error && !formData.codigo ? "border-red-300" : ""}
                disabled={isSubmitting || uploadingFoto}
              />
            </div>

            {/* Nombre */}
            <div>
              <Label
                htmlFor="material-nombre"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                Nombre del Producto
              </Label>
              <Input
                id="material-nombre"
                value={formData.nombre || ""}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: Huawei SUN2000-10KTL-M1"
                disabled={isSubmitting || uploadingFoto}
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <Label
              htmlFor="material-descripcion"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Descripción *
            </Label>
            <Textarea
              id="material-descripcion"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Ej: Estructura para montaje de módulo fotovoltáico..."
              className={error && !formData.descripcion ? "border-red-300" : ""}
              rows={3}
              disabled={isSubmitting || uploadingFoto}
            />
          </div>

          {/* Categoría */}
          <div>
            <Label
              htmlFor="material-categoria"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Categoría *
            </Label>
            <div className="flex space-x-2">
              <Select
                value={formData.categoria}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    categoria: value,
                    // Limpiar marca y potencia si cambia a una categoría que no los requiere
                    ...(!categoriasEspeciales.includes(value) && {
                      marca_id: undefined,
                      potenciaKW: undefined,
                    }),
                  });
                  // Detectar si es una categoría existente o nueva
                  setIsNewCategory(!localCategories.includes(value));
                }}
              >
                <SelectTrigger
                  className={`flex-1 ${error && !formData.categoria ? "border-red-300" : ""}`}
                  disabled={isSubmitting || uploadingFoto}
                >
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {localCategories.map((category, idx) => (
                    <SelectItem key={category || idx} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog
                open={isAddCategoryDialogOpen}
                onOpenChange={setIsAddCategoryDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting || uploadingFoto}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Nueva Categoría</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor="new-category"
                        className="text-sm font-medium text-gray-700 mb-2 block"
                      >
                        Nombre de la Categoría
                      </Label>
                      <Input
                        id="new-category"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Ej: ESTRUCTURAS"
                        disabled={isCreatingCategory}
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddCategoryDialogOpen(false)}
                        disabled={isCreatingCategory}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={addNewCategory}
                        disabled={isCreatingCategory || !newCategory.trim()}
                      >
                        {isCreatingCategory ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Agregar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Campos técnicos SOLO para BATERÍAS, INVERSORES y PANELES */}
          {requiereMarcaYPotencia && (
            <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-amber-900">
                  Información Técnica Requerida
                </h3>
              </div>
              <p className="text-sm text-amber-700">
                Esta categoría requiere información técnica adicional.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Potencia */}
                <div>
                  <Label
                    htmlFor="material-potencia"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Potencia (KW) *
                  </Label>
                  <Input
                    id="material-potencia"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.potenciaKW ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        potenciaKW:
                          value === "" ? undefined : parseFloat(value) || 0,
                      });
                    }}
                    placeholder="Ej: 10.0"
                    className={
                      error && !formData.potenciaKW ? "border-red-300" : ""
                    }
                    disabled={isSubmitting || uploadingFoto}
                  />
                </div>

                {/* Marca */}
                <div>
                  <Label
                    htmlFor="material-marca"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                  >
                    Marca *
                  </Label>
                  <Select
                    value={formData.marca_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, marca_id: value })
                    }
                    disabled={loadingMarcas || isSubmitting || uploadingFoto}
                  >
                    <SelectTrigger
                      className={`${error && !formData.marca_id ? "border-red-300" : ""}`}
                    >
                      <SelectValue
                        placeholder={
                          loadingMarcas
                            ? "Cargando marcas..."
                            : "Seleccionar marca"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {marcasFiltradas.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          No hay marcas disponibles para esta categoría
                        </div>
                      ) : (
                        marcasFiltradas.map((marca) => (
                          <SelectItem key={marca.id} value={marca.id}>
                            {marca.nombre}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Foto del Material */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Foto del Producto
            </Label>

            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Foto actual (solo en modo edición) */}
              {isEditing && fotoUrl && !cambiarFoto && (
                <div className="space-y-3">
                  <div className="relative w-48 h-48 border-2 border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={fotoUrl}
                      alt="Foto actual"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCambiarFoto(true)}
                    disabled={isSubmitting || uploadingFoto}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Cambiar Foto
                  </Button>
                </div>
              )}

              {/* Input de archivo (crear o cambiar foto) */}
              {(!isEditing || !fotoUrl || cambiarFoto) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      disabled={isSubmitting || uploadingFoto}
                      className="flex-1"
                    />
                    {cambiarFoto && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCambiarFoto(false);
                          setFotoFile(null);
                          setFotoPreview(fotoUrl);
                        }}
                        disabled={isSubmitting || uploadingFoto}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Formatos: JPG, PNG, GIF. Máximo 5MB
                  </p>
                </div>
              )}

              {/* Preview de la foto */}
              {fotoPreview && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Vista Previa
                  </Label>
                  <div className="relative w-48 h-48 border-2 border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={fotoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Indicador de subida */}
            {uploadingFoto && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Subiendo foto...</span>
              </div>
            )}

            {/* Error de subida */}
            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Precio y Unidad de Medida */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Precio */}
            <div>
              <Label
                htmlFor="material-precio"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                Precio
              </Label>
              <Input
                id="material-precio"
                type="number"
                step="0.01"
                min="0"
                value={formData.precio ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({
                    ...formData,
                    precio: value === "" ? undefined : parseFloat(value) || 0,
                  });
                }}
                placeholder="0.00"
                disabled={isSubmitting || uploadingFoto}
              />
            </div>

            {/* Unidad de Medida */}
            <div>
              <Label
                htmlFor="material-um"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                Unidad de Medida *
              </Label>
              <div className="flex space-x-2">
                <Select
                  value={formData.um}
                  onValueChange={(value) =>
                    setFormData({ ...formData, um: value })
                  }
                >
                  <SelectTrigger
                    className={`flex-1 ${error && !formData.um ? "border-red-300" : ""}`}
                    disabled={isSubmitting || uploadingFoto}
                  >
                    <SelectValue placeholder="Seleccionar unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {localUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog
                  open={isAddUnitDialogOpen}
                  onOpenChange={setIsAddUnitDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting || uploadingFoto}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Nueva Unidad de Medida</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="new-unit"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          Unidad de Medida
                        </Label>
                        <Input
                          id="new-unit"
                          value={newUnit}
                          onChange={(e) => setNewUnit(e.target.value)}
                          placeholder="Ej: u, m, kg, etc."
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddUnitDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          onClick={addNewUnit}
                          disabled={!newUnit.trim()}
                        >
                          <Plus className="h-4 w-4" />
                          Agregar
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Campos opcionales para web */}
          <div className="space-y-4 p-4 bg-sky-50 rounded-lg border border-sky-200">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-sky-600" />
              <h3 className="text-lg font-semibold text-sky-900">
                Campos Opcionales para Web
              </h3>
            </div>
            <p className="text-sm text-sky-700">
              Configura estos campos si deseas mostrar este material en la
              tienda web.
            </p>

            <div className="space-y-4">
              {/* Toggle habilitar venta web */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="habilitar-venta-web"
                  checked={habilitarVentaWeb}
                  onCheckedChange={setHabilitarVentaWeb}
                  disabled={isSubmitting}
                />
                <Label htmlFor="habilitar-venta-web" className="cursor-pointer">
                  Habilitar venta web
                </Label>
              </div>

              {/* Especificaciones */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Especificaciones
                </Label>
                {especificaciones.map((spec, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Clave (ej: Voltaje)"
                      value={spec.clave}
                      onChange={(e) => {
                        const updated = [...especificaciones];
                        updated[index].clave = e.target.value;
                        setEspecificaciones(updated);
                      }}
                      disabled={isSubmitting}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Valor (ej: 48V)"
                      value={spec.valor}
                      onChange={(e) => {
                        const updated = [...especificaciones];
                        updated[index].valor = e.target.value;
                        setEspecificaciones(updated);
                      }}
                      disabled={isSubmitting}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setEspecificaciones(
                          especificaciones.filter((_, i) => i !== index),
                        )
                      }
                      disabled={isSubmitting}
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
                    setEspecificaciones([
                      ...especificaciones,
                      { clave: "", valor: "" },
                    ])
                  }
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Especificacion
                </Button>
              </div>

              {/* Precio por cantidad */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Precio por Cantidad
                </Label>
                {precioPorCantidad.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      placeholder="Cantidad (ej: 10)"
                      value={item.cantidad}
                      onChange={(e) => {
                        const updated = [...precioPorCantidad];
                        updated[index].cantidad = e.target.value;
                        setPrecioPorCantidad(updated);
                      }}
                      disabled={isSubmitting}
                      className="flex-1"
                      type="number"
                      min="1"
                    />
                    <Input
                      placeholder="Precio (ej: 1400.00)"
                      value={item.precio}
                      onChange={(e) => {
                        const updated = [...precioPorCantidad];
                        updated[index].precio = e.target.value;
                        setPrecioPorCantidad(updated);
                      }}
                      disabled={isSubmitting}
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
                        setPrecioPorCantidad(
                          precioPorCantidad.filter((_, i) => i !== index),
                        )
                      }
                      disabled={isSubmitting}
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
                    setPrecioPorCantidad([
                      ...precioPorCantidad,
                      { cantidad: "", precio: "" },
                    ])
                  }
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Precio
                </Button>
              </div>
            </div>
          </div>
        </div>
        {error && (
          <div className="flex items-center text-red-600 mt-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>{error}</span>
          </div>
        )}
        {success && !isEditing && (
          <div className="flex items-center text-green-600 mt-2">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            <span>{success}</span>
          </div>
        )}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose || onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar
          </Button>
        </div>
      </form>
    </>
  );
}
