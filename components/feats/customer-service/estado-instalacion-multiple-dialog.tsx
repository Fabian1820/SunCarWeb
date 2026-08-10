"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent } from "@/components/shared/molecule/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { Loader2, Image as ImageIcon } from "lucide-react"
import { useOfertasConfeccion } from "@/hooks/use-ofertas-confeccion"

const OPCIONES_ESTADO_INSTALACION = [
  "Pendiente de instalación",
  "Instalación en Proceso",
  "Equipo instalado con éxito",
] as const

interface OfertaConfirmadaDetalle {
  id: string
  numero_oferta?: string | null
  estado_instalacion?: string | null
  nombre_automatico?: string | null
  fecha_confirmada?: string | null
  foto_portada?: string | null
  precio_final?: number | null
  moneda_pago?: string | null
}

const formatearFecha = (fecha?: string | null) => {
  if (!fecha) return null
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const formatearPrecio = (precio?: number | null, moneda?: string | null) => {
  if (precio === null || precio === undefined) return null
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: moneda || "USD",
    minimumFractionDigits: 2,
  }).format(precio)
}

interface EstadoInstalacionMultipleDialogProps {
  clienteNombre: string | null
  ofertas: OfertaConfirmadaDetalle[] | null
  onOpenChange: (open: boolean) => void
  onUpdated?: () => void
}

export function EstadoInstalacionMultipleDialog({
  clienteNombre,
  ofertas,
  onOpenChange,
  onUpdated,
}: EstadoInstalacionMultipleDialogProps) {
  const { actualizarEstadoInstalacion } = useOfertasConfeccion({ autoLoad: false })
  const [valores, setValores] = useState<Record<string, string>>({})
  const [guardandoId, setGuardandoId] = useState<string | null>(null)

  const open = Boolean(ofertas && ofertas.length > 0)

  const valorDe = (o: OfertaConfirmadaDetalle) =>
    valores[o.id] ?? o.estado_instalacion ?? "Pendiente de instalación"

  const handleChange = async (oferta: OfertaConfirmadaDetalle, nuevoEstado: string) => {
    setValores((prev) => ({ ...prev, [oferta.id]: nuevoEstado }))
    setGuardandoId(oferta.id)
    const resultado = await actualizarEstadoInstalacion(oferta.id, nuevoEstado)
    setGuardandoId(null)
    if (resultado.success) {
      onUpdated?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Estado de instalación por oferta</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-600">
          Ofertas confirmadas de{" "}
          <span className="font-semibold text-gray-900">{clienteNombre}</span>{" "}
          — actualiza el estado de instalación de cada una por separado.
        </p>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {(ofertas || []).map((o) => {
            const fecha = formatearFecha(o.fecha_confirmada)
            const precio = formatearPrecio(o.precio_final, o.moneda_pago)
            return (
              <Card key={o.id} className="border">
                <CardContent className="p-2.5">
                  <div className="flex gap-2.5">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden relative border">
                        {o.foto_portada ? (
                          <Image
                            src={o.foto_portada}
                            alt={o.nombre_automatico || o.numero_oferta || ""}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {o.numero_oferta || o.id}
                        </span>
                        <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-700">
                          Confirmada
                        </span>
                        {precio && (
                          <span className="text-xs font-bold text-emerald-600 ml-auto">
                            {precio}
                          </span>
                        )}
                      </div>
                      {(o.nombre_automatico || fecha) && (
                        <p className="text-xs text-gray-600 truncate">
                          {o.nombre_automatico}
                          {o.nombre_automatico && fecha ? " · " : ""}
                          {fecha ? `Confirmada ${fecha}` : ""}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        {guardandoId === o.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        )}
                        <Select
                          value={valorDe(o)}
                          onValueChange={(value) => handleChange(o, value)}
                          disabled={guardandoId === o.id}
                        >
                          <SelectTrigger className="h-8 w-full text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPCIONES_ESTADO_INSTALACION.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
