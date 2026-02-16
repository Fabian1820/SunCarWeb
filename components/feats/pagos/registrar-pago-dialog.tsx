"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Textarea } from "@/components/shared/molecule/textarea"
import { Loader2, Upload } from "lucide-react"
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
        recibido_por: '',
        comprobante_transferencia: '',
        notas: '',
    })

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
                notas: formData.notas || undefined,
            }

            if (formData.metodo_pago === 'efectivo') {
                pagoData.recibido_por = formData.recibido_por
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
                recibido_por: '',
                comprobante_transferencia: '',
                notas: '',
            })
            setSelectedFile(null)

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
                                max={oferta.monto_pendiente}
                                value={formData.monto}
                                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                            <p className="text-xs text-gray-500">
                                Máximo: {formatCurrency(oferta.monto_pendiente)}
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
