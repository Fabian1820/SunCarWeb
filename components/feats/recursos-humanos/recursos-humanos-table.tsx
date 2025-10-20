"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Calculator, Minus, Plus } from "lucide-react"

interface Trabajador {
  id: string
  nombre: string
  cargo: string
  porcentajeFijoEstimulo: number
  porcentajeVariableEstimulo: number
  salarioFijo: number
  alimentacion: number
  diasNoTrabajados: number
}

interface RecursosHumanosTableProps {
  trabajadores: Trabajador[]
  onActualizarTrabajador: (trabajadorId: string, campo: string, valor: any) => void
  onCalcularSalario: (trabajadorId: string) => void
}

export function RecursosHumanosTable({
  trabajadores,
  onActualizarTrabajador,
  onCalcularSalario
}: RecursosHumanosTableProps) {

  const handleIncrement = (trabajadorId: string) => {
    const trabajador = trabajadores.find(t => t.id === trabajadorId)
    if (trabajador) {
      onActualizarTrabajador(trabajadorId, 'diasNoTrabajados', trabajador.diasNoTrabajados + 1)
    }
  }

  const handleDecrement = (trabajadorId: string) => {
    const trabajador = trabajadores.find(t => t.id === trabajadorId)
    if (trabajador && trabajador.diasNoTrabajados > 0) {
      onActualizarTrabajador(trabajadorId, 'diasNoTrabajados', trabajador.diasNoTrabajados - 1)
    }
  }

  const handleInputChange = (trabajadorId: string, campo: string, valor: string) => {
    const numericValue = parseFloat(valor) || 0
    onActualizarTrabajador(trabajadorId, campo, numericValue)
  }

  if (trabajadores.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No hay trabajadores registrados en el sistema.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Cargo</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">
              % Estímulo Fijo
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">
              % Estímulo Variable
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">
              Salario Fijo
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">
              Alimentación
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">
              Días No Trabajados
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-900">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {trabajadores.map((trabajador) => (
            <tr key={trabajador.id} className="border-b border-gray-100 hover:bg-purple-50/50">
              {/* Nombre */}
              <td className="py-4 px-4">
                <p className="font-medium text-gray-900">{trabajador.nombre}</p>
              </td>

              {/* Cargo */}
              <td className="py-4 px-4">
                <p className="text-sm text-gray-600">{trabajador.cargo}</p>
              </td>

              {/* % Estímulo Fijo */}
              <td className="py-4 px-4">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={trabajador.porcentajeFijoEstimulo}
                  onChange={(e) => handleInputChange(trabajador.id, 'porcentajeFijoEstimulo', e.target.value)}
                  className="w-20 text-center"
                />
              </td>

              {/* % Estímulo Variable */}
              <td className="py-4 px-4">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={trabajador.porcentajeVariableEstimulo}
                  onChange={(e) => handleInputChange(trabajador.id, 'porcentajeVariableEstimulo', e.target.value)}
                  className="w-20 text-center"
                />
              </td>

              {/* Salario Fijo */}
              <td className="py-4 px-4">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={trabajador.salarioFijo}
                  onChange={(e) => handleInputChange(trabajador.id, 'salarioFijo', e.target.value)}
                  className="w-28 text-center"
                />
              </td>

              {/* Alimentación */}
              <td className="py-4 px-4">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={trabajador.alimentacion}
                  onChange={(e) => handleInputChange(trabajador.id, 'alimentacion', e.target.value)}
                  className="w-24 text-center"
                />
              </td>

              {/* Días No Trabajados - Spinner */}
              <td className="py-4 px-4">
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDecrement(trabajador.id)}
                    disabled={trabajador.diasNoTrabajados === 0}
                    className="h-8 w-8 p-0 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="w-16 text-center">
                    <span className="text-lg font-bold text-gray-900">
                      {trabajador.diasNoTrabajados}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleIncrement(trabajador.id)}
                    className="h-8 w-8 p-0 border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </td>

              {/* Acciones */}
              <td className="py-4 px-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCalcularSalario(trabajador.id)}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50 w-full"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
