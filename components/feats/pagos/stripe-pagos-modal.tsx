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
import { ExternalLink, Loader2, RefreshCw } from "lucide-react"
import { apiRequest } from "@/lib/api-config"
import type { OfertaConfirmadaSinPago } from "@/lib/services/feats/pagos/pagos-service"
import {
  RegistrarPagoDialog,
  type RegistrarPagoInitialData,
  type RegistrarPagoSuccessPayload,
} from "@/components/feats/pagos/registrar-pago-dialog"

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
}

interface StripePagosResponse {
  success: boolean
  message?: string
  data?: StripePagoListado[]
  total?: number
  total_amount?: number
}

interface StripePagosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPagoSuccess?: () => void
}

type RecargoMode = "con_5" | "sin_5"

type ContactoTipo = "cliente" | "lead" | "lead_sin_agregar" | null

type RecordUnknown = Record<string, unknown>

interface ResultadoLinkInterno {
  encontrado: boolean
  data: RecordUnknown | null
}

const isRecord = (value: unknown): value is RecordUnknown =>
  typeof value === "object" && value !== null

const prop = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toNullableNumber = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string")
}

const normalizeLink = (value: string) => value.trim().replace(/\/$/, "")

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

const inferTipoContacto = (raw: RecordUnknown): ContactoTipo => {
  const contactoTipo = toStringOrNull(prop(prop(raw, "contacto"), "tipo_contacto"))
  if (
    contactoTipo === "cliente" ||
    contactoTipo === "lead" ||
    contactoTipo === "lead_sin_agregar"
  ) {
    return contactoTipo
  }

  if (isRecord(prop(raw, "cliente"))) return "cliente"
  if (isRecord(prop(raw, "lead"))) return "lead"
  if (toStringOrNull(prop(raw, "nombre_lead_sin_agregar"))) return "lead_sin_agregar"

  return null
}

const buildOfertaForPagoDialog = (raw: RecordUnknown): OfertaConfirmadaSinPago => {
  const cliente = prop(raw, "cliente")
  const lead = prop(raw, "lead")
  const contacto = prop(raw, "contacto")

  const clienteNumero =
    toStringOrNull(prop(raw, "cliente_numero")) ||
    toStringOrNull(prop(cliente, "numero"))

  const contactoNombre =
    toStringOrNull(prop(contacto, "nombre")) ||
    toStringOrNull(prop(cliente, "nombre")) ||
    toStringOrNull(prop(lead, "nombre")) ||
    toStringOrNull(prop(raw, "nombre_lead_sin_agregar"))

  const contactoTelefono =
    toStringOrNull(prop(contacto, "telefono")) ||
    toStringOrNull(prop(cliente, "telefono")) ||
    toStringOrNull(prop(lead, "telefono"))

  const contactoCarnet =
    toStringOrNull(prop(contacto, "carnet")) ||
    toStringOrNull(prop(cliente, "carnet_identidad")) ||
    clienteNumero

  const contactoDireccion =
    toStringOrNull(prop(contacto, "direccion")) ||
    toStringOrNull(prop(cliente, "direccion")) ||
    toStringOrNull(prop(lead, "direccion"))

  const contactoCodigo =
    toStringOrNull(prop(contacto, "codigo")) ||
    clienteNumero ||
    toStringOrNull(prop(raw, "lead_id"))

  const precioFinal = toNumber(prop(raw, "precio_final"), 0)
  const montoPendiente = toNumber(prop(raw, "monto_pendiente"), precioFinal)

  const clienteRecord = isRecord(cliente)
  const leadRecord = isRecord(lead)

  const clienteNumeroValue = toStringOrNull(prop(cliente, "numero")) || clienteNumero
  const clienteNombreValue = toStringOrNull(prop(cliente, "nombre")) || contactoNombre

  const leadId = toStringOrNull(prop(lead, "id")) || toStringOrNull(prop(raw, "lead_id"))
  const leadNombre =
    toStringOrNull(prop(lead, "nombre")) ||
    toStringOrNull(prop(raw, "nombre_lead_sin_agregar"))

  return {
    id: toStringOrNull(prop(raw, "id")) || "",
    numero_oferta: toStringOrNull(prop(raw, "numero_oferta")) || "-",
    nombre_automatico:
      toStringOrNull(prop(raw, "nombre_automatico")) ||
      toStringOrNull(prop(raw, "nombre_oferta")) ||
      "Oferta",
    nombre_oferta:
      toStringOrNull(prop(raw, "nombre_oferta")) ||
      toStringOrNull(prop(raw, "nombre_automatico")) ||
      "Oferta",
    nombre_completo:
      toStringOrNull(prop(raw, "nombre_completo")) ||
      toStringOrNull(prop(raw, "nombre_oferta")) ||
      "Oferta",
    tipo_oferta: toStringOrNull(prop(raw, "tipo_oferta")) || "personalizada",
    cliente_numero: clienteNumero,
    lead_id: toStringOrNull(prop(raw, "lead_id")),
    nombre_lead_sin_agregar: toStringOrNull(prop(raw, "nombre_lead_sin_agregar")),
    almacen_id: toStringOrNull(prop(raw, "almacen_id")) || "desconocido",
    almacen_nombre: toStringOrNull(prop(raw, "almacen_nombre")) || "Sin almacén",
    margen_comercial: toNumber(prop(raw, "margen_comercial"), 0),
    porcentaje_margen_materiales: toNumber(
      prop(raw, "porcentaje_margen_materiales"),
      0,
    ),
    porcentaje_margen_instalacion: toNumber(
      prop(raw, "porcentaje_margen_instalacion"),
      0,
    ),
    margen_total: toNumber(prop(raw, "margen_total"), 0),
    margen_materiales: toNumber(prop(raw, "margen_materiales"), 0),
    margen_instalacion: toNumber(prop(raw, "margen_instalacion"), 0),
    costo_transportacion: toNumber(prop(raw, "costo_transportacion"), 0),
    total_materiales: toNumber(prop(raw, "total_materiales"), 0),
    subtotal_con_margen: toNumber(prop(raw, "subtotal_con_margen"), 0),
    descuento_porcentaje: toNumber(prop(raw, "descuento_porcentaje"), 0),
    monto_descuento: toNumber(prop(raw, "monto_descuento"), 0),
    subtotal_con_descuento: toNumber(prop(raw, "subtotal_con_descuento"), 0),
    total_elementos_personalizados: toNumber(
      prop(raw, "total_elementos_personalizados"),
      0,
    ),
    total_costos_extras: toNumber(prop(raw, "total_costos_extras"), 0),
    precio_final: precioFinal,
    aplica_contribucion: Boolean(prop(raw, "aplica_contribucion")),
    porcentaje_contribucion: toNumber(prop(raw, "porcentaje_contribucion"), 0),
    monto_contribucion: toNullableNumber(prop(raw, "monto_contribucion")),
    moneda_pago: toStringOrNull(prop(raw, "moneda_pago")) || "USD",
    tasa_cambio: toNullableNumber(prop(raw, "tasa_cambio")),
    pago_transferencia: Boolean(prop(raw, "pago_transferencia")),
    datos_cuenta: toStringOrNull(prop(raw, "datos_cuenta")),
    monto_convertido: toNullableNumber(prop(raw, "monto_convertido")),
    pagos: toStringArray(prop(raw, "pagos")),
    monto_pendiente: Math.max(0, montoPendiente),
    notas: toStringOrNull(prop(raw, "notas")),
    creado_por: toStringOrNull(prop(raw, "creado_por")),
    fecha_creacion:
      toStringOrNull(prop(raw, "fecha_creacion")) || new Date().toISOString(),
    contacto: {
      nombre: contactoNombre,
      telefono: contactoTelefono,
      carnet: contactoCarnet,
      direccion: contactoDireccion,
      codigo: contactoCodigo,
      tipo_contacto: inferTipoContacto(raw),
    },
    cliente:
      clienteRecord && clienteNumeroValue && clienteNombreValue
        ? {
            numero: clienteNumeroValue,
            nombre: clienteNombreValue,
            telefono: toStringOrNull(prop(cliente, "telefono")) || undefined,
            direccion: toStringOrNull(prop(cliente, "direccion")) || undefined,
            carnet_identidad:
              toStringOrNull(prop(cliente, "carnet_identidad")) || undefined,
          }
        : undefined,
    lead:
      leadRecord && leadId && leadNombre
        ? {
            id: leadId,
            nombre: leadNombre,
            telefono: toStringOrNull(prop(lead, "telefono")) || undefined,
            direccion: toStringOrNull(prop(lead, "direccion")) || undefined,
          }
        : undefined,
  }
}

const getContactDisplay = (
  pago: StripePagoListado,
  localData: RecordUnknown | null,
) => {
  if (!localData) {
    return {
      nombre: pago.customerName || "Cliente Stripe",
      telefono: pago.customerPhone || "-",
      carnet: "-",
      numeroOferta: "-",
      ofertaNombre: "No hay oferta, debe ser de Loydi o fernando",
      ofertaPrecio: null as number | null,
      origen: "stripe",
    }
  }

  const contacto = prop(localData, "contacto")
  const cliente = prop(localData, "cliente")
  const lead = prop(localData, "lead")

  const nombre =
    toStringOrNull(prop(contacto, "nombre")) ||
    toStringOrNull(prop(cliente, "nombre")) ||
    toStringOrNull(prop(lead, "nombre")) ||
    toStringOrNull(prop(localData, "nombre_lead_sin_agregar")) ||
    pago.customerName ||
    "Cliente"

  const telefono =
    toStringOrNull(prop(contacto, "telefono")) ||
    toStringOrNull(prop(cliente, "telefono")) ||
    toStringOrNull(prop(lead, "telefono")) ||
    pago.customerPhone ||
    "-"

  const carnet =
    toStringOrNull(prop(contacto, "carnet")) ||
    toStringOrNull(prop(cliente, "carnet_identidad")) ||
    toStringOrNull(prop(cliente, "numero")) ||
    toStringOrNull(prop(localData, "cliente_numero")) ||
    "-"

  const numeroOferta = toStringOrNull(prop(localData, "numero_oferta")) || "-"
  const ofertaNombre =
    toStringOrNull(prop(localData, "nombre_automatico")) ||
    toStringOrNull(prop(localData, "nombre_completo")) ||
    toStringOrNull(prop(localData, "nombre_oferta")) ||
    numeroOferta
  const ofertaPrecio = toNullableNumber(prop(localData, "precio_final"))

  return {
    nombre,
    telefono,
    carnet,
    numeroOferta,
    ofertaNombre,
    ofertaPrecio,
    origen: "interno",
  }
}

export function StripePagosModal({
  open,
  onOpenChange,
  onPagoSuccess,
}: StripePagosModalProps) {
  const currentRange = useMemo(() => getCurrentMonthRange(), [])
  const [fechaDesde, setFechaDesde] = useState<string>(currentRange.from)
  const [fechaHasta, setFechaHasta] = useState<string>(currentRange.to)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagos, setPagos] = useState<StripePagoListado[]>([])
  const [totalMonto, setTotalMonto] = useState(0)
  const [localDataLoading, setLocalDataLoading] = useState(false)
  const [localDataError, setLocalDataError] = useState<string | null>(null)
  const [localDataByLink, setLocalDataByLink] = useState<
    Record<string, ResultadoLinkInterno>
  >({})
  const [recargoModeBySession, setRecargoModeBySession] = useState<
    Record<string, RecargoMode>
  >({})
  const [nuevoPagoOpen, setNuevoPagoOpen] = useState(false)
  const [selectedOferta, setSelectedOferta] = useState<OfertaConfirmadaSinPago | null>(
    null,
  )
  const [nuevoPagoInitialData, setNuevoPagoInitialData] =
    useState<RegistrarPagoInitialData | null>(null)
  const [comisionPendienteRegistro, setComisionPendienteRegistro] = useState<number | null>(
    null,
  )

  const fetchLocalDataByLinks = useCallback(async (items: StripePagoListado[]) => {
    const links = Array.from(
      new Set(
        items
          .map((item) => (item.paymentLinkUrl ? normalizeLink(item.paymentLinkUrl) : ""))
          .filter((item) => item.length > 0),
      ),
    )

    if (links.length === 0) {
      setLocalDataByLink({})
      setLocalDataError(null)
      return
    }

    setLocalDataLoading(true)
    try {
      const response = await apiRequest<{
        success?: boolean
        message?: string
        data?: {
          resultados?: Array<{
            link_pago_stripe?: string
            encontrado?: boolean
            data?: unknown
          }>
        }
        resultados?: Array<{
          link_pago_stripe?: string
          encontrado?: boolean
          data?: unknown
        }>
      }>("/ofertas/confeccion/por-links-pago-stripe", {
        method: "POST",
        body: JSON.stringify({ linksPagoStripe: links }),
      })

      const resultadosRaw = Array.isArray(response?.data?.resultados)
        ? response.data.resultados
        : Array.isArray(response?.resultados)
          ? response.resultados
          : []

      const nextMap: Record<string, ResultadoLinkInterno> = {}
      resultadosRaw.forEach((resultado) => {
        const link = toStringOrNull(resultado.link_pago_stripe)
        if (!link) return

        const normalized = normalizeLink(link)
        nextMap[normalized] = {
          encontrado: Boolean(resultado.encontrado),
          data: isRecord(resultado.data) ? resultado.data : null,
        }
      })

      setLocalDataByLink(nextMap)
      setLocalDataError(null)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron obtener los datos internos por link."
      setLocalDataError(message)
      setLocalDataByLink({})
    } finally {
      setLocalDataLoading(false)
    }
  }, [])

  const fetchPagos = useCallback(
    async (filters?: { from: string; to: string }) => {
      const from = filters?.from ?? fechaDesde
      const to = filters?.to ?? fechaHasta

      if (from && to && from > to) {
        setError("La fecha desde no puede ser mayor que la fecha hasta.")
        return
      }

      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (from) params.set("fecha_desde", from)
        if (to) params.set("fecha_hasta", to)
        params.set("limit", "500")

        const response = await fetch(`/api/stripe/listar-pagos?${params.toString()}`)
        const data: StripePagosResponse = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.message || "No se pudo cargar el listado de Stripe.")
        }

        const pagosList = Array.isArray(data.data) ? data.data : []
        setPagos(pagosList)
        setTotalMonto(typeof data.total_amount === "number" ? data.total_amount : 0)
        await fetchLocalDataByLinks(pagosList)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo cargar el listado de Stripe."
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [fechaDesde, fechaHasta, fetchLocalDataByLinks],
  )

  useEffect(() => {
    if (!open) return
    fetchPagos()
  }, [open, fetchPagos])

  useEffect(() => {
    setRecargoModeBySession((prev) => {
      const next: Record<string, RecargoMode> = {}
      pagos.forEach((pago) => {
        next[pago.sessionId] = prev[pago.sessionId] || "con_5"
      })
      return next
    })
  }, [pagos])

  const applyQuickRange = (type: "today" | "7d" | "30d" | "month") => {
    let range = currentRange

    if (type === "today") {
      const today = toInputDate(new Date())
      range = { from: today, to: today }
    }
    if (type === "7d") {
      range = getLastDaysRange(7)
    }
    if (type === "30d") {
      range = getLastDaysRange(30)
    }
    if (type === "month") {
      range = getCurrentMonthRange()
    }

    setFechaDesde(range.from)
    setFechaHasta(range.to)
    fetchPagos(range)
  }

  const totalPagos = pagos.length

  const getCoverageDetails = (pago: StripePagoListado, mode: RecargoMode) => {
    const gross = Number(pago.amountTotal || 0)
    const fee = typeof pago.feeAmount === "number" ? pago.feeAmount : null

    const montoOferta = mode === "con_5" ? roundToTwo(gross / 1.05) : gross
    const recargoCobrado = mode === "con_5" ? Math.max(0, gross - montoOferta) : 0
    const netoReal =
      typeof pago.netAmount === "number"
        ? pago.netAmount
        : fee !== null
          ? gross - fee
          : null
    const balanceCobertura = fee !== null ? recargoCobrado - fee : null

    return {
      montoOferta,
      recargoCobrado,
      netoReal,
      balanceCobertura,
    }
  }

  const getLocalResultForPago = (pago: StripePagoListado): ResultadoLinkInterno | null => {
    if (!pago.paymentLinkUrl) return null
    const normalized = normalizeLink(pago.paymentLinkUrl)
    return localDataByLink[normalized] || null
  }

  const handleNuevoPago = (pago: StripePagoListado) => {
    const result = getLocalResultForPago(pago)
    if (!result?.encontrado || !result.data) return

    const oferta = buildOfertaForPagoDialog(result.data)
    const currency = (pago.currency || "USD").toUpperCase() as "USD" | "EUR" | "CUP"
    const fechaPago = pago.createdAt ? pago.createdAt.slice(0, 10) : toInputDate(new Date())
    const methodTypes = pago.paymentMethodTypes.join(", ") || "stripe"
    const recargoMode = recargoModeBySession[pago.sessionId] || "con_5"
    const coverage = getCoverageDetails(pago, recargoMode)

    const tipoPago: "anticipo" | "pendiente" =
      pago.amountTotal >= oferta.monto_pendiente ? "pendiente" : "anticipo"

    const notaPartes = [
      `Registro sugerido desde Stripe (${formatDateTime(pago.createdAt)}).`,
      `Monto cobrado: ${formatAmount(pago.amountTotal, pago.currency)}.`,
      `Monto real de oferta: ${formatAmount(coverage.montoOferta, pago.currency)}.`,
      `Comisión Stripe: ${
        typeof pago.feeAmount === "number"
          ? formatAmount(pago.feeAmount, pago.currency)
          : "no disponible"
      }.`,
      `Modo recargo: ${recargoMode === "con_5" ? "Incluye 5%" : "Sin 5%"}.`,
      `Recargo calculado: ${formatAmount(coverage.recargoCobrado, pago.currency)}.`,
      `Balance cobertura: ${
        coverage.balanceCobertura !== null
          ? formatAmount(coverage.balanceCobertura, pago.currency)
          : "sin dato"
      }.`,
      `Métodos Stripe: ${methodTypes}.`,
      pago.paymentLinkUrl ? `Link de pago: ${pago.paymentLinkUrl}.` : "",
    ].filter((part) => part.length > 0)

    setSelectedOferta(oferta)
    setComisionPendienteRegistro(coverage.balanceCobertura)
    setNuevoPagoInitialData({
      monto: coverage.montoOferta,
      fecha: fechaPago,
      tipo_pago: tipoPago,
      metodo_pago: "stripe",
      moneda: currency,
      tasa_cambio: currency === "USD" ? 1 : currency === "EUR" ? 1.1 : 0.0083,
      pago_cliente: true,
      comprobante_transferencia:
        pago.receiptUrl || pago.invoiceUrl || pago.invoicePdf || "",
      notas: notaPartes.join("\n"),
    })
    setNuevoPagoOpen(true)
  }

  const registrarComisionStripe = async (
    pagoId: string | undefined,
    comision: number | null,
  ) => {
    if (comision === null) return

    if (!pagoId) {
      setLocalDataError(
        "El pago se registró, pero no se recibió pago_id para guardar la comisión Stripe.",
      )
      return
    }

    try {
      await apiRequest("/comisiones-stripe/", {
        method: "POST",
        body: JSON.stringify({
          pago_id: pagoId,
          comision: roundToTwo(comision),
        }),
      })
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo guardar la comisión Stripe para este pago."
      setLocalDataError(
        `El pago se registró, pero falló el guardado de comisión Stripe. ${message}`,
      )
    }
  }

  const handleNuevoPagoSuccess = async (payload?: RegistrarPagoSuccessPayload) => {
    setNuevoPagoOpen(false)
    await registrarComisionStripe(payload?.pagoId, comisionPendienteRegistro)
    setComisionPendienteRegistro(null)
    onPagoSuccess?.()
    await fetchPagos()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1280px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Cobros Stripe</DialogTitle>
            <DialogDescription>
              Vista separada de Stripe con prioridad de datos internos por link de pago.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyQuickRange("today")}
                >
                  Hoy
                </Button>
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
                Si seleccionas <strong>Incluye 5%</strong>, el recargo se calcula como:
                monto - (monto / 1.05).
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {localDataLoading && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                Cargando datos internos por links de Stripe...
              </div>
            )}

            {localDataError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                No se pudieron cargar datos internos. Se muestran solo datos de Stripe. {localDataError}
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
                      <TableHead>Cliente</TableHead>
                      <TableHead className="min-w-[320px]">Oferta</TableHead>
                      <TableHead>¿Incluye 5%?</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead className="text-right">Monto Oferta</TableHead>
                      <TableHead className="text-right">Monto Stripe</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                      <TableHead className="text-right">Neto Real</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Factura</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagos.map((pago) => {
                      const mode = recargoModeBySession[pago.sessionId] || "con_5"
                      const coverage = getCoverageDetails(pago, mode)
                      const localResult = getLocalResultForPago(pago)
                      const localData =
                        localResult?.encontrado && localResult.data ? localResult.data : null
                      const contacto = getContactDisplay(pago, localData)

                      return (
                        <TableRow key={pago.sessionId} className="text-xs">
                          <TableCell className="whitespace-nowrap text-xs">
                            {formatDateTime(pago.createdAt)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-xs">{contacto.nombre}</span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-xs">{contacto.ofertaNombre}</div>
                              {contacto.ofertaPrecio !== null && (
                                <div className="text-[11px] text-slate-600">
                                  Precio: {formatAmount(contacto.ofertaPrecio, pago.currency)}
                                </div>
                              )}
                              {contacto.numeroOferta !== "-" && (
                                <div className="text-[11px] text-slate-500">
                                  {contacto.numeroOferta}
                                </div>
                              )}
                            </div>
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
                            {formatAmount(coverage.montoOferta, pago.currency)}
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
                            {coverage.netoReal !== null
                              ? formatAmount(coverage.netoReal, pago.currency)
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
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => handleNuevoPago(pago)}
                              disabled={!localData}
                              title={
                                localData
                                  ? "Crear pago usando datos de esta oferta"
                                  : "No se encontró oferta interna para este link"
                              }
                            >
                              Nuevo pago
                            </Button>
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

      <RegistrarPagoDialog
        open={nuevoPagoOpen}
        onOpenChange={setNuevoPagoOpen}
        oferta={selectedOferta}
        initialData={nuevoPagoInitialData}
        onSuccess={handleNuevoPagoSuccess}
      />
    </>
  )
}
