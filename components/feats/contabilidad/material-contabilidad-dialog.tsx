"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { SearchableSelect } from "@/components/shared/molecule/searchable-select"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Save, X } from "lucide-react"
import type { Material } from "@/lib/api-types"
import type { MaterialContabilidad } from "@/lib/types/feats/contabilidad/contabilidad-types"

export interface DatosMaterialContabilidad {
  codigo_contabilidad: string
  nombre: string
  descripcion: string
  um: string
  cantidad: number
  precio: number
  material_catalogo_id: string | null
}

interface MaterialContabilidadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = alta; con material = edición */
  material: MaterialContabilidad | null
  /** Catálogo del sistema, solo para el enlace opcional */
  materialesCatalogo: Material[]
  onSubmit: (datos: DatosMaterialContabilidad) => Promise<void>
  loading: boolean
}

const VACIO: DatosMaterialContabilidad = {
  codigo_contabilidad: "",
  nombre: "",
  descripcion: "",
  um: "u",
  cantidad: 0,
  precio: 0,
  material_catalogo_id: null,
}

export function MaterialContabilidadDialog({
  open,
  onOpenChange,
  material,
  materialesCatalogo,
  onSubmit,
  loading,
}: MaterialContabilidadDialogProps) {
  const esEdicion = material !== null
  const [datos, setDatos] = useState<DatosMaterialContabilidad>(VACIO)
  const [errores, setErrores] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setErrores({})
    setDatos(
      material
        ? {
            codigo_contabilidad: material.codigoContabilidad || "",
            nombre: material.nombre || "",
            descripcion: material.descripcion || "",
            um: material.um || "u",
            cantidad: material.cantidadContabilidad ?? 0,
            precio: material.precioContabilidad ?? 0,
            material_catalogo_id: material.materialCatalogoId ?? null,
          }
        : VACIO
    )
  }, [open, material])

  const opcionesCatalogo = useMemo(
    () => [
      { value: "", label: "Sin vincular" },
      ...materialesCatalogo
        .filter((m) => m.codigo)
        .map((m) => ({
          value: String(m.id || m.codigo),
          label: `${m.codigo} — ${m.nombre || m.descripcion || "Material"}`,
        })),
    ],
    [materialesCatalogo]
  )

  // El catálogo es un ATAJO al dar de alta, no un vínculo que se añade después:
  // rellena lo que ya está escrito en otro sitio para no teclearlo de nuevo.
  // Lo que no se toca es el precio: el del catálogo está en USD y este va en CUP.
  const tomarDelCatalogo = (idCatalogo: string) => {
    if (!idCatalogo) {
      setDatos((prev) => ({ ...prev, material_catalogo_id: null }))
      return
    }
    const encontrado = materialesCatalogo.find((m) => String(m.id) === idCatalogo)
    if (!encontrado) return
    setDatos((prev) => ({
      ...prev,
      material_catalogo_id: idCatalogo,
      nombre: String(encontrado.nombre || encontrado.descripcion || prev.nombre),
      descripcion: String(encontrado.descripcion || prev.descripcion),
      um: String(encontrado.um || prev.um),
    }))
    setErrores({})
  }

  const validar = () => {
    const nuevos: Record<string, string> = {}
    if (!datos.codigo_contabilidad.trim()) {
      nuevos.codigo_contabilidad = "El código de contabilidad es obligatorio"
    }
    if (!datos.nombre.trim()) {
      nuevos.nombre = "El nombre es obligatorio"
    }
    if (!Number.isFinite(datos.cantidad) || datos.cantidad < 0) {
      nuevos.cantidad = "La cantidad no puede ser negativa"
    }
    if (!Number.isFinite(datos.precio) || datos.precio < 0) {
      nuevos.precio = "El precio no puede ser negativo"
    }
    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  const enviar = async () => {
    if (!validar()) return
    await onSubmit({
      ...datos,
      codigo_contabilidad: datos.codigo_contabilidad.trim(),
      nombre: datos.nombre.trim(),
      material_catalogo_id: datos.material_catalogo_id || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? "Editar material de contabilidad" : "Agregar material a contabilidad"}
          </DialogTitle>
          <DialogDescription>
            No hace falta que el material exista en el catálogo del sistema. Use el
            código y el nombre con los que trabaja contabilidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!esEdicion && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
              <Label>¿Está en el catálogo del sistema?</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">
                Búsquelo y se rellenan solos el nombre, la unidad y la descripción.
                Si no está, deje esto en blanco y escríbalo usted.
              </p>
              <SearchableSelect
                options={opcionesCatalogo}
                value={datos.material_catalogo_id || ""}
                onValueChange={tomarDelCatalogo}
                placeholder="Buscar en el catálogo (opcional)"
                searchPlaceholder="Buscar por código o nombre..."
                disabled={loading}
              />
              {datos.material_catalogo_id && (
                <p className="text-xs text-emerald-700 mt-2">
                  Datos tomados del catálogo. Puede corregirlos abajo antes de guardar.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="codigo_contabilidad">
                Código de contabilidad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="codigo_contabilidad"
                value={datos.codigo_contabilidad}
                onChange={(e) => setDatos({ ...datos, codigo_contabilidad: e.target.value })}
                placeholder="Ej: 101000094"
                className={errores.codigo_contabilidad ? "border-red-500" : ""}
                disabled={loading}
              />
              {errores.codigo_contabilidad && (
                <p className="text-sm text-red-500 mt-1">{errores.codigo_contabilidad}</p>
              )}
            </div>
            <div>
              <Label htmlFor="um">Unidad de medida</Label>
              <Input
                id="um"
                value={datos.um}
                onChange={(e) => setDatos({ ...datos, um: e.target.value })}
                placeholder="u"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="nombre">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre"
              value={datos.nombre}
              onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
              placeholder="Ej: TUERCA HEXAGONAL ZINC M10"
              className={errores.nombre ? "border-red-500" : ""}
              disabled={loading}
            />
            {errores.nombre && <p className="text-sm text-red-500 mt-1">{errores.nombre}</p>}
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              value={datos.descripcion}
              onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
              placeholder="Opcional"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                step="0.01"
                min="0"
                value={datos.cantidad}
                onChange={(e) => setDatos({ ...datos, cantidad: parseFloat(e.target.value) || 0 })}
                className={errores.cantidad ? "border-red-500" : ""}
                disabled={loading}
              />
              {errores.cantidad && <p className="text-sm text-red-500 mt-1">{errores.cantidad}</p>}
            </div>
            <div>
              <Label htmlFor="precio">Precio (CUP)</Label>
              <Input
                id="precio"
                type="number"
                step="0.0001"
                min="0"
                value={datos.precio}
                onChange={(e) => setDatos({ ...datos, precio: parseFloat(e.target.value) || 0 })}
                className={errores.precio ? "border-red-500" : ""}
                disabled={loading}
              />
              {errores.precio && <p className="text-sm text-red-500 mt-1">{errores.precio}</p>}
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {esEdicion ? "Guardar cambios" : "Agregar material"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
