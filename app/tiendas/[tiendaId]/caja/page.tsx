"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { Textarea } from "@/components/shared/molecule/textarea"
import { RouteGuard } from "@/components/auth/route-guard"
import { X, DollarSign, Minus, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PosView } from "@/components/feats/inventario/pos-view"
import { useCaja } from "@/hooks/use-caja"
import { Loader } from "@/components/shared/atom/loader"
import { SeleccionarCarpetaRecibosDialog } from "@/components/feats/inventario/seleccionar-carpeta-recibos-dialog"

interface Denominacion {
  valor: number
  cantidad: number
}

export default function CajaPage() {
  const params = useParams()
  const router = useRouter()
  const tiendaId = params.tiendaId as string
  const { toast } = useToast()
  
  const { sesionActiva, loading, abrirSesion } = useCaja(tiendaId)

  const [isAperturaDialogOpen, setIsAperturaDialogOpen] = useState(false)
  const [isCarpetaDialogOpen, setIsCarpetaDialogOpen] = useState(false)
  const [isCalculadoraOpen, setIsCalculadoraOpen] = useState(false)
  const [efectivoApertura, setEfectivoApertura] = useState("")
  const [notaApertura, setNotaApertura] = useState("")
  const [abriendo, setAbriendo] = useState(false)

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
    setEfectivoApertura(total.toFixed(2))
    
    // Generar el desglose de denominaciones
    const desglose = denominaciones
      .filter(den => den.cantidad > 0)
      .map(den => `${den.cantidad} x ${den.valor.toFixed(2)} $`)
      .join('\n')
    
    setNotaApertura(desglose)
    setIsCalculadoraOpen(false)
  }

  // Verificar si hay sesión activa al cargar
  useEffect(() => {
    if (!loading && !sesionActiva) {
      setIsAperturaDialogOpen(true)
    }
  }, [loading, sesionActiva])

  const handleAbrirCaja = async () => {
    if (!efectivoApertura || parseFloat(efectivoApertura) < 0) {
      toast({
        title: "Error",
        description: "Ingresa un monto válido para el efectivo de apertura",
        variant: "destructive",
      })
      return
    }

    try {
      setAbriendo(true)
      await abrirSesion(parseFloat(efectivoApertura), notaApertura)
      setIsAperturaDialogOpen(false)
      
      // Mostrar diálogo de selección de carpeta después de abrir la caja
      setIsCarpetaDialogOpen(true)
    } catch (error) {
      // El error ya se muestra en el hook
    } finally {
      setAbriendo(false)
    }
  }

  const handleDescartar = () => {
    setIsAperturaDialogOpen(false)
    router.push(`/tiendas/${tiendaId}`)
  }

  const handleClearMonto = () => {
    setEfectivoApertura("")
  }

  const handleCarpetaSeleccionada = () => {
    toast({
      title: "Carpeta configurada",
      description: "Los recibos se guardarán automáticamente en la carpeta seleccionada",
    })
  }

  const handleContinuarSinCarpeta = () => {
    toast({
      title: "Sin carpeta configurada",
      description: "Los recibos se descargarán en tu carpeta de descargas predeterminada",
    })
  }

  if (loading) {
    return (
      <RouteGuard requiredModule={`tienda:${tiendaId}`}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center">
          <Loader />
        </div>
      </RouteGuard>
    )
  }

  return (
    <RouteGuard requiredModule={`tienda:${tiendaId}`}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
<main className="max-w-full h-screen box-border flex min-h-0">
          {sesionActiva ? (
            <PosView tiendaId={tiendaId} sesionId={sesionActiva.id} />
          ) : (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <Card>
                <CardHeader>
                  <CardTitle>Caja Registradora</CardTitle>
                  <CardDescription>Abre la caja para comenzar a operar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-gray-500 py-8">
                    <p>La caja está cerrada. Abre la caja para comenzar a registrar ventas.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {/* Modal de apertura */}
        <Dialog open={isAperturaDialogOpen} onOpenChange={setIsAperturaDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Control de apertura</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Efectivo de apertura */}
              <div>
                <Label htmlFor="efectivo-apertura" className="text-base font-normal text-gray-700 mb-3 block">
                  Efectivo de apertura
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="efectivo-apertura"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={efectivoApertura}
                      onChange={(e) => setEfectivoApertura(e.target.value)}
                      className="text-3xl font-normal h-16 pr-4"
                    />
                    {efectivoApertura && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                        onClick={handleClearMonto}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    )}
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
              </div>

              {/* Nota de apertura */}
              <div>
                <Label htmlFor="nota-apertura" className="text-base font-normal text-gray-700 mb-3 block">
                  Nota de apertura
                </Label>
                <Textarea
                  id="nota-apertura"
                  placeholder="Opening details:
1 x 5,00 $
1 x 10,00 $
1 x 20,00 $"
                  value={notaApertura}
                  onChange={(e) => setNotaApertura(e.target.value)}
                  className="min-h-[140px] resize-none text-base"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleAbrirCaja}
                  disabled={abriendo}
                  className="h-12 px-8 text-base bg-orange-600 hover:bg-orange-700"
                >
                  {abriendo ? "Abriendo..." : "Abrir caja registradora"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDescartar}
                  disabled={abriendo}
                  className="h-12 px-8 text-base"
                >
                  Descartar
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
                      {den.valor.toFixed(2)} $
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
                  <span className="text-2xl font-bold">Total {calcularTotal().toFixed(2)} $</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de selección de carpeta de recibos */}
        <SeleccionarCarpetaRecibosDialog
          open={isCarpetaDialogOpen}
          onOpenChange={setIsCarpetaDialogOpen}
          onCarpetaSeleccionada={handleCarpetaSeleccionada}
          onContinuarSinCarpeta={handleContinuarSinCarpeta}
        />
      </div>
    </RouteGuard>
  )
}

