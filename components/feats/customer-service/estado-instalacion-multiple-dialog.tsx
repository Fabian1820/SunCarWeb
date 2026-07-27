"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { Loader2 } from "lucide-react"
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
}

const formatearFecha = (fecha?: string | null) => {
  if (!fecha) return null
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Estado de instalación por oferta</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-600">
          {clienteNombre} tiene más de una oferta confirmada — actualiza el
          estado de instalación de cada una por separado.
        </p>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {(ofertas || []).map((o) => {
            const fecha = formatearFecha(o.fecha_confirmada)
            return (
            <div
              key={o.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {o.numero_oferta || o.id}
                </p>
                {(o.nombre_automatico || fecha) && (
                  <p className="text-xs text-slate-500 truncate">
                    {o.nombre_automatico}
                    {o.nombre_automatico && fecha ? " · " : ""}
                    {fecha ? `Confirmada ${fecha}` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {guardandoId === o.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                )}
                <Select
                  value={valorDe(o)}
                  onValueChange={(value) => handleChange(o, value)}
                  disabled={guardandoId === o.id}
                >
                  <SelectTrigger className="w-56">
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
