"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { PermisosService } from "@/lib/api-services"
import { Modulo } from "@/lib/types/feats/permisos/permisos-types"
import { Trash2, Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ModulosManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onModulosUpdated: () => void
}

export function ModulosManagerDialog({
  open,
  onOpenChange,
  onModulosUpdated,
}: ModulosManagerDialogProps) {
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [nuevoModuloNombre, setNuevoModuloNombre] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadModulos()
    }
  }, [open])

  const loadModulos = async () => {
    setIsLoading(true)
    try {
      const data = await PermisosService.getAllModulos()
      setModulos(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los módulos",
        variant: "destructive",
      })
      console.error("Error loading modulos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateModulo = async () => {
    if (!nuevoModuloNombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del módulo no puede estar vacío",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      await PermisosService.createModulo({ nombre: nuevoModuloNombre.trim() })
      toast({
        title: "Módulo creado",
        description: `El módulo "${nuevoModuloNombre}" fue creado exitosamente`,
      })
      setNuevoModuloNombre("")
      await loadModulos()
      onModulosUpdated()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el módulo",
        variant: "destructive",
      })
      console.error("Error creating modulo:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteModulo = async (moduloId: string, nombre: string) => {
    if (!confirm(`¿Está seguro de eliminar el módulo "${nombre}"?`)) {
      return
    }

    setDeletingId(moduloId)
    try {
      await PermisosService.deleteModulo(moduloId)
      toast({
        title: "Módulo eliminado",
        description: `El módulo "${nombre}" fue eliminado exitosamente`,
      })
      await loadModulos()
      onModulosUpdated()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el módulo",
        variant: "destructive",
      })
      console.error("Error deleting modulo:", error)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestión de Módulos del Sistema</DialogTitle>
          <DialogDescription>
            Cree o elimine los módulos disponibles en el sistema
          </DialogDescription>
        </DialogHeader>

        {/* Formulario para crear nuevo módulo */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold mb-3 text-sm">Crear Nuevo Módulo</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="nuevoModulo" className="sr-only">
                Nombre del módulo
              </Label>
              <Input
                id="nuevoModulo"
                placeholder="Nombre del módulo"
                value={nuevoModuloNombre}
                onChange={(e) => setNuevoModuloNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateModulo()
                  }
                }}
                disabled={isCreating}
              />
            </div>
            <Button
              onClick={handleCreateModulo}
              disabled={isCreating || !nuevoModuloNombre.trim()}
              className="bg-suncar-primary hover:bg-suncar-primary/90"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-2">Crear</span>
            </Button>
          </div>
        </div>

        {/* Lista de módulos existentes */}
        <div className="border rounded-lg">
          <div className="bg-gray-100 px-4 py-2 border-b">
            <h3 className="font-semibold text-sm">
              Módulos Existentes ({modulos.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-suncar-primary" />
              <p className="text-sm text-gray-500 mt-2">Cargando módulos...</p>
            </div>
          ) : modulos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No hay módulos creados</p>
            </div>
          ) : (
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {modulos.map((modulo) => (
                <div
                  key={modulo.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <span className="font-medium">{modulo.nombre}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteModulo(modulo.id, modulo.nombre)}
                    disabled={deletingId === modulo.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {deletingId === modulo.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
