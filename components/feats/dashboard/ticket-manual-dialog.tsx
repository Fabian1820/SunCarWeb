"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { ClipboardList, Plus, Trash2, Download } from "lucide-react"
import { ReciboService } from "@/lib/services/feats/caja/recibo-service"

interface ItemManual {
  id: string
  descripcion: string
  precio: number
  cantidad: number
}

interface TicketManualDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

let _idCounter = 0
const newItemId = () => `item-${++_idCounter}-${Date.now()}`
const createItem = (): ItemManual => ({
  id: newItemId(),
  descripcion: "",
  precio: 0,
  cantidad: 1,
})

const todayIso = () => new Date().toISOString().slice(0, 10)

const formatMoney = (value: number) =>
  `$${value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export function TicketManualDialog({ open, onOpenChange }: TicketManualDialogProps) {
  const [nombreLugar, setNombreLugar] = useState("")
  const [fecha, setFecha] = useState(todayIso)
  const [items, setItems] = useState<ItemManual[]>([createItem()])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
    [items],
  )

  const validItems = useMemo(
    () => items.filter((item) => item.descripcion.trim() !== "" && item.cantidad > 0),
    [items],
  )

  // Solo necesita al menos un producto válido; el lugar es opcional
  const canExport = validItems.length > 0

  const handleAddItem = () => setItems((prev) => [...prev, createItem()])

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((item) => item.id !== id)
    })
  }

  const handleItemChange = (
    id: string,
    field: keyof Omit<ItemManual, "id">,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  const handleExport = () => {
    const [year, month, day] = fecha.split("-").map(Number)
    const fechaDate = new Date(year, month - 1, day, 12, 0, 0)

    ReciboService.descargarTicketManualDashboard({
      // Si el nombre está vacío no se envía, así el PDF no muestra "Lugar:"
      nombreAlmacen: nombreLugar.trim() || undefined,
      fecha: fechaDate,
      items: validItems.map((item) => ({
        descripcion: item.descripcion.trim(),
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal: item.precio * item.cantidad,
      })),
      total,
    })
  }

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setNombreLugar("")
      setFecha(todayIso())
      setItems([createItem()])
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-orange-600" />
            Generar Ticket / Vale de Venta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Encabezado del ticket */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Nombre del lugar{" "}
                <span className="text-gray-400 font-normal text-xs">(opcional)</span>
              </Label>
              <Input
                placeholder="Ej: Almacén Central, Tienda Sur..."
                value={nombreLugar}
                onChange={(e) => setNombreLugar(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          {/* Tabla de productos sin líneas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm font-semibold">Productos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="gap-1 h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar producto
              </Button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left font-semibold text-gray-600 pb-2 pr-2 w-[52%]">
                    Nombre
                  </th>
                  <th className="text-right font-semibold text-gray-600 pb-2 px-2 w-[22%]">
                    Precio unit.
                  </th>
                  <th className="text-center font-semibold text-gray-600 pb-2 px-2 w-[18%]">
                    Cant.
                  </th>
                  <th className="w-[8%]" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="py-1.5 pr-2">
                      <Input
                        placeholder="Nombre del producto"
                        value={item.descripcion}
                        onChange={(e) =>
                          handleItemChange(item.id, "descripcion", e.target.value)
                        }
                        className="h-8 text-sm border-gray-200 focus:border-orange-300"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.precio === 0 ? "" : item.precio}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "precio",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="h-8 text-sm text-right border-gray-200 focus:border-orange-300"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        value={item.cantidad === 0 ? "" : item.cantidad}
                        onChange={(e) =>
                          handleItemChange(
                            item.id,
                            "cantidad",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className="h-8 text-sm text-center border-gray-200 focus:border-orange-300"
                      />
                    </td>
                    <td className="py-1.5 pl-1 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length === 1}
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total */}
            <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-500">Total:</span>
              <span className="text-2xl font-bold text-orange-600">
                {formatMoney(total)}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cerrar
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport}
            className="bg-orange-600 hover:bg-orange-700 gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
