"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { AlertTriangle, Loader2, Package } from "lucide-react"
import {
  FacturacionPendienteService,
  type OfertaPorFacturar,
  type ResultadoFacturar,
  type ValePendiente,
} from "@/lib/services/feats/facturacion-pendiente/facturacion-pendiente-service"
import { formatCantidad, formatFecha, formatMoney } from "./formato"

interface FacturarOfertaDialogProps {
  oferta: OfertaPorFacturar | null
  clienteNombre: string | null
  fechaInstalacion: string | null
  valesPendientes: ValePendiente[]
  /** Otras ofertas del cliente que siguen pendientes: se quedarán sin vales. */
  otrasPendientes: number
  onOpenChange: (open: boolean) => void
  onFacturada: (resultado: ResultadoFacturar) => void
}

export function FacturarOfertaDialog({
  oferta,
  clienteNombre,
  fechaInstalacion,
  valesPendientes,
  otrasPendientes,
  onOpenChange,
  onFacturada,
}: FacturarOfertaDialogProps) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cerrar = (open: boolean) => {
    if (enviando) return
    setError(null)
    onOpenChange(open)
  }

  const confirmar = async () => {
    if (!oferta) return
    setEnviando(true)
    setError(null)
    try {
      const resultado = await FacturacionPendienteService.facturar(oferta.oferta_id)
      onFacturada(resultado)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo facturar la oferta")
    } finally {
      setEnviando(false)
    }
  }

  const materiales = valesPendientes.reduce((n, v) => n + v.materiales.length, 0)

  return (
    <Dialog open={!!oferta} onOpenChange={cerrar}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Facturar {oferta?.numero_oferta}</DialogTitle>
          <DialogDescription>
            {clienteNombre} · Total {formatMoney(oferta?.precio_final)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 text-sm">
          <ul className="space-y-1.5 text-gray-700">
            <li>
              La oferta quedará <strong>facturada</strong> con un número nuevo y fecha{" "}
              <strong>{formatFecha(fechaInstalacion) === "—" ? "de hoy" : formatFecha(fechaInstalacion)}</strong>{" "}
              (la de instalación del cliente). Aparecerá en Obras Terminadas → Facturas.
            </li>
            <li>
              {valesPendientes.length > 0 ? (
                <>
                  Se crea la <strong>factura de vales</strong> con {valesPendientes.length}{" "}
                  {valesPendientes.length === 1 ? "vale" : "vales"} ({materiales} líneas) que aún no se habían
                  facturado.
                </>
              ) : (
                <>El cliente no tiene vales pendientes: no se crea factura de vales.</>
              )}
            </li>
          </ul>

          {valesPendientes.length > 0 && otrasPendientes > 0 && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Los vales no indican de qué oferta son: esta factura se lleva <strong>todos</strong> los vales
                pendientes del cliente. {otrasPendientes === 1 ? "La otra oferta pendiente" : `Las otras ${otrasPendientes} ofertas pendientes`}{" "}
                se facturarán después sin vales.
              </span>
            </div>
          )}

          {valesPendientes.length > 0 && (
            <div className="rounded-md border border-gray-200">
              <div className="flex items-center gap-1.5 border-b bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
                <Package className="h-3.5 w-3.5" />
                Vales que entran en la factura
              </div>
              <div className="divide-y max-h-60 overflow-y-auto">
                {valesPendientes.map((v) => (
                  <div key={v.vale_id} className="px-3 py-2">
                    <div className="text-xs font-medium text-gray-800">
                      {v.codigo || v.vale_id} <span className="text-gray-500 font-normal">· {formatFecha(v.fecha)}</span>
                    </div>
                    <ul className="mt-1 text-xs text-gray-600 space-y-0.5">
                      {v.materiales.map((m, i) => (
                        <li key={i}>
                          {formatCantidad(m.cantidad)} × {m.nombre || m.codigo}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-3 border-t">
          <Button variant="outline" onClick={() => cerrar(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={enviando} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Facturando...
              </>
            ) : (
              "Facturar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
