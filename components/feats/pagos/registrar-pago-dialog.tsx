"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmEditDialog } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Loader2, Landmark } from "lucide-react"
import type { OfertaConfirmadaSinPago } from "@/lib/services/feats/pagos/pagos-service"
import { PagoService, type PagoCreateData } from "@/lib/services/feats/pagos/pago-service"
import { BancoService, TasaCambioService, TransferenciaBancariaService } from "@/lib/api-services"
import type { TasaCambio } from "@/lib/types/feats/tasa-cambio/tasa-cambio-types"
import type { Banco } from "@/lib/types/feats/wallet/banco-types"
import type { TransferenciaBancariaCreateData } from "@/lib/types/feats/transferencias-bancarias/transferencia-bancaria-types"
import { useAuth } from "@/contexts/auth-context"

/** Lo mínimo que necesita este diálogo de un ServicioCliente para registrarle un pago. */
export interface ServicioParaPagoDialog {
    id: string
    descripcion: string
    precio_total: number
    monto_pendiente: number
    cliente_nombre?: string | null
}

interface RegistrarPagoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** "oferta" (default) registra oferta_id; "servicio" registra servicio_id sobre un ServicioCliente. */
    tipo?: "oferta" | "servicio"
    oferta: OfertaConfirmadaSinPago | ServicioParaPagoDialog | null
    onSuccess: (payload?: RegistrarPagoSuccessPayload) => void
    initialData?: RegistrarPagoInitialData | null
}

const esServicio = (
    item: OfertaConfirmadaSinPago | ServicioParaPagoDialog,
    tipo: "oferta" | "servicio",
): item is ServicioParaPagoDialog => tipo === "servicio"

export interface RegistrarPagoSuccessPayload {
    pagoId?: string
    transferenciaBancariaPendiente?: boolean
}

export interface RegistrarPagoInitialData {
    monto?: string | number
    fecha?: string
    tipo_pago?: 'anticipo' | 'pendiente' | 'completo'
    metodo_pago?: 'efectivo' | 'transferencia_bancaria' | 'stripe'
    moneda?: 'USD' | 'EUR' | 'CUP'
    tasa_cambio?: number
    pago_cliente?: boolean
    nombre_pagador?: string
    carnet_pagador?: string
    recibido_por?: string
    comprobante_transferencia?: string
    notas?: string
    justificacion_diferencia?: string
}

const getDefaultFormData = () => ({
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    tipo_pago: 'anticipo' as 'anticipo' | 'pendiente' | 'completo',
    metodo_pago: 'efectivo' as 'efectivo' | 'transferencia_bancaria' | 'stripe',
    moneda: 'USD' as 'USD' | 'EUR' | 'CUP',
    tasa_cambio: 1.0,
    pago_cliente: true,
    nombre_pagador: '',
    carnet_pagador: '',
    recibido_por: '',
    comprobante_transferencia: '',
    notas: '',
    justificacion_diferencia: '',
})

const getDefaultDatosFacturacion = () => ({
    nombre_completo_cliente: '',
    pais_residencia: '',
    tipo_documento_identidad: '',
    numero_documento_identidad: '',
    direccion_residencia: '',
    telefono: '',
    correo: '',
    contacto_en_cuba: '',
    direccion_instalacion_cuba: '',
})

const ARCHIVOS_COMPROBANTE_VALIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']

const normalizeDate = (value?: string) => {
    if (!value) return new Date().toISOString().slice(0, 10)
    return value.length >= 10 ? value.slice(0, 10) : value
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message
    if (isRecord(error) && typeof error.message === 'string') return error.message
    return fallback
}

// Orientacion en que la operadora escribe la tasa en el formulario:
// EUR -> "USD por 1 EUR" (~1.14, valor que se sabe de memoria)
// CUP -> "CUP por 1 USD" (~550)
// El backend siempre recibe "USD por 1 moneda".
const TASA_SE_ESCRIBE_EN_USD_POR_MONEDA: Record<'USD' | 'EUR' | 'CUP', boolean> = {
    USD: true,
    EUR: true,
    CUP: false,
}

// Convierte la tasa del formulario a "USD por 1 moneda" (formato del backend).
const getUsdPorMoneda = (moneda: 'USD' | 'EUR' | 'CUP', tasaFormulario: number): number => {
    if (moneda === 'USD') return 1
    if (!(tasaFormulario > 0)) return 0
    return TASA_SE_ESCRIBE_EN_USD_POR_MONEDA[moneda] ? tasaFormulario : 1 / tasaFormulario
}

// Tasa diaria registrada, expresada en la orientacion del formulario.
const getTasaFormularioDesdeTasaDiaria = (
    moneda: 'USD' | 'EUR' | 'CUP',
    tasaDiaria: TasaCambio | null,
): number | null => {
    if (moneda === 'USD') return 1
    if (!tasaDiaria) return null

    if (moneda === 'EUR') {
        const eurPorUsd = Number(tasaDiaria.usd_a_eur || 0)
        if (eurPorUsd <= 0) return null
        return 1 / eurPorUsd
    }

    const cupPorUsd = Number(tasaDiaria.usd_a_cup || 0)
    if (cupPorUsd <= 0) return null
    return cupPorUsd
}

const roundTo4Decimals = (value: number): number =>
    Math.round(value * 10000) / 10000

export function RegistrarPagoDialog({
    open,
    onOpenChange,
    tipo = "oferta",
    oferta,
    onSuccess,
    initialData = null,
}: RegistrarPagoDialogProps) {
    const { user } = useAuth()
    const esDeServicio = tipo === "servicio"
    // La forma de oferta (contacto, lead_id, cliente_numero) solo existe en ofertas.
    const ofertaReal = oferta && !esDeServicio ? (oferta as OfertaConfirmadaSinPago) : null
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [tasaDiaria, setTasaDiaria] = useState<TasaCambio | null>(null)
    const [loadingTasaDiaria, setLoadingTasaDiaria] = useState(false)
    const [errorTasaDiaria, setErrorTasaDiaria] = useState<string | null>(null)

    const [formData, setFormData] = useState(getDefaultFormData)
    // La transferencia con aprobación del banco solo existe para ofertas; en un
    // servicio se registra directa como Pago, con su comprobante.
    const flujoBancario = formData.metodo_pago === 'transferencia_bancaria' && !esDeServicio

    const [desgloseBilletes, setDesgloseBilletes] = useState<Record<string, number>>({})

    const [showConfirm, setShowConfirm] = useState(false)

    // Campos específicos de "Transferencia bancaria" — mismo flujo de doble
    // confirmación que Leads/Clientes: crea una TransferenciaBancaria
    // "pendiente" que el admin de Wallet acepta o rechaza (ver
    // transferencia-bancaria-dialog.tsx).
    const [bancoId, setBancoId] = useState('')
    const [bancos, setBancos] = useState<Banco[]>([])
    const [loadingBancos, setLoadingBancos] = useState(false)
    const [errorBancos, setErrorBancos] = useState<string | null>(null)
    const [datosFacturacion, setDatosFacturacion] = useState(getDefaultDatosFacturacion)
    const [comprobanteTransferencia, setComprobanteTransferencia] = useState<{
        url: string
        nombre: string
        tamano?: number
        mimeType?: string
    } | null>(null)
    const [subiendoComprobanteTransferencia, setSubiendoComprobanteTransferencia] = useState(false)

    // Reset/prellenado cuando se abre el diálogo
    useEffect(() => {
        if (open) {
            const base = getDefaultFormData()
            const nombreUsuario = user?.nombre ?? ''
            setFormData({
                ...base,
                recibido_por: nombreUsuario,
                ...(initialData
                    ? {
                        ...initialData,
                        monto:
                            typeof initialData.monto === 'number'
                                ? initialData.monto.toFixed(2)
                                : initialData.monto ?? base.monto,
                        fecha: normalizeDate(initialData.fecha),
                        recibido_por: initialData.recibido_por ?? nombreUsuario,
                    }
                    : {}),
            })
            setDesgloseBilletes({})
            setError(null)
            setBancoId('')
            setComprobanteTransferencia(null)
            setDatosFacturacion({
                ...getDefaultDatosFacturacion(),
                nombre_completo_cliente: ofertaReal?.contacto?.nombre ?? '',
                telefono: ofertaReal?.contacto?.telefono ?? '',
                direccion_instalacion_cuba: ofertaReal?.contacto?.direccion ?? '',
            })
        }
    }, [open, initialData, user, oferta])

    // Cargar bancos (destino de la transferencia) al abrir el diálogo
    useEffect(() => {
        if (!open) {
            setBancos([])
            return
        }

        let cancelled = false
        setLoadingBancos(true)
        setErrorBancos(null)

        BancoService.listarOpciones()
            .then((data) => {
                if (!cancelled) setBancos(data)
            })
            .catch((err: unknown) => {
                if (!cancelled) setErrorBancos(getErrorMessage(err, 'No se pudieron cargar los bancos'))
            })
            .finally(() => {
                if (!cancelled) setLoadingBancos(false)
            })

        return () => {
            cancelled = true
        }
    }, [open])

    // Cargar tasa diaria por fecha seleccionada
    useEffect(() => {
        if (!open || !formData.fecha) {
            setTasaDiaria(null)
            setErrorTasaDiaria(null)
            setLoadingTasaDiaria(false)
            return
        }

        let cancelled = false
        setLoadingTasaDiaria(true)
        setErrorTasaDiaria(null)

        TasaCambioService.getTasaCambioByFecha(formData.fecha)
            .then((data) => {
                if (cancelled) return
                setTasaDiaria(data)
            })
            .catch((err: unknown) => {
                if (cancelled) return
                setTasaDiaria(null)
                setErrorTasaDiaria(
                    getErrorMessage(err, "No se pudo consultar la tasa diaria."),
                )
            })
            .finally(() => {
                if (cancelled) return
                setLoadingTasaDiaria(false)
            })

        return () => {
            cancelled = true
        }
    }, [formData.fecha, open])

    // Actualizar tasa cuando cambia moneda o fecha/tasa diaria
    // tasa_cambio se almacena en la orientacion del formulario
    // (EUR: USD por 1 EUR; CUP: CUP por 1 USD)
    useEffect(() => {
        if (formData.moneda === "USD") {
            setFormData((prev) => (prev.tasa_cambio === 1 ? prev : { ...prev, tasa_cambio: 1 }))
            return
        }

        if (loadingTasaDiaria) return

        const tasaUsuario = getTasaFormularioDesdeTasaDiaria(formData.moneda, tasaDiaria)

        if (tasaUsuario && Number.isFinite(tasaUsuario)) {
            const tasaNormalizada = roundTo4Decimals(tasaUsuario)
            setFormData((prev) =>
                prev.tasa_cambio === tasaNormalizada ? prev : { ...prev, tasa_cambio: tasaNormalizada },
            )
            return
        }

        // Sin tasa registrada: CUP → 550 por defecto; resto → manual
        const fallback = formData.moneda === "CUP" ? 550 : 0
        setFormData((prev) => (prev.tasa_cambio === fallback ? prev : { ...prev, tasa_cambio: fallback }))
    }, [formData.moneda, loadingTasaDiaria, tasaDiaria])

    // Limpiar desglose al cambiar moneda
    useEffect(() => {
        setDesgloseBilletes({})
    }, [formData.moneda])

    // Denominaciones por moneda
    const getDenominaciones = (moneda: string): string[] => {
        const denominaciones = {
            USD: ['100', '50', '20', '10', '5', '1'],
            EUR: ['500', '200', '100', '50', '20', '10', '5'],
            CUP: ['5000', '2000', '1000', '500', '200', '100', '50', '20', '10', '5', '1']
        }
        return denominaciones[moneda as keyof typeof denominaciones] || []
    }

    // Calcular total del desglose
    const calcularTotalDesglose = (): number => {
        return Object.entries(desgloseBilletes).reduce((total, [denominacion, cantidad]) => {
            return total + (parseFloat(denominacion) * cantidad)
        }, 0)
    }

    // Actualizar cantidad de una denominación
    const actualizarDenominacion = (denominacion: string, cantidad: string) => {
        const cantidadNum = parseInt(cantidad) || 0
        if (cantidadNum === 0) {
            const nuevoDesglose = { ...desgloseBilletes }
            delete nuevoDesglose[denominacion]
            setDesgloseBilletes(nuevoDesglose)
        } else {
            setDesgloseBilletes({ ...desgloseBilletes, [denominacion]: cantidadNum })
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value)
    }

    // tasaRegistradaMoneda ya en la orientacion del formulario
    const tasaRegistradaMoneda = getTasaFormularioDesdeTasaDiaria(formData.moneda, tasaDiaria)
    const tasaBloqueadaPorFecha =
        formData.moneda !== "USD" &&
        Boolean(tasaRegistradaMoneda && Number.isFinite(tasaRegistradaMoneda))

    // Unica fuente de verdad para convertir a USD: monto * usdPorMoneda
    const usdPorMoneda = getUsdPorMoneda(formData.moneda, formData.tasa_cambio)
    const tasaEnUsdPorMoneda = TASA_SE_ESCRIBE_EN_USD_POR_MONEDA[formData.moneda]

    const handleComprobanteTransferenciaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!ARCHIVOS_COMPROBANTE_VALIDOS.includes(file.type)) {
            setError('Solo se permiten archivos de imagen (JPG, PNG, WEBP) o PDF')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('El archivo no puede superar los 5MB')
            return
        }

        setError(null)
        setSubiendoComprobanteTransferencia(true)
        try {
            const res = await TransferenciaBancariaService.subirComprobante(file)
            setComprobanteTransferencia({
                url: res.url,
                nombre: res.filename,
                tamano: res.size,
                mimeType: res.content_type,
            })
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Error al subir el comprobante'))
        } finally {
            setSubiendoComprobanteTransferencia(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!oferta) return

        console.log('🚀 [RegistrarPago] Iniciando validación del formulario')
        console.log('📋 FormData completo:', formData)
        console.log('📋 Oferta/Servicio:', {
            id: oferta.id,
            numero: esServicio(oferta, tipo) ? oferta.descripcion : oferta.numero_oferta,
            pendiente: oferta.monto_pendiente,
        })

        setError(null)

        // Validaciones
        const monto = parseFloat(formData.monto)
        console.log('💰 Monto parseado:', monto)
        if (isNaN(monto) || monto <= 0) {
            setError('El monto debe ser mayor a 0')
            return
        }

        // Calcular monto en USD para comparar con el pendiente
        const montoEnUSD = usdPorMoneda > 0 ? monto * usdPorMoneda : monto
        const excedePendiente = montoEnUSD > oferta.monto_pendiente

        if (excedePendiente && !formData.justificacion_diferencia.trim()) {
            setError(`El monto en USD (${formatCurrency(montoEnUSD)}) excede el monto pendiente (${formatCurrency(oferta.monto_pendiente)}). Debe proporcionar una justificación.`)
            return
        }

        if (excedePendiente && formData.justificacion_diferencia.trim().length < 10) {
            setError('La justificación debe tener al menos 10 caracteres')
            return
        }

        if (formData.tasa_cambio <= 0) {
            setError('La tasa de cambio debe ser mayor a 0')
            return
        }

        if (!formData.pago_cliente && !formData.nombre_pagador.trim()) {
            setError('Debe ingresar el nombre de quien realiza el pago')
            return
        }

        if (formData.metodo_pago === 'efectivo' && !formData.recibido_por.trim()) {
            setError('El campo "Recibido por" es obligatorio para pagos en efectivo')
            return
        }

        const fechaPago = new Date(formData.fecha)
        if (fechaPago > new Date()) {
            setError('La fecha no puede ser futura')
            return
        }

        if (flujoBancario) {
            if (!ofertaReal?.lead_id && !ofertaReal?.cliente_numero) {
                setError('No se pudo determinar el cliente o lead de esta oferta para registrar la transferencia bancaria')
                return
            }
            if (!bancoId) {
                setError('Seleccione el banco destino de la transferencia')
                return
            }
            if (!datosFacturacion.nombre_completo_cliente.trim()) {
                setError('Falta el nombre completo del cliente')
                return
            }
            if (!datosFacturacion.pais_residencia.trim()) {
                setError('Falta el país de residencia')
                return
            }
            if (!datosFacturacion.tipo_documento_identidad.trim()) {
                setError('Falta el tipo de documento de identidad')
                return
            }
            if (!datosFacturacion.numero_documento_identidad.trim()) {
                setError('Falta el número de documento de identidad')
                return
            }
            if (!datosFacturacion.direccion_residencia.trim()) {
                setError('Falta la dirección de residencia')
                return
            }
            if (!datosFacturacion.telefono.trim()) {
                setError('Falta el teléfono')
                return
            }
            if (!datosFacturacion.direccion_instalacion_cuba.trim()) {
                setError('Falta la dirección de instalación en Cuba')
                return
            }
        }

        console.log('✅ Todas las validaciones pasaron, pidiendo confirmación...')

        setShowConfirm(true)
    }

    const handleConfirmedSubmit = async () => {
        if (!oferta) return

        const monto = parseFloat(formData.monto)
        const montoEnUSD = usdPorMoneda > 0 ? monto * usdPorMoneda : monto
        const excedePendiente = montoEnUSD > oferta.monto_pendiente

        setLoading(true)

        try {
            if (flujoBancario) {
                const origenTransferencia = ofertaReal?.lead_id
                    ? { lead_id: ofertaReal.lead_id }
                    : ofertaReal?.cliente_numero
                        ? { cliente_numero: ofertaReal.cliente_numero }
                        : null

                if (!origenTransferencia) {
                    throw new Error('No se pudo determinar el cliente o lead de esta oferta para registrar la transferencia bancaria')
                }

                const notasConDiferencia = excedePendiente && formData.justificacion_diferencia.trim()
                    ? [formData.notas.trim(), `Justificación del monto excedente: ${formData.justificacion_diferencia.trim()}`]
                        .filter(Boolean)
                        .join(' — ')
                    : formData.notas.trim()

                const transferenciaData: TransferenciaBancariaCreateData = {
                    ...origenTransferencia,
                    oferta_id: oferta.id,
                    banco_id: bancoId,
                    monto,
                    moneda: formData.moneda,
                    // Backend espera "USD por 1 moneda", igual que Pago
                    tasa_cambio: usdPorMoneda > 0 ? usdPorMoneda : formData.tasa_cambio,
                    nombre_completo_cliente: datosFacturacion.nombre_completo_cliente.trim(),
                    pais_residencia: datosFacturacion.pais_residencia.trim(),
                    tipo_documento_identidad: datosFacturacion.tipo_documento_identidad.trim(),
                    numero_documento_identidad: datosFacturacion.numero_documento_identidad.trim(),
                    direccion_residencia: datosFacturacion.direccion_residencia.trim(),
                    telefono: datosFacturacion.telefono.trim(),
                    direccion_instalacion_cuba: datosFacturacion.direccion_instalacion_cuba.trim(),
                    correo: datosFacturacion.correo.trim() || undefined,
                    contacto_en_cuba: datosFacturacion.contacto_en_cuba.trim() || undefined,
                    notas: notasConDiferencia || undefined,
                    ...(comprobanteTransferencia
                        ? {
                            comprobante_cliente: {
                                url: comprobanteTransferencia.url,
                                nombre: comprobanteTransferencia.nombre,
                                tamano: comprobanteTransferencia.tamano ?? 0,
                                mime_type: comprobanteTransferencia.mimeType ?? 'application/octet-stream',
                            },
                        }
                        : {}),
                }

                await TransferenciaBancariaService.crear(transferenciaData)

                setFormData(getDefaultFormData())
                setDesgloseBilletes({})
                setBancoId('')
                setComprobanteTransferencia(null)
                setDatosFacturacion(getDefaultDatosFacturacion())

                onSuccess({ transferenciaBancariaPendiente: true })
                onOpenChange(false)
                return
            }

            const pagoData: PagoCreateData = {
                ...(esServicio(oferta, tipo) ? { servicio_id: oferta.id } : { oferta_id: oferta.id }),
                monto: monto,
                fecha: formData.fecha,
                tipo_pago: formData.tipo_pago,
                metodo_pago: formData.metodo_pago,
                moneda: formData.moneda,
                // Backend espera "USD por 1 moneda"
                tasa_cambio: usdPorMoneda > 0 ? usdPorMoneda : formData.tasa_cambio,
                pago_cliente: formData.pago_cliente,
                notas: formData.notas || undefined,
            }

            if (!formData.pago_cliente) {
                pagoData.nombre_pagador = formData.nombre_pagador
                if (formData.carnet_pagador.trim()) {
                    pagoData.carnet_pagador = formData.carnet_pagador
                }
            }

            if (formData.metodo_pago === 'efectivo') {
                pagoData.recibido_por = formData.recibido_por
                if (user?.ci) {
                    pagoData.recibido_por_ci = user.ci
                }
                // Agregar desglose de billetes si existe
                if (Object.keys(desgloseBilletes).length > 0) {
                    pagoData.desglose_billetes = desgloseBilletes
                }
            } else if (formData.comprobante_transferencia.trim()) {
                // Solo agregar comprobante si se proporcionó (Stripe)
                pagoData.comprobante_transferencia = formData.comprobante_transferencia
            }

            if (esDeServicio && formData.metodo_pago === 'transferencia_bancaria' && comprobanteTransferencia) {
                pagoData.comprobante_transferencia = comprobanteTransferencia.url
            }

            // Agregar diferencia si el monto excede el pendiente
            if (excedePendiente && formData.justificacion_diferencia.trim()) {
                pagoData.diferencia = {
                    justificacion: formData.justificacion_diferencia.trim()
                }
            }

            const createdPago = await PagoService.crearPago(pagoData)
            const pagoIdCreado =
                (typeof createdPago?.pago_id === 'string' && createdPago.pago_id.trim()) ||
                (typeof createdPago?.pago?.id === 'string' && createdPago.pago.id.trim()) ||
                undefined

            // Resetear formulario
            setFormData(getDefaultFormData())
            setDesgloseBilletes({})

            onSuccess({ pagoId: pagoIdCreado })
            onOpenChange(false)
        } catch (err: unknown) {
            setError(getErrorMessage(
                err,
                flujoBancario
                    ? 'Error al registrar la transferencia bancaria'
                    : 'Error al registrar el pago',
            ))
        } finally {
            setLoading(false)
        }
    }

    if (!oferta) return null

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Pago</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Información de la oferta o el servicio */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                                {esServicio(oferta, tipo) ? "Servicio:" : "Oferta:"}
                            </span>
                            <span className="text-sm font-medium">
                                {esServicio(oferta, tipo) ? oferta.descripcion : oferta.numero_oferta}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Cliente:</span>
                            <span className="text-sm font-medium">
                                {esServicio(oferta, tipo)
                                    ? oferta.cliente_nombre || 'Sin nombre'
                                    : oferta.cliente?.nombre || oferta.lead?.nombre || 'Sin nombre'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">
                                {esServicio(oferta, tipo) ? "Precio del servicio:" : "Precio Final:"}
                            </span>
                            <span className="text-sm font-medium">
                                {formatCurrency(esServicio(oferta, tipo) ? oferta.precio_total : oferta.precio_final)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Monto Pendiente:</span>
                            <span className="text-sm font-bold text-red-600">
                                {formatCurrency(oferta.monto_pendiente)}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Moneda */}
                        <div className="space-y-2">
                            <Label htmlFor="moneda">
                                Moneda <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.moneda}
                                onValueChange={(value: 'USD' | 'EUR' | 'CUP') =>
                                    setFormData({ ...formData, moneda: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD - Dólar</SelectItem>
                                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                                    <SelectItem value="CUP">CUP - Peso Cubano</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tasa de Cambio */}
                        <div className="space-y-2">
                            <Label htmlFor="tasa_cambio">
                                {formData.moneda === 'USD'
                                    ? 'Tasa de cambio'
                                    : tasaEnUsdPorMoneda
                                    ? `1 ${formData.moneda} equivale a (USD)`
                                    : `1 USD equivale a (${formData.moneda})`}
                                {' '}<span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="tasa_cambio"
                                type="number"
                                step="any"
                                min="0.01"
                                value={formData.tasa_cambio}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(",", ".")
                                    const parsed = raw === "" ? 0 : Number(raw)
                                    setFormData({
                                        ...formData,
                                        tasa_cambio: Number.isFinite(parsed) ? parsed : 0,
                                    })
                                }}
                                disabled={formData.moneda === 'USD' || tasaBloqueadaPorFecha}
                                required
                            />
                            {formData.moneda === 'USD' ? (
                                <p className="text-xs text-gray-500">
                                    La tasa de cambio es 1.0 para USD
                                </p>
                            ) : loadingTasaDiaria ? (
                                <p className="text-xs text-gray-500">
                                    Consultando tasa diaria registrada...
                                </p>
                            ) : tasaBloqueadaPorFecha ? (
                                <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                                    Tasa cargada automáticamente desde el registro diario de {formData.fecha}. No se puede editar.
                                </p>
                            ) : errorTasaDiaria ? (
                                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                    {errorTasaDiaria} Ingrese la tasa manualmente.
                                </p>
                            ) : (
                                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                    No hay tasa de cambio registrada para {formData.fecha}. Ingrese la tasa manualmente.
                                </p>
                            )}
                            {formData.moneda !== 'USD' && formData.tasa_cambio > 0 && (
                                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                                    💡 {tasaEnUsdPorMoneda
                                        ? `1 ${formData.moneda} = ${formData.tasa_cambio.toFixed(2)} USD`
                                        : `${formData.tasa_cambio.toFixed(2)} ${formData.moneda} = 1 USD`}
                                </p>
                            )}
                        </div>

                        {/* Monto */}
                        <div className="space-y-2">
                            <Label htmlFor="monto">
                                Monto <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="monto"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={formData.monto}
                                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                            {formData.moneda !== 'USD' && formData.monto && usdPorMoneda > 0 && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                    <p className="text-sm text-blue-700">
                                        Equivalente en USD: ${(parseFloat(formData.monto) * usdPorMoneda).toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {formData.monto} {formData.moneda} {tasaEnUsdPorMoneda ? '×' : '÷'} {formData.tasa_cambio} = {(parseFloat(formData.monto) * usdPorMoneda).toFixed(2)} USD
                                    </p>
                                </div>
                            )}
                            <p className="text-xs text-gray-500">
                                Máximo pendiente: {formatCurrency(oferta.monto_pendiente)}
                            </p>
                        </div>

                        {/* Justificación de diferencia (solo si excede el pendiente) */}
                        {formData.monto && (() => {
                            const m = parseFloat(formData.monto)
                            const usd = usdPorMoneda > 0 ? m * usdPorMoneda : m
                            return usd > oferta.monto_pendiente
                        })() && (
                            <div className="space-y-2 border-l-4 border-emerald-400 pl-4 bg-emerald-50 p-3 rounded">
                                <div className="flex items-start gap-2">
                                    <div className="bg-emerald-500 text-white rounded-full p-1 mt-0.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-emerald-800 mb-1">
                                            El monto excede el pendiente en {formatCurrency((() => {
                                                const m = parseFloat(formData.monto)
                                                const usd = usdPorMoneda > 0 ? m * usdPorMoneda : m
                                                return usd - oferta.monto_pendiente
                                            })())}
                                        </p>
                                        <p className="text-xs text-emerald-700 mb-2">
                                            Debe proporcionar una justificación para este pago adicional
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="justificacion_diferencia">
                                        Justificación <span className="text-red-500">*</span>
                                    </Label>
                                    <Textarea
                                        id="justificacion_diferencia"
                                        value={formData.justificacion_diferencia}
                                        onChange={(e) => setFormData({ ...formData, justificacion_diferencia: e.target.value })}
                                        placeholder="Ej: Cliente pagó de más para cubrir servicios adicionales, propina, anticipo para futuros servicios..."
                                        rows={3}
                                        required
                                        className="bg-white"
                                    />
                                    <p className="text-xs text-gray-600">
                                        Mínimo 10 caracteres. Esta justificación quedará registrada en el sistema.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Fecha */}
                        <div className="space-y-2">
                            <Label htmlFor="fecha">
                                Fecha <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="fecha"
                                type="date"
                                value={formData.fecha}
                                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                max={new Date().toISOString().slice(0, 10)}
                                required
                            />
                        </div>

                        {/* Tipo de Pago */}
                        <div className="space-y-2">
                            <Label htmlFor="tipo_pago">
                                Tipo de Pago <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.tipo_pago}
                                onValueChange={(value: 'anticipo' | 'pendiente' | 'completo') =>
                                    setFormData({ ...formData, tipo_pago: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="anticipo">Anticipo</SelectItem>
                                    <SelectItem value="pendiente">Pago Pendiente</SelectItem>
                                    <SelectItem value="completo">Completo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* ¿Quién paga? */}
                        <div className="space-y-3 border-t pt-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="pago_cliente"
                                    checked={formData.pago_cliente}
                                    onChange={(e) => setFormData({ 
                                        ...formData, 
                                        pago_cliente: e.target.checked,
                                        nombre_pagador: '',
                                        carnet_pagador: ''
                                    })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="pago_cliente" className="cursor-pointer">
                                    El cliente paga directamente
                                </Label>
                            </div>

                            {!formData.pago_cliente && (
                                <div className="space-y-3 pl-6 border-l-2 border-emerald-200">
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre_pagador">
                                            Nombre del pagador <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="nombre_pagador"
                                            type="text"
                                            value={formData.nombre_pagador}
                                            onChange={(e) => setFormData({ ...formData, nombre_pagador: e.target.value })}
                                            placeholder="Nombre completo"
                                            required={!formData.pago_cliente}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="carnet_pagador">
                                            Carnet del pagador
                                        </Label>
                                        <Input
                                            id="carnet_pagador"
                                            type="text"
                                            value={formData.carnet_pagador}
                                            onChange={(e) => setFormData({ ...formData, carnet_pagador: e.target.value })}
                                            placeholder="Número de carnet"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Método de Pago */}
                        <div className="space-y-2">
                            <Label htmlFor="metodo_pago">
                                Método de Pago <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.metodo_pago}
                                onValueChange={(value: 'efectivo' | 'transferencia_bancaria' | 'stripe') =>
                                    setFormData({ ...formData, metodo_pago: value, comprobante_transferencia: '', recibido_por: user?.nombre ?? '' })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="efectivo">Efectivo</SelectItem>
                                    <SelectItem value="transferencia_bancaria">Transferencia Bancaria</SelectItem>
                                    <SelectItem value="stripe">Stripe</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Recibido por (solo para efectivo) */}
                        {formData.metodo_pago === 'efectivo' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Recibido por</Label>
                                    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                                        <span className="text-sm text-gray-700 font-medium">
                                            {formData.recibido_por || 'Usuario no disponible'}
                                        </span>
                                        <span className="ml-auto text-xs text-gray-400">(usuario logueado)</span>
                                    </div>
                                </div>

                                {/* Desglose de Billetes */}
                                <div className="space-y-3 border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <Label>Desglose de Billetes (opcional)</Label>
                                        {Object.keys(desgloseBilletes).length > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setDesgloseBilletes({})}
                                                className="text-xs"
                                            >
                                                Limpiar
                                            </Button>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-3">
                                        {getDenominaciones(formData.moneda).map((denominacion) => (
                                            <div key={denominacion} className="space-y-1">
                                                <Label htmlFor={`billete-${denominacion}`} className="text-xs">
                                                    {denominacion} {formData.moneda}
                                                </Label>
                                                <Input
                                                    id={`billete-${denominacion}`}
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={desgloseBilletes[denominacion] || ''}
                                                    onChange={(e) => actualizarDenominacion(denominacion, e.target.value)}
                                                    placeholder="0"
                                                    className="text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {Object.keys(desgloseBilletes).length > 0 && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-blue-900">
                                                    Total del desglose:
                                                </span>
                                                <span className="text-sm font-bold text-blue-900">
                                                    {calcularTotalDesglose().toFixed(2)} {formData.moneda}
                                                </span>
                                            </div>
                                            {formData.monto && Math.abs(calcularTotalDesglose() - parseFloat(formData.monto)) > 0.01 && (
                                                <p className="text-xs text-emerald-600 mt-1">
                                                    ⚠️ El total del desglose no coincide con el monto del pago
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Transferencia bancaria: mismo flujo de doble aprobación que en Leads/Clientes */}
                        {flujoBancario && (
                            <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4">
                                <div className="flex items-center gap-2 text-blue-900">
                                    <Landmark className="h-4 w-4" />
                                    <p className="text-sm font-medium">
                                        Queda pendiente de aprobación por el administrador del banco
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="banco_id">
                                        Banco destino <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={bancoId || undefined}
                                        onValueChange={(value) => setBancoId(value)}
                                        disabled={loadingBancos}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder={loadingBancos ? 'Cargando bancos...' : 'Seleccione un banco'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bancos.map((b) => (
                                                <SelectItem key={b.id} value={b.id}>
                                                    {b.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errorBancos && <p className="text-xs text-red-600">{errorBancos}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="comprobante_file">
                                        Comprobante del cliente (opcional)
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="comprobante_file"
                                            type="file"
                                            accept={ARCHIVOS_COMPROBANTE_VALIDOS.join(',')}
                                            onChange={handleComprobanteTransferenciaChange}
                                            disabled={subiendoComprobanteTransferencia}
                                            className="flex-1 bg-white"
                                        />
                                        {subiendoComprobanteTransferencia && <Loader2 className="h-4 w-4 animate-spin" />}
                                    </div>
                                    {comprobanteTransferencia && (
                                        <p className="text-xs text-green-600">
                                            ✓ Comprobante subido: {comprobanteTransferencia.nombre}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500">
                                        Formatos permitidos: JPG, PNG, WEBP, PDF (máx. 5MB)
                                    </p>
                                </div>

                                <div className="space-y-3 border-t border-blue-200 pt-3">
                                    <p className="text-sm font-medium text-gray-700">Datos de facturación</p>

                                    <div className="space-y-2">
                                        <Label htmlFor="tb_nombre_completo">
                                            Nombre completo del cliente <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="tb_nombre_completo"
                                            className="bg-white"
                                            value={datosFacturacion.nombre_completo_cliente}
                                            onChange={(e) => setDatosFacturacion((prev) => ({ ...prev, nombre_completo_cliente: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="tb_pais">
                                                País de residencia <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="tb_pais"
                                                className="bg-white"
                                                value={datosFacturacion.pais_residencia}
                                                onChange={(e) => setDatosFacturacion((prev) => ({ ...prev, pais_residencia: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tb_telefono">
                                                Teléfono <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="tb_telefono"
                                                className="bg-white"
                                                value={datosFacturacion.telefono}
                                                onChange={(e) => setDatosFacturacion((prev) => ({ ...prev, telefono: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="tb_tipo_doc">
                                                Tipo de documento de identidad <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="tb_tipo_doc"
                                                className="bg-white"
                                                value={datosFacturacion.tipo_documento_identidad}
                                                onChange={(e) => setDatosFacturacion((prev) => ({ ...prev, tipo_documento_identidad: e.target.value }))}
                                                placeholder="Ej: Carnet de identidad, Pasaporte"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tb_num_doc">
                                                Número de documento de identidad <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="tb_num_doc"
                                                className="bg-white"
                                                value={datosFacturacion.numero_documento_identidad}
                                                onChange={(e) => setDatosFacturacion((prev) => ({ ...prev, numero_documento_identidad: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tb_direccion_residencia">
                                            Dirección del cliente en el país de residencia <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="tb_direccion_residencia"
                                            className="bg-white"
                                            value={datosFacturacion.direccion_residencia}
                                            onChange={(e) => setDatosFacturacion((prev) => ({ ...prev, direccion_residencia: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="tb_correo">Correo</Label>
                                            <Input
                                                id="tb_correo"
                                                type="email"
                                                className="bg-white"
                                                value={datosFacturacion.correo}
                                                onChange={(e) => setDatosFacturacion((prev) => ({ ...prev, correo: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tb_contacto_cuba">Datos de contacto en Cuba</Label>
                                            <Input
                                                id="tb_contacto_cuba"
                                                className="bg-white"
                                                value={datosFacturacion.contacto_en_cuba}
                                                onChange={(e) => setDatosFacturacion((prev) => ({ ...prev, contacto_en_cuba: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tb_direccion_instalacion">
                                            Dirección de instalación en Cuba <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="tb_direccion_instalacion"
                                            className="bg-white"
                                            value={datosFacturacion.direccion_instalacion_cuba}
                                            onChange={(e) => setDatosFacturacion((prev) => ({ ...prev, direccion_instalacion_cuba: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Servicio: transferencia directa, solo con comprobante */}
                        {esDeServicio && formData.metodo_pago === 'transferencia_bancaria' && (
                            <div className="space-y-2">
                                <Label htmlFor="comprobante_servicio_file">Comprobante de pago</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="comprobante_servicio_file"
                                        type="file"
                                        accept={ARCHIVOS_COMPROBANTE_VALIDOS.join(',')}
                                        onChange={handleComprobanteTransferenciaChange}
                                        disabled={subiendoComprobanteTransferencia}
                                        className="flex-1"
                                    />
                                    {subiendoComprobanteTransferencia && <Loader2 className="h-4 w-4 animate-spin" />}
                                </div>
                                {comprobanteTransferencia && (
                                    <p className="text-xs text-green-600">✓ Comprobante subido: {comprobanteTransferencia.nombre}</p>
                                )}
                                <p className="text-xs text-gray-500">JPG, PNG, WEBP o PDF (máx. 5MB)</p>
                            </div>
                        )}

                        {/* Comprobante URL (para stripe) */}
                        {formData.metodo_pago === 'stripe' && (
                            <div className="space-y-2">
                                <Label htmlFor="comprobante_url">
                                    URL del Comprobante Stripe (opcional)
                                </Label>
                                <Input
                                    id="comprobante_url"
                                    type="url"
                                    value={formData.comprobante_transferencia}
                                    onChange={(e) =>
                                        setFormData({ ...formData, comprobante_transferencia: e.target.value })
                                    }
                                    placeholder="https://..."
                                />
                            </div>
                        )}

                        {/* Notas */}
                        <div className="space-y-2">
                            <Label htmlFor="notas">Notas (opcional)</Label>
                            <Textarea
                                id="notas"
                                value={formData.notas}
                                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                placeholder="Notas adicionales sobre el pago..."
                                rows={3}
                            />
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={loading || subiendoComprobanteTransferencia}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-green-600 hover:bg-green-700"
                                disabled={loading || subiendoComprobanteTransferencia}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Registrando...
                                    </>
                                ) : (
                                    flujoBancario ? 'Registrar transferencia' : 'Registrar Pago'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
        <ConfirmEditDialog
            open={showConfirm}
            onOpenChange={setShowConfirm}
            title={flujoBancario ? 'Confirmar transferencia bancaria' : 'Confirmar registro de pago'}
            message={
                flujoBancario
                    ? `Se registrará una transferencia de ${(parseFloat(formData.monto) || 0).toFixed(2)} ${formData.moneda}, pendiente de aprobación por el administrador del banco. ¿Continuar?`
                    : `¿Está seguro de registrar un pago de ${(parseFloat(formData.monto) || 0).toFixed(2)} ${formData.moneda}?`
            }
            onConfirm={handleConfirmedSubmit}
            confirmText={flujoBancario ? 'Sí, registrar transferencia' : 'Sí, registrar pago'}
            isLoading={loading}
        />
        </>
    )
}
