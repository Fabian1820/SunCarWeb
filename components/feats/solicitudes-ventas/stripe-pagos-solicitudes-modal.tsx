"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Input } from "@/components/shared/molecule/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { ExternalLink, Loader2, RefreshCw, CreditCard } from "lucide-react"
import { apiRequest } from "@/lib/api-config"

interface StripePagoListado {
  sessionId: string
  createdAt: string
  amountTotal: number
  feeAmount: number | null
  netAmount: number | null
  currency: string
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  paymentStatus: string
  checkoutStatus: string | null
  paymentMethodTypes: string[]
  paymentLinkId: string | null
  paymentLinkUrl: string | null
  invoiceUrl: string | null
  invoicePdf: string | null
  invoiceNumber: string | null
  receiptUrl: string | null
  solicitud_venta_id?: string
  solicitud_codigo?: string
  precio_base?: number
  incluye_comision?: boolean
}

interface StripePagosResponse {
  success: boolean
  message?: string
  data?: StripePagoListado[]
  total?: number
  total_amount?: number
}

interface StripePagosSolicitudesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type RecargoMode = "con_5" | "sin_5"

const toInputDate = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10)
}

const getCurrentMonthRange = () => {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  return {
    from: toInputDate(monthStart),
    to: toInputDate(today),
  }
}

const getLastDaysRange = (days: number) => {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - (days - 1))
  return {
    from: toInputDate(from),
    to: toInputDate(to),
  }
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

const formatAmount = (amount: number, currency: string) => {
  const normalized = (currency || "USD").toUpperCase()
  if (normalized === "EUR" || normalized === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalized,
      minimumFractionDigits: 2,
    }).format(amount)
  }
  return `${amount.toFixed(2)} ${normalized}`
}

const roundToTwo = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100

const getCoverageDetails = (pago: StripePagoListado, mode: RecargoMode) => {
  const amount = Number(pago.amountTotal || 0)
  const fee = Number(pago.feeAmount || 0)
  const net = Number(pago.netAmount || 0)
  const precioBase = Number(pago.precio_base || 0)
  const incluyeComision = pago.incluye_comision ?? true

  let montoOferta = 0
  if (incluyeComision && mode === "con_5") {
    montoOferta = roundToTwo(amount / 1.05)
  } else if (!incluyeComision && mode === "sin_5") {
    montoOferta = amount
  } else if (incluyeComision && mode === "sin_5") {
    montoOferta = roundToTwo(amount * 1.05)
  } else {
    montoOferta = roundToTwo(amount / 1.05)
  }

  const netReal = net > 0 ? net : roundToTwo(amount - fee)

  const balance = precioBase > 0 ? roundToTwo(montoOferta - precioBase) : null

  return {
    montoOferta,
    montoStripe: amount,
    feeAmount: fee,
    netReal,
    balanceCobertura: balance,
  }
}

export function StripePagosSolicitudesModal({
  open,
  onOpenChange,
}: StripePagosSolicitudesModalProps) {
  const [loading, setLoading] = useState(false)
  const [pagos, setPagos] = useState<StripePagoListado[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [recargoModeBySession, setRecargoModeBySession] = useState<Record<string, RecargoMode>>({})

  const applyQuickRange = useCallback((range: "7d" | "30d" | "month") => {
    if (range === "month") {
      const { from, to } = getCurrentMonthRange()
      setFechaDesde(from)
      setFechaHasta(to)
    } else {
      const days = range === "7d" ? 7 : 30
      const { from, to } = getLastDaysRange(days)
      setFechaDesde(from)
      setFechaHasta(to)
    }
  }, [])

  const fetchPagos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (fechaDesde) params.append("fecha_desde", fechaDesde)
      if (fechaHasta) params.append("fecha_hasta", fechaHasta)
      params.append("tipo", "solicitud_venta")

      const response = await apiRequest(`/stripe/pagos?${params.toString()}`, {
        method: "GET",
      })

      const data: StripePagosResponse = await response.json()

      if (!data.success) {
        throw new Error(data.message || "Error al cargar pagos")
      }

      setPagos(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar pagos de Stripe")
    } finally {
      setLoading(false)
    }
  }, [fechaDesde, fechaHasta])

  useEffect(() => {
    if (open) {
      applyQuickRange("month")
      fetchPagos()
    }
  }, [open, applyQuickRange, fetchPagos])

  const totalPagos = useMemo(() => pagos.length, [pagos])

  const totalMonto = useMemo(
    () => pagos.reduce((acc, p) => acc + Number(p.amountTotal || 0), 0),
    [pagos]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            Pagos Stripe - Solicitudes de Ventas
          </DialogTitle>
          <DialogDescription>
            Visualiza los pagos realizados a través de enlaces de Stripe generados desde solicitudes de ventas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyQuickRange("7d")}
              >
                Últimos 7 días
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyQuickRange("30d")}
              >
                Últimos 30 días
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyQuickRange("month")}
              >
                Mes actual
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-slate-600 mb-1">Fecha desde</p>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(event) => setFechaDesde(event.target.value)}
                />
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Fecha hasta</p>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(event) => setFechaHasta(event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="button" onClick={() => fetchPagos()} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    "Aplicar filtro"
                  )}
                </Button>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fetchPagos()}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-md border border-white/80 bg-white p-3">
                <p className="text-xs text-slate-600">Total de pagos</p>
                <p className="text-lg font-semibold text-slate-900">{totalPagos}</p>
              </div>
              <div className="rounded-md border border-white/80 bg-white p-3">
                <p className="text-xs text-slate-600">Monto total</p>
                <p className="text-lg font-semibold text-emerald-700">
                  {formatAmount(totalMonto, "USD")}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Si seleccionas <strong>Incluye 5%</strong>, el recargo se calcula como: monto - (monto / 1.05).
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="border rounded-lg min-h-[320px] overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
              </div>
            ) : pagos.length === 0 ? (
              <div className="text-center py-16 text-sm text-slate-600">
                No hay pagos Stripe para el rango seleccionado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Solicitud</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>¿Incluye 5%?</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead className="text-right">Precio Base</TableHead>
                    <TableHead className="text-right">Monto Stripe</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                    <TableHead className="text-right">Neto Real</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>Comprobante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((pago) => {
                    const mode = recargoModeBySession[pago.sessionId] || "con_5"
                    const coverage = getCoverageDetails(pago, mode)

                    return (
                      <TableRow key={pago.sessionId} className="text-xs">
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateTime(pago.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700">
                              {pago.solicitud_codigo || pago.solicitud_venta_id?.slice(-6).toUpperCase() || "-"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-xs">
                            {pago.customerName || "-"}
                          </span>
                          {pago.customerEmail && (
                            <div className="text-[11px] text-slate-500">
                              {pago.customerEmail}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mode}
                            onValueChange={(value: RecargoMode) =>
                              setRecargoModeBySession((prev) => ({
                                ...prev,
                                [pago.sessionId]: value,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="con_5">Incluye 5%</SelectItem>
                              <SelectItem value="sin_5">Sin 5%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {(pago.currency || "USD").toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-700">
                          {coverage.montoOferta !== null
                            ? formatAmount(pago.precio_base || coverage.montoOferta, pago.currency)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-900">
                          {formatAmount(pago.amountTotal, pago.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {typeof pago.feeAmount === "number"
                            ? formatAmount(pago.feeAmount, pago.currency)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {coverage.netReal !== null
                            ? formatAmount(coverage.netReal, pago.currency)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {coverage.balanceCobertura === null ? (
                            <Badge variant="outline">Sin dato</Badge>
                          ) : coverage.balanceCobertura >= 0 ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              Ganancia {formatAmount(coverage.balanceCobertura, pago.currency)}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">
                              Pérdida {formatAmount(Math.abs(coverage.balanceCobertura), pago.currency)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {pago.paymentMethodTypes.length > 0
                            ? pago.paymentMethodTypes.join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-700">
                            {pago.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pago.invoiceUrl || pago.invoicePdf ? (
                            <a
                              href={pago.invoiceUrl || pago.invoicePdf || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              Ver <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {pago.receiptUrl ? (
                            <a
                              href={pago.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              Ver <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}