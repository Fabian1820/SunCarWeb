"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { AlertTriangle, CheckCircle2, Loader2, ArrowRight } from "lucide-react"
import type { ComparacionPrecio } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

interface ComparacionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comparacion: ComparacionPrecio | null
  onAplicarPrecio: () => void
  loadingAction?: boolean
}

export function ComparacionDialog({ open, onOpenChange, comparacion, onAplicarPrecio, loadingAction }: ComparacionDialogProps) {
  if (!comparacion) return null

  const { precio_actual_material, precio_calculado_ficha, diferencia_absoluta, diferencia_porcentual, requiere_actualizacion } = comparacion

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {requiere_actualizacion ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            Comparación de Precio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Precio actual del material</p>
              <p className="text-xl font-bold text-gray-900">${precio_actual_material.toFixed(2)}</p>
            </div>
            <div className="bg-teal-50 rounded-lg p-4 text-center">
              <p className="text-xs text-teal-600 mb-1">Precio calculado (ficha)</p>
              <p className="text-xl font-bold text-teal-900">${precio_calculado_ficha.toFixed(2)}</p>
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Diferencia absoluta:</span>
              <span className={`text-sm font-bold ${diferencia_absoluta > 0 ? 'text-red-600' : diferencia_absoluta < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {diferencia_absoluta > 0 ? '+' : ''}${diferencia_absoluta.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Diferencia porcentual:</span>
              <span className={`text-sm font-bold ${diferencia_porcentual > 0 ? 'text-red-600' : diferencia_porcentual < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {diferencia_porcentual > 0 ? '+' : ''}{diferencia_porcentual.toFixed(2)}%
              </span>
            </div>
          </div>

          {requiere_actualizacion ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium mb-2">
                El precio del material difiere del precio calculado en la ficha.
              </p>
              <Button
                onClick={onAplicarPrecio}
                disabled={loadingAction}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              >
                {loadingAction ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Aplicar precio al material (${precio_calculado_ficha.toFixed(2)})
              </Button>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                El precio del material coincide con la ficha de costo.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
