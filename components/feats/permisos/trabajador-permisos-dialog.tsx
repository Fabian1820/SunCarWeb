"use client"

import { useState, useEffect, useMemo } from "react"
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
import { PermisosService, InventarioService } from "@/lib/api-services"
import { Modulo } from "@/lib/types/feats/permisos/permisos-types"
import { Loader2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Almacen, Tienda } from "@/lib/inventario-types"
import { Input } from "@/components/shared/molecule/input"

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
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [tiendasSeleccionadas, setTiendasSeleccionadas] = useState<Set<string>>(new Set())
  const [almacenesSeleccionados, setAlmacenesSeleccionados] = useState<Set<string>>(new Set())
  const [tiendaSearch, setTiendaSearch] = useState("")
  const [almacenSearch, setAlmacenSearch] = useState("")
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
      const [modulos, tiendasData, almacenesData] = await Promise.all([
        PermisosService.getAllModulos(),
        InventarioService.getTiendas(),
        InventarioService.getAlmacenes(),
      ])

      setTodosModulos(modulos)
      setTiendas(Array.isArray(tiendasData) ? tiendasData : [])
      setAlmacenes(Array.isArray(almacenesData) ? almacenesData : [])

      try {
        const nombresModulos = await PermisosService.getTrabajadorModulosNombres(
          trabajadorCi
        )

        const tiendasIds = new Set(
          nombresModulos
            .filter((nombre) => nombre.startsWith("tienda:"))
            .map((nombre) => nombre.split(":")[1])
            .filter(Boolean)
        )
        const almacenesIds = new Set(
          nombresModulos
            .filter((nombre) => nombre.startsWith("almacen:"))
            .map((nombre) => nombre.split(":")[1])
            .filter(Boolean)
        )
        setTiendasSeleccionadas(tiendasIds)
        setAlmacenesSeleccionados(almacenesIds)

        const idsSeleccionados = new Set(
          modulos
            .filter((m) => !m.nombre.startsWith("tienda:") && !m.nombre.startsWith("almacen:"))
            .filter((m) => nombresModulos.includes(m.nombre))
            .map((m) => m.id)
        )
        setModulosSeleccionados(idsSeleccionados)
      } catch (error) {
        setModulosSeleccionados(new Set())
        setTiendasSeleccionadas(new Set())
        setAlmacenesSeleccionados(new Set())
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
    const todosIds = new Set(modulosGenerales.map(m => m.id))
    setModulosSeleccionados(todosIds)
  }

  const handleDeseleccionarTodo = () => {
    setModulosSeleccionados(new Set())
  }

  const modulosGenerales = useMemo(() => {
    return todosModulos.filter(
      (modulo) => !modulo.nombre.startsWith("tienda:") && !modulo.nombre.startsWith("almacen:")
    )
  }, [todosModulos])

  const filteredTiendas = useMemo(() => {
    const search = tiendaSearch.trim().toLowerCase()
    const base = search
      ? tiendas.filter((tienda) => tienda.nombre?.toLowerCase().includes(search))
      : tiendas
    return [...base].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
  }, [tiendas, tiendaSearch])

  const filteredAlmacenes = useMemo(() => {
    const search = almacenSearch.trim().toLowerCase()
    const base = search
      ? almacenes.filter((almacen) => almacen.nombre?.toLowerCase().includes(search))
      : almacenes
    return [...base].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
  }, [almacenes, almacenSearch])

  const handleSave = async () => {
    if (!trabajadorCi) return

    setIsSaving(true)
    try {
      const moduleNameToId = new Map(todosModulos.map((m) => [m.nombre, m.id]))

      const ensureModuloId = async (nombre: string) => {
        const existingId = moduleNameToId.get(nombre)
        if (existingId) return existingId
        const nuevoId = await PermisosService.createModulo({ nombre })
        moduleNameToId.set(nombre, nuevoId)
        setTodosModulos((prev) => [...prev, { id: nuevoId, nombre }])
        return nuevoId
      }

      const tiendaIds = Array.from(tiendasSeleccionadas)
      const almacenIds = Array.from(almacenesSeleccionados)

      const tiendaModulos = await Promise.all(
        tiendaIds.map((tiendaId) => ensureModuloId(`tienda:${tiendaId}`))
      )
      const almacenModulos = await Promise.all(
        almacenIds.map((almacenId) => ensureModuloId(`almacen:${almacenId}`))
      )

      const moduloIds = new Set([
        ...Array.from(modulosSeleccionados),
        ...tiendaModulos,
        ...almacenModulos,
      ])

      await PermisosService.updateTrabajadorPermisos(trabajadorCi, {
        modulo_ids: Array.from(moduloIds),
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
            {modulosGenerales.length === 0 ? (
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
                  {modulosGenerales.map((modulo) => (
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

            <div className="space-y-4 border-t pt-4">
              <div>
                <Label className="text-sm font-semibold text-gray-900">Permisos por tienda</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Selecciona las tiendas que este trabajador podrá gestionar.
                </p>
                <Input
                  value={tiendaSearch}
                  onChange={(event) => setTiendaSearch(event.target.value)}
                  placeholder="Buscar tienda..."
                  className="mt-2"
                />
                <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
                  {filteredTiendas.length === 0 ? (
                    <p className="text-sm text-gray-500 px-2 py-3">No hay tiendas disponibles</p>
                  ) : (
                    filteredTiendas.map((tienda) => (
                      <div
                        key={tienda.id || tienda.nombre}
                        className="flex items-center space-x-3 rounded-md px-2 py-2 hover:bg-gray-50"
                      >
                        <Checkbox
                          id={`tienda-${tienda.id}`}
                          checked={tiendasSeleccionadas.has(tienda.id || "")}
                          onCheckedChange={() => {
                            if (!tienda.id) return
                            const newSet = new Set(tiendasSeleccionadas)
                            if (newSet.has(tienda.id)) {
                              newSet.delete(tienda.id)
                            } else {
                              newSet.add(tienda.id)
                            }
                            setTiendasSeleccionadas(newSet)
                          }}
                        />
                        <Label htmlFor={`tienda-${tienda.id}`} className="flex-1 cursor-pointer">
                          {tienda.nombre}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-900">Permisos por almacén</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Selecciona los almacenes que este trabajador podrá gestionar.
                </p>
                <Input
                  value={almacenSearch}
                  onChange={(event) => setAlmacenSearch(event.target.value)}
                  placeholder="Buscar almacén..."
                  className="mt-2"
                />
                <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
                  {filteredAlmacenes.length === 0 ? (
                    <p className="text-sm text-gray-500 px-2 py-3">No hay almacenes disponibles</p>
                  ) : (
                    filteredAlmacenes.map((almacen) => (
                      <div
                        key={almacen.id || almacen.nombre}
                        className="flex items-center space-x-3 rounded-md px-2 py-2 hover:bg-gray-50"
                      >
                        <Checkbox
                          id={`almacen-${almacen.id}`}
                          checked={almacenesSeleccionados.has(almacen.id || "")}
                          onCheckedChange={() => {
                            if (!almacen.id) return
                            const newSet = new Set(almacenesSeleccionados)
                            if (newSet.has(almacen.id)) {
                              newSet.delete(almacen.id)
                            } else {
                              newSet.add(almacen.id)
                            }
                            setAlmacenesSeleccionados(newSet)
                          }}
                        />
                        <Label htmlFor={`almacen-${almacen.id}`} className="flex-1 cursor-pointer">
                          {almacen.nombre}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
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
            disabled={isSaving || isLoading}
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
