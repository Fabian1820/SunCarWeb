"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/shared/atom/select"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { API_BASE_URL } from "@/lib/api-config"
import { ClienteService } from "@/lib/services/feats/customer/cliente-service"
import type { Factura, FacturaTipo, FacturaSubTipo } from "@/lib/types/feats/facturas/factura-types"
import type { Cliente } from "@/lib/api-types"

interface FacturaFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    factura?: Factura | null
    onSave: (factura: Omit<Factura, 'id' | 'fecha_creacion' | 'total'>) => Promise<void>
    onGetNumeroSugerido: () => Promise<{ numero_sugerido: string; mensaje: string }>
}

export function FacturaFormDialog({
    open,
    onOpenChange,
    factura,
    onSave,
    onGetNumeroSugerido,
}: FacturaFormDialogProps) {
    const { token } = useAuth()
    const [formData, setFormData] = useState<Omit<Factura, 'id' | 'fecha_creacion' | 'total'>>({
        numero_factura: '',
        tipo: 'cliente_directo',
        subtipo: null,
        cliente_id: null,
        vales: [],
        pagada: false,
        terminada: false,
    })
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [loadingClientes, setLoadingClientes] = useState(false)
    const [loadingNumero, setLoadingNumero] = useState(false)
    const [saving, setSaving] = useState(false)

    // Cargar clientes al abrir
    useEffect(() => {
        if (open && token) {
            loadClientes()
            if (!factura) {
                // Modo crear: obtener número sugerido
                loadNumeroSugerido()
            }
        }
    }, [open, token, factura])

    // Cargar datos de factura existente
    useEffect(() => {
        if (factura && open) {
            setFormData({
                numero_factura: factura.numero_factura,
                tipo: factura.tipo,
                subtipo: factura.subtipo || null,
                cliente_id: factura.cliente_id || null,
                vales: factura.vales,
                pagada: factura.pagada,
                terminada: factura.terminada,
            })
        } else if (!factura && open) {
            // Reset form para nueva factura
            setFormData({
                numero_factura: '',
                tipo: 'cliente_directo',
                subtipo: null,
                cliente_id: null,
                vales: [],
                pagada: false,
                terminada: false,
            })
        }
    }, [factura, open])

    const loadClientes = async () => {
        setLoadingClientes(true)
        try {
            const data = await ClienteService.getClientes()
            // El servicio devuelve { clients: Cliente[], total, skip, limit }
            setClientes(data.clients || [])
        } catch (error) {
            console.error('Error cargando clientes:', error)
        } finally {
            setLoadingClientes(false)
        }
    }

    const loadNumeroSugerido = async () => {
        setLoadingNumero(true)
        try {
            const result = await onGetNumeroSugerido()
            setFormData((prev) => ({ ...prev, numero_factura: result.numero_sugerido }))
        } catch (error) {
            console.error('Error obteniendo número sugerido:', error)
        } finally {
            setLoadingNumero(false)
        }
    }

    const handleTipoChange = (tipo: FacturaTipo) => {
        setFormData({
            ...formData,
            tipo,
            subtipo: tipo === 'instaladora' ? 'brigada' : null,
            cliente_id: null,
        })
    }

    const handleSubTipoChange = (subtipo: FacturaSubTipo) => {
        setFormData({
            ...formData,
            subtipo,
            cliente_id: subtipo === 'cliente' ? formData.cliente_id : null,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            await onSave(formData)
            onOpenChange(false)
        } catch (error) {
            console.error('Error guardando factura:', error)
            alert(error instanceof Error ? error.message : 'Error guardando factura')
        } finally {
            setSaving(false)
        }
    }

    const isFormValid = () => {
        if (!formData.numero_factura.trim()) return false
        if (formData.tipo === 'instaladora' && formData.subtipo === 'cliente' && !formData.cliente_id) {
            return false
        }
        return true
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {factura ? 'Editar Factura' : 'Nueva Factura'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información Básica */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Número de Factura */}
                        <div className="space-y-2">
                            <Label>Número de Factura</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.numero_factura}
                                    onChange={(e) =>
                                        setFormData({ ...formData, numero_factura: e.target.value })
                                    }
                                    placeholder="SC251140"
                                    disabled={loadingNumero}
                                    required
                                />
                                {!factura && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={loadNumeroSugerido}
                                        disabled={loadingNumero}
                                    >
                                        {loadingNumero ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sugerir'}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Tipo de Factura */}
                        <div className="space-y-2">
                            <Label>Tipo de Factura</Label>
                            <Select value={formData.tipo} onValueChange={(v) => handleTipoChange(v as FacturaTipo)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="instaladora">Instaladora</SelectItem>
                                    <SelectItem value="cliente_directo">Cliente Directo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Opciones condicionales para Instaladora */}
                    {formData.tipo === 'instaladora' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Subtipo</Label>
                                <Select
                                    value={formData.subtipo || ''}
                                    onValueChange={(v) => handleSubTipoChange(v as FacturaSubTipo)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="brigada">Brigada</SelectItem>
                                        <SelectItem value="cliente">Cliente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.subtipo === 'cliente' && (
                                <div className="space-y-2">
                                    <Label>Cliente</Label>
                                    <Select
                                        value={formData.cliente_id || ''}
                                        onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingClientes ? "Cargando..." : "Seleccionar cliente"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clientes.map((cliente) => (
                                                <SelectItem key={cliente.numero} value={cliente.numero}>
                                                    {cliente.nombre} ({cliente.numero})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Estados */}
                    <div className="flex gap-6">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="pagada"
                                checked={formData.pagada}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, pagada: checked as boolean })
                                }
                            />
                            <Label htmlFor="pagada" className="cursor-pointer">
                                Pagada
                            </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="terminada"
                                checked={formData.terminada}
                                onCheckedChange={(checked) =>
                                    setFormData({ ...formData, terminada: checked as boolean })
                                }
                            />
                            <Label htmlFor="terminada" className="cursor-pointer">
                                Terminada
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-orange-600 hover:bg-orange-700"
                            disabled={!isFormValid() || saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : factura ? (
                                'Actualizar Factura'
                            ) : (
                                'Crear Factura'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
