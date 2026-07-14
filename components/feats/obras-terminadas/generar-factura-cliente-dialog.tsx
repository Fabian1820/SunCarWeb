"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { ClienteSearchSelector } from "@/components/feats/cliente/cliente-search-selector"
import { ClienteService } from "@/lib/services/feats/customer/cliente-service"
import {
  ObrasTerminadasService,
  type ObraTerminada,
} from "@/lib/services/feats/obras-terminadas/obras-terminadas-service"
import type { Cliente } from "@/lib/types/feats/customer/cliente-types"
import { Loader2, FileText, AlertTriangle } from "lucide-react"

interface GenerarFacturaClienteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFacturada?: () => void
  clienteNumeroInicial?: string
}

const INSTALADO_RE = /equipo\s+instalad/i

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value || 0)
}

export function GenerarFacturaClienteDialog({
  open,
  onOpenChange,
  onFacturada,
  clienteNumeroInicial,
}: GenerarFacturaClienteDialogProps) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [clienteId, setClienteId] = useState("")
  const [ofertas, setOfertas] = useState<ObraTerminada[]>([])
  const [loadingOfertas, setLoadingOfertas] = useState(false)
  const [facturandoOfertaId, setFacturandoOfertaId] = useState<string | null>(null)

  const clienteSeleccionado = clientes.find(
    (c) => c.id === clienteId || c.numero === clienteId,
  )

  useEffect(() => {
    if (!open) {
      setClienteId("")
      setOfertas([])
      return
    }
    if (clientes.length > 0) return
    setLoadingClientes(true)
    ClienteService.getClientes()
      .then((data) => setClientes(data.clients || []))
      .catch((error) => console.error("Error cargando clientes:", error))
      .finally(() => setLoadingClientes(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && clienteNumeroInicial) setClienteId(clienteNumeroInicial)
  }, [open, clienteNumeroInicial])

  useEffect(() => {
    const numero = clienteSeleccionado?.numero
    if (!numero) {
      setOfertas([])
      return
    }
    setLoadingOfertas(true)
    ObrasTerminadasService.getDatos({
      cliente_numero: numero,
      requiere_instalado: false,
      estado_factura: "todos",
      limit: 50,
    })
      .then((resp) => setOfertas(resp.data))
      .catch((error) => {
        console.error("Error cargando ofertas del cliente:", error)
        setOfertas([])
      })
      .finally(() => setLoadingOfertas(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteSeleccionado?.numero])

  const handleFacturar = async (oferta: ObraTerminada) => {
    if (!oferta.oferta_id) return

    const instalado = INSTALADO_RE.test(oferta.estado_cliente || "")
    if (!instalado) {
      const confirmar = window.confirm(
        "Este cliente todavía no está instalado (\"Equipo instalado con éxito\"). ¿Facturar de todas formas?",
      )
      if (!confirmar) return
    }

    setFacturandoOfertaId(oferta.oferta_id)
    try {
      const result = await ObrasTerminadasService.marcarFacturada(oferta.oferta_id)
      setOfertas((prev) =>
        prev.map((o) =>
          o.oferta_id === oferta.oferta_id
            ? { ...o, facturada: true, numero_factura: result.numero_factura }
            : o,
        ),
      )
      onFacturada?.()
    } catch (error) {
      console.error("Error generando factura:", error)
      window.alert(
        error instanceof Error ? error.message : "No se pudo generar la factura",
      )
    } finally {
      setFacturandoOfertaId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Generar factura a cliente</DialogTitle>
          <DialogDescription>
            Busca un cliente para ver sus ofertas confirmadas y facturar la que falte.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-shrink-0">
          <ClienteSearchSelector
            label="Cliente"
            clients={clientes}
            value={clienteId}
            onChange={setClienteId}
            loading={loadingClientes}
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 mt-2">
          {!clienteSeleccionado ? (
            <div className="text-center py-10 text-sm text-gray-500">
              Selecciona un cliente para ver sus ofertas confirmadas.
            </div>
          ) : loadingOfertas ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <span className="ml-3 text-gray-600 text-sm">Cargando ofertas...</span>
            </div>
          ) : ofertas.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-500">
              Este cliente no tiene ofertas confirmadas.
            </div>
          ) : (
            <div className="space-y-2">
              {!INSTALADO_RE.test(clienteSeleccionado.estado || "") && (
                <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Este cliente aún no está instalado (estado: {clienteSeleccionado.estado || "sin estado"}).
                </div>
              )}
              {ofertas.map((oferta) => (
                <div
                  key={oferta.oferta_id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">
                        {oferta.numero_oferta}
                      </span>
                      <span className="text-xs text-gray-500">
                        {oferta.fecha_creacion
                          ? new Date(oferta.fecha_creacion).toLocaleDateString("es-ES")
                          : "sin fecha"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 flex-wrap">
                      <span>Total: <strong>{formatMoney(oferta.precio_final)}</strong></span>
                      <span className="text-emerald-700">Pagado: {formatMoney(oferta.total_pagado)}</span>
                      <span className="text-red-600">Pendiente: {formatMoney(oferta.monto_pendiente)}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {oferta.facturada ? (
                      <span className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">
                        <FileText className="h-3 w-3" />
                        {oferta.numero_factura}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleFacturar(oferta)}
                        disabled={facturandoOfertaId === oferta.oferta_id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {facturandoOfertaId === oferta.oferta_id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Facturando...
                          </>
                        ) : (
                          "Facturar"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
