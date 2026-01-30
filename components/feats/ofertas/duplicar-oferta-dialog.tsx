"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/shared/molecule/dialog"
import { ConfeccionOfertasView } from "./confeccion-ofertas-view"
import type { OfertaConfeccion } from "@/hooks/use-ofertas-confeccion"
import { Copy, X } from "lucide-react"
import { Button } from "@/components/shared/atom/button"

interface DuplicarOfertaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oferta: OfertaConfeccion | null
  onSuccess?: () => void
}

export function DuplicarOfertaDialog({ open, onOpenChange, oferta, onSuccess }: DuplicarOfertaDialogProps) {
  if (!oferta) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-screen h-screen p-0 m-0 rounded-none border-0 flex flex-col overflow-hidden">
        {/* Header fijo con botón de cerrar */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b bg-white z-50">
          <div>
            <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Copy className="h-5 w-5 text-blue-600" />
              Duplicar Oferta
            </DialogTitle>
            <p className="text-sm text-slate-600 mt-0.5">
              Creando nueva oferta basada en: {oferta.nombre}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Contenido - debe tener flex-1 y min-h-0 para que los scrolls internos funcionen */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <ConfeccionOfertasView 
            modoEdicion={false}
            ofertaParaDuplicar={oferta}
            onGuardarExito={() => {
              onSuccess?.()
              onOpenChange(false)
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
