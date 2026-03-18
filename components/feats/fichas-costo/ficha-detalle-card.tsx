"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { Percent, ArrowRightLeft, History, Loader2, CheckCircle2, TrendingUp, DollarSign, Shield, ShoppingCart, Receipt, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import type { FichaCosto } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

interface FichaDetalleCardProps {
  ficha: FichaCosto
  onCompararPrecio: () => void
  onAplicarPrecio: () => void
  onVerHistorial: () => void
  loadingAction?: boolean
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

const fmt = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function FichaDetalleCard({ ficha, onCompararPrecio, onAplicarPrecio, onVerHistorial, loadingAction }: FichaDetalleCardProps) {
  const [desgloseAbierto, setDesgloseAbierto] = useState(false)
  const usoPrecioAnterior =
    ficha.precio_anterior_ficha != null &&
    ficha.precio_venta_calculado === ficha.precio_anterior_ficha

  return (
    <Card className="border-l-4 border-l-teal-600">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-600" />
            Ficha Activa
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-teal-100 text-teal-800">v{ficha.version}</Badge>
            <Badge className={ficha.estado === 'activa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
              {ficha.estado}
            </Badge>
            {usoPrecioAnterior && (
              <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Precio protegido
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Vigente desde: {formatDate(ficha.vigente_desde)}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Desglose del cálculo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <DollarSign className="h-4 w-4 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Precio base</p>
            <p className="text-sm font-bold text-gray-800">${ficha.precio_base.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400">Precio al crear ficha</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <Percent className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Porcentaje</p>
            <p className="text-sm font-bold text-amber-600">+{ficha.porcentaje}%</p>
            <p className="text-[10px] text-gray-400">+${(ficha.precio_calculado - ficha.precio_base).toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center col-span-2 sm:col-span-1">
            <TrendingUp className="h-4 w-4 text-slate-500 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Precio calculado</p>
            <p className="text-sm font-bold text-slate-700">${ficha.precio_calculado.toFixed(2)}</p>
            <p className="text-[10px] text-gray-400">precio_base × (1 + %)</p>
          </div>
        </div>

        {/* Desglose */}
        {ficha.desglose && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setDesgloseAbierto((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
            >
              <span>Desglose del cálculo</span>
              {desgloseAbierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {desgloseAbierto && (
              <div className="divide-y divide-gray-100">
                {/* Mercancía */}
                <div className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5" /> Mercancía
                  </p>
                  <div className="space-y-1">
                    {ficha.desglose.mercancia.map((m, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto] text-xs text-gray-600">
                        <span>{m.nombre} <span className="text-gray-400">× {m.cantidad} @ ${fmt(m.precio_unitario)}</span></span>
                        <span className="font-semibold text-gray-800">${fmt(m.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs font-bold text-blue-700 pt-1 border-t border-blue-100">
                    <span>Total mercancía</span>
                    <span>${fmt(ficha.desglose.total_mercancia)}</span>
                  </div>
                </div>

                {/* Gastos */}
                <div className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5" /> Gastos adicionales
                  </p>
                  <div className="space-y-1">
                    {ficha.desglose.gastos.map((g, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto] text-xs text-gray-600">
                        <span>{g.nombre}</span>
                        <span className="font-semibold text-gray-800">${fmt(g.valor)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs font-bold text-amber-700 pt-1 border-t border-amber-100">
                    <span>Total gastos</span>
                    <span>${fmt(ficha.desglose.total_gastos)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ficha anterior (si aplicó la protección del máximo) */}
        {ficha.precio_anterior_ficha != null && (
          <div className={`rounded-lg p-3 border text-sm flex items-center justify-between gap-2 ${
            usoPrecioAnterior
              ? 'bg-amber-50 border-amber-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <Shield className={`h-4 w-4 flex-shrink-0 ${usoPrecioAnterior ? 'text-amber-500' : 'text-gray-400'}`} />
              <div>
                <p className="text-xs font-semibold text-gray-600">Ficha anterior</p>
                <p className="text-xs text-gray-500">
                  Precio de venta anterior: <span className="font-bold">${ficha.precio_anterior_ficha.toFixed(2)}</span>
                </p>
              </div>
            </div>
            {usoPrecioAnterior ? (
              <Badge className="bg-amber-100 text-amber-700 text-[10px] shrink-0">Se usó este precio</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-500 text-[10px] shrink-0">Superado por nuevo cálculo</Badge>
            )}
          </div>
        )}

        {/* Precio final de venta */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
          <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-1">
            Precio de Venta Final
          </p>
          <p className="text-3xl font-bold text-teal-900">
            ${ficha.precio_venta_calculado.toFixed(2)}
          </p>
          <p className="text-[11px] text-teal-500 mt-1">
            {usoPrecioAnterior
              ? 'Mantenido de la ficha anterior (mayor que el calculado)'
              : 'Precio calculado con el porcentaje aplicado'}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onCompararPrecio}
            disabled={loadingAction}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {loadingAction ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <ArrowRightLeft className="h-4 w-4 mr-1" />
            )}
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
