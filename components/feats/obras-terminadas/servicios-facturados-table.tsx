"use client"

import { Loader2 } from "lucide-react"
import { Badge } from "@/components/shared/atom/badge"
import type { ServicioCliente } from "@/lib/services/feats/customer/servicios-cliente-service"

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0)
}

function formatFecha(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("es-ES")
}

interface ServiciosFacturadosTableProps {
  servicios: ServicioCliente[]
  loading: boolean
}

/**
 * Lista simple (sin export PDF/Excel todavía) de servicios de cliente ya
 * facturados, para verlos junto a las facturas de obras. Deliberadamente
 * separada de FacturasObrasTerminadasTable: esa tabla asume la forma de
 * ObraTerminada (precio_final, materiales, comercial...) y mezclar ambas
 * formas ahí sería más confuso que tenerlas en pestañas distintas.
 */
export function ServiciosFacturadosTable({ servicios, loading }: ServiciosFacturadosTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
      </div>
    )
  }

  if (servicios.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-500">No hay servicios facturados.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2.5">Cliente</th>
            <th className="px-4 py-2.5">Descripción</th>
            <th className="px-4 py-2.5">Precio</th>
            <th className="px-4 py-2.5">Pendiente</th>
            <th className="px-4 py-2.5">N° Factura</th>
            <th className="px-4 py-2.5">Fecha facturación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {servicios.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-2.5 font-medium text-gray-900">{s.cliente_numero}</td>
              <td className="px-4 py-2.5 text-gray-700">{s.descripcion}</td>
              <td className="px-4 py-2.5">{formatMoney(s.precio_total)}</td>
              <td className="px-4 py-2.5">
                {s.monto_pendiente > 0 ? (
                  <span className="text-red-600">{formatMoney(s.monto_pendiente)}</span>
                ) : (
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    Pagado
                  </Badge>
                )}
              </td>
              <td className="px-4 py-2.5">{s.numero_factura || "—"}</td>
              <td className="px-4 py-2.5">{formatFecha(s.fecha_facturacion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
