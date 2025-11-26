"use client"

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
import { Trash2 } from "lucide-react"
import type { ItemVale } from "@/lib/types/feats/facturas/factura-types"
import type { Material } from "@/lib/material-types"

interface ItemValeRowProps {
    item: ItemVale
    index: number
    materiales: Material[]
    onChange: (index: number, item: ItemVale) => void
    onRemove: (index: number) => void
}

export function ItemValeRow({
    item,
    index,
    materiales,
    onChange,
    onRemove,
}: ItemValeRowProps) {
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

    const handleMaterialChange = (materialKey: string) => {
        const material = materiales.find((m, idx) => buildMaterialKey(m, idx) === materialKey)
        if (material) {
            onChange(index, {
                ...item,
                material_id: (material as any)._id || material.id || (material as any).material_id || (material as any).producto_id || '',
                codigo: material.codigo.toString(),
                descripcion: material.descripcion,
                precio: material.precio || 0,
            })
        }
    }

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
                        {materiales.map((material, idx) => (
                            <SelectItem
                                key={buildMaterialKey(material, idx)}
                                value={buildMaterialKey(material, idx)}
                            >
                                {material.codigo} - {material.descripcion.substring(0, 30)}
                            </SelectItem>
                        ))}
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
                <Label className="text-xs">Precio</Label>
                <Input
                    type="number"
                    step="0.01"
                    value={item.precio}
                    onChange={(e) => handleFieldChange('precio', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="text-right"
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
