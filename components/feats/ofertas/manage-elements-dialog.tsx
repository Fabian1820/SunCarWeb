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
  Image as ImageIcon
} from "lucide-react"
import type { Oferta, CreateElementoRequest, ElementoOferta } from "@/lib/api-types"
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
  const { agregarElemento, eliminarElemento, recargarOfertas, actualizarOfertaLocal } = useOfertas()
  const { toast: toastNotification } = useToast()
  
  // Estado para el nuevo elemento
  const [nuevoElemento, setNuevoElemento] = useState<CreateElementoRequest>({
    categoria: "",
    descripcion: "",
    cantidad: 1,
    foto: null
  })

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

    if (!nuevoElemento.categoria.trim()) {
      toastNotification({
        title: "Error",
        description: "La categoría es requerida",
        variant: "destructive",
      })
      return
    }

    if (nuevoElemento.cantidad < 1) {
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
                  <Label htmlFor="categoria">Categoría *</Label>
                  <Input
                    id="categoria"
                    placeholder="Ej: Panel Solar"
                    value={nuevoElemento.categoria}
                    onChange={(e) => setNuevoElemento(prev => ({ ...prev, categoria: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
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
                    onChange={(e) => setNuevoElemento(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                    min="1"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAgregarElemento} 
                    disabled={saving || !nuevoElemento.categoria.trim()}
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
                  {oferta.elementos.map((elemento, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
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
                      
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => handleShowDeleteConfirm(index, elemento)}
                         disabled={loading}
                         className="text-red-500 hover:text-red-700 hover:bg-red-50"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  ))}
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
