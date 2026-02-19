"use client"

import { useState } from "react"
import { CreditCard, Loader2, Copy, CheckCircle } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { useToast } from "@/hooks/use-toast"
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion"

interface GenerarLinkPagoConfeccionButtonProps {
  oferta: OfertaConfeccion
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default" | "lg" | "icon"
  showIcon?: boolean
}

export function GenerarLinkPagoConfeccionButton({
  oferta,
  variant = "outline",
  size = "sm",
  showIcon = true,
}: GenerarLinkPagoConfeccionButtonProps) {
  const STRIPE_FEE_PERCENT = 0.05
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [paymentLink, setPaymentLink] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Tomar la moneda de la oferta, por defecto USD
  const currency = oferta.moneda_pago || 'USD'
  const precioBase = oferta.precio_final
  const hasPrice = typeof precioBase === "number" && precioBase > 0
  const isDisabled = !hasPrice || loading
  const precioConRecargo = hasPrice
    ? Math.round(precioBase * (1 + STRIPE_FEE_PERCENT) * 100) / 100
    : 0

  const formatCurrency = (amount: number, currencyCode: string) => {
    const symbol = currencyCode === 'EUR' ? '€' : currencyCode === 'CUP' ? '' : '$'
    const suffix = currencyCode === 'CUP' ? ' CUP' : ` ${currencyCode}`
    return `${symbol}${amount.toFixed(2)}${suffix}`
  }

  const handleGenerate = async () => {
    if (!hasPrice) {
      toast({
        title: "Error",
        description: "La oferta debe tener un precio válido",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/stripe/generar-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          precio: precioBase,
          descripcion: oferta.nombre_completo || oferta.nombre,
          oferta_id: oferta.id,
          cliente_id: oferta.cliente_id,
          lead_id: oferta.lead_id,
          moneda: currency,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        // Si es error de configuración de Stripe, mostrar mensaje más detallado
        if (response.status === 500 && data.message?.includes('no está configurado')) {
          throw new Error(
            'Stripe no está configurado. Por favor, configura la variable STRIPE_SECRET_KEY en tu archivo .env.local'
          )
        }
        throw new Error(data.message || "Error al generar link de pago")
      }

      setPaymentLink(data.payment_link)
      setDialogOpen(true)

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
        onClick={handleGenerate}
        disabled={isDisabled}
        title={
          !hasPrice
            ? "La oferta debe tener un precio válido"
            : "Generar link de pago con Stripe (incluye 5% de gastos)"
        }
        className="w-full"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          showIcon && <CreditCard className="h-3.5 w-3.5" />
        )}
        {size !== 'icon' && (
          <span className={showIcon ? 'ml-2' : ''}>
            {loading ? 'Generando...' : 'Generar Link de Pago (+5% Stripe)'}
          </span>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Link de Pago Generado</DialogTitle>
            <DialogDescription>
              El link de pago ha sido generado exitosamente. Puedes copiarlo y compartirlo con el cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Link de Pago</label>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-md overflow-x-auto">
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

            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                <strong>Descripción:</strong> {oferta.nombre_completo || oferta.nombre}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Precio base:</strong>{' '}
                {typeof precioBase === 'number' ? formatCurrency(precioBase, currency) : 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Total con 5% Stripe:</strong> {formatCurrency(precioConRecargo, currency)}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
