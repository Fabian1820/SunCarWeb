"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Check, Calendar, Trash2 } from "lucide-react"
import { CalendarDiasSelector } from "./calendar-dias-selector"
import type { TrabajadorRRHH } from "@/lib/recursos-humanos-types"

interface RecursosHumanosTableProps {
  trabajadores: TrabajadorRRHH[]
  mes: number
  anio: number
  montoTotalEstimulos: number
  onActualizarCampo: (ci: string, campo: string, valor: any) => Promise<{success: boolean; message: string}>
  onEliminarTrabajador?: (ci: string, nombre: string) => Promise<void>
}

// Función para calcular el salario de un trabajador según la documentación API
function calcularSalario(
  trabajador: TrabajadorRRHH,
  montoTotalEstimulos: number,
  totalTrabajadores: number
): number | null {
  // Validar que todos los datos estén completos
  if (trabajador.salario_fijo === undefined ||
      trabajador.alimentacion === undefined ||
      trabajador.dias_trabajables === undefined ||
      trabajador.dias_no_trabajados === undefined ||
      trabajador.porcentaje_fijo_estimulo === undefined ||
      trabajador.porcentaje_variable_estimulo === undefined ||
      montoTotalEstimulos <= 0 ||
      totalTrabajadores <= 0) {
    return null
  }

  // Cálculo según la documentación API (líneas 611-636)
  // Días efectivamente trabajados
  const diasTrabajados = trabajador.dias_trabajables - trabajador.dias_no_trabajados.length

  // Salario proporcional a días trabajados
  const salarioProporcional = (trabajador.salario_fijo / trabajador.dias_trabajables) * diasTrabajados

  // Estímulo fijo (porcentaje sobre el salario proporcional)
  const estimuloFijo = salarioProporcional * (trabajador.porcentaje_fijo_estimulo / 100)

  // Estímulo variable (porcentaje del ingreso mensual dividido entre todos los trabajadores)
  const estimuloVariable = (montoTotalEstimulos * (trabajador.porcentaje_variable_estimulo / 100)) / totalTrabajadores

  // Total: salario proporcional + estímulos + alimentación completa
  const salarioTotal = salarioProporcional + estimuloFijo + estimuloVariable + trabajador.alimentacion

  return salarioTotal
}

export function RecursosHumanosTableFinal({
  trabajadores,
  mes,
  anio,
  montoTotalEstimulos,
  onActualizarCampo,
  onEliminarTrabajador
}: RecursosHumanosTableProps) {
  const [editando, setEditando] = useState<{ci: string, campo: string} | null>(null)
  const [valores, setValores] = useState<Record<string, any>>({})
  const [valoresOriginales, setValoresOriginales] = useState<Record<string, any>>({})
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<TrabajadorRRHH | null>(null)
  const [guardando, setGuardando] = useState<{ci: string, campo: string} | null>(null)
  const [salariosCalculados, setSalariosCalculados] = useState<Record<string, number | null>>({})

  // Recalcular salarios cuando cambien los datos
  useEffect(() => {
    const nuevosSalarios: Record<string, number | null> = {}
    const totalTrabajadores = trabajadores.length

    trabajadores.forEach(trabajador => {
      nuevosSalarios[trabajador.CI] = calcularSalario(trabajador, montoTotalEstimulos, totalTrabajadores)
    })
    setSalariosCalculados(nuevosSalarios)
  }, [trabajadores, montoTotalEstimulos])

  const iniciarEdicion = (ci: string, campo: string, valorActual: any) => {
    const key = `${ci}-${campo}`
    setEditando({ ci, campo })
    setValores({ ...valores, [key]: valorActual })
    setValoresOriginales({ ...valoresOriginales, [key]: valorActual })
  }

  const cancelarEdicion = () => {
    setEditando(null)
  }

  const guardarCampo = async (ci: string, campo: string) => {
    const key = `${ci}-${campo}`
    let valor = valores[key]
    const valorOriginal = valoresOriginales[key]

    // Convertir string vacío o inválido a 0 antes de guardar
    if (valor === '' || valor === null || valor === undefined) {
      valor = 0
    } else if (typeof valor === 'string') {
      // Intentar convertir a número si es un string numérico
      const numValue = parseFloat(valor)
      if (!isNaN(numValue)) {
        valor = numValue
      }
    }

    // Validar si realmente hubo cambios
    let valorOriginalNormalizado = valorOriginal
    if (typeof valorOriginalNormalizado === 'string') {
      const numValue = parseFloat(valorOriginalNormalizado)
      if (!isNaN(numValue)) {
        valorOriginalNormalizado = numValue
      }
    }

    if (valor === valorOriginalNormalizado ||
        (typeof valor === 'number' && typeof valorOriginalNormalizado === 'number' &&
         Math.abs(valor - valorOriginalNormalizado) < 0.000001)) {
      // No hubo cambios, solo cerrar la edición sin llamar al backend
      setEditando(null)
      return
    }

    setGuardando({ ci, campo })
    const result = await onActualizarCampo(ci, campo, valor)
    setGuardando(null)

    if (result.success) {
      setEditando(null)
      // Actualizar el valor original después de guardado exitoso
      setValoresOriginales({ ...valoresOriginales, [key]: valor })
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

  const renderCampoEditable = (
    trabajador: TrabajadorRRHH,
    campo: string,
    valorActual: any,
    tipo: 'number' | 'text' = 'number',
    step: number = 1
  ) => {
    const estaEditando = editando?.ci === trabajador.CI && editando?.campo === campo
    const key = `${trabajador.CI}-${campo}`
    const estaGuardando = guardando?.ci === trabajador.CI && guardando?.campo === campo

    if (estaEditando) {
      return (
        <div className="flex items-center space-x-2">
          <Input
            type={tipo}
            value={valores[key] ?? valorActual}
            onChange={(e) => {
              if (tipo === 'number') {
                // Permitir string vacío o convertir a número
                const value = e.target.value === '' ? '' : e.target.value
                setValores({ ...valores, [key]: value })
              } else {
                setValores({ ...valores, [key]: e.target.value })
              }
            }}
            className="w-24 h-8 text-sm"
            min={tipo === 'number' ? 0 : undefined}
            step={tipo === 'number' ? step : undefined}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                guardarCampo(trabajador.CI, campo)
              } else if (e.key === 'Escape') {
                cancelarEdicion()
              }
            }}
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
        title="Click para editar (Enter para guardar, Esc para cancelar)"
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
              <th className="text-center py-3 px-4 font-semibold text-gray-900">% Est. Fijo</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900">% Est. Variable</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900">Salario Fijo</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900">Alimentación</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900">Días Trabajables</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900">Días No Trabajados</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-900 bg-green-50">Salario Calculado</th>
              {onEliminarTrabajador && (
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody>
            {trabajadores.map((trabajador) => {
              const salarioCalculado = salariosCalculados[trabajador.CI]

              return (
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

                  {/* % Estímulo Fijo - step: 1 */}
                  <td className="py-4 px-4 text-center">
                    {renderCampoEditable(trabajador, 'porcentaje_fijo_estimulo', trabajador.porcentaje_fijo_estimulo, 'number', 1)}
                  </td>

                  {/* % Estímulo Variable - step: 1 */}
                  <td className="py-4 px-4 text-center">
                    {renderCampoEditable(trabajador, 'porcentaje_variable_estimulo', trabajador.porcentaje_variable_estimulo, 'number', 1)}
                  </td>

                  {/* Salario Fijo - step: 1000 */}
                  <td className="py-4 px-4 text-center">
                    {renderCampoEditable(trabajador, 'salario_fijo', trabajador.salario_fijo, 'number', 1000)}
                  </td>

                  {/* Alimentación - step: 1000 */}
                  <td className="py-4 px-4 text-center">
                    {renderCampoEditable(trabajador, 'alimentacion', trabajador.alimentacion, 'number', 1000)}
                  </td>

                  {/* Días Trabajables - step: 1 */}
                  <td className="py-4 px-4 text-center">
                    {renderCampoEditable(trabajador, 'dias_trabajables', trabajador.dias_trabajables, 'number', 1)}
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

                  {/* Salario Calculado */}
                  <td className="py-4 px-4 bg-green-50">
                    <div className="text-center">
                      {salarioCalculado !== null && salarioCalculado !== undefined ? (
                        <span className="font-bold text-green-700 text-lg">
                          ${salarioCalculado.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm italic">
                          Datos incompletos
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Acciones */}
                  {onEliminarTrabajador && (
                    <td className="py-4 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEliminarTrabajador(trabajador.CI, trabajador.nombre)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        title="Eliminar trabajador"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
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
