"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, Wrench } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Input } from "@/components/shared/molecule/input"
import { useToast } from "@/hooks/use-toast"
import {
  ServiciosClienteService,
  type ServicioCliente,
} from "@/lib/services/feats/customer/servicios-cliente-service"
import { ServicioClienteEstadoBadge } from "@/components/feats/customer/servicio-cliente-estado-badge"
import { RegistrarPagoDialog } from "./registrar-pago-dialog"

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0)

/**
 * Cobros de Servicios de cliente (trabajos post-venta), junto a los de ofertas
 * pero en su propia vista: las tablas de ofertas están atadas a otro endpoint
 * paginado y a la forma de OfertaConPagos, así que aquí se listan aparte y
 * cada fila lleva la etiqueta "Servicio".
 */
export function ServiciosPagosPanel() {
  const { toast } = useToast()
  const [servicios, setServicios] = useState<ServicioCliente[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState("")
  const [soloPendientes, setSoloPendientes] = useState(true)
  const [seleccionado, setSeleccionado] = useState<ServicioCliente | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      setServicios(await ServiciosClienteService.listarTodos())
    } catch (e) {
      toast({
        title: "No se pudieron cargar los servicios",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargar()
  }, [cargar])

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    return servicios.filter((s) => {
      if (soloPendientes && s.monto_pendiente <= 0.01) return false
      if (!t) return true
      return [s.cliente_nombre, s.cliente_numero, s.descripcion, s.numero_factura]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    })
  }, [servicios, q, soloPendientes])

  const totalPendiente = filtrados.reduce((a, s) => a + s.monto_pendiente, 0)

  return (
    <>
      <div className="rounded-lg border border-l-4 border-l-green-600 bg-white p-4 shadow-md space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente, servicio o factura..."
            className="h-9 w-72"
          />
          <Button
            variant={soloPendientes ? "default" : "outline"}
            size="sm"
            onClick={() => setSoloPendientes((v) => !v)}
          >
            Solo con saldo pendiente
          </Button>
          <Button variant="outline" size="sm" onClick={cargar} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <span className="ml-auto text-sm text-gray-600">
            {filtrados.length} servicios · Pendiente: <strong className="text-red-600">{money(totalPendiente)}</strong>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No hay servicios para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Servicio</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Precio</th>
                  <th className="px-3 py-2">Cobrado</th>
                  <th className="px-3 py-2">Pendiente</th>
                  <th className="px-3 py-2">Factura</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="gap-1 bg-teal-100 text-teal-800 border-teal-200">
                        <Wrench className="h-3 w-3" />
                        Servicio
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {s.cliente_nombre || s.cliente_numero}
                      <span className="block text-xs font-normal text-gray-500">N° {s.cliente_numero}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{s.descripcion}</td>
                    <td className="px-3 py-2">
                      <ServicioClienteEstadoBadge estado={s.estado} />
                    </td>
                    <td className="px-3 py-2">{money(s.precio_total)}</td>
                    <td className="px-3 py-2 text-emerald-700">{money(s.precio_total - s.monto_pendiente)}</td>
                    <td className="px-3 py-2 font-medium text-red-600">{money(s.monto_pendiente)}</td>
                    <td className="px-3 py-2">{s.numero_factura || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {s.monto_pendiente > 0.01 && (
                        <Button size="sm" variant="outline" onClick={() => setSeleccionado(s)}>
                          Registrar pago
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RegistrarPagoDialog
        open={seleccionado !== null}
        onOpenChange={(v) => {
          if (!v) setSeleccionado(null)
        }}
        tipo="servicio"
        oferta={
          seleccionado
            ? {
                id: seleccionado.id,
                descripcion: seleccionado.descripcion,
                precio_total: seleccionado.precio_total,
                monto_pendiente: seleccionado.monto_pendiente,
                cliente_nombre: seleccionado.cliente_nombre ?? seleccionado.cliente_numero,
              }
            : null
        }
        onSuccess={() => {
          setSeleccionado(null)
          cargar()
        }}
      />
    </>
  )
}
