"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/shared/molecule/dialog"
import { Badge } from "@/components/shared/atom/badge"
import { X, Info, RefreshCw } from "lucide-react"
import { obtenerFuentesDeLocalStorage, eliminarFuente } from "@/lib/utils/fuentes-sync"
import { migrarFuentesDesdeDB } from "@/lib/utils/migrate-fuentes"
import { useToast } from "@/hooks/use-toast"

const FUENTES_BASE = ['Página Web', 'Instagram', 'Facebook', 'Directo', 'Mensaje de Whatsapp', 'Visita']

export function FuentesManager() {
  const [open, setOpen] = useState(false)
  const [fuentesPersonalizadas, setFuentesPersonalizadas] = useState<string[]>([])
  const [sincronizando, setSincronizando] = useState(false)
  const { toast } = useToast()

  const cargarFuentes = () => {
    const fuentes = obtenerFuentesDeLocalStorage()
    setFuentesPersonalizadas(fuentes)
  }

  useEffect(() => {
    if (open) {
      cargarFuentes()
    }
  }, [open])

  const eliminarFuenteHandler = (fuente: string) => {
    eliminarFuente(fuente)
    cargarFuentes() // Recargar la lista
    
    toast({
      title: "Fuente eliminada",
      description: `La fuente "${fuente}" ha sido eliminada y no volverá a aparecer.`,
    })
  }

  const sincronizarFuentes = async () => {
    setSincronizando(true)
    try {
      const resultado = await migrarFuentesDesdeDB()
      
      if (resultado.success) {
        cargarFuentes() // Recargar la lista
        toast({
          title: "Sincronización completada",
          description: `Se encontraron ${resultado.fuentesPersonalizadas} fuentes personalizadas en la base de datos.`,
        })
      } else {
        toast({
          title: "Error en la sincronización",
          description: resultado.error || "No se pudo completar la sincronización.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al sincronizar las fuentes.",
        variant: "destructive",
      })
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Gestionar Fuentes</span>
          <span className="sm:hidden">Fuentes</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Gestión de Fuentes</span>
            <Button
              variant="outline"
              size="sm"
              onClick={sincronizarFuentes}
              disabled={sincronizando}
              className="ml-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${sincronizando ? 'animate-spin' : ''}`} />
              {sincronizando ? 'Sincronizando...' : 'Sincronizar BD'}
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {/* Fuentes Base */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Fuentes Predefinidas</h3>
            <div className="flex flex-wrap gap-2">
              {FUENTES_BASE.map(fuente => (
                <Badge key={fuente} variant="secondary" className="text-sm py-1.5 px-3">
                  {fuente}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Estas fuentes están siempre disponibles y no se pueden eliminar.
            </p>
          </div>

          {/* Fuentes Personalizadas */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-gray-700">
              Fuentes Personalizadas ({fuentesPersonalizadas.length})
            </h3>
            {fuentesPersonalizadas.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {fuentesPersonalizadas.map(fuente => (
                    <Badge 
                      key={fuente} 
                      variant="default" 
                      className="text-sm py-1.5 px-3 pr-1 flex items-center gap-1"
                    >
                      <span className="max-w-[200px] truncate">{fuente}</span>
                      <button
                        onClick={() => eliminarFuenteHandler(fuente)}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors flex-shrink-0"
                        title="Eliminar fuente"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Haz clic en la X para eliminar una fuente. Los cambios se aplican automáticamente.
                </p>
              </>
            ) : (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
                <p className="font-medium mb-2">No hay fuentes personalizadas</p>
                <p className="text-xs">Se agregarán automáticamente cuando:</p>
                <ul className="mt-2 text-xs list-disc list-inside space-y-1">
                  <li>Cargues leads o clientes con fuentes personalizadas</li>
                  <li>Crees una nueva fuente usando "✏️ Otra (escribir manualmente)"</li>
                  <li>Hagas clic en "Sincronizar BD" para cargar todas las existentes</li>
                </ul>
              </div>
            )}
          </div>

          {/* Información */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">¿Cómo funciona?</p>
                <ul className="space-y-1 text-xs">
                  <li>• Las fuentes se sincronizan automáticamente al cargar leads y clientes</li>
                  <li>• Usa "Sincronizar BD" para cargar todas las fuentes existentes manualmente</li>
                  <li>• Los cambios se aplican en tiempo real en todos los formularios</li>
                  <li>• Las fuentes se guardan en tu navegador (localStorage)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button onClick={() => setOpen(false)} className="w-full sm:w-auto">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
