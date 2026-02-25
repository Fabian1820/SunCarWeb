"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import { CreditCard, DollarSign, Smartphone } from "lucide-react"
import { ClienteSearchSelector } from "@/components/feats/cliente/cliente-search-selector"
import { ClienteService } from "@/lib/services/feats/customer/cliente-service"
import type { Cliente } from "@/lib/types/feats/customer/cliente-types"
import type { MetodoPago, PagoDetalle } from "@/lib/types/feats/caja-types"

interface PagoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  total: number
  onConfirm: (
    metodoPago: MetodoPago,
    pagos: PagoDetalle[],
    clienteData?: {
      cliente_id?: string
      cliente_nombre?: string
      cliente_ci?: string
      cliente_telefono?: string
    }
  ) => Promise<void>
}

export function PagoDialog({
  open,
  onOpenChange,
  total,
  onConfirm,
}: PagoDialogProps) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo")
  const [montoRecibido, setMontoRecibido] = useState("")
  const [referencia, setReferencia] = useState("")
  const [cambio, setCambio] = useState(0)
  const [procesando, setProcesando] = useState(false)
  const [clienteId, setClienteId] = useState("")
  const [clienteNombre, setClienteNombre] = useState("")
  const [clienteCi, setClienteCi] = useState("")
  const [clienteTelefono, setClienteTelefono] = useState("")
  const [tipoCliente, setTipoCliente] = useState<"instaladora" | "directo">("instaladora")
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientesLoading, setClientesLoading] = useState(false)

  useEffect(() => {
    const loadClientes = async () => {
      setClientesLoading(true)
      try {
        const data = await ClienteService.getClientes()
        // El servicio devuelve { clients: Cliente[], total, skip, limit }
        setClientes(data.clients || [])
      } catch (error) {
        console.error("Error loading clientes:", error)
        setClientes([])
      } finally {
        setClientesLoading(false)
      }
    }
    loadClientes()
  }, [])

  useEffect(() => {
    if (tipoCliente === "instaladora") {
      setClienteNombre("")
      setClienteCi("")
      setClienteTelefono("")
    } else {
      setClienteId("")
    }
  }, [tipoCliente])

  // Calcular cambio para efectivo
  useEffect(() => {
    if (metodoPago === "efectivo" && montoRecibido) {
      const recibido = parseFloat(montoRecibido)
      if (!isNaN(recibido)) {
        setCambio(Math.max(0, recibido - total))
      }
    } else {
      setCambio(0)
    }
  }, [montoRecibido, total, metodoPago])

  const handleConfirm = async () => {
    const pagos: PagoDetalle[] = []

    if (metodoPago === "efectivo") {
      const recibido = parseFloat(montoRecibido)
      if (isNaN(recibido) || recibido < total) {
        return
      }
      pagos.push({
        metodo: "efectivo",
        monto: total,
        monto_recibido: recibido,
      })
    } else if (metodoPago === "tarjeta" || metodoPago === "transferencia") {
      if (!referencia.trim()) {
        return
      }
      pagos.push({
        metodo: metodoPago,
        monto: total,
        referencia: referencia,
      })
    }

    try {
      setProcesando(true)
      const clienteData: {
        cliente_id?: string
        cliente_nombre?: string
        cliente_ci?: string
        cliente_telefono?: string
      } = {}

      const trimmedClienteId = clienteId.trim()
      const trimmedClienteNombre = clienteNombre.trim()
      const trimmedClienteCi = clienteCi.trim()
      const trimmedClienteTelefono = clienteTelefono.trim()

      if (tipoCliente === "instaladora" && trimmedClienteId) {
        clienteData.cliente_id = trimmedClienteId
        // Obtener datos completos del cliente de instaladora
        const clienteInstaladora = clientes.find(c => c.id === trimmedClienteId || c.numero === trimmedClienteId)
        if (clienteInstaladora) {
          clienteData.cliente_nombre = clienteInstaladora.nombre
          if (clienteInstaladora.carnet_identidad) {
            clienteData.cliente_ci = clienteInstaladora.carnet_identidad
          }
          if (clienteInstaladora.telefono) {
            clienteData.cliente_telefono = clienteInstaladora.telefono
          }
        }
      } else if (tipoCliente === "directo" && trimmedClienteNombre) {
        clienteData.cliente_nombre = trimmedClienteNombre
        if (trimmedClienteCi) clienteData.cliente_ci = trimmedClienteCi
        if (trimmedClienteTelefono) clienteData.cliente_telefono = trimmedClienteTelefono
      }

      const payloadClienteData = Object.keys(clienteData).length > 0 ? clienteData : undefined
      await onConfirm(metodoPago, pagos, payloadClienteData)
      // Limpiar formulario
      setMontoRecibido("")
      setReferencia("")
      setMetodoPago("efectivo")
      setClienteId("")
      setClienteNombre("")
      setClienteCi("")
      setClienteTelefono("")
    } catch (error) {
      // El error ya se muestra en el hook
    } finally {
      setProcesando(false)
    }
  }

  const handleCancel = () => {
    setMontoRecibido("")
    setReferencia("")
    setMetodoPago("efectivo")
    setClienteId("")
    setClienteNombre("")
    setClienteCi("")
    setClienteTelefono("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Procesar pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Total a pagar */}
          <div className="border-2 border-orange-200 rounded-lg p-6 bg-gradient-to-br from-orange-50 to-white shadow-sm">
            <div className="pb-4 mb-4 border-b-2 border-orange-200">
              <h3 className="text-xl font-bold text-gray-900">Total a pagar</h3>
              <p className="text-sm text-gray-600 mt-1">Resumen del cobro actual</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-orange-600">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>

          
          {/* Métodos de pago */}
          <div className="border-2 border-orange-200 rounded-lg p-6 bg-white shadow-sm">
            <div className="pb-4 mb-4 border-b-2 border-orange-200">
              <h3 className="text-xl font-bold text-gray-900">Método de pago</h3>
              <p className="text-sm text-gray-600 mt-1">Selecciona cómo cobrar</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={metodoPago === "efectivo" ? "default" : "outline"}
                className={`h-20 flex-col gap-2 ${
                  metodoPago === "efectivo"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "hover:bg-orange-50 border-orange-200"
                }`}
                onClick={() => setMetodoPago("efectivo")}
              >
                <DollarSign className="h-6 w-6" />
                <span>Efectivo</span>
              </Button>
              <Button
                type="button"
                variant={metodoPago === "tarjeta" ? "default" : "outline"}
                className={`h-20 flex-col gap-2 ${
                  metodoPago === "tarjeta"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "hover:bg-orange-50 border-orange-200"
                }`}
                onClick={() => setMetodoPago("tarjeta")}
              >
                <CreditCard className="h-6 w-6" />
                <span>Tarjeta</span>
              </Button>
              <Button
                type="button"
                variant={metodoPago === "transferencia" ? "default" : "outline"}
                className={`h-20 flex-col gap-2 ${
                  metodoPago === "transferencia"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "hover:bg-orange-50 border-orange-200"
                }`}
                onClick={() => setMetodoPago("transferencia")}
              >
                <Smartphone className="h-6 w-6" />
                <span>Transferencia</span>
              </Button>
            </div>
          </div>

          
          {/* Campos según método */}
          {metodoPago === "efectivo" && (
            <div className="border-2 border-orange-200 rounded-lg p-6 bg-white shadow-sm space-y-4">
              <div className="pb-4 mb-4 border-b-2 border-orange-200">
                <h3 className="text-xl font-bold text-gray-900">Efectivo</h3>
                <p className="text-sm text-gray-600 mt-1">Monto recibido del cliente</p>
              </div>
              <div>
                <Label htmlFor="monto-recibido" className="text-base font-normal text-gray-700 mb-3 block">
                  Monto recibido
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-orange-500" />
                  <Input
                    id="monto-recibido"
                    type="number"
                    step="0.01"
                    min={total}
                    placeholder={total.toFixed(2)}
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    className="text-3xl font-normal h-16 pl-14 pr-4 text-gray-900 placeholder:text-gray-400 border-orange-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>

              {cambio > 0 && (
                <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
                  <div className="flex items-center justify-between">
                    <span className="text-base text-orange-700 font-medium">Cambio</span>
                    <span className="text-2xl font-bold text-orange-600">
                      ${cambio.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          
          {(metodoPago === "tarjeta" || metodoPago === "transferencia") && (
            <div className="border-2 border-orange-200 rounded-lg p-6 bg-white shadow-sm">
              <div className="pb-4 mb-4 border-b-2 border-orange-200">
                <h3 className="text-xl font-bold text-gray-900">
                  {metodoPago === "tarjeta" ? "Tarjeta" : "Transferencia"}
                </h3>
                <p className="text-sm text-gray-600 mt-1">Referencia del pago</p>
              </div>
              <Label htmlFor="referencia" className="text-base font-normal text-gray-700 mb-3 block">
                {metodoPago === "tarjeta" ? "Número de autorización" : "Número de transferencia"}
              </Label>
              <Input
                id="referencia"
                type="text"
                placeholder={metodoPago === "tarjeta" ? "AUTH-123456" : "TRANS-789012"}
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="text-lg h-12 text-gray-900 placeholder:text-gray-400 border-orange-200 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>
          )}


          
          {/* Datos de cliente (opcional) */}
          <div className="border-2 border-orange-200 rounded-lg p-6 bg-white shadow-sm space-y-4">
            <div className="pb-4 mb-4 border-b-2 border-orange-200">
              <h3 className="text-xl font-bold text-gray-900">Cliente</h3>
              <p className="text-sm text-gray-600 mt-1">
                Selecciona el tipo de cliente para mostrar los campos correctos.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="tipo-cliente"
                  value="instaladora"
                  checked={tipoCliente === "instaladora"}
                  onChange={() => setTipoCliente("instaladora")}
                  className="text-orange-600 focus:ring-orange-500"
                />
                Instaladora
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="tipo-cliente"
                  value="directo"
                  checked={tipoCliente === "directo"}
                  onChange={() => setTipoCliente("directo")}
                  className="text-orange-600 focus:ring-orange-500"
                />
                Directo
              </label>
            </div>
            {tipoCliente === "instaladora" ? (
              <ClienteSearchSelector
                label="Buscar cliente"
                clients={clientes}
                value={clienteId}
                onChange={setClienteId}
                placeholder="Buscar por nombre, número o dirección..."
                disabled={false}
                loading={clientesLoading}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cliente-nombre" className="text-sm text-gray-700 mb-1 block">
                    Nombre
                  </Label>
                  <Input
                    id="cliente-nombre"
                    type="text"
                    placeholder="Nombre completo"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    className="h-11 text-gray-900 placeholder:text-gray-400 border-orange-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <Label htmlFor="cliente-ci" className="text-sm text-gray-700 mb-1 block">
                    CI
                  </Label>
                  <Input
                    id="cliente-ci"
                    type="text"
                    placeholder="Carnet de identidad"
                    value={clienteCi}
                    onChange={(e) => setClienteCi(e.target.value)}
                    className="h-11 text-gray-900 placeholder:text-gray-400 border-orange-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <Label htmlFor="cliente-telefono" className="text-sm text-gray-700 mb-1 block">
                    Teléfono
                  </Label>
                  <Input
                    id="cliente-telefono"
                    type="text"
                    placeholder="555-1234"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    className="h-11 text-gray-900 placeholder:text-gray-400 border-orange-200 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleConfirm}
              disabled={
                procesando ||
                (metodoPago === "efectivo" && (parseFloat(montoRecibido) < total || !montoRecibido)) ||
                ((metodoPago === "tarjeta" || metodoPago === "transferencia") && !referencia.trim())
              }
              className="h-12 px-8 text-base bg-orange-600 hover:bg-orange-700"
            >
              {procesando ? "Procesando..." : "Confirmar pago"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={procesando}
              className="h-12 px-8 text-base border-orange-200 hover:bg-orange-50"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
