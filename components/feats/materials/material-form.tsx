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
  FileText,
  Download,
} from "lucide-react";
import { FileUpload } from "@/components/shared/molecule/file-upload";
import type { Material, MaterialFormData } from "@/lib/material-types";
import { useToast } from "@/hooks/use-toast";
import { useMarcas } from "@/hooks/use-marcas";
import { useUploadFoto } from "@/hooks/use-upload-foto";
import { MaterialService } from "@/lib/api-services";

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
    comentario: initialData?.comentario ?? null,
    nombre: initialData?.nombre || "",
    marca_id: initialData?.marca_id || undefined,
    foto: null,
    potenciaKW: initialData?.potenciaKW ?? undefined,
    numero_serie: initialData?.numero_serie ?? null,
    stockaje_minimo: initialData?.stockaje_minimo ?? null,
  });

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(
    initialData?.foto || null,
  );

  // Estado para ficha técnica
  const [fichaTecnicaFile, setFichaTecnicaFile] = useState<File | null>(null);
  const [fichaTecnicaUrl, setFichaTecnicaUrl] = useState<string | null>(
    initialData?.ficha_tecnica_url || null,
  );
  const [cambiarFichaTecnica, setCambiarFichaTecnica] = useState(false);
  const [uploadingFichaTecnica, setUploadingFichaTecnica] = useState(false);
  const [eliminarFichaTecnica, setEliminarFichaTecnica] = useState(false);

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
      comentario: initialData.comentario ?? null,
      nombre: initialData.nombre || "",
      marca_id: initialData.marca_id || undefined,
      foto: null,
      potenciaKW: initialData.potenciaKW ?? undefined,
      numero_serie: initialData.numero_serie ?? null,
      stockaje_minimo: initialData.stockaje_minimo ?? null,
    });
    setFotoUrl(initialData.foto || null);
    setFotoFile(null);
    setFichaTecnicaUrl(initialData.ficha_tecnica_url || null);
    setFichaTecnicaFile(null);
    setCambiarFichaTecnica(false);
    setEliminarFichaTecnica(false);
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

  // Manejar cambio de archivo de ficha técnica
  const handleFichaTecnicaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setFichaTecnicaFile(null);
      return;
    }

    // Validar tipo de archivo (PDF, Word, etc.)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("El archivo debe ser PDF, Word o Excel");
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("La ficha técnica no debe superar 10MB");
      return;
    }

    setFichaTecnicaFile(file);
    setError(null);
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

      // 2. Subir ficha técnica si hay un archivo nuevo
      let finalFichaTecnicaUrl = fichaTecnicaUrl;
      
      // Si se marcó para eliminar, establecer como null
      if (eliminarFichaTecnica) {
        finalFichaTecnicaUrl = null;
      } else if (fichaTecnicaFile) {
        // Si hay un archivo nuevo, subirlo
        try {
          setUploadingFichaTecnica(true);
          finalFichaTecnicaUrl = await MaterialService.uploadFichaTecnica(fichaTecnicaFile);
          setFichaTecnicaUrl(finalFichaTecnicaUrl);
        } catch (uploadErr: any) {
          throw new Error(`Error al subir la ficha técnica: ${uploadErr.message}`);
        } finally {
          setUploadingFichaTecnica(false);
        }
      }

      // 3. Preparar datos del material
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
          comentario: formData.comentario?.trim() || null,
          nombre: formData.nombre,
          foto: finalFotoUrl || undefined,
          ficha_tecnica_url: finalFichaTecnicaUrl !== undefined ? finalFichaTecnicaUrl : undefined,
          ...(requiereMarcaYPotencia && {
            marca_id: formData.marca_id,
            potenciaKW: formData.potenciaKW,
          }),
          // Campos opcionales de inventario
          numero_serie: formData.numero_serie?.trim() || null,
          stockaje_minimo: formData.stockaje_minimo || null,
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
            comentario: null,
            nombre: "",
            marca_id: undefined,
            foto: null,
            potenciaKW: undefined,
            numero_serie: null,
            stockaje_minimo: null,
          });
          setFotoFile(null);

          setFotoUrl(null);
          setFichaTecnicaFile(null);
          setFichaTecnicaUrl(null);
          setEliminarFichaTecnica(false);
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
                disabled={isEditing || isSubmitting || uploadingFoto}
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

          <div>
            <Label
              htmlFor="material-comentario"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Comentario
            </Label>
            <Textarea
              id="material-comentario"
              value={formData.comentario ?? ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  comentario: e.target.value,
                })
              }
              placeholder="Observaciones internas del material"
              rows={2}
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
          <FileUpload
            id="material-foto"
            label="Foto del Producto"
            accept="image/*"
            value={fotoFile}
            onChange={(file) => setFotoFile(file)}
            maxSizeInMB={5}
            showPreview={true}
            disabled={isSubmitting || uploadingFoto}
            currentImageUrl={!fotoFile ? (fotoUrl || undefined) : undefined}
          />

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

          {/* Ficha Técnica del Material */}
          <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <Label className="text-sm font-medium text-purple-900">
                  Ficha Técnica (Opcional)
                </Label>
              </div>
              {isEditing && fichaTecnicaUrl && !cambiarFichaTecnica && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEliminarFichaTecnica(true);
                    setFichaTecnicaUrl(null);
                    setCambiarFichaTecnica(false);
                  }}
                  disabled={isSubmitting || uploadingFichaTecnica}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Quitar Ficha
                </Button>
              )}
            </div>

            {/* Ficha técnica actual (solo en modo edición) */}
            {isEditing && fichaTecnicaUrl && !cambiarFichaTecnica && !eliminarFichaTecnica && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 border-2 border-purple-300 rounded-lg bg-white shadow-sm">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      Ficha técnica adjunta
                    </p>
                    <a
                      href={fichaTecnicaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 mt-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar documento
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCambiarFichaTecnica(true)}
                    disabled={isSubmitting || uploadingFichaTecnica}
                    className="flex-shrink-0"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Cambiar
                  </Button>
                </div>
              </div>
            )}

            {/* Input de archivo (crear o cambiar ficha técnica) */}
            {(!isEditing || !fichaTecnicaUrl || cambiarFichaTecnica || eliminarFichaTecnica) && (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 bg-white hover:border-purple-400 transition-colors">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                      <Upload className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="text-center">
                      <Label
                        htmlFor="ficha-tecnica-input"
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-purple-600"
                      >
                        Seleccionar archivo
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, Word, Excel • Máximo 10MB
                      </p>
                    </div>
                    <Input
                      id="ficha-tecnica-input"
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFichaTecnicaChange}
                      disabled={isSubmitting || uploadingFichaTecnica}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('ficha-tecnica-input')?.click()}
                      disabled={isSubmitting || uploadingFichaTecnica}
                      className="mt-2"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Buscar archivo
                    </Button>
                  </div>
                </div>

                {cambiarFichaTecnica && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCambiarFichaTecnica(false);
                        setFichaTecnicaFile(null);
                        setEliminarFichaTecnica(false);
                      }}
                      disabled={isSubmitting || uploadingFichaTecnica}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEliminarFichaTecnica(true);
                        setFichaTecnicaFile(null);
                        setFichaTecnicaUrl(null);
                        setCambiarFichaTecnica(false);
                      }}
                      disabled={isSubmitting || uploadingFichaTecnica}
                      className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Quitar Ficha
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Archivo seleccionado */}
            {fichaTecnicaFile && (
              <div className="flex items-center gap-3 p-4 border-2 border-green-300 rounded-lg bg-green-50 shadow-sm">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {fichaTecnicaFile.name}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {(fichaTecnicaFile.size / 1024 / 1024).toFixed(2)} MB • Listo para subir
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFichaTecnicaFile(null);
                    const input = document.getElementById('ficha-tecnica-input') as HTMLInputElement;
                    if (input) input.value = '';
                  }}
                  disabled={isSubmitting || uploadingFichaTecnica}
                  className="flex-shrink-0 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Indicador de eliminación */}
            {eliminarFichaTecnica && !fichaTecnicaFile && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                  La ficha técnica será eliminada al guardar
                </span>
              </div>
            )}

            {/* Indicador de subida */}
            {uploadingFichaTecnica && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">
                  Subiendo ficha técnica...
                </span>
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

          {/* Campos opcionales de inventario */}
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">
                Información de Inventario
              </h3>
            </div>
            <p className="text-sm text-green-700">
              Gestión de inventario y control de stock.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Número de Serie */}
              <div>
                <Label
                  htmlFor="material-numero-serie"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Número de Serie
                </Label>
                <Input
                  id="material-numero-serie"
                  value={formData.numero_serie ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numero_serie: e.target.value || null,
                    })
                  }
                  placeholder="Ej: SN-2026-ABC123"
                  disabled={isSubmitting || uploadingFoto}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Código alfanumérico único del material
                </p>
              </div>

              {/* Stockaje Mínimo */}
              <div>
                <Label
                  htmlFor="material-stockaje-minimo"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Stockaje Mínimo
                </Label>
                <Input
                  id="material-stockaje-minimo"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.stockaje_minimo ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      stockaje_minimo:
                        value === "" ? null : parseInt(value) || 0,
                    });
                  }}
                  placeholder="Ej: 10"
                  disabled={isSubmitting || uploadingFoto}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cantidad mínima requerida en almacenes
                </p>
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
