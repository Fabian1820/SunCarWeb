"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Label } from "@/components/shared/atom/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/shared/atom/select"
import { Trash2, Search } from "lucide-react"
import type { ItemVale } from "@/lib/types/feats/facturas/factura-types"
import type { Material } from "@/lib/material-types"

interface ItemValeRowProps {
    item: ItemVale
    index: number
    materiales: Material[]
    onChange: (index: number, item: ItemVale) => void
    onRemove: (index: number) => void
    tipoFactura?: 'instaladora' | 'cliente_directo'
}

export function ItemValeRow({
    item,
    index,
    materiales,
    onChange,
    onRemove,
    tipoFactura,
}: ItemValeRowProps) {
    const [searchQuery, setSearchQuery] = useState("")

    const buildMaterialKey = (material: Material, idx: number) =>
        (material as any).material_key || `${material.id || (material as any)._id || (material as any).producto_id || 'mat'}__${material.codigo || idx}`

    const selectedKey = () => {
        const matchIndex = materiales.findIndex(
            (m) =>
                (((m as any)._id || m.id || (m as any).material_id || (m as any).producto_id) === item.material_id) &&
                (item.codigo ? String(m.codigo) === String(item.codigo) : true)
        )
        if (matchIndex === -1) return ''
        return buildMaterialKey(materiales[matchIndex], matchIndex)
    }

    // Filtrar materiales por descripción
    const filteredMateriales = useMemo(() => {
        if (!searchQuery.trim()) return materiales

        const query = searchQuery.toLowerCase()
        return materiales.filter((material) =>
            material.descripcion.toLowerCase().includes(query) ||
            material.codigo.toString().toLowerCase().includes(query)
        )
    }, [materiales, searchQuery])

    const handleMaterialChange = (materialKey: string) => {
        const material = materiales.find((m, idx) => buildMaterialKey(m, idx) === materialKey)
        if (material) {
            // Obtener el precio base del material
            let precioFinal = material.precio || 0
            const precioOriginal = precioFinal
            
            // Aplicar 15% de descuento SOLO si:
            // 1. El tipo de factura es "instaladora"
            // 2. La categoría es exactamente "INVERSORES" o "BATERÍAS"
            if (tipoFactura === 'instaladora') {
                const categoria = material.categoria?.trim() || ''
                console.log('🔍 Verificando descuento:', {
                    tipoFactura,
                    categoria,
                    precioOriginal,
                    aplicaDescuento: categoria === 'INVERSORES' || categoria === 'BATERÍAS'
                })
                
                if (categoria === 'INVERSORES' || categoria === 'BATERÍAS') {
                    precioFinal = Math.round(precioFinal * 0.85 * 100) / 100 // Aplicar 15% de descuento y redondear a 2 decimales
                    console.log('✅ Descuento aplicado:', { precioOriginal, precioFinal, descuento: '15%' })
                }
            }
            
            onChange(index, {
                ...item,
                material_id: (material as any)._id || material.id || (material as any).material_id || (material as any).producto_id || '',
                codigo: material.codigo.toString(),
                descripcion: material.descripcion,
                precio: precioFinal,
            })
        }
    }

    // Verificar si el material actual tiene descuento aplicado
    const materialActual = materiales.find(
        (m) =>
            (((m as any)._id || m.id || (m as any).material_id || (m as any).producto_id) === item.material_id) &&
            (item.codigo ? String(m.codigo) === String(item.codigo) : true)
    )
    const tieneDescuento = tipoFactura === 'instaladora' && materialActual ? 
        (materialActual.categoria?.trim() === 'INVERSORES' || materialActual.categoria?.trim() === 'BATERÍAS') : 
        false

    const handleFieldChange = (field: keyof ItemVale, value: string | number) => {
        onChange(index, { ...item, [field]: value })
    }

    const subtotal = item.precio * item.cantidad

    return (
        <div className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg border border-gray-200">
            {/* Selector de Material */}
            <div className="col-span-3 space-y-2">
                <Label className="text-xs">Material</Label>
                <Select value={selectedKey()} onValueChange={handleMaterialChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Buscador interno */}
                        <div className="sticky top-0 z-10 bg-white p-2 border-b">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar por descripción o código..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-8 text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>

                        {/* Lista de materiales filtrados */}
                        <div className="max-h-[300px] overflow-y-auto">
                            {filteredMateriales.length > 0 ? (
                                filteredMateriales.map((material, idx) => (
                                    <SelectItem
                                        key={buildMaterialKey(material, idx)}
                                        value={buildMaterialKey(material, idx)}
                                    >
                                        {material.codigo} - {material.descripcion.substring(0, 30)}
                                    </SelectItem>
                                ))
                            ) : (
                                <div className="py-6 text-center text-sm text-gray-500">
                                    No se encontraron materiales
                                </div>
                            )}
                        </div>
                    </SelectContent>
                </Select>
            </div>

            {/* Código */}
            <div className="col-span-2 space-y-2">
                <Label className="text-xs">Código</Label>
                <Input
                    value={item.codigo}
                    onChange={(e) => handleFieldChange('codigo', e.target.value)}
                    placeholder="Código"
                />
            </div>

            {/* Descripción */}
            <div className="col-span-2 space-y-2">
                <Label className="text-xs">Descripción</Label>
                <Input
                    value={item.descripcion}
                    onChange={(e) => handleFieldChange('descripcion', e.target.value)}
                    placeholder="Descripción"
                />
            </div>

            {/* Precio */}
            <div className="col-span-2 space-y-2">
                <Label className="text-xs flex items-center gap-2">
                    Precio
                    {tieneDescuento && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                            -15%
                        </span>
                    )}
                </Label>
                <Input
                    type="number"
                    step="0.01"
                    value={item.precio}
                    onChange={(e) => handleFieldChange('precio', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={`text-right ${tieneDescuento ? 'border-green-300 bg-green-50' : ''}`}
                />
            </div>

            {/* Cantidad */}
            <div className="col-span-1 space-y-2">
                <Label className="text-xs">Cant.</Label>
                <Input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => handleFieldChange('cantidad', parseInt(e.target.value) || 1)}
                />
            </div>

            {/* Subtotal */}
            <div className="col-span-1 space-y-2">
                <Label className="text-xs">Subtotal</Label>
                <div className="h-10 flex items-center justify-end font-semibold text-sm">
                    ${subtotal.toFixed(2)}
                </div>
            </div>

            {/* Botón Eliminar */}
            <div className="col-span-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
