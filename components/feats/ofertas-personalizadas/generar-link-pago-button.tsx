"use client"

import { useState } from 'react'
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
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [paymentLink, setPaymentLink] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Validaciones
  const isPagada = oferta.pagada === true
  const hasPrice = oferta.precio !== undefined && oferta.precio !== null && oferta.precio > 0
  const isDisabled = isPagada || !hasPrice || loading

  // Formatear descripción de la oferta
  const formatearDescripcion = (): string => {
    const partes: string[] = []

    if (oferta.inversores && oferta.inversores.length > 0) {
      partes.push(`Inversores: ${oferta.inversores.length}`)
    }
    if (oferta.baterias && oferta.baterias.length > 0) {
      partes.push(`Baterías: ${oferta.baterias.length}`)
    }
    if (oferta.paneles && oferta.paneles.length > 0) {
      partes.push(`Paneles: ${oferta.paneles.length}`)
    }
    if (oferta.utiles && oferta.utiles.length > 0) {
      partes.push(`Útiles: ${oferta.utiles.length}`)
    }
    if (oferta.servicios && oferta.servicios.length > 0) {
      partes.push(`Servicios: ${oferta.servicios.length}`)
    }

    return partes.length > 0
      ? partes.join(' | ')
      : 'Oferta personalizada de energía solar'
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
            : 'Generar link de pago con Stripe'
        }
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          showIcon && <CreditCard className="h-4 w-4" />
        )}
        {size !== 'icon' && (
          <span className={showIcon ? 'ml-2' : ''}>
            {loading ? 'Generando...' : 'Generar Link de Pago'}
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
                <strong>Precio:</strong> ${oferta.precio?.toFixed(2)} USD
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
