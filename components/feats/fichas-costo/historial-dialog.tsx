"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Badge } from "@/components/shared/atom/badge"
import { History, Loader2 } from "lucide-react"
import type { FichaCosto } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

interface HistorialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  historial: FichaCosto[]
  loading?: boolean
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function HistorialDialog({ open, onOpenChange, historial, loading }: HistorialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-600" />
            Historial de Versiones
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600 mr-2" />
            <span className="text-gray-600">Cargando historial...</span>
          </div>
        ) : historial.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No hay versiones anteriores
          </div>
        ) : (
          <div className="space-y-3">
            {historial.map((ficha, idx) => (
              <div
                key={ficha._id || ficha.id || idx}
                className={`border rounded-lg p-4 ${ficha.estado === 'activa' ? 'border-teal-300 bg-teal-50/50' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Versión {ficha.version}</span>
                    <Badge className={ficha.estado === 'activa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                      {ficha.estado}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(ficha.vigente_desde)}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Costo base:</span>
                    <span className="ml-1 font-medium">${ficha.costo_unitario.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Costo real:</span>
                    <span className="ml-1 font-medium">${ficha.costo_real_unitario.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Ganancia:</span>
                    <span className="ml-1 font-medium">{ficha.porcentaje_ganancia}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">P. Venta:</span>
                    <span className="ml-1 font-bold text-teal-700">${ficha.precio_venta_calculado.toFixed(2)}</span>
                  </div>
                </div>

                {/* Auditoría */}
                {ficha.auditoria && ficha.auditoria.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-semibold mb-1">AUDITORÍA</p>
                    {ficha.auditoria.map((a, ai) => (
                      <div key={ai} className="text-[11px] text-gray-500 flex items-center gap-1">
                        <span className="font-medium">{a.accion}</span>
                        {a.usuario && <span>por {a.usuario}</span>}
                        <span>— {formatDate(a.fecha)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
