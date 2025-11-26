"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Plus, Trash2 } from "lucide-react"
import { ItemValeRow } from "./item-vale-row"
import type { Vale, ItemVale } from "@/lib/types/feats/facturas/factura-types"
import type { Material } from "@/lib/material-types"

interface ValeFormProps {
    vale: Vale
    index: number
    materiales: Material[]
    onChange: (index: number, vale: Vale) => void
    onRemove: (index: number) => void
    canRemove: boolean
}

export function ValeForm({
    vale,
    index,
    materiales,
    onChange,
    onRemove,
    canRemove,
}: ValeFormProps) {
    const getDateValue = () => (vale.fecha ? new Date(vale.fecha).toISOString().slice(0, 10) : "")

    const handleDateInput = (value: string) => {
        onChange(index, {
            ...vale,
            fecha: value ? new Date(value).toISOString() : "",
        })
    }

    const handleAddItem = () => {
        const newItem: ItemVale = {
            material_id: '',
            codigo: '',
            descripcion: '',
            precio: 0,
            cantidad: 1,
        }
        onChange(index, {
            ...vale,
            items: [...vale.items, newItem],
        })
    }

    const handleItemChange = (itemIndex: number, item: ItemVale) => {
        const updatedItems = [...vale.items]
        updatedItems[itemIndex] = item
        onChange(index, {
            ...vale,
            items: updatedItems,
        })
    }

    const handleRemoveItem = (itemIndex: number) => {
        onChange(index, {
            ...vale,
            items: vale.items.filter((_, i) => i !== itemIndex),
        })
    }

    const total = vale.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)

    return (
        <Card className="border-2 border-orange-200">
            <CardHeader className="bg-orange-50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Vale #{index + 1}</CardTitle>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">
                            Total: <span className="font-bold text-orange-600">${total.toFixed(2)}</span>
                        </div>
                        {canRemove && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemove(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                {/* Selector de Fecha */}
                <div className="space-y-2">
                    <Label>Fecha del Vale</Label>
                    <Input
                        type="date"
                        value={getDateValue()}
                        onChange={(e) => handleDateInput(e.target.value)}
                    />
                </div>

                {/* Lista de Items */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Items del Vale</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddItem}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Agregar Item
                        </Button>
                    </div>

                    {vale.items.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <p className="text-gray-500 text-sm">No hay items. Haz clic en "Agregar Item" para comenzar.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {vale.items.map((item, itemIndex) => (
                                <ItemValeRow
                                    key={`${item.material_id || 'new'}-${item.codigo || item.descripcion || itemIndex}-${itemIndex}`}
                                    item={item}
                                    index={itemIndex}
                                    materiales={materiales}
                                    onChange={handleItemChange}
                                    onRemove={handleRemoveItem}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
