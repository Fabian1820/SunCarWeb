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
import { Trash2, Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const GRUPOS_PREDEFINIDOS = [
  {
    grupo: "Trabajos Diarios",
    descripcion: "Pestañas del módulo /instalaciones/trabajos-diarios",
    modulos: [
      { nombre: "trabajos:confirmar", label: "Confirmar salidas" },
      { nombre: "trabajos:registrar", label: "Cierre diario instalaciones" },
      { nombre: "trabajos:averias", label: "Averías" },
      { nombre: "trabajos:actualizaciones", label: "Actualizaciones" },
      { nombre: "trabajos:entregas", label: "Entregas sin instalar" },
      { nombre: "trabajos:todos", label: "Todos los trabajos" },
    ],
  },
]

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
  const [creandoGrupo, setCreandoGrupo] = useState<string | null>(null)
  const [grupoExpandido, setGrupoExpandido] = useState<string | null>(null)
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

  const handleCrearGrupo = async (grupoNombre: string, modulosGrupo: { nombre: string }[]) => {
    setCreandoGrupo(grupoNombre)
    const existentes = new Set(modulos.map((m) => m.nombre))
    const faltantes = modulosGrupo.filter((m) => !existentes.has(m.nombre))

    if (faltantes.length === 0) {
      toast({ title: "Sin cambios", description: "Todos los módulos de este grupo ya existen." })
      setCreandoGrupo(null)
      return
    }

    let creados = 0
    for (const m of faltantes) {
      try {
        await PermisosService.createModulo({ nombre: m.nombre })
        creados++
      } catch {
        // ignorar errores individuales
      }
    }

    toast({
      title: creados > 0 ? "Módulos creados" : "Error",
      description: creados > 0
        ? `Se crearon ${creados} módulo(s) del grupo "${grupoNombre}".`
        : "No se pudo crear ningún módulo.",
      variant: creados > 0 ? "default" : "destructive",
    })

    await loadModulos()
    onModulosUpdated()
    setCreandoGrupo(null)
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

        {/* Grupos predefinidos */}
        <div className="border rounded-lg">
          <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
            <h3 className="font-semibold text-sm text-blue-800">Grupos Predefinidos</h3>
            <p className="text-xs text-blue-600 mt-0.5">Crea de golpe todos los módulos de un grupo funcional</p>
          </div>
          <div className="divide-y">
            {GRUPOS_PREDEFINIDOS.map((grupo) => {
              const existentes = new Set(modulos.map((m) => m.nombre))
              const faltantes = grupo.modulos.filter((m) => !existentes.has(m.nombre))
              const expanded = grupoExpandido === grupo.grupo
              return (
                <div key={grupo.grupo} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{grupo.grupo}</p>
                      <p className="text-xs text-gray-500">{grupo.descripcion}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {faltantes.length === 0
                          ? "✅ Todos los módulos ya existen"
                          : `${faltantes.length} de ${grupo.modulos.length} módulos pendientes de crear`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setGrupoExpandido(expanded ? null : grupo.grupo)}
                        className="text-xs"
                      >
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span className="ml-1">Ver</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleCrearGrupo(grupo.grupo, grupo.modulos)}
                        disabled={creandoGrupo === grupo.grupo || faltantes.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        {creandoGrupo === grupo.grupo ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        <span className="ml-1">Crear grupo</span>
                      </Button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-3 grid grid-cols-1 gap-1">
                      {grupo.modulos.map((m) => {
                        const yaExiste = existentes.has(m.nombre)
                        return (
                          <div
                            key={m.nombre}
                            className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${
                              yaExiste ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"
                            }`}
                          >
                            <span>{m.label}</span>
                            <span className="font-mono text-gray-400">{m.nombre}</span>
                            {yaExiste && <span className="text-green-500 ml-2">✓</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
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
