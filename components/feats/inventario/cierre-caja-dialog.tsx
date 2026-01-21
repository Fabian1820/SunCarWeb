"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { DollarSign, Minus, Plus, ChevronDown, ChevronUp, X, Banknote } from "lucide-react"
import type { SesionCaja } from "@/lib/types/feats/caja-types"
import { ReciboService } from "@/lib/services/feats/caja/recibo-service"
import { useToast } from "@/hooks/use-toast"

interface Denominacion {
  valor: number
  cantidad: number
}

interface CierreCajaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sesion: SesionCaja | null
  onConfirm: (efectivoCierre: number, notas: string) => Promise<void>
  nombreTienda?: string
  direccionTienda?: string
  telefonoTienda?: string
}

export function CierreCajaDialog({
  open,
  onOpenChange,
  sesion,
  onConfirm,
  nombreTienda,
  direccionTienda,
  telefonoTienda,
}: CierreCajaDialogProps) {
  const [efectivoCierre, setEfectivoCierre] = useState("")
  const [notas, setNotas] = useState("")
  const [procesando, setProcesando] = useState(false)
  const [isCalculadoraOpen, setIsCalculadoraOpen] = useState(false)
  const [mostrarDetalleEfectivo, setMostrarDetalleEfectivo] = useState(false)
  const { toast } = useToast()

  const [denominaciones, setDenominaciones] = useState<Denominacion[]>([
    { valor: 200, cantidad: 0 },
    { valor: 100, cantidad: 0 },
    { valor: 50, cantidad: 0 },
    { valor: 20, cantidad: 0 },
    { valor: 10, cantidad: 0 },
    { valor: 5, cantidad: 0 },
    { valor: 2, cantidad: 0 },
    { valor: 1, cantidad: 0 },
    { valor: 0.50, cantidad: 0 },
    { valor: 0.20, cantidad: 0 },
    { valor: 0.10, cantidad: 0 },
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
    setIsCalculadoraOpen(false)
  }

  const efectivoEsperado = sesion
    ? sesion.efectivo_apertura + sesion.total_efectivo + sesion.total_entradas - sesion.total_salidas
    : 0

  const diferencia = efectivoCierre
    ? parseFloat(efectivoCierre) - efectivoEsperado
    : 0

  const totalOrdenes = sesion ? sesion.total_ventas : 0
  const cantidadOrdenes = sesion ? sesion.cantidad_ordenes || 0 : 0
  
  // Total de efectivo esperado en caja
  const totalEfectivoEsperado = efectivoEsperado
  
  // Total de movimientos de entrada y salida
  const totalMovimientos = sesion ? (sesion.total_entradas - sesion.total_salidas) : 0

  const handleConfirm = async () => {
    const efectivo = parseFloat(efectivoCierre)
    if (isNaN(efectivo) || efectivo < 0) {
      return
    }

    try {
      setProcesando(true)
      
      // Actualizar la nota de cierre con la nota ingresada
      const sesionConNota = { ...sesion, nota_cierre: notas }
      
      // Generar y guardar el PDF del cierre de caja
      try {
        if (ReciboService.tieneCarpetaSeleccionada()) {
          await ReciboService.guardarCierreCajaAutomatico(
            sesionConNota,
            efectivo,
            nombreTienda || 'SUNCAR BOLIVIA'
          )
          toast({
            title: "Cierre guardado",
            description: "El cierre de caja se guardó automáticamente en la carpeta configurada",
          })
        } else {
          ReciboService.descargarCierreCaja(
            sesionConNota,
            efectivo,
            nombreTienda || 'SUNCAR BOLIVIA'
          )
        }
      } catch (errorPdf: any) {
        console.error('Error al guardar cierre de caja:', errorPdf)
        toast({
          title: "Error al guardar cierre",
          description: errorPdf.message || "No se pudo guardar el cierre de caja automáticamente",
          variant: "destructive",
        })
      }
      
      // Cerrar la sesión en el backend
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold flex items-center justify-between">
              <span>Cerrando la caja registradora</span>
              <span className="text-lg font-normal text-slate-600">
                {cantidadOrdenes} órdenes: {totalOrdenes.toFixed(2)} $
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1 pt-4">
            {/* EFECTIVO */}
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold text-slate-900">Efectivo</h3>
                <span className="text-2xl font-bold text-slate-900">
                  {totalEfectivoEsperado.toFixed(2)} $
                </span>
              </div>

              {/* Detalle efectivo colapsable */}
              <button
                onClick={() => setMostrarDetalleEfectivo(!mostrarDetalleEfectivo)}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-2"
              >
                {mostrarDetalleEfectivo ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span>{mostrarDetalleEfectivo ? "Ocultar detalle" : "Mostrar detalle"}</span>
              </button>

              {mostrarDetalleEfectivo && (
                <div className="space-y-1 pl-4 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Apertura</span>
                    <span>{sesion.efectivo_apertura.toFixed(2)} $</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Pagos en Efectivo</span>
                    <span>{sesion.total_efectivo.toFixed(2)} $</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1">
                      <ChevronDown className="h-3 w-3" />
                      Entrada y salida de efectivo
                    </span>
                    <span>{totalMovimientos >= 0 ? '' : '- '}{Math.abs(totalMovimientos).toFixed(2)} $</span>
                  </div>
                  <div className="flex items-center justify-between font-medium text-slate-900 pt-1 border-t border-slate-200">
                    <span>Contado</span>
                    <span>{efectivoCierre ? parseFloat(efectivoCierre).toFixed(2) : "0,00"} $</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Diferencia</span>
                    <span className={diferencia === 0 ? "text-slate-600" : diferencia > 0 ? "text-emerald-600" : "text-rose-600"}>
                      {diferencia >= 0 ? '' : '- '}{Math.abs(diferencia).toFixed(2)} $
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* TARJETA */}
            <div className="border-b border-slate-200 py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold text-slate-900">Tarjeta</h3>
                <span className="text-2xl font-bold text-slate-900">
                  {sesion.total_tarjeta.toFixed(2)} $
                </span>
              </div>
              <div className="space-y-1 pl-4 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Contado</span>
                  <span>{sesion.total_tarjeta.toFixed(2)} $</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Diferencia</span>
                  <span>0,00 $</span>
                </div>
              </div>
            </div>

            {/* Conteo de efectivo */}
            <div className="pt-4">
              <Label htmlFor="efectivo-cierre" className="text-base font-semibold text-slate-900 mb-3 block">
                Conteo de efectivo
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
                    className="text-2xl font-normal h-14 pr-4"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14"
                  title="Limpiar"
                  onClick={() => setEfectivoCierre("")}
                >
                  <X className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14"
                  title="Calculadora de billetes"
                  onClick={() => setIsCalculadoraOpen(true)}
                >
                  <Banknote className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Nota de cierre */}
            <div className="pt-2">
              <Label htmlFor="notas-cierre" className="text-base font-semibold text-slate-900 mb-3 block">
                Nota de cierre
              </Label>
              <Textarea
                id="notas-cierre"
                placeholder="Agregar una nota de cierre..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="min-h-[100px] resize-none text-base"
              />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Calculadora de billetes y monedas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-3">
              {denominaciones.map((den, index) => (
                <div key={den.valor} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold min-w-[80px]">
                      {den.valor >= 1 ? `${den.valor.toFixed(0)} Bs` : `${(den.valor * 100).toFixed(0)} ¢`}
                    </span>
                    <div className="flex items-center bg-white rounded-lg border border-slate-300">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-r-none hover:bg-slate-100"
                        onClick={() => handleCantidadChange(index, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={den.cantidad}
                        onChange={(e) => {
                          const newDen = [...denominaciones]
                          newDen[index].cantidad = Math.max(0, parseInt(e.target.value) || 0)
                          setDenominaciones(newDen)
                        }}
                        className="h-10 w-20 text-center border-0 bg-transparent focus-visible:ring-0 text-base font-medium"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-l-none hover:bg-slate-100"
                        onClick={() => handleCantidadChange(index, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-slate-700 min-w-[100px] text-right">
                    {(den.valor * den.cantidad).toFixed(2)} $
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t-2 border-slate-300">
              <Button
                onClick={handleConfirmarCalculadora}
                className="h-12 px-8 text-base bg-orange-600 hover:bg-orange-700"
              >
                Confirmar
              </Button>
              <div className="text-right">
                <p className="text-sm text-slate-600 mb-1">Total</p>
                <span className="text-3xl font-bold text-slate-900">{calcularTotal().toFixed(2)} $</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
