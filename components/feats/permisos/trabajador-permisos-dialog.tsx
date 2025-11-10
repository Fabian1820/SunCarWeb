"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import { Label } from "@/components/shared/atom/label"
import { PermisosService } from "@/lib/api-services"
import { Modulo } from "@/lib/types/feats/permisos/permisos-types"
import { Loader2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TrabajadorPermisosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trabajadorCi: string | null
  trabajadorNombre: string | null
  onPermisosUpdated: () => void
}

export function TrabajadorPermisosDialog({
  open,
  onOpenChange,
  trabajadorCi,
  trabajadorNombre,
  onPermisosUpdated,
}: TrabajadorPermisosDialogProps) {
  const [todosModulos, setTodosModulos] = useState<Modulo[]>([])
  const [modulosSeleccionados, setModulosSeleccionados] = useState<Set<string>>(
    new Set()
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && trabajadorCi) {
      loadData()
    }
  }, [open, trabajadorCi])

  const loadData = async () => {
    if (!trabajadorCi) return

    setIsLoading(true)
    try {
      // Cargar todos los módulos del sistema
      const modulos = await PermisosService.getAllModulos()
      setTodosModulos(modulos)

      // Cargar módulos actuales del trabajador
      try {
        const nombresModulos = await PermisosService.getTrabajadorModulosNombres(
          trabajadorCi
        )

        // Convertir nombres a IDs
        const idsSeleccionados = new Set(
          modulos
            .filter((m) => nombresModulos.includes(m.nombre))
            .map((m) => m.id)
        )
        setModulosSeleccionados(idsSeleccionados)
      } catch (error) {
        // Si no tiene permisos, iniciar vacío
        setModulosSeleccionados(new Set())
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleModulo = (moduloId: string) => {
    const newSet = new Set(modulosSeleccionados)
    if (newSet.has(moduloId)) {
      newSet.delete(moduloId)
    } else {
      newSet.add(moduloId)
    }
    setModulosSeleccionados(newSet)
  }

  const handleSeleccionarTodo = () => {
    const todosIds = new Set(todosModulos.map(m => m.id))
    setModulosSeleccionados(todosIds)
  }

  const handleDeseleccionarTodo = () => {
    setModulosSeleccionados(new Set())
  }

  const handleSave = async () => {
    if (!trabajadorCi) return

    setIsSaving(true)
    try {
      await PermisosService.updateTrabajadorPermisos(trabajadorCi, {
        modulo_ids: Array.from(modulosSeleccionados),
      })

      toast({
        title: "Permisos actualizados",
        description: `Los permisos de ${trabajadorNombre} fueron actualizados exitosamente`,
      })

      onPermisosUpdated()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los permisos",
        variant: "destructive",
      })
      console.error("Error updating permisos:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permisos de {trabajadorNombre}</DialogTitle>
          <DialogDescription>
            CI: {trabajadorCi}
            <br />
            Seleccione los módulos a los que tendrá acceso
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-suncar-primary" />
            <p className="text-sm text-gray-500 mt-2">Cargando módulos...</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {todosModulos.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No hay módulos disponibles</p>
                <p className="text-sm mt-1">
                  Cree módulos primero usando el botón "Ver Módulos"
                </p>
              </div>
            ) : (
              <>
                {/* Botones de acción rápida */}
                <div className="flex gap-2 pb-2 border-b">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSeleccionarTodo}
                    className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
                  >
                    Seleccionar Todo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeseleccionarTodo}
                    className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                  >
                    Deseleccionar Todo
                  </Button>
                </div>

                {/* Lista de módulos */}
                <div className="space-y-1">
                  {todosModulos.map((modulo) => (
                <div
                  key={modulo.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
                >
                  <Checkbox
                    id={`modulo-${modulo.id}`}
                    checked={modulosSeleccionados.has(modulo.id)}
                    onCheckedChange={() => handleToggleModulo(modulo.id)}
                  />
                  <Label
                    htmlFor={`modulo-${modulo.id}`}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {modulo.nombre}
                  </Label>
                </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading || todosModulos.length === 0}
            className="bg-suncar-primary hover:bg-suncar-primary/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
