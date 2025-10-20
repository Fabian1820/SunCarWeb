"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { DollarSign, Calendar } from "lucide-react"

interface EstimulosDialogProps {
  montoActual: number
  mesActual: string
  anioActual: string
  ingresoId: string | null // null significa que se creará uno nuevo
  onGuardar: (monto: number, mes: string, anio: string) => void
}

export function EstimulosDialog({
  montoActual,
  mesActual,
  anioActual,
  ingresoId,
  onGuardar
}: EstimulosDialogProps) {
  const [monto, setMonto] = useState(montoActual.toString())
  const [mes, setMes] = useState(mesActual)
  const [anio, setAnio] = useState(anioActual)

  const esActualizacion = ingresoId !== null
  const esMismoMesAnio = mes === mesActual && anio === anioActual

  useEffect(() => {
    setMonto(montoActual.toString())
    setMes(mesActual)
    setAnio(anioActual)
  }, [montoActual, mesActual, anioActual])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const montoNumerico = parseFloat(monto) || 0
    if (montoNumerico <= 0) {
      alert("El monto debe ser mayor a 0")
      return
    }
    if (!mes || !anio) {
      alert("Debe seleccionar mes y año")
      return
    }
    onGuardar(montoNumerico, mes, anio)
  }

  const meses = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" }
  ]

  const anios = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i
    return { value: year.toString(), label: year.toString() }
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Período */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-gray-700">
          <Calendar className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold">Período</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="mes" className="text-sm font-medium text-gray-700 mb-2 block">
              Mes
            </Label>
            <select
              id="mes"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Seleccione mes</option>
              {meses.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="anio" className="text-sm font-medium text-gray-700 mb-2 block">
              Año
            </Label>
            <select
              id="anio"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Seleccione año</option>
              {anios.map(a => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Monto */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-gray-700">
          <DollarSign className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold">Monto Total de Estímulos</h3>
        </div>
        <Label htmlFor="monto" className="text-sm text-gray-600">
          Este monto será distribuido entre todos los trabajadores según sus porcentajes
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
            $
          </span>
          <Input
            id="monto"
            type="number"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="pl-8 text-lg"
            placeholder="0.00"
            required
          />
        </div>
      </div>

      {/* Información adicional */}
      <div className={`border rounded-lg p-4 ${
        esActualizacion && esMismoMesAnio
          ? 'bg-blue-50 border-blue-200'
          : !esActualizacion || !esMismoMesAnio
          ? 'bg-green-50 border-green-200'
          : 'bg-purple-50 border-purple-200'
      }`}>
        <p className={`text-sm ${
          esActualizacion && esMismoMesAnio
            ? 'text-blue-900'
            : !esActualizacion || !esMismoMesAnio
            ? 'text-green-900'
            : 'text-purple-900'
        }`}>
          <strong>
            {esActualizacion && esMismoMesAnio
              ? 'Actualización:'
              : !esActualizacion || !esMismoMesAnio
              ? 'Crear nuevo ingreso:'
              : 'Nota:'}
          </strong> {' '}
          {esActualizacion && esMismoMesAnio
            ? 'Se actualizará el monto del ingreso mensual actual.'
            : !esActualizacion || !esMismoMesAnio
            ? 'Se creará un nuevo registro de ingreso mensual para este período.'
            : 'Este monto será utilizado para calcular los estímulos de cada trabajador basándose en sus porcentajes fijo y variable configurados.'}
        </p>
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="submit"
          className={`${
            esActualizacion && esMismoMesAnio
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
              : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
          }`}
        >
          {esActualizacion && esMismoMesAnio ? 'Actualizar Monto' : 'Crear Nuevo Ingreso'}
        </Button>
      </div>
    </form>
  )
}
