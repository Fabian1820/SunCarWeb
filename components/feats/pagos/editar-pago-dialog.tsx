"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Loader2 } from "lucide-react"
import { PagoService } from "@/lib/services/feats/pagos/pago-service"

interface EditarPagoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    pago: any | null
    oferta: any
    onSuccess: () => void
}

export function EditarPagoDialog({ open, onOpenChange, pago, oferta, onSuccess }: EditarPagoDialogProps) {
    const [loading, setLoading] = useState(false)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    const [formData, setFormData] = useState({
        monto: '',
        fecha: '',
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

    // Cargar datos del pago cuando se abre el diálogo
    useEffect(() => {
        if (open && pago) {
            console.log('Cargando pago para editar:', pago)
            console.log('Monto del pago:', pago.monto)
            const nuevoFormData = {
                monto: pago.monto?.toString() || '',
                fecha: pago.fecha ? new Date(pago.fecha).toISOString().slice(0, 10) : '',
                tipo_pago: pago.tipo_pago || 'anticipo',
                metodo_pago: pago.metodo_pago || 'efectivo',
                moneda: pago.moneda || 'USD',
                tasa_cambio: pago.tasa_cambio || 1.0,
                pago_cliente: pago.pago_cliente ?? true,
                nombre_pagador: pago.nombre_pagador || '',
                carnet_pagador: pago.carnet_pagador || '',
                recibido_por: pago.recibido_por || '',
                comprobante_transferencia: pago.comprobante_transferencia || '',
                notas: pago.notas || '',
            }
            console.log('Nuevo formData:', nuevoFormData)
            setFormData(nuevoFormData)
            setDesgloseBilletes(pago.desglose_billetes || {})
            setError(null)
            setSelectedFile(null)
        }
    }, [open, pago?.id]) // Agregar pago.id como dependencia

    // Actualizar tasa de cambio cuando cambia la moneda
    useEffect(() => {
        if (!open || !pago) return
        
        const tasasSugeridas = {
            USD: 1.0,
            EUR: 1.10,
            CUP: 0.0083
        }
        
        // Solo actualizar si es un cambio de moneda (no al cargar datos iniciales)
        if (formData.moneda !== pago.moneda) {
            setFormData(prev => ({
                ...prev,
                tasa_cambio: tasasSugeridas[prev.moneda]
            }))
        }
    }, [formData.moneda, open, pago?.moneda])

    const getDenominaciones = (moneda: string): string[] => {
        const denominaciones = {
            USD: ['100', '50', '20', '10', '5', '1'],
            EUR: ['500', '200', '100', '50', '20', '10', '5'],
            CUP: ['1000', '500', '200', '100', '50', '20', '10', '5', '1']
        }
        return denominaciones[moneda as keyof typeof denominaciones] || []
    }

    const calcularTotalDesglose = (): number => {
        return Object.entries(desgloseBilletes).reduce((total, [denominacion, cantidad]) => {
            return total + (parseFloat(denominacion) * cantidad)
        }, 0)
    }

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

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
        if (!validTypes.includes(file.type)) {
            setError('Solo se permiten archivos de imagen (JPG, PNG, WEBP) o PDF')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('El archivo no puede superar los 5MB')
            return
        }

        setSelectedFile(file)
        setError(null)

        setUploadingFile(true)
        try {
            const formDataUpload = new FormData()
            formDataUpload.append('archivo', file)

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.suncarsrl.com'}/api/pagos/upload-comprobante`, {
                method: 'POST',
                body: formDataUpload,
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
        if (!pago) return

        setError(null)

        const monto = parseFloat(formData.monto)
        if (isNaN(monto) || monto <= 0) {
            setError('El monto debe ser mayor a 0')
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

        setLoading(true)

        try {
            const updateData: any = {
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
                updateData.nombre_pagador = formData.nombre_pagador
                if (formData.carnet_pagador.trim()) {
                    updateData.carnet_pagador = formData.carnet_pagador
                }
            }

            if (formData.metodo_pago === 'efectivo') {
                updateData.recibido_por = formData.recibido_por
                if (Object.keys(desgloseBilletes).length > 0) {
                    updateData.desglose_billetes = desgloseBilletes
                }
            } else if (formData.comprobante_transferencia.trim()) {
                updateData.comprobante_transferencia = formData.comprobante_transferencia
            }

            console.log('📤 Enviando actualización al backend:', updateData)
            console.log('📤 Monto a actualizar:', updateData.monto)
            console.log('📤 ID del pago:', pago.id)

            const response = await PagoService.actualizarPago(pago.id, updateData)
            
            console.log('✅ Pago actualizado exitosamente:', response)

            onSuccess()
            onOpenChange(false)
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el pago')
        } finally {
            setLoading(false)
        }
    }

    if (!pago || !oferta) return null

    console.log('Renderizando EditarPagoDialog - formData.monto:', formData.monto)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent key={pago.id} className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Pago</DialogTitle>
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
                                {oferta.contacto?.nombre || oferta.nombre_completo || 'Sin nombre'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Precio Final:</span>
                            <span className="text-sm font-medium">{formatCurrency(oferta.precio_final)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Monto Pendiente Actual:</span>
                            <span className="text-sm font-bold text-orange-700">
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
                                step="0.0001"
                                min="0.0001"
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
                                    💡 Ejemplo: Si 1 {formData.moneda} = {formData.tasa_cambio.toFixed(4)} USD, entonces {formData.monto || '100'} {formData.moneda} = {((parseFloat(formData.monto) || 100) * formData.tasa_cambio).toFixed(2)} USD
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
                                        nombre_pagador: e.target.checked ? '' : formData.nombre_pagador,
                                        carnet_pagador: e.target.checked ? '' : formData.carnet_pagador
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
                                    setFormData({ ...formData, metodo_pago: value })
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
                                    Comprobante de Transferencia (opcional)
                                </Label>
                                {formData.comprobante_transferencia && !selectedFile && (
                                    <div className="text-xs text-green-600 mb-2">
                                        ✓ Comprobante actual: <a href={formData.comprobante_transferencia} target="_blank" rel="noopener noreferrer" className="underline">Ver archivo</a>
                                    </div>
                                )}
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
                                        ✓ Nuevo archivo subido: {selectedFile.name}
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
                                disabled={loading || uploadingFile}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={loading || uploadingFile}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Actualizando...
                                    </>
                                ) : (
                                    'Actualizar Pago'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
