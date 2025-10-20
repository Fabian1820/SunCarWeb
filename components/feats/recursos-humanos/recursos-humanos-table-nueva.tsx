"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/molecule/dialog"
import { Calculator, Check, Calendar } from "lucide-react"
import { CalendarDiasSelector } from "./calendar-dias-selector"
import type { TrabajadorRRHH } from "@/lib/recursos-humanos-types"

interface RecursosHumanosTableProps {
  trabajadores: TrabajadorRRHH[]
  mes: number
  anio: number
  onActualizarCampo: (ci: string, campo: string, valor: any) => Promise<{success: boolean; message: string}>
  onCalcularSalario: (ci: string) => void
}

export function RecursosHumanosTableNueva({
  trabajadores,
  mes,
  anio,
  onActualizarCampo,
  onCalcularSalario
}: RecursosHumanosTableProps) {
  const [editando, setEditando] = useState<{ci: string, campo: string} | null>(null)
  const [valores, setValores] = useState<Record<string, any>>({})
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<TrabajadorRRHH | null>(null)
  const [guardando, setGuardando] = useState<{ci: string, campo: string} | null>(null)

  const iniciarEdicion = (ci: string, campo: string, valorActual: any) => {
    setEditando({ ci, campo })
    setValores({ ...valores, [`${ci}-${campo}`]: valorActual })
  }

  const cancelarEdicion = () => {
    setEditando(null)
  }

  const guardarCampo = async (ci: string, campo: string) => {
    const key = `${ci}-${campo}`
    const valor = valores[key]

    setGuardando({ ci, campo })
    const result = await onActualizarCampo(ci, campo, valor)
    setGuardando(null)

    if (result.success) {
      setEditando(null)
    }
  }

  const abrirCalendario = (trabajador: TrabajadorRRHH) => {
    setTrabajadorSeleccionado(trabajador)
    setIsCalendarOpen(true)
  }

  const guardarDias = async () => {
    if (!trabajadorSeleccionado) return

    const key = `${trabajadorSeleccionado.CI}-dias_no_trabajados`
    const dias = valores[key] || trabajadorSeleccionado.dias_no_trabajados

    setGuardando({ ci: trabajadorSeleccionado.CI, campo: 'dias_no_trabajados' })
    const result = await onActualizarCampo(trabajadorSeleccionado.CI, 'dias_no_trabajados', dias)
    setGuardando(null)

    if (result.success) {
      setIsCalendarOpen(false)
      setTrabajadorSeleccionado(null)
    }
  }

  const renderCampoEditable = (trabajador: TrabajadorRRHH, campo: string, valorActual: any, tipo: 'number' | 'text' = 'number') => {
    const estaEditando = editando?.ci === trabajador.CI && editando?.campo === campo
    const key = `${trabajador.CI}-${campo}`
    const estaGuardando = guardando?.ci === trabajador.CI && guardando?.campo === campo

    if (estaEditando) {
      return (
        <div className="flex items-center space-x-2">
          <Input
            type={tipo}
            value={valores[key] ?? valorActual}
            onChange={(e) => setValores({ ...valores, [key]: tipo === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
            className="w-24 h-8 text-sm"
            min={tipo === 'number' ? 0 : undefined}
            step={tipo === 'number' ? 0.01 : undefined}
            autoFocus
          />
          <Button
            size="sm"
            onClick={() => guardarCampo(trabajador.CI, campo)}
            disabled={estaGuardando}
            className="h-8 px-2 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={cancelarEdicion}
            disabled={estaGuardando}
            className="h-8 px-2"
          >
            ✕
          </Button>
        </div>
      )
    }

    return (
      <button
        onClick={() => iniciarEdicion(trabajador.CI, campo, valorActual)}
        className="hover:bg-purple-100 px-2 py-1 rounded transition-colors"
        title="Click para editar"
      >
        {valorActual}
      </button>
    )
  }

  if (trabajadores.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No hay trabajadores registrados en el sistema.</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Cargo</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900">% Estímulo Fijo</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900">% Estímulo Variable</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900">Salario Fijo</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900">Alimentación</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900">Días No Trabajados</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {trabajadores.map((trabajador) => (
              <tr key={trabajador.CI} className="border-b border-gray-100 hover:bg-purple-50/50">
                {/* Nombre */}
                <td className="py-4 px-4">
                  <div>
                    <p className="font-medium text-gray-900">{trabajador.nombre}</p>
                    <p className="text-xs text-gray-500">CI: {trabajador.CI}</p>
                  </div>
                </td>

                {/* Cargo */}
                <td className="py-4 px-4 text-center">
                  {renderCampoEditable(trabajador, 'cargo', trabajador.cargo, 'text')}
                </td>

                {/* % Estímulo Fijo */}
                <td className="py-4 px-4 text-center">
                  {renderCampoEditable(trabajador, 'porcentaje_fijo_estimulo', trabajador.porcentaje_fijo_estimulo)}
                </td>

                {/* % Estímulo Variable */}
                <td className="py-4 px-4 text-center">
                  {renderCampoEditable(trabajador, 'porcentaje_variable_estimulo', trabajador.porcentaje_variable_estimulo)}
                </td>

                {/* Salario Fijo */}
                <td className="py-4 px-4 text-center">
                  {renderCampoEditable(trabajador, 'salario_fijo', trabajador.salario_fijo)}
                </td>

                {/* Alimentación */}
                <td className="py-4 px-4 text-center">
                  {renderCampoEditable(trabajador, 'alimentacion', trabajador.alimentacion)}
                </td>

                {/* Días No Trabajados */}
                <td className="py-4 px-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirCalendario(trabajador)}
                    className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {trabajador.dias_no_trabajados.length} días
                  </Button>
                </td>

                {/* Acciones */}
                <td className="py-4 px-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCalcularSalario(trabajador.CI)}
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

      {/* Dialog del calendario */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Días No Trabajados - {trabajadorSeleccionado?.nombre}
            </DialogTitle>
          </DialogHeader>
          {trabajadorSeleccionado && (
            <CalendarDiasSelector
              diasSeleccionados={valores[`${trabajadorSeleccionado.CI}-dias_no_trabajados`] || trabajadorSeleccionado.dias_no_trabajados}
              mes={mes}
              anio={anio}
              onDiasChange={(dias) => {
                setValores({ ...valores, [`${trabajadorSeleccionado.CI}-dias_no_trabajados`]: dias })
              }}
              onGuardar={guardarDias}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
