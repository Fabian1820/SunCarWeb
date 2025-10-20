"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Save, X, Loader2, Image as ImageIcon, Trash2 } from "lucide-react"
import type { Blog, BlogFormData, Categoria, Estado } from "@/lib/blog-types"
import { generateSlugFromTitulo, isValidSlug } from "@/lib/blog-types"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"

interface BlogFormProps {
  initialData?: Blog
  onSubmit?: (data: BlogFormData) => void
  onCancel: () => void
  isEditing?: boolean
  onValidarSlug?: (slug: string, blogId?: string) => Promise<{ disponible: boolean; message: string }>
}

const categorias: { value: Categoria; label: string }[] = [
  { value: "instalacion", label: "Instalación" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "casos_exito", label: "Casos de Éxito" },
  { value: "ahorro_energetico", label: "Ahorro Energético" },
  { value: "novedades", label: "Novedades" },
  { value: "normativas", label: "Normativas" },
]

const estados: { value: Estado; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "publicado", label: "Publicado" },
  { value: "archivado", label: "Archivado" },
]

export function BlogForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
  onValidarSlug,
}: BlogFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<BlogFormData>({
    titulo: initialData?.titulo || "",
    slug: initialData?.slug || "",
    resumen: initialData?.resumen || "",
    contenido: initialData?.contenido || "",
    categoria: initialData?.categoria || "instalacion",
    estado: initialData?.estado || "borrador",
    autor: initialData?.autor || "Equipo SunCar",
    tags: initialData?.tags || [],
    seoMetaDescripcion: initialData?.seoMetaDescripcion || "",
    fechaPublicacion: initialData?.fechaPublicacion || null,
    imagenPrincipal: null,
    imagenesAdicionales: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState("")
  const [slugValidation, setSlugValidation] = useState<{ validating: boolean; disponible?: boolean; message?: string }>({
    validating: false,
  })

  // Auto-generate slug when title changes (only for new blogs)
  useEffect(() => {
    if (!isEditing && formData.titulo && !formData.slug) {
      const generatedSlug = generateSlugFromTitulo(formData.titulo)
      setFormData((prev) => ({ ...prev, slug: generatedSlug }))
    }
  }, [formData.titulo, isEditing, formData.slug])

  // Validate slug on change (with debounce)
  useEffect(() => {
    if (!onValidarSlug || !formData.slug) return

    const timer = setTimeout(async () => {
      setSlugValidation({ validating: true })
      try {
        const result = await onValidarSlug(formData.slug, initialData?.id)
        setSlugValidation({ validating: false, disponible: result.disponible, message: result.message })
      } catch (err) {
        setSlugValidation({ validating: false, disponible: false, message: "Error al validar slug" })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.slug, onValidarSlug, initialData?.id])

  const validateForm = () => {
    if (!formData.titulo.trim()) {
      setError("El título es requerido")
      return false
    }
    if (formData.titulo.length > 150) {
      setError("El título no puede exceder 150 caracteres")
      return false
    }
    if (!formData.slug.trim()) {
      setError("El slug es requerido")
      return false
    }
    if (!isValidSlug(formData.slug)) {
      setError("El slug debe estar en formato kebab-case (ej: mi-articulo-ejemplo)")
      return false
    }
    if (slugValidation.disponible === false) {
      setError("El slug ya está en uso. Por favor elija otro.")
      return false
    }
    if (!formData.resumen.trim()) {
      setError("El resumen es requerido")
      return false
    }
    if (formData.resumen.length > 300) {
      setError("El resumen no puede exceder 300 caracteres")
      return false
    }
    if (!formData.contenido.trim()) {
      setError("El contenido es requerido")
      return false
    }
    if (formData.seoMetaDescripcion && formData.seoMetaDescripcion.length > 160) {
      setError("La meta descripción SEO no puede exceder 160 caracteres")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(formData)
        if (!isEditing) {
          // Reset form after successful creation
          setFormData({
            titulo: "",
            slug: "",
            resumen: "",
            contenido: "",
            categoria: "instalacion",
            estado: "borrador",
            autor: "Equipo SunCar",
            tags: [],
            seoMetaDescripcion: "",
            fechaPublicacion: null,
            imagenPrincipal: null,
            imagenesAdicionales: [],
          })
          setTagInput("")
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || "Error al guardar el blog"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] })
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="titulo">
            Título <span className="text-red-500">*</span>
          </Label>
          <Input
            id="titulo"
            placeholder="Título del artículo (máx. 150 caracteres)"
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            maxLength={150}
          />
          <p className="text-xs text-gray-500 mt-1">{formData.titulo.length}/150 caracteres</p>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="slug">
            Slug <span className="text-red-500">*</span>
          </Label>
          <Input
            id="slug"
            placeholder="url-amigable-unica"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
          />
          {slugValidation.validating && (
            <p className="text-xs text-gray-500 mt-1">Validando disponibilidad...</p>
          )}
          {!slugValidation.validating && slugValidation.message && (
            <p
              className={`text-xs mt-1 ${
                slugValidation.disponible ? "text-green-600" : "text-red-600"
              }`}
            >
              {slugValidation.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="categoria">
            Categoría <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.categoria}
            onValueChange={(value) => setFormData({ ...formData, categoria: value as Categoria })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="estado">
            Estado <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.estado}
            onValueChange={(value) => setFormData({ ...formData, estado: value as Estado })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {estados.map((est) => (
                <SelectItem key={est.value} value={est.value}>
                  {est.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="autor">Autor</Label>
          <Input
            id="autor"
            placeholder="Nombre del autor"
            value={formData.autor}
            onChange={(e) => setFormData({ ...formData, autor: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="fechaPublicacion">Fecha de Publicación</Label>
          <Input
            id="fechaPublicacion"
            type="datetime-local"
            value={formData.fechaPublicacion ? new Date(formData.fechaPublicacion).toISOString().slice(0, 16) : ""}
            onChange={(e) =>
              setFormData({ ...formData, fechaPublicacion: e.target.value ? new Date(e.target.value) : null })
            }
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="resumen">
            Resumen <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="resumen"
            placeholder="Descripción corta para vista previa (máx. 300 caracteres)"
            value={formData.resumen}
            onChange={(e) => setFormData({ ...formData, resumen: e.target.value })}
            maxLength={300}
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">{formData.resumen.length}/300 caracteres</p>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="contenido">
            Contenido <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="contenido"
            placeholder="Contenido completo del blog en HTML o Markdown"
            value={formData.contenido}
            onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
            rows={8}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="seoMetaDescripcion">Meta Descripción SEO</Label>
          <Textarea
            id="seoMetaDescripcion"
            placeholder="Descripción para motores de búsqueda (máx. 160 caracteres)"
            value={formData.seoMetaDescripcion}
            onChange={(e) => setFormData({ ...formData, seoMetaDescripcion: e.target.value })}
            maxLength={160}
            rows={2}
          />
          <p className="text-xs text-gray-500 mt-1">{formData.seoMetaDescripcion.length}/160 caracteres</p>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="tags">Etiquetas (Tags)</Label>
          <div className="flex gap-2 mb-2">
            <Input
              id="tags"
              placeholder="Agregar etiqueta"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={handleAddTag}>
              Agregar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm"
              >
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-purple-900">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="imagenPrincipal">Imagen Principal</Label>
          <Input
            id="imagenPrincipal"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setFormData({ ...formData, imagenPrincipal: file })
            }}
          />
          {initialData?.imagenPrincipal && !formData.imagenPrincipal && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <ImageIcon className="h-4 w-4" />
              <span>Imagen actual: {initialData.imagenPrincipal.split('/').pop()}</span>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="imagenesAdicionales">Imágenes Adicionales</Label>
          <Input
            id="imagenesAdicionales"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              setFormData({ ...formData, imagenesAdicionales: files })
            }}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || slugValidation.validating || slugValidation.disponible === false}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          {isEditing ? "Actualizar Blog" : "Crear Blog"}
        </Button>
      </div>
    </form>
  )
}
