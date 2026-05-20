"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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
import {
  PermisosService,
  InventarioService,
  TrabajadorService,
} from "@/lib/api-services"
import { Loader2, Save, Copy, ChevronDown, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Almacen, Tienda } from "@/lib/inventario-types"
import { Input } from "@/components/shared/molecule/input"
import { useModulosSync } from "@/hooks/use-modulos-sync"
import {
  MODULOS_CATALOGO,
  MODULO_GRUPOS,
  type ModuloCatalogo,
  type ModuloGrupoKey,
} from "@/lib/modulos-catalogo"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shared/molecule/tabs"

interface TrabajadorPermisosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trabajadorCi: string | null
  trabajadorNombre: string | null
  onPermisosUpdated: () => void
}

/**
 * Diálogo rediseñado: muestra los módulos del catálogo agrupados por sección
 * (igual que el dashboard). Por cada módulo: checkbox principal "todo" más,
 * si tiene sub-permisos declarados, una lista de checkboxes independientes
 * para cada uno.
 *
 * Convenciones de selección:
 *   - Marcar el padre = asignar el permiso del módulo (acceso completo).
 *   - Marcar un sub-permiso sin el padre = solo ese sub-acceso.
 *
 * Persiste como nombres de módulo (string) que luego se mapean a OIDs via
 * la tabla `modulos` en BD.
 */
export function TrabajadorPermisosDialog({
  open,
  onOpenChange,
  trabajadorCi,
  trabajadorNombre,
  onPermisosUpdated,
}: TrabajadorPermisosDialogProps) {
  const { toast } = useToast()
  const { bdModulos, cargar: cargarBd, sincronizarFaltantes } = useModulosSync()

  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [tiendaSearch, setTiendaSearch] = useState("")
  const [almacenSearch, setAlmacenSearch] = useState("")

  // Estado interno: Set de NOMBRES (no IDs) de permisos asignados al trabajador.
  // Incluye claves del catálogo (leads, facturas, facturas/pagos-clientes,
  // trabajos:averias) y dinámicos (tienda:{id}, almacen:{id}).
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<Set<string>>(
    new Set(),
  )

  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Set<ModuloGrupoKey>>(
    new Set(),
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Copiar permisos
  const [trabajadoresConPermisos, setTrabajadoresConPermisos] = useState<
    { ci: string; nombre: string }[]
  >([])
  const [copyFromCi, setCopyFromCi] = useState<string>("")
  const [isCopying, setIsCopying] = useState(false)

  const loadData = useCallback(async () => {
    if (!trabajadorCi) return
    setIsLoading(true)
    try {
      // Asegurar que el catálogo está sincronizado en BD antes de cargar IDs.
      await sincronizarFaltantes()

      const [tiendasData, almacenesData, nombresAsignados, cisConPermisos, todosTrabajadores] =
        await Promise.all([
          InventarioService.getTiendas(),
          InventarioService.getAlmacenes(),
          PermisosService.getTrabajadorModulosNombres(trabajadorCi).catch(
            () => [] as string[],
          ),
          PermisosService.getTrabajadoresConPermisos().catch(() => [] as string[]),
          TrabajadorService.getAllTrabajadores().catch(() => []),
        ])

      setTiendas(Array.isArray(tiendasData) ? tiendasData : [])
      setAlmacenes(Array.isArray(almacenesData) ? almacenesData : [])
      setPermisosSeleccionados(new Set(nombresAsignados))

      // Lista para "copiar permisos": trabajadores con permisos asignados, excepto el actual.
      const mapNombres = new Map<string, string>(
        todosTrabajadores.map((t: any) => [t.CI ?? t.ci, t.nombre]),
      )
      const lista = cisConPermisos
        .filter((ci) => ci !== trabajadorCi)
        .map((ci) => ({ ci, nombre: mapNombres.get(ci) || ci }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
      setTrabajadoresConPermisos(lista)
      setCopyFromCi("")

      // Abrir por defecto las secciones que tienen algún permiso seleccionado.
      const seccionesConSeleccion = new Set<ModuloGrupoKey>()
      for (const m of MODULOS_CATALOGO) {
        const nombresDelModulo = [m.key, ...(m.subPermisos?.map((s) => s.key) ?? [])]
        if (nombresDelModulo.some((n) => nombresAsignados.includes(n))) {
          seccionesConSeleccion.add(m.grupo)
        }
      }
      setSeccionesAbiertas(seccionesConSeleccion)

      await cargarBd()
    } catch (error) {
      console.error("Error cargando permisos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del trabajador.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [trabajadorCi, sincronizarFaltantes, cargarBd, toast])

  useEffect(() => {
    if (open && trabajadorCi) {
      loadData()
    }
  }, [open, trabajadorCi, loadData])

  const togglePermiso = (nombre: string, on?: boolean) => {
    setPermisosSeleccionados((prev) => {
      const next = new Set(prev)
      const shouldAdd = on !== undefined ? on : !next.has(nombre)
      if (shouldAdd) next.add(nombre)
      else next.delete(nombre)
      return next
    })
  }

  const toggleSeccion = (key: ModuloGrupoKey) => {
    setSeccionesAbiertas((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const modulosPorGrupo = useMemo(() => {
    const map = new Map<ModuloGrupoKey, ModuloCatalogo[]>()
    for (const grupo of MODULO_GRUPOS) {
      map.set(
        grupo.key,
        MODULOS_CATALOGO.filter((m) => m.grupo === grupo.key),
      )
    }
    return map
  }, [])

  const filteredTiendas = useMemo(() => {
    const s = tiendaSearch.trim().toLowerCase()
    const base = s
      ? tiendas.filter((t) => t.nombre?.toLowerCase().includes(s))
      : tiendas
    return [...base].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
  }, [tiendas, tiendaSearch])

  const filteredAlmacenes = useMemo(() => {
    const s = almacenSearch.trim().toLowerCase()
    const base = s
      ? almacenes.filter((a) => a.nombre?.toLowerCase().includes(s))
      : almacenes
    return [...base].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
  }, [almacenes, almacenSearch])

  const handleCopyFrom = async () => {
    if (!copyFromCi) return
    setIsCopying(true)
    try {
      const nombres = await PermisosService.getTrabajadorModulosNombres(copyFromCi)
      setPermisosSeleccionados(new Set(nombres))
      toast({
        title: "Permisos copiados",
        description: `Se copiaron ${nombres.length} permiso(s). Puede ajustarlos antes de guardar.`,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "No se pudieron copiar los permisos.",
        variant: "destructive",
      })
    } finally {
      setIsCopying(false)
    }
  }

  const handleSave = async () => {
    if (!trabajadorCi) return
    setIsSaving(true)
    try {
      // Asegurar IDs en BD para todos los permisos seleccionados (incluyendo
      // dinámicos tienda:/almacen: que podrían no existir aún).
      const moduleNameToId = new Map(bdModulos.map((m) => [m.nombre, m.id]))
      const ensureModuloId = async (nombre: string): Promise<string> => {
        const existing = moduleNameToId.get(nombre)
        if (existing) return existing
        const nuevoId = await PermisosService.createModulo({ nombre })
        moduleNameToId.set(nombre, nuevoId)
        return nuevoId
      }

      const seleccionados = Array.from(permisosSeleccionados)
      const ids = await Promise.all(seleccionados.map((n) => ensureModuloId(n)))

      await PermisosService.updateTrabajadorPermisos(trabajadorCi, {
        modulo_ids: ids,
      })

      toast({
        title: "Permisos actualizados",
        description: `Permisos de ${trabajadorNombre} guardados correctamente.`,
      })
      onPermisosUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los permisos.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ─────────────────────── Render helpers ───────────────────────

  const renderModuloRow = (m: ModuloCatalogo) => {
    const tieneAcceso = permisosSeleccionados.has(m.key)
    const Icon = m.icon
    return (
      <div key={m.key} className="border rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50">
          <Checkbox
            id={`mod-${m.key}`}
            checked={tieneAcceso}
            onCheckedChange={(checked) => togglePermiso(m.key, Boolean(checked))}
          />
          <Icon className={`h-5 w-5 ${m.iconClass}`} />
          <Label
            htmlFor={`mod-${m.key}`}
            className="flex-1 cursor-pointer"
          >
            <div className="font-medium text-sm">{m.label}</div>
            <div className="text-xs text-gray-500 font-normal">{m.descripcion}</div>
          </Label>
          {tieneAcceso ? (
            <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
              acceso completo
            </span>
          ) : null}
        </div>

        {m.subPermisos && m.subPermisos.length > 0 ? (
          <div className="border-t bg-gray-50/50 px-4 py-2 space-y-1">
            <p className="text-xs text-gray-500 mb-1">
              Sub-permisos (asignables independientes del acceso completo):
            </p>
            {m.subPermisos.map((sp) => {
              const tieneSub = permisosSeleccionados.has(sp.key)
              return (
                <div
                  key={sp.key}
                  className="flex items-center gap-2 py-1 px-1 rounded hover:bg-white"
                >
                  <Checkbox
                    id={`sub-${sp.key}`}
                    checked={tieneSub || tieneAcceso}
                    disabled={tieneAcceso}
                    onCheckedChange={(checked) =>
                      togglePermiso(sp.key, Boolean(checked))
                    }
                  />
                  <Label
                    htmlFor={`sub-${sp.key}`}
                    className={`flex-1 cursor-pointer text-sm ${
                      tieneAcceso ? "text-gray-400" : "text-gray-700"
                    }`}
                  >
                    {sp.label}
                    <span className="ml-2 text-xs text-gray-400 font-mono">
                      {sp.key}
                    </span>
                  </Label>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

  const renderSeccion = (grupoKey: ModuloGrupoKey) => {
    const grupo = MODULO_GRUPOS.find((g) => g.key === grupoKey)
    if (!grupo) return null
    const modulos = modulosPorGrupo.get(grupoKey) ?? []
    if (modulos.length === 0) return null
    const abierta = seccionesAbiertas.has(grupoKey)
    const cuentaAsignados = modulos.filter((m) => {
      const subs = m.subPermisos?.map((s) => s.key) ?? []
      return [m.key, ...subs].some((n) => permisosSeleccionados.has(n))
    }).length

    return (
      <div key={grupoKey} className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSeccion(grupoKey)}
          className="w-full flex items-center justify-between px-3 py-2 bg-orange-50 hover:bg-orange-100 transition-colors"
        >
          <div className="flex items-center gap-2 text-left">
            {abierta ? (
              <ChevronDown className="h-4 w-4 text-orange-700" />
            ) : (
              <ChevronRight className="h-4 w-4 text-orange-700" />
            )}
            <div>
              <p className="font-semibold text-sm text-orange-900">
                {grupo.title || "Resultados Empresa"}
              </p>
              {grupo.subtitle ? (
                <p className="text-xs text-orange-700/80">{grupo.subtitle}</p>
              ) : null}
            </div>
          </div>
          <span className="text-xs font-medium text-orange-800 bg-white border border-orange-200 px-2 py-0.5 rounded">
            {cuentaAsignados}/{modulos.length}
          </span>
        </button>
        {abierta ? (
          <div className="p-2 space-y-2 bg-white">
            {modulos.map(renderModuloRow)}
          </div>
        ) : null}
      </div>
    )
  }

  const tiendaIdsSeleccionadas = useMemo(() => {
    const out = new Set<string>()
    for (const n of permisosSeleccionados) {
      if (n.startsWith("tienda:")) out.add(n.slice("tienda:".length))
    }
    return out
  }, [permisosSeleccionados])

  const almacenIdsSeleccionados = useMemo(() => {
    const out = new Set<string>()
    for (const n of permisosSeleccionados) {
      if (n.startsWith("almacen:")) out.add(n.slice("almacen:".length))
    }
    return out
  }, [permisosSeleccionados])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permisos de {trabajadorNombre}</DialogTitle>
          <DialogDescription>CI: {trabajadorCi}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-600" />
            <p className="text-sm text-gray-500 mt-2">Cargando permisos…</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Copiar permisos de otro */}
            {trabajadoresConPermisos.length > 0 ? (
              <div className="flex items-end gap-2 border rounded-lg p-3 bg-blue-50/30 border-blue-200">
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">
                    Copiar permisos de otro trabajador
                  </Label>
                  <Select value={copyFromCi} onValueChange={setCopyFromCi}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue placeholder="Seleccionar trabajador…" />
                    </SelectTrigger>
                    <SelectContent>
                      {trabajadoresConPermisos.map((t) => (
                        <SelectItem key={t.ci} value={t.ci}>
                          {t.nombre}{" "}
                          <span className="text-gray-400 text-xs">({t.ci})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyFrom}
                  disabled={!copyFromCi || isCopying}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  {isCopying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">Copiar</span>
                </Button>
              </div>
            ) : null}

            <Tabs defaultValue="modulos" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="modulos">Módulos</TabsTrigger>
                <TabsTrigger value="tiendas">
                  Tiendas ({tiendaIdsSeleccionadas.size})
                </TabsTrigger>
                <TabsTrigger value="almacenes">
                  Almacenes ({almacenIdsSeleccionados.size})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="modulos" className="space-y-2 mt-3">
                {MODULO_GRUPOS.map((g) => renderSeccion(g.key))}
              </TabsContent>

              <TabsContent value="tiendas" className="mt-3 space-y-2">
                <Input
                  value={tiendaSearch}
                  onChange={(e) => setTiendaSearch(e.target.value)}
                  placeholder="Buscar tienda…"
                />
                <div className="max-h-[50vh] overflow-y-auto rounded-lg border p-2 space-y-1">
                  {filteredTiendas.length === 0 ? (
                    <p className="text-sm text-gray-500 px-2 py-3 text-center">
                      No hay tiendas disponibles
                    </p>
                  ) : (
                    filteredTiendas.map((tienda) => {
                      const id = tienda.id || ""
                      if (!id) return null
                      const nombre = `tienda:${id}`
                      const marcado = permisosSeleccionados.has(nombre)
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 rounded px-2 py-2 hover:bg-gray-50"
                        >
                          <Checkbox
                            id={`tienda-${id}`}
                            checked={marcado}
                            onCheckedChange={(c) =>
                              togglePermiso(nombre, Boolean(c))
                            }
                          />
                          <Label
                            htmlFor={`tienda-${id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            {tienda.nombre}
                          </Label>
                        </div>
                      )
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="almacenes" className="mt-3 space-y-2">
                <Input
                  value={almacenSearch}
                  onChange={(e) => setAlmacenSearch(e.target.value)}
                  placeholder="Buscar almacén…"
                />
                <div className="max-h-[50vh] overflow-y-auto rounded-lg border p-2 space-y-1">
                  {filteredAlmacenes.length === 0 ? (
                    <p className="text-sm text-gray-500 px-2 py-3 text-center">
                      No hay almacenes disponibles
                    </p>
                  ) : (
                    filteredAlmacenes.map((almacen) => {
                      const id = almacen.id || ""
                      if (!id) return null
                      const nombre = `almacen:${id}`
                      const marcado = permisosSeleccionados.has(nombre)
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 rounded px-2 py-2 hover:bg-gray-50"
                        >
                          <Checkbox
                            id={`almacen-${id}`}
                            checked={marcado}
                            onCheckedChange={(c) =>
                              togglePermiso(nombre, Boolean(c))
                            }
                          />
                          <Label
                            htmlFor={`almacen-${id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            {almacen.nombre}
                          </Label>
                        </div>
                      )
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="text-xs text-gray-500 italic border-t pt-2">
              Total seleccionados: {permisosSeleccionados.size} permiso(s).
              Marcar un módulo otorga acceso completo (todas sus funcionalidades).
              Marcar solo sub-permisos da acceso únicamente a esas
              funcionalidades específicas.
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
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando…
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
