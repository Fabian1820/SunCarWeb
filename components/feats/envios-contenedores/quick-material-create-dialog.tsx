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
import {
  Loader2,
  Package,
  Plus,
  Upload,
  FileText,
  X,
  AlertCircle,
} from "lucide-react";
import type { Material } from "@/lib/material-types";
import { useMarcas } from "@/hooks/use-marcas";
import { useUploadFoto } from "@/hooks/use-upload-foto";
import { FileUpload } from "@/components/shared/molecule/file-upload";
import { MarcaForm } from "@/components/feats/materials/marca-form";
import { MaterialService } from "@/lib/api-services";
import type {
  MarcaCreateRequest,
  MarcaUpdateRequest,
} from "@/lib/types/feats/marcas/marca-types";

const CATEGORIAS_ESPECIALES = ["BATERÍAS", "INVERSORES", "PANELES"];
const DEFAULT_UNITS = ["u", "m", "kg", "L"];
const FICHA_TECNICA_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export interface QuickMaterialData {
  codigo: string;
  categoria: string;
  descripcion: string;
  um: string;
  nombre?: string;
  marca_id?: string;
  potenciaKW?: number;
  foto?: string;
  ficha_tecnica_url?: string | null;
  /** True si la categoría no existía previamente y debe crearse. */
  isNewCategory?: boolean;
}

interface QuickMaterialCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  units: string[];
  onSubmit: (data: QuickMaterialData) => Promise<Material>;
  onCreated: (material: Material) => void;
}

export function QuickMaterialCreateDialog({
  open,
  onOpenChange,
  categories,
  units,
  onSubmit,
  onCreated,
}: QuickMaterialCreateDialogProps) {
  const {
    marcasSimplificadas,
    loading: loadingMarcas,
    createMarca,
    loadMarcas,
  } = useMarcas();
  const { uploadFoto, uploading: uploadingFoto } = useUploadFoto();

  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nombre, setNombre] = useState("");
  const [um, setUm] = useState("");
  const [marcaId, setMarcaId] = useState<string | undefined>(undefined);
  const [potenciaKW, setPotenciaKW] = useState<string>("");

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fichaFile, setFichaFile] = useState<File | null>(null);
  const [uploadingFicha, setUploadingFicha] = useState(false);

  const [localCategories, setLocalCategories] = useState<string[]>(categories);
  const [localUnits, setLocalUnits] = useState<string[]>([]);
  const [newCategoriesSet, setNewCategoriesSet] = useState<Set<string>>(new Set());

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [addMarcaOpen, setAddMarcaOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [creatingMarca, setCreatingMarca] = useState(false);

  const requiereTecnica = CATEGORIAS_ESPECIALES.includes(categoria);

  // ───── sync local lists con props ─────
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    const all = new Set<string>([...DEFAULT_UNITS, ...units.filter(Boolean)]);
    setLocalUnits(Array.from(all).sort());
  }, [units]);

  // ───── reset al abrir/cerrar ─────
  useEffect(() => {
    if (!open) return;
    setCodigo("");
    setCategoria("");
    setDescripcion("");
    setNombre("");
    setUm("");
    setMarcaId(undefined);
    setPotenciaKW("");
    setFotoFile(null);
    setFichaFile(null);
    setError(null);
    setNewCategoriesSet(new Set());
    setNewCategory("");
    setNewUnit("");
  }, [open]);

  useEffect(() => {
    if (!requiereTecnica) {
      setMarcaId(undefined);
      setPotenciaKW("");
    }
  }, [requiereTecnica]);

  const marcasFiltradas = marcasSimplificadas.filter((marca) =>
    marca.tipos_material.includes(categoria as any),
  );

  // ───── handlers ─────
  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (localCategories.includes(trimmed)) {
      setError(`La categoría "${trimmed}" ya existe.`);
      return;
    }
    setLocalCategories((prev) => [...prev, trimmed]);
    setNewCategoriesSet((prev) => new Set(prev).add(trimmed));
    setCategoria(trimmed);
    setNewCategory("");
    setAddCategoryOpen(false);
  };

  const handleAddUnit = () => {
    const trimmed = newUnit.trim();
    if (!trimmed) return;
    if (localUnits.includes(trimmed)) {
      setError(`La unidad "${trimmed}" ya existe.`);
      return;
    }
    setLocalUnits((prev) => [...prev, trimmed].sort());
    setUm(trimmed);
    setNewUnit("");
    setAddUnitOpen(false);
  };

  const handleAddMarca = async (
    data: MarcaCreateRequest | MarcaUpdateRequest,
  ) => {
    setCreatingMarca(true);
    try {
      const createData = data as MarcaCreateRequest;
      const nombreNuevo = createData.nombre.trim();
      const ok = await createMarca(createData);
      if (!ok) throw new Error("No se pudo crear la marca.");
      await loadMarcas();
      // El hook loadMarcas actualiza marcasSimplificadas; buscamos por nombre.
      const reloaded = await import("@/lib/services/feats/marcas/marca-service").then(
        (m) => m.MarcaService.getMarcasSimplificadas(),
      );
      const creada = reloaded.find(
        (m) => m.nombre.trim().toLowerCase() === nombreNuevo.toLowerCase(),
      );
      if (creada) {
        setMarcaId(creada.id);
      }
      setAddMarcaOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la marca.");
    } finally {
      setCreatingMarca(false);
    }
  };

  const handleFichaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFichaFile(null);
      return;
    }
    if (!FICHA_TECNICA_TYPES.includes(file.type)) {
      setError("La ficha técnica debe ser PDF, Word o Excel.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("La ficha técnica no debe superar 10MB.");
      return;
    }
    setFichaFile(file);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!codigo.trim()) return setError("El código es obligatorio.");
    if (!categoria) return setError("Selecciona una categoría.");
    if (!descripcion.trim()) return setError("La descripción es obligatoria.");
    if (!um.trim()) return setError("La unidad de medida es obligatoria.");
    if (requiereTecnica) {
      if (!marcaId) return setError("La marca es obligatoria para esta categoría.");
      const pot = parseFloat(potenciaKW);
      if (!Number.isFinite(pot) || pot <= 0) {
        return setError("La potencia (kW) es obligatoria.");
      }
    }

    setSubmitting(true);
    try {
      let fotoUrl: string | undefined;
      if (fotoFile) {
        fotoUrl = await uploadFoto(fotoFile);
      }

      let fichaUrl: string | null | undefined;
      if (fichaFile) {
        setUploadingFicha(true);
        try {
          fichaUrl = await MaterialService.uploadFichaTecnica(fichaFile);
        } finally {
          setUploadingFicha(false);
        }
      }

      const material = await onSubmit({
        codigo: codigo.trim(),
        categoria,
        descripcion: descripcion.trim(),
        um: um.trim(),
        nombre: nombre.trim() || undefined,
        marca_id: requiereTecnica ? marcaId : undefined,
        potenciaKW: requiereTecnica ? parseFloat(potenciaKW) : undefined,
        foto: fotoUrl,
        ficha_tecnica_url: fichaUrl,
        isNewCategory: newCategoriesSet.has(categoria),
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
      <DialogContent className="max-w-2xl p-0 gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-lg sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 shrink-0">
              <Package className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">
                Crear material rápido
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Quedará agregado al envío al crearlo.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* Código + Nombre */}
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

          {/* Descripción */}
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

          {/* Categoría + Unidad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Categoría <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {localCategories.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">Sin categorías</div>
                    ) : (
                      localCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                          {newCategoriesSet.has(c) ? (
                            <span className="ml-1 text-xs text-emerald-600">
                              (nueva)
                            </span>
                          ) : null}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setAddCategoryOpen(true)}
                  title="Agregar nueva categoría"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Unidad de medida <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Select value={um} onValueChange={setUm}>
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {localUnits.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setAddUnitOpen(true)}
                  title="Agregar nueva unidad"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Foto */}
          <div className="space-y-1.5">
            <FileUpload
              id="qm-foto"
              label="Foto del producto"
              accept="image/*"
              value={fotoFile}
              onChange={(file) => setFotoFile(file as File | null)}
              maxSizeInMB={5}
              showPreview={true}
              disabled={submitting || uploadingFoto}
            />
            {uploadingFoto ? (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Subiendo foto…</span>
              </div>
            ) : null}
          </div>

          {/* Ficha técnica */}
          <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              <Label className="text-sm font-medium text-purple-900">
                Ficha técnica (opcional)
              </Label>
            </div>

            {!fichaFile ? (
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-white">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Upload className="h-6 w-6 text-purple-600" />
                  <p className="text-xs text-gray-500">
                    PDF, Word o Excel · Máximo 10MB
                  </p>
                  <Input
                    id="qm-ficha-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFichaChange}
                    disabled={submitting || uploadingFicha}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById("qm-ficha-input")?.click()
                    }
                    disabled={submitting || uploadingFicha}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Buscar archivo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 border border-green-300 rounded-lg bg-green-50">
                <FileText className="h-5 w-5 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fichaFile.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {(fichaFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFichaFile(null);
                    const input = document.getElementById(
                      "qm-ficha-input",
                    ) as HTMLInputElement | null;
                    if (input) input.value = "";
                  }}
                  disabled={submitting || uploadingFicha}
                  className="text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {uploadingFicha ? (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Subiendo ficha técnica…</span>
              </div>
            ) : null}
          </div>

          {/* Información técnica (solo categorías especiales) */}
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
                  <div className="flex gap-2">
                    <Select
                      value={marcaId}
                      onValueChange={setMarcaId}
                      disabled={loadingMarcas}
                    >
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue
                          placeholder={loadingMarcas ? "Cargando..." : "Seleccionar..."}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {marcasFiltradas.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500">
                            No hay marcas para esta categoría
                          </div>
                        ) : (
                          marcasFiltradas.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nombre}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setAddMarcaOpen(true)}
                      title="Crear nueva marca"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error ? (
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : null}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-lg flex justify-end gap-2 sticky bottom-0">
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
            disabled={submitting || uploadingFoto || uploadingFicha}
            className="px-5 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear material
          </Button>
        </div>

        {/* Sub-dialog: nueva categoría */}
        <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar nueva categoría</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="new-cat">Nombre</Label>
              <Input
                id="new-cat"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Ej: ESTRUCTURAS"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                }}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddCategoryOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim()}
                >
                  Agregar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sub-dialog: nueva unidad */}
        <Dialog open={addUnitOpen} onOpenChange={setAddUnitOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar nueva unidad de medida</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="new-um">Unidad</Label>
              <Input
                id="new-um"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="Ej: u, m, kg, L"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddUnit();
                }}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddUnitOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleAddUnit}
                  disabled={!newUnit.trim()}
                >
                  Agregar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sub-dialog: nueva marca */}
        <Dialog open={addMarcaOpen} onOpenChange={setAddMarcaOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear nueva marca</DialogTitle>
            </DialogHeader>
            <MarcaForm
              onSubmit={handleAddMarca}
              onCancel={() => setAddMarcaOpen(false)}
            />
            {creatingMarca ? (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Creando marca…</span>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
