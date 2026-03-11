"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { Package } from "lucide-react"
import { useMaterials } from "@/hooks/use-materials"
import { useMemo } from "react"

interface VerMaterialesOfertaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oferta: any | null
  nombreCliente?: string
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(value)
}

export function VerMaterialesOfertaDialog({ open, onOpenChange, oferta, nombreCliente }: VerMaterialesOfertaDialogProps) {
  const { materials } = useMaterials()

  const elementos = useMemo(() => {
    if (!oferta) return []
    return oferta.elementos || oferta.materiales || oferta.items || []
  }, [oferta])

  const getMaterialNombre = (elemento: any): string => {
    if (elemento.nombre) return elemento.nombre
    if (elemento.descripcion) return elemento.descripcion
    const material = materials.find(
      (m) => m.codigo?.toString() === elemento.material_codigo?.toString() || m.id === elemento.material_id
    )
    return material?.nombre || material?.descripcion || `Material ${elemento.material_codigo || elemento.material_id || ''}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Materiales de la Oferta
            {nombreCliente && <span className="text-sm font-normal text-gray-500">— {nombreCliente}</span>}
          </DialogTitle>
        </DialogHeader>

        {!oferta ? (
          <div className="text-center py-8 text-gray-500">No hay oferta seleccionada</div>
        ) : elementos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Esta oferta no tiene materiales</p>
          </div>
        ) : (
          <div className="space-y-3">
            {elementos.map((elemento: any, idx: number) => (
              <Card key={idx} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{getMaterialNombre(elemento)}</p>
                        {elemento.marca && (
                          <p className="text-xs text-gray-500">Marca: {elemento.marca}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm flex-shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Cantidad</p>
                        <p className="font-semibold">{elemento.cantidad ?? 1}</p>
                      </div>
                      {elemento.precio != null && (
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Precio</p>
                          <p className="font-semibold text-green-700">{formatCurrency(elemento.precio)}</p>
                        </div>
                      )}
                      {elemento.precio != null && elemento.cantidad != null && (
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold text-gray-900">{formatCurrency(elemento.precio * elemento.cantidad)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
