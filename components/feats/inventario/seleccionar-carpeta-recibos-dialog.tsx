"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { FolderOpen, AlertCircle, CheckCircle2 } from "lucide-react"
import { ReciboService } from "@/lib/services/feats/caja/recibo-service"
import { Alert, AlertDescription } from "@/components/shared/atom/alert"

interface SeleccionarCarpetaRecibosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCarpetaSeleccionada: () => void
  onContinuarSinCarpeta: () => void
}

export function SeleccionarCarpetaRecibosDialog({
  open,
  onOpenChange,
  onCarpetaSeleccionada,
  onContinuarSinCarpeta,
}: SeleccionarCarpetaRecibosDialogProps) {
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState(false)
  const [nombreCarpeta, setNombreCarpeta] = useState("")
  const [error, setError] = useState("")
  const [seleccionando, setSeleccionando] = useState(false)

  const handleSeleccionarCarpeta = async () => {
    try {
      setSeleccionando(true)
      setError("")
      
      const directorio = await ReciboService.seleccionarCarpetaRecibos()
      
      if (directorio) {
        setCarpetaSeleccionada(true)
        setNombreCarpeta(directorio.name)
      }
    } catch (err: any) {
      setError(err.message || "Error al seleccionar carpeta")
    } finally {
      setSeleccionando(false)
    }
  }

  const handleContinuar = () => {
    if (carpetaSeleccionada) {
      onCarpetaSeleccionada()
    }
    onOpenChange(false)
  }

  const handleContinuarSinCarpeta = () => {
    onContinuarSinCarpeta()
    onOpenChange(false)
  }

  const soportaSeleccion = ReciboService.soportaSeleccionCarpeta()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Configurar carpeta de recibos
          </DialogTitle>
          <DialogDescription>
            Selecciona una carpeta donde se guardarán automáticamente los recibos de venta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!soportaSeleccion ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tu navegador no soporta la selección de carpetas. 
                Usa Chrome, Edge o un navegador compatible para esta función.
                Los recibos se descargarán normalmente.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                
                {carpetaSeleccionada ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Carpeta seleccionada</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {nombreCarpeta}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSeleccionarCarpeta}
                      disabled={seleccionando}
                      className="mt-2"
                    >
                      Cambiar carpeta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">
                      Los recibos se guardarán automáticamente en la carpeta que selecciones
                    </p>
                    <Button
                      onClick={handleSeleccionarCarpeta}
                      disabled={seleccionando}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {seleccionando ? "Seleccionando..." : "Seleccionar carpeta"}
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  ℹ️ Información importante
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Los recibos se guardarán automáticamente al completar cada venta</li>
                  <li>• Puedes cambiar la carpeta en cualquier momento</li>
                  <li>• El navegador recordará tu selección para la próxima sesión</li>
                  <li>• También podrás descargar recibos manualmente desde el historial</li>
                </ul>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleContinuar}
              disabled={!carpetaSeleccionada && soportaSeleccion}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              Continuar
            </Button>
            <Button
              variant="outline"
              onClick={handleContinuarSinCarpeta}
              className="flex-1"
            >
              Omitir
            </Button>
          </div>

          {soportaSeleccion && (
            <p className="text-xs text-gray-500 text-center">
              Si omites este paso, los recibos se descargarán normalmente en tu carpeta de descargas
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
