import type { EstadoComparacion, EstadoFacturacion } from "@/lib/services/feats/facturacion-pendiente/facturacion-pendiente-service"

export function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value || 0)
}

export function formatFecha(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatCantidad(value?: number | null) {
  const n = Number(value || 0)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

export const ESTADO_FACTURACION: Record<EstadoFacturacion, { label: string; className: string }> = {
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-800 border-amber-200" },
  facturada: { label: "Facturada", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  no_facturar: { label: "No se factura", className: "bg-gray-100 text-gray-700 border-gray-200" },
}

export const ESTADO_COMPARACION: Record<EstadoComparacion, { label: string; className: string }> = {
  ok: { label: "Completo", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  falta: { label: "Falta por salir", className: "bg-amber-100 text-amber-800 border-amber-200" },
  exceso: { label: "Salió de más", className: "bg-rose-100 text-rose-800 border-rose-200" },
  no_ofertado: { label: "No ofertado", className: "bg-sky-100 text-sky-800 border-sky-200" },
}
