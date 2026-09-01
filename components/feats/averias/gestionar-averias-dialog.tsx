"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/shared/molecule/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogPortal, AlertDialogOverlay } from "@/components/shared/atom/alert-dialog"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { AlertTriangle, CheckCircle, Plus, Trash2 } from "lucide-react"
import { AveriaService } from "@/lib/api-services"
import { useToast } from "@/hooks/use-toast"
import type { Cliente } from "@/lib/api-types"
import type { Averia } from "@/lib/types/feats/averias/averia-types"

interface GestionarAveriasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente
  onSuccess: () => void
}

export function GestionarAveriasDialog({
  open,
  onOpenChange,
  cliente,
  onSuccess,
}: GestionarAveriasDialogProps) {
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Formulario
  const [descripcion, setDescripcion] = useState("")
  
  // Estado para el dialog de confirmación
  const [averiaAEliminar, setAveriaAEliminar] = useState<Averia | null>(null)
  
  // Controlar la visibilidad del dialog principal cuando el AlertDialog está abierto
  const dialogPrincipalOpen = open && !averiaAEliminar

  const averias = cliente.averias || []
  const averiasPendientes = averias.filter(a => a.estado === 'Pendiente')
  const averiasSolucionadas = averias.filter(a => a.estado === 'Solucionada')

  console.log('📋 Averías del cliente:', {
    total: averias.length,
    pendientes: averiasPendientes.length,
    solucionadas: averiasSolucionadas.length,
    averias: averias
  })

  const handleAgregarAveria = async () => {
    if (!descripcion.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar una descripción de la avería",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await AveriaService.agregarAveria(cliente.numero, {
        descripcion: descripcion.trim(),
        estado: 'Pendiente',
      })

      toast({
        title: "Avería agregada",
        description: "La avería se ha registrado correctamente",
      })

      setDescripcion("")
      onSuccess()
      
      // Cerrar el dialog después de agregar
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar la avería",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleMarcarSolucionada = async (averia: Averia) => {
    console.log('🔧 Intentando marcar como solucionada:', {
      clienteNumero: cliente.numero,
      averiaId: averia.id,
      averia: averia
    })
    
    setIsUpdating(true)
    try {
      await AveriaService.actualizarAveria(cliente.numero, averia.id, {
        estado: 'Solucionada',
      })

      toast({
        title: "Avería solucionada",
        description: "La avería se ha marcado como solucionada",
      })

      onSuccess()
    } catch (error: any) {
      console.error('❌ Error al marcar como solucionada:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la avería",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEliminarAveria = (averia: Averia) => {
    setAveriaAEliminar(averia)
  }

  const confirmarEliminarAveria = async () => {
    if (!averiaAEliminar) return

    console.log('🔧 Intentando eliminar avería:', {
      clienteNumero: cliente.numero,
      averiaId: averiaAEliminar.id,
      averia: averiaAEliminar
    })

    setIsUpdating(true)
    try {
      await AveriaService.eliminarAveria(cliente.numero, averiaAEliminar.id)

      toast({
        title: "Avería eliminada",
        description: "La avería se ha eliminado correctamente",
      })

      setAveriaAEliminar(null)
      onSuccess()
    } catch (error: any) {
      console.error('❌ Error al eliminar avería:', error)
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la avería",
        variant: "destructive",
      })
      setAveriaAEliminar(null)
    } finally {
      setIsUpdating(false)
    }
  }
  
  const handleCancelarEliminar = () => {
    setAveriaAEliminar(null)
  }

  return (
    <>
      <Dialog open={dialogPrincipalOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestionar Averías - {cliente.nombre}</DialogTitle>
            <DialogDescription>
              Agrega, actualiza o elimina averías del cliente {cliente.numero}
            </DialogDescription>
          </DialogHeader>

        <div className="space-y-6">
          {/* Formulario para agregar avería */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Agregar Nueva Avería
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="descripcion">Descripción de la avería *</Label>
                <Textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Inversor no enciende, panel dañado, etc."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleAgregarAveria}
                disabled={isCreating || !descripcion.trim()}
                className="w-full bg-gradient-to-r from-red-500 to-red-600"
              >
                {isCreating ? "Agregando..." : "Agregar Avería"}
              </Button>
            </div>
          </div>

          {/* Lista de averías pendientes */}
          {averiasPendientes.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Averías Pendientes ({averiasPendientes.length})
              </h3>
              <div className="space-y-2">
                {averiasPendientes.map((averia) => (
                  <div key={averia.id} className="border rounded-lg p-3 bg-red-50 border-red-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{averia.descripcion}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Reportada: {averia.fecha_reporte}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => handleMarcarSolucionada(averia)}
                          disabled={isUpdating}
                          title="Marcar como solucionada"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => handleEliminarAveria(averia)}
                          disabled={isUpdating}
                          title="Eliminar avería"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de averías solucionadas */}
          {averiasSolucionadas.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                Averías Solucionadas ({averiasSolucionadas.length})
              </h3>
              <div className="space-y-2">
                {averiasSolucionadas.map((averia) => (
                  <div key={averia.id} className="border rounded-lg p-3 bg-green-50 border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{averia.descripcion}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Reportada: {averia.fecha_reporte} | Solucionada: {averia.fecha_solucion}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => handleEliminarAveria(averia)}
                        disabled={isUpdating}
                        title="Eliminar avería"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sin averías */}
          {averias.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No hay averías registradas para este cliente</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Dialog de confirmación para eliminar */}
    <AlertDialog open={!!averiaAEliminar} onOpenChange={(open) => !open && handleCancelarEliminar()}>
      <AlertDialogPortal>
        <AlertDialogOverlay className="z-[60]" />
        <AlertDialogContent className="z-[60]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar avería?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar la avería "{averiaAEliminar?.descripcion}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating} onClick={handleCancelarEliminar}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminarAveria}
              disabled={isUpdating}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUpdating ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>
  </>
  )
}
