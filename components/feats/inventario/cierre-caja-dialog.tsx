"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { DollarSign, Minus, Plus } from "lucide-react"
import type { SesionCaja } from "@/lib/types/feats/caja-types"

interface Denominacion {
  valor: number
  cantidad: number
}

interface CierreCajaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sesion: SesionCaja | null
  onConfirm: (efectivoCierre: number, notas: string) => Promise<void>
}

export function CierreCajaDialog({
  open,
  onOpenChange,
  sesion,
  onConfirm,
}: CierreCajaDialogProps) {
  const [efectivoCierre, setEfectivoCierre] = useState("")
  const [notas, setNotas] = useState("")
  const [procesando, setProcesando] = useState(false)
  const [isCalculadoraOpen, setIsCalculadoraOpen] = useState(false)

  const [denominaciones, setDenominaciones] = useState<Denominacion[]>([
    { valor: 100, cantidad: 0 },
    { valor: 50, cantidad: 0 },
    { valor: 20, cantidad: 0 },
    { valor: 10, cantidad: 0 },
    { valor: 5, cantidad: 0 },
    { valor: 2, cantidad: 0 },
    { valor: 1, cantidad: 0 },
    { valor: 0.25, cantidad: 0 },
    { valor: 0.10, cantidad: 0 },
    { valor: 0.05, cantidad: 0 },
    { valor: 0.01, cantidad: 0 },
  ])

  const calcularTotal = () => {
    return denominaciones.reduce((total, den) => total + (den.valor * den.cantidad), 0)
  }

  const handleCantidadChange = (index: number, delta: number) => {
    setDenominaciones(prev => {
      const newDen = [...prev]
      const newCantidad = Math.max(0, newDen[index].cantidad + delta)
      newDen[index] = { ...newDen[index], cantidad: newCantidad }
      return newDen
    })
  }

  const handleConfirmarCalculadora = () => {
    const total = calcularTotal()
    setEfectivoCierre(total.toFixed(2))
    
    // Generar el desglose de denominaciones
    const desglose = denominaciones
      .filter(den => den.cantidad > 0)
      .map(den => `${den.cantidad} x $${den.valor.toFixed(2)}`)
      .join('\n')
    
    setNotas(desglose)
    setIsCalculadoraOpen(false)
  }

  const efectivoEsperado = sesion
    ? sesion.efectivo_apertura + sesion.total_efectivo
    : 0

  const diferencia = efectivoCierre
    ? parseFloat(efectivoCierre) - efectivoEsperado
    : 0

  const handleConfirm = async () => {
    const efectivo = parseFloat(efectivoCierre)
    if (isNaN(efectivo) || efectivo < 0) {
      return
    }

    try {
      setProcesando(true)
      await onConfirm(efectivo, notas)
      // Limpiar formulario
      setEfectivoCierre("")
      setNotas("")
      setDenominaciones(prev => prev.map(d => ({ ...d, cantidad: 0 })))
    } catch (error) {
      // El error ya se muestra en el hook
    } finally {
      setProcesando(false)
    }
  }

  const handleCancel = () => {
    setEfectivoCierre("")
    setNotas("")
    setDenominaciones(prev => prev.map(d => ({ ...d, cantidad: 0 })))
    onOpenChange(false)
  }

  if (!sesion) return null

  return (
    <>
      <Dialog open={open && !isCalculadoraOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Cierre de caja</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Resumen del día */}
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <h3 className="font-semibold text-lg mb-4">Resumen del día</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Sesión</p>
                  <p className="text-lg font-semibold">{sesion.numero_sesion}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Efectivo inicial</p>
                  <p className="text-lg font-semibold">${sesion.efectivo_apertura.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total ventas</p>
                  <p className="text-lg font-semibold text-emerald-600">${sesion.total_ventas.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Efectivo en ventas</p>
                  <p className="text-lg font-semibold">${sesion.total_efectivo.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Tarjeta</p>
                  <p className="text-lg font-semibold">${sesion.total_tarjeta.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Transferencia</p>
                  <p className="text-lg font-semibold">${sesion.total_transferencia.toFixed(2)}</p>
                </div>
                <div className="col-span-2 pt-2 border-t">
                  <p className="text-sm text-slate-600">Efectivo esperado</p>
                  <p className="text-2xl font-bold text-blue-600">${efectivoEsperado.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Conteo de efectivo */}
            <div>
              <Label htmlFor="efectivo-cierre" className="text-base font-normal text-gray-700 mb-3 block">
                Efectivo final
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="efectivo-cierre"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={efectivoCierre}
                    onChange={(e) => setEfectivoCierre(e.target.value)}
                    className="text-3xl font-normal h-16 pr-4"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16 p-1"
                  title="Calculadora"
                  onClick={() => setIsCalculadoraOpen(true)}
                >
                  <DollarSign className="h-full w-full" strokeWidth={3} />
                </Button>
              </div>

              {/* Diferencia */}
              {efectivoCierre && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  diferencia === 0
                    ? "bg-emerald-50 border-emerald-200"
                    : diferencia > 0
                    ? "bg-blue-50 border-blue-200"
                    : "bg-rose-50 border-rose-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium">
                      {diferencia === 0 && "¡Cuadra perfecto!"}
                      {diferencia > 0 && "Sobrante"}
                      {diferencia < 0 && "Faltante"}
                    </span>
                    <span className={`text-2xl font-bold ${
                      diferencia === 0
                        ? "text-emerald-700"
                        : diferencia > 0
                        ? "text-blue-700"
                        : "text-rose-700"
                    }`}>
                      {diferencia !== 0 && `$${Math.abs(diferencia).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Notas de cierre */}
            <div>
              <Label htmlFor="notas-cierre" className="text-base font-normal text-gray-700 mb-3 block">
                Notas de cierre
              </Label>
              <Textarea
                id="notas-cierre"
                placeholder="Observaciones del cierre..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="min-h-[120px] resize-none text-base"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleConfirm}
                disabled={procesando || !efectivoCierre || parseFloat(efectivoCierre) < 0}
                className="h-12 px-8 text-base bg-orange-600 hover:bg-orange-700"
              >
                {procesando ? "Cerrando..." : "Cerrar caja"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={procesando}
                className="h-12 px-8 text-base"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de calculadora de monedas/billetes */}
      <Dialog open={isCalculadoraOpen} onOpenChange={setIsCalculadoraOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Monedas/billetes</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {denominaciones.map((den, index) => (
                <div key={den.valor} className="flex items-center gap-2">
                  <div className="flex items-center bg-gray-50 rounded-lg border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-r-none"
                      onClick={() => handleCantidadChange(index, -1)}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <Input
                      type="number"
                      value={den.cantidad}
                      onChange={(e) => {
                        const newDen = [...denominaciones]
                        newDen[index].cantidad = Math.max(0, parseInt(e.target.value) || 0)
                        setDenominaciones(newDen)
                      }}
                      className="h-12 w-20 text-center border-0 bg-transparent focus-visible:ring-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-l-none"
                      onClick={() => handleCantidadChange(index, 1)}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                  <span className="text-base font-medium min-w-[80px]">
                    ${den.valor.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                onClick={handleConfirmarCalculadora}
                className="h-12 px-8 text-base bg-orange-600 hover:bg-orange-700"
              >
                Confirmar
              </Button>
              <div className="text-right">
                <span className="text-2xl font-bold">Total ${calcularTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
