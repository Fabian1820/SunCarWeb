"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Plus, Trash2, Loader2, DollarSign, Truck, Ship, Percent } from "lucide-react"
import type { FichaCostoCreateData, ModoDistribucion, OtroCosto } from "@/lib/types/feats/fichas-costo/ficha-costo-types"

interface CrearFichaFormProps {
  materialId: string
  materialNombre: string
  onSubmit: (data: FichaCostoCreateData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const MODOS: { value: ModoDistribucion; label: string }[] = [
  { value: 'unidad', label: 'Por unidad' },
  { value: 'lote', label: 'Por lote' },
  { value: 'contenedor', label: 'Por contenedor' },
]

export function CrearFichaForm({ materialId, materialNombre, onSubmit, onCancel, loading }: CrearFichaFormProps) {
  const [costoUnitario, setCostoUnitario] = useState("")
  const [transporteModo, setTransporteModo] = useState<ModoDistribucion>("lote")
  const [transportePrecio, setTransportePrecio] = useState("")
  const [transporteCantidad, setTransporteCantidad] = useState("")
  const [envioModo, setEnvioModo] = useState<ModoDistribucion>("contenedor")
  const [envioPrecio, setEnvioPrecio] = useState("")
  const [envioCantidad, setEnvioCantidad] = useState("")
  const [porcentajeGanancia, setPorcentajeGanancia] = useState("")
  const [otrosCostos, setOtrosCostos] = useState<{ tipo: string; modo: ModoDistribucion; precio: string; cantidad: string }[]>([])

  const addOtroCosto = () => {
    setOtrosCostos(prev => [...prev, { tipo: "", modo: "unidad", precio: "", cantidad: "1" }])
  }

  const removeOtroCosto = (idx: number) => {
    setOtrosCostos(prev => prev.filter((_, i) => i !== idx))
  }

  const updateOtroCosto = (idx: number, field: string, value: string) => {
    setOtrosCostos(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data: FichaCostoCreateData = {
      material_id: materialId,
      costo_unitario: parseFloat(costoUnitario) || 0,
      costo_transportacion: {
        modo: transporteModo,
        precio_total: parseFloat(transportePrecio) || 0,
        cantidad_base: transporteModo === 'unidad' ? 1 : (parseInt(transporteCantidad) || 1),
      },
      costo_envio: {
        modo: envioModo,
        precio_total: parseFloat(envioPrecio) || 0,
        cantidad_base: envioModo === 'unidad' ? 1 : (parseInt(envioCantidad) || 1),
      },
      otros_costos: otrosCostos
        .filter(c => c.tipo.trim())
        .map(c => ({
          tipo_costo: c.tipo,
          detalle: {
            modo: c.modo,
            precio_total: parseFloat(c.precio) || 0,
            cantidad_base: c.modo === 'unidad' ? 1 : (parseInt(c.cantidad) || 1),
          },
        })),
      porcentaje_ganancia: parseFloat(porcentajeGanancia) || 0,
    }

    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Material seleccionado */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
        <p className="text-sm text-teal-700">
          <span className="font-semibold">Material:</span> {materialNombre}
        </p>
        <p className="text-xs text-teal-600 mt-0.5">ID: {materialId}</p>
      </div>

      {/* Costo base */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Costo Base Unitario (USD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Ej: 120.50"
            value={costoUnitario}
            onChange={(e) => setCostoUnitario(e.target.value)}
            required
          />
        </CardContent>
      </Card>

      {/* Transporte */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-600" />
            Costo de Transportación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Modo</Label>
              <Select value={transporteModo} onValueChange={(v) => setTransporteModo(v as ModoDistribucion)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Precio total (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="500"
                value={transportePrecio}
                onChange={(e) => setTransportePrecio(e.target.value)}
                required
              />
            </div>
            {transporteModo !== 'unidad' && (
              <div>
                <Label className="text-xs">Cantidad base</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="25"
                  value={transporteCantidad}
                  onChange={(e) => setTransporteCantidad(e.target.value)}
                  required
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Envío */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ship className="h-4 w-4 text-indigo-600" />
            Costo de Envío
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Modo</Label>
              <Select value={envioModo} onValueChange={(v) => setEnvioModo(v as ModoDistribucion)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Precio total (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="1200"
                value={envioPrecio}
                onChange={(e) => setEnvioPrecio(e.target.value)}
                required
              />
            </div>
            {envioModo !== 'unidad' && (
              <div>
                <Label className="text-xs">Cantidad base</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="100"
                  value={envioCantidad}
                  onChange={(e) => setEnvioCantidad(e.target.value)}
                  required
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Otros costos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Otros Costos</span>
            <Button type="button" variant="outline" size="sm" onClick={addOtroCosto}>
              <Plus className="h-3 w-3 mr-1" /> Agregar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {otrosCostos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">Sin costos adicionales</p>
          ) : (
            otrosCostos.map((costo, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Costo #{idx + 1}</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeOtroCosto(idx)}>
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Input
                      placeholder="Ej: seguro"
                      value={costo.tipo}
                      onChange={(e) => updateOtroCosto(idx, 'tipo', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Modo</Label>
                    <Select value={costo.modo} onValueChange={(v) => updateOtroCosto(idx, 'modo', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MODOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Precio total</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costo.precio}
                      onChange={(e) => updateOtroCosto(idx, 'precio', e.target.value)}
                      required
                    />
                  </div>
                  {costo.modo !== 'unidad' && (
                    <div>
                      <Label className="text-xs">Cant. base</Label>
                      <Input
                        type="number"
                        min="1"
                        value={costo.cantidad}
                        onChange={(e) => updateOtroCosto(idx, 'cantidad', e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Porcentaje de ganancia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Percent className="h-4 w-4 text-amber-600" />
            Porcentaje de Ganancia (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            step="0.1"
            min="0"
            placeholder="Ej: 10"
            value={porcentajeGanancia}
            onChange={(e) => setPorcentajeGanancia(e.target.value)}
            required
          />
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || !costoUnitario}
          className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            "Guardar Ficha"
          )}
        </Button>
      </div>
    </form>
  )
}
