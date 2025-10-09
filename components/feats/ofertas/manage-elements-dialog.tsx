"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { FileUpload } from "@/components/shared/molecule/file-upload"
import {
  Plus,
  X,
  Trash2,
  Package,
  Save,
  Loader2,
  Image as ImageIcon,
  Edit
} from "lucide-react"
import type { Oferta, CreateElementoRequest, ElementoOferta, UpdateElementoRequest } from "@/lib/api-types"
import { toast } from "sonner"
import { useToast } from "@/hooks/use-toast"
import { useOfertas } from "@/hooks/use-ofertas"

interface ManageElementsDialogProps {
  isOpen: boolean
  onClose: () => void
  oferta: Oferta | null
  onOfertaUpdate?: (ofertaId: string) => void
}

export default function ManageElementsDialog({
  isOpen,
  onClose,
  oferta,
  onOfertaUpdate
}: ManageElementsDialogProps) {
  const { agregarElemento, eliminarElemento, editarElemento, recargarOfertas, actualizarOfertaLocal } = useOfertas()
  const { toast: toastNotification } = useToast()

  // Estado para el nuevo elemento
  const [nuevoElemento, setNuevoElemento] = useState<CreateElementoRequest>({
    categoria: "",
    descripcion: "", // requerido
    cantidad: 1, // requerido, mayor a 0
    foto: null
  })

  // Estado para edición de elementos
  const [elementoEditando, setElementoEditando] = useState<{index: number, elemento: UpdateElementoRequest} | null>(null)

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [elementToDelete, setElementToDelete] = useState<{index: number, elemento: ElementoOferta} | null>(null)

  // Resetear formulario cuando se abre/cierra el diálogo
  useEffect(() => {
    if (isOpen) {
      setNuevoElemento({
        categoria: "",
        descripcion: "",
        cantidad: 1,
        foto: null
      })
      setElementoEditando(null)
    }
  }, [isOpen])

  // Agregar nuevo elemento
  const handleAgregarElemento = async () => {
    if (!oferta?.id) {
      toastNotification({
        title: "Error",
        description: "No se ha seleccionado una oferta",
        variant: "destructive",
      })
      return
    }

    if (!nuevoElemento.descripcion.trim()) {
      toastNotification({
        title: "Error",
        description: "La descripción es requerida",
        variant: "destructive",
      })
      return
    }

    if (nuevoElemento.cantidad <= 0) {
      toastNotification({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const success = await agregarElemento(oferta.id, nuevoElemento)

      if (success) {
        toastNotification({
          title: "Éxito",
          description: "Elemento agregado correctamente",
        })
        setNuevoElemento({
          categoria: "",
          descripcion: "",
          cantidad: 1,
          foto: null
        })
        // Actualizar la oferta específica en el estado local
        await actualizarOfertaLocal(oferta.id)
        // También notificar al componente padre para actualizar su estado
        if (onOfertaUpdate) {
          onOfertaUpdate(oferta.id)
        }
      } else {
        toastNotification({
          title: "Error",
          description: "No se pudo agregar el elemento",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al agregar elemento:", error)
      toastNotification({
        title: "Error",
        description: "Error al agregar el elemento",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Mostrar confirmación de eliminación
  const handleShowDeleteConfirm = (elementoIndex: number, elemento: ElementoOferta) => {
    setElementToDelete({ index: elementoIndex, elemento })
    setShowDeleteConfirm(true)
  }

  // Eliminar elemento confirmado
  const handleConfirmDelete = async () => {
    if (!oferta?.id || !elementToDelete) {
      toastNotification({
        title: "Error",
        description: "No se ha seleccionado una oferta o elemento",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const success = await eliminarElemento(oferta.id, elementToDelete.index)

      if (success) {
        toastNotification({
          title: "Éxito",
          description: "Elemento eliminado correctamente",
        })
        // Actualizar la oferta específica en el estado local
        await actualizarOfertaLocal(oferta.id)
        // También notificar al componente padre para actualizar su estado
        if (onOfertaUpdate) {
          onOfertaUpdate(oferta.id)
        }
      } else {
        toastNotification({
          title: "Error",
          description: "No se pudo eliminar el elemento",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al eliminar elemento:", error)
      toastNotification({
        title: "Error",
        description: "Error al eliminar el elemento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
      setElementToDelete(null)
    }
  }

  // Iniciar edición de elemento
  const handleStartEdit = (elementoIndex: number, elemento: ElementoOferta) => {
    setElementoEditando({
      index: elementoIndex,
      elemento: {
        categoria: elemento.categoria,
        descripcion: elemento.descripcion || "",
        cantidad: elemento.cantidad,
        foto: null // La foto se manejará por separado
      }
    })
  }

  // Cancelar edición
  const handleCancelEdit = () => {
    setElementoEditando(null)
  }

  // Guardar cambios de edición
  const handleSaveEdit = async () => {
    if (!oferta?.id || !elementoEditando) {
      toastNotification({
        title: "Error",
        description: "No se ha seleccionado una oferta o elemento",
        variant: "destructive",
      })
      return
    }

    // Validaciones
    if (!elementoEditando.elemento.descripcion?.trim()) {
      toastNotification({
        title: "Error",
        description: "La descripción es requerida",
        variant: "destructive",
      })
      return
    }

    if (!elementoEditando.elemento.cantidad || elementoEditando.elemento.cantidad <= 0) {
      toastNotification({
        title: "Error",
        description: "La cantidad debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const success = await editarElemento(oferta.id, elementoEditando.index, elementoEditando.elemento)

      if (success) {
        toastNotification({
          title: "Éxito",
          description: "Elemento editado correctamente",
        })
        setElementoEditando(null)
        // Actualizar la oferta específica en el estado local
        await actualizarOfertaLocal(oferta.id)
        // También notificar al componente padre para actualizar su estado
        if (onOfertaUpdate) {
          onOfertaUpdate(oferta.id)
        }
      } else {
        toastNotification({
          title: "Error",
          description: "No se pudo editar el elemento",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al editar elemento:", error)
      toastNotification({
        title: "Error",
        description: "Error al editar el elemento",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!oferta) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            Gestionar Elementos - {oferta.descripcion}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la oferta */}
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-orange-900">{oferta.descripcion}</h3>
                  <p className="text-sm text-orange-700">
                    {oferta.elementos?.length || 0} elemento{(oferta.elementos?.length || 0) !== 1 ? 's' : ''} actual{(oferta.elementos?.length || 0) !== 1 ? 'es' : ''}
                  </p>
                </div>
                <Badge variant="outline" className="bg-orange-100 text-orange-800">
                  ${oferta.precio.toLocaleString()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Formulario para agregar nuevo elemento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Agregar Nuevo Elemento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="categoria">Categoría</Label>
                  <Input
                    id="categoria"
                    placeholder="Ej: Panel Solar"
                    value={nuevoElemento.categoria}
                    onChange={(e) => setNuevoElemento(prev => ({ ...prev, categoria: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion">Descripción *</Label>
                  <Input
                    id="descripcion"
                    placeholder="Ej: Panel 400W monocristalino"
                    value={nuevoElemento.descripcion}
                    onChange={(e) => setNuevoElemento(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="cantidad">Cantidad *</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    placeholder="1"
                    value={nuevoElemento.cantidad}
                    onChange={(e) => setNuevoElemento(prev => ({ ...prev, cantidad: parseFloat(e.target.value) || 0 }))}
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleAgregarElemento}
                    disabled={saving || !nuevoElemento.descripcion.trim()}
                    className="w-full"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Agregar
                  </Button>
                </div>
              </div>

              <FileUpload
                id="foto-elemento"
                label="Foto del Elemento (opcional)"
                accept="image/*"
                value={nuevoElemento.foto}
                onChange={(file) => setNuevoElemento(prev => ({ ...prev, foto: file }))}
                maxSizeInMB={10}
                showPreview={true}
                disabled={saving}
              />
            </CardContent>
          </Card>

          {/* Lista de elementos existentes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-4 w-4" />
                Elementos Actuales ({oferta.elementos?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {oferta.elementos && oferta.elementos.length > 0 ? (
                <div className="space-y-3">
                  {oferta.elementos.map((elemento, index) => {
                    // Crear una key más estable basada en las propiedades del elemento
                    const elementKey = `${elemento.categoria}-${elemento.descripcion || 'no-desc'}-${elemento.cantidad}-${index}`
                    const isEditing = elementoEditando?.index === index

                    return (
                    <div key={elementKey} className="p-4 bg-gray-50 rounded-lg border">
                      {isEditing ? (
                        // Modo edición
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label htmlFor={`edit-categoria-${index}`}>Categoría</Label>
                              <Input
                                id={`edit-categoria-${index}`}
                                placeholder="Ej: Panel Solar"
                                value={elementoEditando.elemento.categoria || ""}
                                onChange={(e) => setElementoEditando(prev => prev ? {
                                  ...prev,
                                  elemento: { ...prev.elemento, categoria: e.target.value }
                                } : null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-descripcion-${index}`}>Descripción *</Label>
                              <Input
                                id={`edit-descripcion-${index}`}
                                placeholder="Ej: Panel 400W monocristalino"
                                value={elementoEditando.elemento.descripcion || ""}
                                onChange={(e) => setElementoEditando(prev => prev ? {
                                  ...prev,
                                  elemento: { ...prev.elemento, descripcion: e.target.value }
                                } : null)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-cantidad-${index}`}>Cantidad *</Label>
                              <Input
                                id={`edit-cantidad-${index}`}
                                type="number"
                                placeholder="1"
                                value={elementoEditando.elemento.cantidad || 0}
                                onChange={(e) => setElementoEditando(prev => prev ? {
                                  ...prev,
                                  elemento: { ...prev.elemento, cantidad: parseFloat(e.target.value) || 0 }
                                } : null)}
                                min="0.01"
                                step="0.01"
                              />
                            </div>
                          </div>

                          <FileUpload
                            id={`edit-foto-${index}`}
                            label="Nueva Foto del Elemento (opcional)"
                            accept="image/*"
                            value={elementoEditando.elemento.foto}
                            onChange={(file) => setElementoEditando(prev => prev ? {
                              ...prev,
                              elemento: { ...prev.elemento, foto: file }
                            } : null)}
                            maxSizeInMB={10}
                            showPreview={true}
                            disabled={saving}
                          />

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={saving}
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={saving || !elementoEditando.elemento.descripcion?.trim()}
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              Guardar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Modo visualización
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {elemento.categoria && (
                                <Badge variant="outline" className="text-xs">
                                  {elemento.categoria}
                                </Badge>
                              )}
                              <span className="font-medium text-gray-900">
                                {elemento.descripcion || "Sin descripción"}
                              </span>
                               {elemento.cantidad && (
                                 <Badge variant="secondary" className="text-xs">
                                   x{elemento.cantidad}
                                 </Badge>
                               )}
                            </div>

                            {elemento.foto && (
                              <div className="mt-2">
                                <div className="w-20 h-16 rounded overflow-hidden bg-gray-100">
                                  <img
                                    src={elemento.foto}
                                    alt={elemento.descripcion || "Elemento"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                    }}
                                  />
                                  <div className="hidden flex items-center justify-center h-full bg-gray-100">
                                    <ImageIcon className="h-4 w-4 text-gray-400" />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(index, elemento)}
                              disabled={loading || elementoEditando !== null}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowDeleteConfirm(index, elemento)}
                              disabled={loading || elementoEditando !== null}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No hay elementos agregados a esta oferta</p>
                  <p className="text-sm">Usa el formulario de arriba para agregar el primer elemento</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Diálogo de confirmación de eliminación */}
      <ConfirmDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="¿Eliminar elemento?"
        message={`¿Estás seguro de que deseas eliminar el elemento "${elementToDelete?.elemento.descripcion || elementToDelete?.elemento.categoria || 'este elemento'}"? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setElementToDelete(null)
        }}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={loading}
      />
    </Dialog>
  )
}
