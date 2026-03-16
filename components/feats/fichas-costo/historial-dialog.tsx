"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Badge } from "@/components/shared/atom/badge"
import { History, Loader2, Shield, TrendingUp } from "lucide-react"
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
          <div className="text-center py-12 text-gray-500">No hay versiones anteriores</div>
        ) : (
          <div className="space-y-3">
            {historial.map((ficha, idx) => {
              const usoPrecioAnterior =
                ficha.precio_anterior_ficha != null &&
                ficha.precio_venta_calculado === ficha.precio_anterior_ficha

              return (
                <div
                  key={ficha._id || ficha.id || idx}
                  className={`border rounded-lg p-4 ${
                    ficha.estado === 'activa'
                      ? 'border-teal-300 bg-teal-50/50'
                      : 'border-gray-200'
                  }`}
                >
                  {/* Cabecera */}
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Versión {ficha.version}</span>
                      <Badge className={ficha.estado === 'activa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}>
                        {ficha.estado}
                      </Badge>
                      {usoPrecioAnterior && (
                        <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1 text-[10px]">
                          <Shield className="h-2.5 w-2.5" />
                          Precio protegido
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(ficha.vigente_desde)}</span>
                  </div>

                  {/* Desglose */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                    <div className="bg-white rounded p-2 border border-gray-100">
                      <p className="text-gray-400">Precio base</p>
                      <p className="font-bold text-gray-700">${ficha.precio_base.toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-gray-100">
                      <p className="text-gray-400">Porcentaje</p>
                      <p className="font-bold text-amber-600">+{ficha.porcentaje}%</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-gray-100">
                      <p className="text-gray-400">Calculado</p>
                      <p className="font-bold text-slate-600 flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        ${ficha.precio_calculado.toFixed(2)}
                      </p>
                    </div>
                    <div className={`rounded p-2 border ${ficha.estado === 'activa' ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-100'}`}>
                      <p className="text-gray-400">P. Venta final</p>
                      <p className="font-bold text-teal-700">${ficha.precio_venta_calculado.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Precio anterior si lo hubo */}
                  {ficha.precio_anterior_ficha != null && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                      <Shield className="h-3 w-3 text-amber-400" />
                      Ficha anterior: <span className="font-medium">${ficha.precio_anterior_ficha.toFixed(2)}</span>
                      {usoPrecioAnterior
                        ? ' → se mantuvo el precio anterior (era mayor)'
                        : ' → superado por el nuevo cálculo'}
                    </div>
                  )}

                  {/* Auditoría */}
                  {ficha.auditoria && ficha.auditoria.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 font-semibold mb-1">AUDITORÍA</p>
                      {ficha.auditoria.map((a, ai) => (
                        <div key={ai} className="text-[11px] text-gray-500 flex items-center gap-1">
                          <span className="font-medium">{a.tipo}</span>
                          {a.nombre && <span>por {a.nombre}</span>}
                          <span>— {formatDate(a.fecha)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
