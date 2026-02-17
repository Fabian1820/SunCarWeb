"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Loader2 } from "lucide-react"
import type { OfertaConfirmadaSinPago } from "@/lib/services/feats/pagos/pagos-service"
import { PagoService, type PagoCreateData } from "@/lib/services/feats/pagos/pago-service"

interface RegistrarPagoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    oferta: OfertaConfirmadaSinPago | null
    onSuccess: () => void
}

export function RegistrarPagoDialog({ open, onOpenChange, oferta, onSuccess }: RegistrarPagoDialogProps) {
    const [loading, setLoading] = useState(false)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    const [formData, setFormData] = useState({
        monto: '',
        fecha: new Date().toISOString().slice(0, 10),
        tipo_pago: 'anticipo' as 'anticipo' | 'pendiente',
        metodo_pago: 'efectivo' as 'efectivo' | 'transferencia_bancaria' | 'stripe',
        moneda: 'USD' as 'USD' | 'EUR' | 'CUP',
        tasa_cambio: 1.0,
        pago_cliente: true,
        nombre_pagador: '',
        carnet_pagador: '',
        recibido_por: '',
        comprobante_transferencia: '',
        notas: '',
    })

    const [desgloseBilletes, setDesgloseBilletes] = useState<Record<string, number>>({})

    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    // Actualizar fecha cuando se abre el diálogo
    useEffect(() => {
        if (open) {
            setFormData(prev => ({
                ...prev,
                fecha: new Date().toISOString().slice(0, 10)
            }))
        }
    }, [open])

    // Actualizar tasa de cambio cuando cambia la moneda
    useEffect(() => {
        const tasasSugeridas = {
            USD: 1.0,
            EUR: 1.10,  // 1 EUR ≈ 1.10 USD (aproximado)
            CUP: 0.0083  // 1 CUP ≈ 0.0083 USD (120 CUP = 1 USD)
        }
        setFormData(prev => ({
            ...prev,
            tasa_cambio: tasasSugeridas[prev.moneda]
        }))
        // Limpiar desglose al cambiar moneda
        setDesgloseBilletes({})
    }, [formData.moneda])

    // Denominaciones por moneda
    const getDenominaciones = (moneda: string): string[] => {
        const denominaciones = {
            USD: ['100', '50', '20', '10', '5', '1'],
            EUR: ['500', '200', '100', '50', '20', '10', '5'],
            CUP: ['1000', '500', '200', '100', '50', '20', '10', '5', '1']
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validar tipo de archivo
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
        if (!validTypes.includes(file.type)) {
            setError('Solo se permiten archivos de imagen (JPG, PNG, WEBP) o PDF')
            return
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('El archivo no puede superar los 5MB')
            return
        }

        setSelectedFile(file)
        setError(null)

        // Subir archivo inmediatamente
        setUploadingFile(true)
        try {
            const formData = new FormData()
            formData.append('archivo', file)

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.suncarsrl.com'}/api/pagos/upload-comprobante`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            })

            if (!response.ok) {
                throw new Error('Error al subir el archivo')
            }

            const data = await response.json()
            setFormData(prev => ({ ...prev, comprobante_transferencia: data.url }))
        } catch (err: any) {
            setError(err.message || 'Error al subir el archivo')
            setSelectedFile(null)
        } finally {
            setUploadingFile(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!oferta) return

        setError(null)

        // Validaciones
        const monto = parseFloat(formData.monto)
        if (isNaN(monto) || monto <= 0) {
            setError('El monto debe ser mayor a 0')
            return
        }

        if (monto > oferta.monto_pendiente) {
            setError(`El monto no puede ser mayor al monto pendiente (${formatCurrency(oferta.monto_pendiente)})`)
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

        if ((formData.metodo_pago === 'transferencia_bancaria' || formData.metodo_pago === 'stripe') && !formData.comprobante_transferencia.trim()) {
            setError('El comprobante es obligatorio para transferencias y pagos con Stripe')
            return
        }

        const fechaPago = new Date(formData.fecha)
        if (fechaPago > new Date()) {
            setError('La fecha no puede ser futura')
            return
        }

        setLoading(true)

        try {
            const pagoData: PagoCreateData = {
                oferta_id: oferta.id,
                monto: monto,
                fecha: formData.fecha,
                tipo_pago: formData.tipo_pago,
                metodo_pago: formData.metodo_pago,
                moneda: formData.moneda,
                tasa_cambio: formData.tasa_cambio,
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
                // Agregar desglose de billetes si existe
                if (Object.keys(desgloseBilletes).length > 0) {
                    pagoData.desglose_billetes = desgloseBilletes
                }
            } else {
                pagoData.comprobante_transferencia = formData.comprobante_transferencia
            }

            await PagoService.crearPago(pagoData)

            // Resetear formulario
            setFormData({
                monto: '',
                fecha: new Date().toISOString().slice(0, 10),
                tipo_pago: 'anticipo',
                metodo_pago: 'efectivo',
                moneda: 'USD',
                tasa_cambio: 1.0,
                pago_cliente: true,
                nombre_pagador: '',
                carnet_pagador: '',
                recibido_por: '',
                comprobante_transferencia: '',
                notas: '',
            })
            setSelectedFile(null)
            setDesgloseBilletes({})

            onSuccess()
            onOpenChange(false)
        } catch (err: any) {
            setError(err.message || 'Error al registrar el pago')
        } finally {
            setLoading(false)
        }
    }

    if (!oferta) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Pago</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Información de la oferta */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Oferta:</span>
                            <span className="text-sm font-medium">{oferta.numero_oferta}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Cliente:</span>
                            <span className="text-sm font-medium">
                                {oferta.cliente?.nombre || oferta.lead?.nombre || 'Sin nombre'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Precio Final:</span>
                            <span className="text-sm font-medium">{formatCurrency(oferta.precio_final)}</span>
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
                                Tasa de cambio <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="tasa_cambio"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={formData.tasa_cambio}
                                onChange={(e) => setFormData({ ...formData, tasa_cambio: parseFloat(e.target.value) || 1.0 })}
                                disabled={formData.moneda === 'USD'}
                                required
                            />
                            {formData.moneda === 'USD' ? (
                                <p className="text-xs text-gray-500">
                                    La tasa de cambio es 1.0 para USD
                                </p>
                            ) : (
                                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                                    💡 Ejemplo: Si 1 {formData.moneda} = {formData.tasa_cambio} USD, entonces {formData.monto || '100'} {formData.moneda} = {((parseFloat(formData.monto) || 100) * formData.tasa_cambio).toFixed(2)} USD
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
                            {formData.moneda !== 'USD' && formData.monto && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                    <p className="text-sm text-blue-700">
                                        Equivalente en USD: ${(parseFloat(formData.monto) * formData.tasa_cambio).toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {formData.monto} {formData.moneda} × {formData.tasa_cambio} = {(parseFloat(formData.monto) * formData.tasa_cambio).toFixed(2)} USD
                                    </p>
                                </div>
                            )}
                            <p className="text-xs text-gray-500">
                                Máximo pendiente: {formatCurrency(oferta.monto_pendiente)}
                            </p>
                        </div>

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
                                onValueChange={(value: 'anticipo' | 'pendiente') =>
                                    setFormData({ ...formData, tipo_pago: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="anticipo">Anticipo</SelectItem>
                                    <SelectItem value="pendiente">Pago Pendiente</SelectItem>
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
                                <div className="space-y-3 pl-6 border-l-2 border-orange-200">
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
                                    setFormData({ ...formData, metodo_pago: value, comprobante_transferencia: '', recibido_por: '' })
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
                                    <Label htmlFor="recibido_por">
                                        Recibido por <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="recibido_por"
                                        type="text"
                                        value={formData.recibido_por}
                                        onChange={(e) => setFormData({ ...formData, recibido_por: e.target.value })}
                                        placeholder="Nombre de quien recibió el pago"
                                        required
                                    />
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
                                                <p className="text-xs text-orange-600 mt-1">
                                                    ⚠️ El total del desglose no coincide con el monto del pago
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Comprobante archivo (para transferencia) */}
                        {formData.metodo_pago === 'transferencia_bancaria' && (
                            <div className="space-y-2">
                                <Label htmlFor="comprobante_file">
                                    Comprobante de Transferencia <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="comprobante_file"
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                                        onChange={handleFileChange}
                                        disabled={uploadingFile}
                                        className="flex-1"
                                    />
                                    {uploadingFile && <Loader2 className="h-4 w-4 animate-spin" />}
                                </div>
                                {selectedFile && (
                                    <p className="text-xs text-green-600">
                                        ✓ Archivo subido: {selectedFile.name}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500">
                                    Formatos permitidos: JPG, PNG, WEBP, PDF (máx. 5MB)
                                </p>
                            </div>
                        )}

                        {/* Comprobante URL (para stripe) */}
                        {formData.metodo_pago === 'stripe' && (
                            <div className="space-y-2">
                                <Label htmlFor="comprobante_url">
                                    URL del Comprobante Stripe <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="comprobante_url"
                                    type="url"
                                    value={formData.comprobante_transferencia}
                                    onChange={(e) =>
                                        setFormData({ ...formData, comprobante_transferencia: e.target.value })
                                    }
                                    placeholder="https://..."
                                    required
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
                                disabled={loading || uploadingFile}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-green-600 hover:bg-green-700"
                                disabled={loading || uploadingFile}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Registrando...
                                    </>
                                ) : (
                                    'Registrar Pago'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
