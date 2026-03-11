"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { DollarSign, Truck, Ship, Percent, ArrowRightLeft, History, Loader2, CheckCircle2 } from "lucide-react"
import type { FichaCosto } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

interface FichaDetalleCardProps {
  ficha: FichaCosto
  onCompararPrecio: () => void
  onAplicarPrecio: () => void
  onVerHistorial: () => void
  loadingAction?: boolean
}

function formatModo(modo: string): string {
  switch (modo) {
    case 'unidad': return 'Por unidad'
    case 'lote': return 'Por lote'
    case 'contenedor': return 'Por contenedor'
    default: return modo
  }
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

export function FichaDetalleCard({ ficha, onCompararPrecio, onAplicarPrecio, onVerHistorial, loadingAction }: FichaDetalleCardProps) {
  return (
    <Card className="border-l-4 border-l-teal-600">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-600" />
            Ficha Activa
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-teal-100 text-teal-800">
              Versión {ficha.version}
            </Badge>
            <Badge className={ficha.estado === 'activa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
              {ficha.estado}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Vigente desde: {formatDate(ficha.vigente_desde)}
          {ficha.vigente_hasta && ` — hasta: ${formatDate(ficha.vigente_hasta)}`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen de costos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <DollarSign className="h-4 w-4 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Costo Base</p>
            <p className="text-sm font-bold">${ficha.costo_unitario.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <Truck className="h-4 w-4 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Transporte</p>
            <p className="text-sm font-bold">${ficha.costo_transportacion.precio_total.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400">{formatModo(ficha.costo_transportacion.modo)} ({ficha.costo_transportacion.cantidad_base}u)</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <Ship className="h-4 w-4 text-indigo-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Envío</p>
            <p className="text-sm font-bold">${ficha.costo_envio.precio_total.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400">{formatModo(ficha.costo_envio.modo)} ({ficha.costo_envio.cantidad_base}u)</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <Percent className="h-4 w-4 text-amber-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Ganancia</p>
            <p className="text-sm font-bold">{ficha.porcentaje_ganancia}%</p>
          </div>
        </div>

        {/* Otros costos */}
        {ficha.otros_costos && ficha.otros_costos.length > 0 && (
          <div className="border rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Otros costos:</p>
            <div className="space-y-1">
              {ficha.otros_costos.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{c.tipo_costo}</span>
                  <span className="font-medium">
                    ${c.detalle.precio_total.toFixed(2)} ({formatModo(c.detalle.modo)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resultados calculados */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-teal-600">Costo Real Unitario</p>
              <p className="text-lg font-bold text-teal-800">${ficha.costo_real_unitario.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-teal-600">Ganancia Unitaria</p>
              <p className="text-lg font-bold text-green-700">${ficha.ganancia_unitaria.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-teal-600">Precio de Venta</p>
              <p className="text-lg font-bold text-teal-900">${ficha.precio_venta_calculado.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCompararPrecio}
            disabled={loadingAction}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {loadingAction ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRightLeft className="h-4 w-4 mr-1" />}
            Comparar con precio material
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onVerHistorial}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <History className="h-4 w-4 mr-1" />
            Historial
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
