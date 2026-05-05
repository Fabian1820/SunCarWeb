"use client"

import { useState } from "react"
import { CreditCard, Loader2, Copy, CheckCircle, DollarSign } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import { useToast } from "@/hooks/use-toast"
import type { SolicitudVentaSummary } from "@/lib/api-types"

interface GenerarLinkPagoSolicitudButtonProps {
  solicitud: SolicitudVentaSummary
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default" | "lg" | "icon"
  showIcon?: boolean
}

export function GenerarLinkPagoSolicitudButton({
  solicitud,
  variant = "default",
  size = "default",
  showIcon = true,
}: GenerarLinkPagoSolicitudButtonProps) {
  const STRIPE_RATE = 0.0325
  const STRIPE_FIXED = 0.30
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [paymentLink, setPaymentLink] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [precioManual, setPrecioManual] = useState<string>("")
  const [incluirComision, setIncluirComision] = useState<boolean>(true)
  const { toast } = useToast()

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value)

  const precioBase = precioManual ? parseFloat(precioManual) : 0
  const isValidPrice = precioBase > 0
  const precioConRecargo = isValidPrice
    ? Math.round(((precioBase + STRIPE_FIXED) / (1 - STRIPE_RATE)) * 100) / 100
    : 0

  const handleOpenDialog = () => {
    setPrecioManual("")
    setIncluirComision(true)
    setPaymentLink("")
    setDialogOpen(true)
  }

  const handleGenerate = async () => {
    if (!isValidPrice) {
      toast({
        title: "Error",
        description: "Ingrese un precio válido mayor a 0",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const montoEnviar = incluirComision ? precioConRecargo : precioBase

      const response = await fetch("/api/stripe/generar-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          precio: montoEnviar,
          descripcion: `Solicitud de Venta: ${solicitud.codigo || solicitud.id.slice(-6).toUpperCase()} - Cliente: ${solicitud.cliente_venta_nombre || "Sin cliente"} - Almacén: ${solicitud.almacen_nombre || "Sin almacén"}`,
          solicitud_venta_id: solicitud.id,
          precio_base: precioBase,
          incluye_comision: incluirComision,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Error al generar link de pago")
      }

      setPaymentLink(data.payment_link)
      toast({
        title: "Link de Pago Generado",
        description: data.message,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al generar link",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink)
      setCopied(true)
      toast({
        title: "Copiado",
        description: "Link de pago copiado al portapapeles",
      })

      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el link",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenDialog}
        disabled={loading}
        title="Generar link de pago con Stripe"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          showIcon && <CreditCard className="h-4 w-4" />
        )}
        {size !== "icon" && (
          <span className={showIcon ? "ml-2" : ""}>
            Generar Link de Pago
          </span>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generar Link de Pago - Stripe</DialogTitle>
            <DialogDescription>
              Ingrese el monto a cobrar. Puede agregar la comisión real de Stripe (3.25% + $0.30).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="precio-manual">Precio (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="precio-manual"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={precioManual}
                  onChange={(e) => setPrecioManual(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="incluir-comision"
                checked={incluirComision}
                onCheckedChange={(checked) => setIncluirComision(checked as boolean)}
              />
              <Label htmlFor="incluir-comision" className="text-sm cursor-pointer">
                Agregar comisión de Stripe 3.25% + $0.30 ({formatCurrency(precioConRecargo - precioBase)})
              </Label>
            </div>

            <div className="bg-gray-50 p-3 rounded-md space-y-1">
              <p className="text-sm text-gray-600">
                <strong>Precio base:</strong> {isValidPrice ? formatCurrency(precioBase) : "$0.00"}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Total a cobrar:</strong> {isValidPrice ? formatCurrency(incluirComision ? precioConRecargo : precioBase) : "$0.00"}
              </p>
            </div>

            {paymentLink && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Link de Pago Generado</Label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-green-50 border border-green-200 rounded-md overflow-x-auto">
                    <a
                      href={paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm break-all"
                    >
                      {paymentLink}
                    </a>
                  </div>
                  <Button variant="outline" size="icon" onClick={handleCopyLink} title="Copiar link">
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              <p>Información de la solicitud:</p>
              <p>Codigo: {solicitud.codigo || solicitud.id.slice(-6).toUpperCase()}</p>
              <p>Cliente: {solicitud.cliente_venta_nombre || "Sin cliente"}</p>
              <p>Almacén: {solicitud.almacen_nombre || "Sin almacén"}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!isValidPrice || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                "Generar Link de Pago"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}