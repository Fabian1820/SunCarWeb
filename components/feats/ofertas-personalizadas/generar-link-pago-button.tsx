"use client"

import { useId, useState } from 'react'
import { CreditCard, Loader2, Copy, CheckCircle } from 'lucide-react'
import { Button } from '@/components/shared/atom/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/molecule/dialog'
import { useToast } from '@/hooks/use-toast'
import type { OfertaPersonalizada } from '@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types'

interface GenerarLinkPagoButtonProps {
  oferta: OfertaPersonalizada
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  showIcon?: boolean
}

export function GenerarLinkPagoButton({
  oferta,
  variant = 'default',
  size = 'default',
  showIcon = true,
}: GenerarLinkPagoButtonProps) {
  const STRIPE_FEE_PERCENT = 0.05
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [paymentLink, setPaymentLink] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD')
  const currencySelectId = useId()
  const { toast } = useToast()

  // Validaciones
  const isPagada = oferta.pagada === true
  const hasPrice = oferta.precio !== undefined && oferta.precio !== null && oferta.precio > 0
  const isDisabled = isPagada || !hasPrice || loading
  const precioConRecargo = hasPrice
    ? Math.round(oferta.precio! * (1 + STRIPE_FEE_PERCENT) * 100) / 100
    : 0

  const formatCurrency = (amount: number, currencyCode: 'USD' | 'EUR') => {
    const symbol = currencyCode === 'EUR' ? '€' : '$'
    return `${symbol}${amount.toFixed(2)} ${currencyCode}`
  }

  // Formatear descripción de la oferta
  const formatearDescripcion = (): string => {
    const partes: string[] = []

    const formatEquipoItem = (
      label: string,
      item: {
        cantidad?: number
        potencia?: number
        marca?: string
        descripcion?: string
        codigo_equipo?: string
      }
    ) => {
      const cantidad = typeof item.cantidad === 'number' ? `${item.cantidad}x ` : ''
      const descripcion = item.descripcion?.trim()
      const detalles = [
        item.marca?.trim(),
        item.potencia ? `${item.potencia}W` : undefined,
        item.codigo_equipo?.trim(),
      ]
        .filter(Boolean)
        .join(' ')
      const base = descripcion || label
      const extra = detalles ? ` (${detalles})` : ''
      return `${cantidad}${base}${extra}`.trim()
    }

    const formatUtilItem = (item: { cantidad?: number; descripcion?: string }) => {
      const cantidad = typeof item.cantidad === 'number' ? `${item.cantidad}x ` : ''
      const descripcion = item.descripcion?.trim() || 'Útil sin descripción'
      return `${cantidad}${descripcion}`.trim()
    }

    const formatServicioItem = (item: { descripcion?: string; costo?: number }) => {
      const descripcion = item.descripcion?.trim() || 'Servicio sin descripción'
      const costo =
        typeof item.costo === 'number' ? ` (${formatCurrency(item.costo, currency)})` : ''
      return `${descripcion}${costo}`.trim()
    }

    if (oferta.inversores && oferta.inversores.length > 0) {
      partes.push(
        `Inversores: ${oferta.inversores.map((inv) => formatEquipoItem('Inversor', inv)).join('; ')}`
      )
    }
    if (oferta.baterias && oferta.baterias.length > 0) {
      partes.push(
        `Baterías: ${oferta.baterias.map((bat) => formatEquipoItem('Batería', bat)).join('; ')}`
      )
    }
    if (oferta.paneles && oferta.paneles.length > 0) {
      partes.push(
        `Paneles: ${oferta.paneles.map((panel) => formatEquipoItem('Panel', panel)).join('; ')}`
      )
    }
    if (oferta.utiles && oferta.utiles.length > 0) {
      partes.push(`Útiles: ${oferta.utiles.map((util) => formatUtilItem(util)).join('; ')}`)
    }
    if (oferta.servicios && oferta.servicios.length > 0) {
      partes.push(
        `Servicios: ${oferta.servicios.map((srv) => formatServicioItem(srv)).join('; ')}`
      )
    }

    return partes.length > 0
      ? partes.join('\n')
      : 'Oferta personalizada de energia solar'
  }

  const handleGenerate = async () => {
    if (!hasPrice) {
      toast({
        title: 'Error',
        description: 'La oferta debe tener un precio válido',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/stripe/generar-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          precio: oferta.precio,
          descripcion: formatearDescripcion(),
          oferta_id: oferta.id,
          cliente_id: oferta.cliente_id,
          lead_id: oferta.lead_id,
          moneda: currency,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al generar link de pago')
      }

      setPaymentLink(data.payment_link)
      setDialogOpen(true)

      toast({
        title: 'Link de Pago Generado',
        description: data.message,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al generar link',
        variant: 'destructive',
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
        title: 'Copiado',
        description: 'Link de pago copiado al portapapeles',
      })

      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el link',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor={currencySelectId} className="text-xs font-medium text-gray-600">
            Moneda
          </label>
          <select
            id={currencySelectId}
            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as 'USD' | 'EUR')}
            disabled={loading}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <Button
          variant={variant}
          size={size}
          onClick={handleGenerate}
          disabled={isDisabled}
          title={
            isPagada
              ? 'La oferta ya está pagada'
              : !hasPrice
              ? 'La oferta debe tener un precio válido'
              : 'Generar link de pago con Stripe (incluye 5% de gastos)'
          }
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            showIcon && <CreditCard className="h-4 w-4" />
          )}
          {size !== 'icon' && (
            <span className={showIcon ? 'ml-2' : ''}>
              {loading ? 'Generando...' : 'Generar Link de Pago (+5% Stripe)'}
            </span>
          )}
        </Button>
      </div>

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
              <label className="text-sm font-medium text-gray-700">
                Link de Pago
              </label>
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  title="Copiar link"
                >
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
                <strong>Descripción:</strong> {formatearDescripcion()}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Precio base:</strong>{' '}
                {typeof oferta.precio === 'number' ? formatCurrency(oferta.precio, currency) : 'N/A'}
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
