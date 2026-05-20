"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Loader2, RefreshCw, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useModulosSync } from "@/hooks/use-modulos-sync"

interface ModulosSyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSynced: () => void
}

export function ModulosSyncDialog({
  open,
  onOpenChange,
  onSynced,
}: ModulosSyncDialogProps) {
  const { toast } = useToast()
  const {
    bdModulos,
    faltantes,
    huerfanos,
    loading,
    syncing,
    cargar,
    sincronizarFaltantes,
    eliminarHuerfano,
  } = useModulosSync()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      cargar().catch(() => null)
    }
  }, [open, cargar])

  const handleSincronizar = async () => {
    try {
      const creados = await sincronizarFaltantes()
      toast({
        title: "Sincronización completa",
        description:
          creados > 0
            ? `Se crearon ${creados} módulo(s) en BD desde el catálogo.`
            : "Todos los módulos del catálogo ya existen en BD.",
      })
      onSynced()
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Falló la sincronización con BD.",
        variant: "destructive",
      })
    }
  }

  const handleEliminarHuerfano = async (id: string, nombre: string) => {
    if (
      !confirm(
        `Eliminar el módulo "${nombre}" de BD? Está en BD pero no en el catálogo del frontend.\n\nSi algún trabajador lo tiene asignado, perderá ese permiso.`,
      )
    ) {
      return
    }
    setDeletingId(id)
    try {
      await eliminarHuerfano(id)
      toast({
        title: "Módulo eliminado",
        description: `Se eliminó "${nombre}" de BD.`,
      })
      onSynced()
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: `No se pudo eliminar "${nombre}".`,
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sincronización Catálogo ↔ BD</DialogTitle>
          <DialogDescription>
            Mantén alineados los módulos del frontend (catálogo) con los de la
            base de datos.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-600" />
            <p className="text-sm text-gray-500 mt-2">Cargando estado…</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-xs text-gray-500">En BD</p>
                <p className="text-2xl font-semibold">{bdModulos.length}</p>
              </div>
              <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
                <p className="text-xs text-amber-700">Faltan crear</p>
                <p className="text-2xl font-semibold text-amber-800">
                  {faltantes.length}
                </p>
              </div>
              <div className="border rounded-lg p-3 bg-red-50 border-red-200">
                <p className="text-xs text-red-700">Huérfanos en BD</p>
                <p className="text-2xl font-semibold text-red-800">
                  {huerfanos.length}
                </p>
              </div>
            </div>

            {/* Botón sincronizar faltantes */}
            <div className="flex items-center justify-between border rounded-lg p-3 bg-white">
              <div className="flex items-start gap-2">
                {faltantes.length === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {faltantes.length === 0
                      ? "Catálogo sincronizado"
                      : `${faltantes.length} módulo(s) por crear en BD`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {faltantes.length === 0
                      ? "Todos los módulos del catálogo ya existen en BD."
                      : "El catálogo del frontend tiene módulos que no están en BD."}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleSincronizar}
                disabled={syncing || faltantes.length === 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1.5">Sincronizar</span>
              </Button>
            </div>

            {/* Lista de faltantes */}
            {faltantes.length > 0 && (
              <div className="border rounded-lg">
                <div className="bg-amber-50 px-3 py-2 border-b border-amber-200">
                  <p className="text-sm font-medium text-amber-800">
                    Faltantes en BD ({faltantes.length})
                  </p>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y">
                  {faltantes.map((nombre) => (
                    <div
                      key={nombre}
                      className="px-3 py-2 text-sm font-mono text-gray-700"
                    >
                      {nombre}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de huérfanos */}
            {huerfanos.length > 0 && (
              <div className="border rounded-lg">
                <div className="bg-red-50 px-3 py-2 border-b border-red-200">
                  <p className="text-sm font-medium text-red-800">
                    Huérfanos en BD ({huerfanos.length})
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Módulos que están en BD pero no en el catálogo del frontend.
                    Probablemente fueron eliminados o renombrados.
                  </p>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y">
                  {huerfanos.map((m) => (
                    <div
                      key={m.id}
                      className="px-3 py-2 flex items-center justify-between"
                    >
                      <span className="text-sm font-mono text-gray-700">
                        {m.nombre}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarHuerfano(m.id, m.nombre)}
                        disabled={deletingId === m.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingId === m.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 italic">
              Los permisos dinámicos por instancia (tienda:&#123;id&#125;,
              almacen:&#123;id&#125;) no se listan aquí: se crean automáticamente
              al dar de alta tiendas o almacenes.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
