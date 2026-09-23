"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, FileText, Loader2, Package, RotateCcw, Scale, Wrench } from "lucide-react"
import {
  FacturacionPendienteService,
  type DetalleClientePorFacturar,
  type OfertaPorFacturar,
  type ResultadoFacturar,
} from "@/lib/services/feats/facturacion-pendiente/facturacion-pendiente-service"
import { FacturarOfertaDialog } from "./facturar-oferta-dialog"
import { NoFacturarDialog } from "./no-facturar-dialog"
import { ESTADO_FACTURACION, formatCantidad, formatFecha, formatMoney } from "./formato"

interface DetalleClientePorFacturarProps {
  clienteNumero: string
  puedeFacturar: boolean
  puedeComparar: boolean
  onCambio: () => void
  onComparar: (clienteNumero: string) => void
}

export function DetalleClientePorFacturar({
  clienteNumero,
  puedeFacturar,
  puedeComparar,
  onCambio,
  onComparar,
}: DetalleClientePorFacturarProps) {
  const { toast } = useToast()
  const [detalle, setDetalle] = useState<DetalleClientePorFacturar | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aFacturar, setAFacturar] = useState<OfertaPorFacturar | null>(null)
  const [aDescartar, setADescartar] = useState<OfertaPorFacturar | null>(null)
  const [reactivando, setReactivando] = useState<string | null>(null)
  const [verVales, setVerVales] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDetalle(await FacturacionPendienteService.detalle(clienteNumero))
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el cliente")
    } finally {
      setCargando(false)
    }
  }, [clienteNumero])

  useEffect(() => {
    cargar()
  }, [cargar])

  const alFacturar = (r: ResultadoFacturar) => {
    toast({
      title: `Facturada ${r.numero_factura}`,
      description: r.aviso
        ? r.aviso
        : r.factura_vales
          ? `Factura de vales ${r.factura_vales.numero_factura} con ${r.factura_vales.vales_incluidos} vales.`
          : "Sin vales pendientes: no se creó factura de vales.",
      variant: r.aviso ? "destructive" : undefined,
    })
    cargar()
    onCambio()
  }

  const reactivar = async (oferta: OfertaPorFacturar) => {
    setReactivando(oferta.oferta_id)
    try {
      await FacturacionPendienteService.quitarNoFacturar(oferta.oferta_id)
      cargar()
      onCambio()
    } catch (e) {
      toast({
        title: "No se pudo deshacer",
        description: e instanceof Error ? e.message : "Intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setReactivando(null)
    }
  }

  if (cargando && !detalle) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin mr-2 text-emerald-600" />
        Cargando ofertas y vales...
      </div>
    )
  }

  if (error || !detalle) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        <AlertCircle className="h-4 w-4" />
        {error || "Sin datos"}
        <Button variant="outline" size="sm" className="ml-auto" onClick={cargar}>
          Reintentar
        </Button>
      </div>
    )
  }

  const pendientes = detalle.ofertas.filter((o) => o.estado_facturacion === "pendiente")

  return (
    <div className="space-y-4">
      {/* Ofertas confirmadas */}
      <div className="space-y-2">
        {detalle.ofertas.map((oferta) => {
          const estado = ESTADO_FACTURACION[oferta.estado_facturacion]
          return (
            <div
              key={oferta.oferta_id}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">{oferta.numero_oferta}</span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${estado.className}`}>
                    {estado.label}
                  </span>
                  <span className="text-xs text-gray-500">Confirmada {formatFecha(oferta.fecha_confirmada)}</span>
                </div>
                {oferta.nombre && <p className="mt-0.5 text-xs text-gray-600 truncate">{oferta.nombre}</p>}
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
                  <span>
                    Total <strong>{formatMoney(oferta.precio_final)}</strong>
                  </span>
                  <span className={oferta.monto_pendiente > 0.01 ? "text-red-600" : "text-emerald-700"}>
                    Pendiente de cobro {formatMoney(oferta.monto_pendiente)}
                  </span>
                  {oferta.estado_instalacion && <span>Instalación: {oferta.estado_instalacion}</span>}
                </div>
                {oferta.estado_facturacion === "facturada" && (
                  <p className="mt-1 text-xs text-emerald-800">
                    <FileText className="inline h-3 w-3 mr-1" />
                    {oferta.numero_factura || "Sin número"} · {formatFecha(oferta.fecha_facturacion)}
                    {oferta.facturada_por && ` · aceptada por ${oferta.facturada_por} el ${formatFecha(oferta.facturada_en)}`}
                  </p>
                )}
                {oferta.estado_facturacion === "no_facturar" && oferta.no_facturar && (
                  <p className="mt-1 text-xs text-gray-600">
                    “{oferta.no_facturar.motivo}” — {oferta.no_facturar.por || "sin nombre"}, {formatFecha(oferta.no_facturar.fecha)}
                  </p>
                )}
              </div>

              {puedeFacturar && oferta.estado_facturacion === "pendiente" && (
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setADescartar(oferta)}>
                    No facturar
                  </Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setAFacturar(oferta)}>
                    Facturar
                  </Button>
                </div>
              )}
              {puedeFacturar && oferta.estado_facturacion === "no_facturar" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  disabled={reactivando === oferta.oferta_id}
                  onClick={() => reactivar(oferta)}
                >
                  {reactivando === oferta.oferta_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Deshacer
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* Vales pendientes, facturas de vales, servicios */}
      <div className="grid gap-3 md:grid-cols-3 text-xs">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-1.5 font-medium text-gray-700">
            <Package className="h-3.5 w-3.5" />
            Vales sin facturar: {detalle.vales_pendientes.length}
          </div>
          <p className="mt-1 text-gray-500">Entran en la próxima factura del cliente.</p>
          {detalle.vales_pendientes.length > 0 && (
            <>
              <button className="mt-1 text-emerald-700 underline" onClick={() => setVerVales((v) => !v)}>
                {verVales ? "Ocultar" : "Ver materiales"}
              </button>
              {verVales && (
                <ul className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                  {detalle.vales_pendientes.map((v) => (
                    <li key={v.vale_id}>
                      <span className="font-medium">{v.codigo}</span> · {formatFecha(v.fecha)}
                      <ul className="pl-3 text-gray-600">
                        {v.materiales.map((m, i) => (
                          <li key={i}>
                            {formatCantidad(m.cantidad)} × {m.nombre || m.codigo}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-1.5 font-medium text-gray-700">
            <FileText className="h-3.5 w-3.5" />
            Facturas de vales emitidas: {detalle.facturas_vales.length}
          </div>
          <ul className="mt-2 space-y-1">
            {detalle.facturas_vales.map((f) => (
              <li key={f.id} className={f.anulada ? "text-gray-400 line-through" : "text-gray-700"}>
                {f.numero_factura} · {formatFecha(f.fecha)} · {f.vales} vales · {formatMoney(f.total)}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-1.5 font-medium text-gray-700">
            <Wrench className="h-3.5 w-3.5" />
            Servicios: {detalle.servicios.length}
          </div>
          <ul className="mt-2 space-y-1 text-gray-700">
            {detalle.servicios.map((s) => (
              <li key={s.id}>
                {s.descripcion} · {formatMoney(s.precio_total)} ·{" "}
                {s.facturado ? `facturado ${s.numero_factura ?? ""}` : s.estado}
              </li>
            ))}
          </ul>
          {detalle.servicios.length > 0 && (
            <p className="mt-1 text-gray-500">Se facturan desde Obras Terminadas → Facturas → Servicios.</p>
          )}
        </div>
      </div>

      {puedeComparar && (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onComparar(clienteNumero)}>
          <Scale className="h-4 w-4" />
          Ver oferta vs almacén
        </Button>
      )}

      <FacturarOfertaDialog
        oferta={aFacturar}
        clienteNombre={detalle.cliente_nombre}
        fechaInstalacion={detalle.fecha_equipo_instalado}
        valesPendientes={detalle.vales_pendientes}
        otrasPendientes={Math.max(0, pendientes.length - 1)}
        onOpenChange={(open) => !open && setAFacturar(null)}
        onFacturada={alFacturar}
      />
      <NoFacturarDialog
        oferta={aDescartar}
        onOpenChange={(open) => !open && setADescartar(null)}
        onHecho={() => {
          cargar()
          onCambio()
        }}
      />
    </div>
  )
}
