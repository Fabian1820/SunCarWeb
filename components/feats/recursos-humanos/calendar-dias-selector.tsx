"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Calendar } from "lucide-react"

interface CalendarDiasSelectorProps {
  diasSeleccionados: number[]
  mes: number
  anio: number
  onDiasChange: (dias: number[]) => void
  onGuardar?: () => void
}

export function CalendarDiasSelector({
  diasSeleccionados,
  mes,
  anio,
  onDiasChange,
  onGuardar
}: CalendarDiasSelectorProps) {
  const [dias, setDias] = useState<number[]>(diasSeleccionados)

  useEffect(() => {
    setDias(diasSeleccionados)
  }, [diasSeleccionados])

  // Calcular días del mes
  const diasDelMes = new Date(anio, mes, 0).getDate()
  const diasArray = Array.from({ length: diasDelMes }, (_, i) => i + 1)

  const toggleDia = (dia: number) => {
    const nuevosDias = dias.includes(dia)
      ? dias.filter(d => d !== dia)
      : [...dias, dia].sort((a, b) => a - b)

    setDias(nuevosDias)
    onDiasChange(nuevosDias)
  }

  const nombreMes = new Date(anio, mes - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900 capitalize">
            {nombreMes}
          </h3>
        </div>
        <span className="text-sm text-gray-600">
          {dias.length} {dias.length === 1 ? 'día' : 'días'} seleccionado{dias.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Calendario de días */}
      <div className="grid grid-cols-7 gap-2">
        {diasArray.map(dia => {
          const isSelected = dias.includes(dia)
          const fecha = new Date(anio, mes - 1, dia)
          const diaSemana = fecha.getDay()
          const esDomingo = diaSemana === 0

          return (
            <button
              key={dia}
              onClick={() => toggleDia(dia)}
              className={`
                aspect-square rounded-lg border-2 font-semibold text-sm transition-all
                ${isSelected
                  ? 'bg-red-500 border-red-600 text-white shadow-md'
                  : esDomingo
                    ? 'bg-gray-100 border-gray-300 text-gray-400'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                }
              `}
              title={`${dia} - ${fecha.toLocaleDateString('es-ES', { weekday: 'long' })}`}
            >
              {dia}
            </button>
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-center space-x-6 text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-gray-200 bg-white"></div>
          <span>Trabajado</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-red-600 bg-red-500"></div>
          <span>No trabajado</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded border-2 border-gray-300 bg-gray-100"></div>
          <span>Domingo</span>
        </div>
      </div>

      {onGuardar && (
        <div className="pt-4 border-t">
          <Button
            onClick={onGuardar}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            Guardar Cambios
          </Button>
        </div>
      )}
    </div>
  )
}
