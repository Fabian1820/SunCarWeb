"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Check, Calendar, UserCheck, UserX, Eye, X } from "lucide-react"
import { CalendarDiasSelector } from "./calendar-dias-selector"
import { AsistenciaBadge } from "./asistencia-badge"
import { toast } from "sonner"
import type { TrabajadorRRHH } from "@/lib/recursos-humanos-types"
import type { Sede, Departamento } from "@/lib/api-types"

interface RecursosHumanosTableProps {
  trabajadores: TrabajadorRRHH[]
  mes: number
  anio: number
  montoTotalEstimulos: number
  sedes: Sede[]
  departamentos: Departamento[]
  loadingCatalogos?: boolean
  estadoAsistencia?: Map<string, boolean>
  loadingAsistencia?: boolean
  onActualizarCampo: (ci: string, campo: string, valor: any) => Promise<{success: boolean; message: string}>
  onActualizarRelacion?: (
    ci: string,
    campo: "sede_id" | "departamento_id",
    valor: string | null,
  ) => Promise<{success: boolean; message: string}>
  onCambiarEstadoTrabajador?: (
    ci: string,
    nombre: string,
    activoActual: boolean,
  ) => Promise<void>
  onVerDetalles?: (trabajador: TrabajadorRRHH) => void
  isVistaHistorica?: boolean
}

// FunciÃ³n para calcular el salario de un trabajador segÃºn la nueva especificaciÃ³n
function calcularSalario(
  trabajador: TrabajadorRRHH,
  montoTotalEstimulos: number,
  totalTrabajadores: number,
  trabajadoresDestacados: number
): number | null {
  // Validar que todos los datos estÃ©n completos
  if (trabajador.salario_fijo === undefined || trabajador.salario_fijo === null ||
      trabajador.alimentacion === undefined || trabajador.alimentacion === null ||
      trabajador.dias_trabajables === undefined || trabajador.dias_trabajables === null ||
      trabajador.dias_no_trabajados === undefined || trabajador.dias_no_trabajados === null ||
      trabajador.porcentaje_fijo_estimulo === undefined || trabajador.porcentaje_fijo_estimulo === null ||
      trabajador.porcentaje_variable_estimulo === undefined || trabajador.porcentaje_variable_estimulo === null ||
      montoTotalEstimulos < 0 ||
      totalTrabajadores <= 0) {
    console.log('âŒ Datos incompletos para calcular salario:', {
      salario_fijo: trabajador.salario_fijo,
      alimentacion: trabajador.alimentacion,
      dias_trabajables: trabajador.dias_trabajables,
      dias_no_trabajados: trabajador.dias_no_trabajados,
      porcentaje_fijo_estimulo: trabajador.porcentaje_fijo_estimulo,
      porcentaje_variable_estimulo: trabajador.porcentaje_variable_estimulo,
      montoTotalEstimulos,
      totalTrabajadores
    })
    return null
  }

  // CÃ¡lculo segÃºn la nueva especificaciÃ³n
  // DÃ­as efectivamente trabajados
  const diasTrabajados = trabajador.dias_trabajables - trabajador.dias_no_trabajados.length

  // Salario proporcional a dÃ­as trabajados
  const salarioProporcional = (trabajador.salario_fijo / trabajador.dias_trabajables) * diasTrabajados

  // Calcular trabajadores destacados (porcentaje_variable_estimulo > 0)
  // Ya se pasa como parÃ¡metro

  // EstÃ­mulo fijo: 30% del total Ã— porcentaje individual del trabajador
  const estimuloFijo = montoTotalEstimulos * 0.30 * (trabajador.porcentaje_fijo_estimulo / 100)

  // EstÃ­mulo variable: 70% del total Ã— porcentaje individual del trabajador
  // Solo se aplica si el trabajador es destacado (porcentaje_variable_estimulo > 0)
  const estimuloVariable = trabajador.porcentaje_variable_estimulo > 0 
    ? montoTotalEstimulos * 0.70 * (trabajador.porcentaje_variable_estimulo / 100)
    : 0

  // Total: salario proporcional + estÃ­mulos + alimentaciÃ³n completa
  const salarioTotal = salarioProporcional + estimuloFijo + estimuloVariable + trabajador.alimentacion

  return salarioTotal
}

export function RecursosHumanosTableFinal({
  trabajadores,
  mes,
  anio,
  montoTotalEstimulos,
  sedes,
  departamentos,
  loadingCatalogos = false,
  estadoAsistencia,
  loadingAsistencia,
  onActualizarCampo,
  onActualizarRelacion,
  onCambiarEstadoTrabajador,
  onVerDetalles,
  isVistaHistorica = false
}: RecursosHumanosTableProps) {
  const [editando, setEditando] = useState<{ci: string, campo: string} | null>(null)
  const [valores, setValores] = useState<Record<string, any>>({})
  const [valoresOriginales, setValoresOriginales] = useState<Record<string, any>>({})
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<TrabajadorRRHH | null>(null)
  const [guardando, setGuardando] = useState<{ci: string, campo: string} | null>(null)
  const [guardandoRelacion, setGuardandoRelacion] = useState<{ci: string, campo: "sede_id" | "departamento_id"} | null>(null)
  const [salariosCalculados, setSalariosCalculados] = useState<Record<string, number | null>>({})
  const [filaResaltada, setFilaResaltada] = useState<string | null>(null)

  const sedesMap = useMemo(() => new Map(sedes.map((sede) => [sede.id, sede.nombre])), [sedes])
  const departamentosMap = useMemo(
    () => new Map(departamentos.map((departamento) => [departamento.id, departamento.nombre])),
    [departamentos],
  )

  // Recalcular salarios cuando cambien los datos
  useEffect(() => {
    console.log('ðŸ”„ Recalculando salarios...', { 
      trabajadoresCount: trabajadores.length, 
      montoTotalEstimulos 
    })
    
    const nuevosSalarios: Record<string, number | null> = {}
    const totalTrabajadores = trabajadores.length
    
    // Calcular trabajadores destacados (porcentaje_variable_estimulo > 0)
    const trabajadoresDestacados = trabajadores.filter(t => t.porcentaje_variable_estimulo > 0).length
    
    // Validar suma de porcentajes
    const sumaPorcentajesFijos = trabajadores.reduce((sum, t) => sum + (t.porcentaje_fijo_estimulo || 0), 0)
    const sumaPorcentajesVariables = trabajadores.reduce((sum, t) => sum + (t.porcentaje_variable_estimulo || 0), 0)
    
    console.log('ðŸ“Š ValidaciÃ³n de porcentajes:', {
      sumaFijos: sumaPorcentajesFijos,
      sumaVariables: sumaPorcentajesVariables,
      excedeFijos: sumaPorcentajesFijos > 100,
      excedeVariables: sumaPorcentajesVariables > 100
    })
    
    // Mostrar alertas si excede el 100%
    if (sumaPorcentajesFijos > 100) {
      console.warn('âš ï¸ La suma de porcentajes fijos excede el 100%:', sumaPorcentajesFijos + '%')
      toast.error(`âš ï¸ La suma de porcentajes fijos excede el 100%: ${sumaPorcentajesFijos.toFixed(1)}%`, {
        duration: 5000,
        description: 'Ajusta los porcentajes para que no excedan el 100% en total'
      })
    }
    if (sumaPorcentajesVariables > 100) {
      console.warn('âš ï¸ La suma de porcentajes variables excede el 100%:', sumaPorcentajesVariables + '%')
      toast.error(`âš ï¸ La suma de porcentajes variables excede el 100%: ${sumaPorcentajesVariables.toFixed(1)}%`, {
        duration: 5000,
        description: 'Ajusta los porcentajes para que no excedan el 100% en total'
      })
    }
    
    console.log('ðŸ‘¥ Trabajadores destacados:', trabajadoresDestacados, 'de', totalTrabajadores)

    trabajadores.forEach(trabajador => {
      const salario = calcularSalario(trabajador, montoTotalEstimulos, totalTrabajadores, trabajadoresDestacados)
      nuevosSalarios[trabajador.CI] = salario
      console.log(`ðŸ’° Salario calculado para ${trabajador.nombre}:`, salario)
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

    // Convertir string vacÃ­o o invÃ¡lido a 0 antes de guardar
    if (valor === '' || valor === null || valor === undefined) {
      valor = 0
    } else if (typeof valor === 'string') {
      // Intentar convertir a nÃºmero si es un string numÃ©rico
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
      // No hubo cambios, solo cerrar la ediciÃ³n sin llamar al backend
      setEditando(null)
      return
    }

    setGuardando({ ci, campo })
    const result = await onActualizarCampo(ci, campo, valor)
    setGuardando(null)

    if (result.success) {
      setEditando(null)
      // Actualizar el valor original despuÃ©s de guardado exitoso
      setValoresOriginales({ ...valoresOriginales, [key]: valor })
    }
  }

  const abrirCalendario = (trabajador: TrabajadorRRHH) => {
    setTrabajadorSeleccionado(trabajador)
    setIsCalendarOpen(true)
  }

  const guardarRelacion = async (
    ci: string,
    campo: "sede_id" | "departamento_id",
    valor: string | null,
  ) => {
    if (!onActualizarRelacion) return

    setGuardandoRelacion({ ci, campo })
    const result = await onActualizarRelacion(ci, campo, valor)
    setGuardandoRelacion(null)

    if (!result.success) {
      toast.error(result.message || "No se pudo actualizar la relaciÃ³n")
    }
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
        <div className="flex items-center space-x-1">
          <Input
            type={tipo}
            value={valores[key] ?? valorActual}
            onChange={(e) => {
              if (tipo === 'number') {
                // Permitir string vacÃ­o o convertir a nÃºmero
                const value = e.target.value === '' ? '' : e.target.value
                setValores({ ...valores, [key]: value })
              } else {
                setValores({ ...valores, [key]: e.target.value })
              }
            }}
            className="w-20 h-7 text-sm px-2"
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
            className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            onClick={cancelarEdicion}
            disabled={estaGuardando}
            className="h-7 w-7 p-0 bg-red-600 hover:bg-red-700 text-white"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )
    }

    return (
      <button
        onClick={() => iniciarEdicion(trabajador.CI, campo, valorActual)}
        className="hover:bg-purple-100 px-1 py-1 rounded transition-colors w-full"
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
	              <th className="text-left py-3 px-3 font-semibold text-gray-900 sticky left-0 bg-white z-10 min-w-[160px]">Nombre</th>
	              <th className="text-left py-3 px-3 font-semibold text-gray-900 min-w-[130px]">Cargo</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-900 min-w-[150px]">Sede</th>
              <th className="text-left py-3 px-3 font-semibold text-gray-900 min-w-[150px]">Departamento</th>
	              <th className="text-center py-3 px-2 font-semibold text-gray-900 text-sm w-[70px]">% Fijo</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-900 text-sm w-[70px]">% Var.</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-900 w-[100px]">Salario</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-900 w-[90px]">Aliment.</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-900 text-sm w-[60px]">Días T.</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-900 text-sm w-[60px]">NT</th>
              <th className="text-center py-3 px-2 font-semibold text-gray-900 bg-green-50 w-[110px]">Total</th>
              {!isVistaHistorica && <th className="text-center py-3 px-2 font-semibold text-gray-900 text-sm sticky right-0 bg-white z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] w-[80px]">Acc.</th>}
            </tr>
          </thead>
          <tbody>
            {trabajadores.map((trabajador) => {
              const salarioCalculado = salariosCalculados[trabajador.CI]
              const estaResaltada = filaResaltada === trabajador.CI
              const sedeId =
                typeof trabajador.sede_id === "string" ? trabajador.sede_id : ""
              const departamentoId =
                typeof trabajador.departamento_id === "string"
                  ? trabajador.departamento_id
                  : ""
              const tieneSedeFueraCatalogo =
                !!sedeId && !sedesMap.has(sedeId)
              const tieneDepartamentoFueraCatalogo =
                !!departamentoId && !departamentosMap.has(departamentoId)

              return (
                <tr 
                  key={trabajador.CI} 
                  className={`border-b border-gray-100 transition-colors duration-150 group ${
                    estaResaltada ? 'bg-purple-200/60' : 'hover:bg-purple-50/30'
                  }`}
                >
                  {/* Nombre + Asistencia - IMPORTANTE: MÃ¡s grande */}
                  <td 
                    className={`py-3 px-3 sticky left-0 z-10 transition-colors duration-150 cursor-pointer ${
                      estaResaltada ? 'bg-purple-200/60' : 'bg-white group-hover:bg-purple-50/30'
                    }`}
                    onMouseEnter={() => setFilaResaltada(trabajador.CI)}
                    onMouseLeave={() => setFilaResaltada(null)}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{trabajador.nombre}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {!trabajador.is_brigadista ? (
                          <AsistenciaBadge
                            estaEnOficina={estadoAsistencia?.get(trabajador.CI) ?? false}
                            loading={loadingAsistencia}
                          />
                        ) : (
                          <span className="text-xs text-gray-400">Brigadista</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cargo - IMPORTANTE: MÃ¡s grande */}
                  <td className={`py-3 px-3 text-left transition-colors duration-150 ${
                    estaResaltada ? 'bg-purple-200/60' : ''
                  }`}>
                    {isVistaHistorica ? trabajador.cargo : renderCampoEditable(trabajador, 'cargo', trabajador.cargo, 'text')}
                  </td>

                  {/* Sede */}
                  <td className={`py-3 px-3 text-left transition-colors duration-150 ${
                    estaResaltada ? 'bg-purple-200/60' : ''
                  }`}>
                    {isVistaHistorica ? (
                      <span className="text-sm text-gray-700">
                        {trabajador.sede_id
                          ? sedesMap.get(trabajador.sede_id) || trabajador.sede_id
                          : "No asignada"}
                      </span>
                    ) : (
                      <select
                        value={sedeId}
                        onChange={(event) =>
                          guardarRelacion(
                            trabajador.CI,
                            "sede_id",
                            event.target.value ? event.target.value : null,
                          )
                        }
                        disabled={
                          loadingCatalogos ||
                          (guardandoRelacion?.ci === trabajador.CI &&
                            guardandoRelacion?.campo === "sede_id")
                        }
                        className="w-full h-8 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                      >
                        <option value="">Sin sede</option>
                        {tieneSedeFueraCatalogo ? (
                          <option value={sedeId}>
                            Sede no activa ({sedeId})
                          </option>
                        ) : null}
                        {sedes.map((sede) => (
                          <option key={sede.id} value={sede.id}>
                            {sede.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* Departamento */}
                  <td className={`py-3 px-3 text-left transition-colors duration-150 ${
                    estaResaltada ? 'bg-purple-200/60' : ''
                  }`}>
                    {isVistaHistorica ? (
                      <span className="text-sm text-gray-700">
                        {trabajador.departamento_id
                          ? departamentosMap.get(trabajador.departamento_id) || trabajador.departamento_id
                          : "No asignado"}
                      </span>
                    ) : (
                      <select
                        value={departamentoId}
                        onChange={(event) =>
                          guardarRelacion(
                            trabajador.CI,
                            "departamento_id",
                            event.target.value ? event.target.value : null,
                          )
                        }
                        disabled={
                          loadingCatalogos ||
                          (guardandoRelacion?.ci === trabajador.CI &&
                            guardandoRelacion?.campo === "departamento_id")
                        }
                        className="w-full h-8 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                      >
                        <option value="">Sin departamento</option>
                        {tieneDepartamentoFueraCatalogo ? (
                          <option value={departamentoId}>
                            Departamento no activo ({departamentoId})
                          </option>
                        ) : null}
                        {departamentos.map((departamento) => (
                          <option key={departamento.id} value={departamento.id}>
                            {departamento.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  {/* % EstÃ­mulo Fijo - Menos importante: mÃ¡s pequeÃ±o */}
                  <td className={`py-3 px-2 text-center text-sm transition-colors duration-150 ${
                    estaResaltada ? 'bg-purple-200/60' : ''
                  }`}>
                    {isVistaHistorica ? trabajador.porcentaje_fijo_estimulo : renderCampoEditable(trabajador, 'porcentaje_fijo_estimulo', trabajador.porcentaje_fijo_estimulo, 'number', 1)}
                  </td>

                  {/* % EstÃ­mulo Variable - Menos importante: mÃ¡s pequeÃ±o */}
                  <td className={`py-3 px-2 text-center text-sm transition-colors duration-150 ${
                    estaResaltada ? 'bg-purple-200/60' : ''
                  }`}>
                    {isVistaHistorica ? trabajador.porcentaje_variable_estimulo : renderCampoEditable(trabajador, 'porcentaje_variable_estimulo', trabajador.porcentaje_variable_estimulo, 'number', 1)}
                  </td>

                  {/* Salario Fijo - IMPORTANTE: TamaÃ±o normal */}
                  <td className={`py-3 px-2 text-center transition-colors duration-150 ${
                    estaResaltada ? 'bg-purple-200/60' : ''
                  }`}>
                    {isVistaHistorica ? trabajador.salario_fijo : renderCampoEditable(trabajador, 'salario_fijo', trabajador.salario_fijo, 'number', 1000)}
                  </td>

                  {/* AlimentaciÃ³n - IMPORTANTE: TamaÃ±o normal */}
                  <td className={`py-3 px-2 text-center transition-colors duration-150 ${
                    estaResaltada ? 'bg-purple-200/60' : ''
                  }`}>
                    {isVistaHistorica ? trabajador.alimentacion : renderCampoEditable(trabajador, 'alimentacion', trabajador.alimentacion, 'number', 1000)}
                  </td>

                  {/* DÃ­as Trabajables - Menos importante: mÃ¡s pequeÃ±o */}
                  <td className={`py-3 px-2 text-center text-sm transition-colors duration-150 ${
                    estaResaltada ? 'bg-purple-200/60' : ''
                  }`}>
                    {isVistaHistorica ? trabajador.dias_trabajables : renderCampoEditable(trabajador, 'dias_trabajables', trabajador.dias_trabajables, 'number', 1)}
                  </td>

                  {/* DÃ­as No Trabajados - Menos importante: mÃ¡s pequeÃ±o */}
                  <td className={`py-3 px-2 transition-colors duration-150 ${
                    estaResaltada ? 'bg-purple-200/60' : ''
                  }`}>
                    {isVistaHistorica ? (
                      <div className="text-center text-sm">
                        {trabajador.dias_no_trabajados.length}
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirCalendario(trabajador)}
                        className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 h-7 text-xs px-1"
                      >
                        <Calendar className="h-3 w-3" />
                        <span className="ml-1">{trabajador.dias_no_trabajados.length}</span>
                      </Button>
                    )}
                  </td>

                  {/* Salario Calculado - MUY IMPORTANTE: MÃ¡s grande y destacado */}
                  <td className={`py-3 px-2 transition-colors duration-150 ${
                    estaResaltada ? 'bg-green-200/80' : 'bg-green-50 group-hover:bg-green-100/50'
                  }`}>
                    <div className="text-center">
                      {salarioCalculado !== null && salarioCalculado !== undefined ? (
                        <span className="font-bold text-green-700 text-base">
                          ${salarioCalculado.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">
                          N/A
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Acciones - Menos importante: iconos pequeÃ±os */}
                  {!isVistaHistorica && (
                    <td className={`py-3 px-2 sticky right-0 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] transition-colors duration-150 ${
                      estaResaltada ? 'bg-purple-200/60' : 'bg-white group-hover:bg-purple-50/30'
                    }`}>
                      <div className="flex items-center justify-center gap-1">
                        {onVerDetalles && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onVerDetalles(trabajador)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-7 w-7 p-0"
                            title="Ver detalles"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onCambiarEstadoTrabajador && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onCambiarEstadoTrabajador(
                                trabajador.CI,
                                trabajador.nombre,
                                trabajador.activo !== false,
                              )
                            }
                            className={`h-7 w-7 p-0 ${
                              trabajador.activo === false
                                ? "text-green-600 hover:text-green-800 hover:bg-green-50"
                                : "text-red-600 hover:text-red-800 hover:bg-red-50"
                            }`}
                            title={trabajador.activo === false ? "Reactivar" : "Dar de baja"}
                          >
                            {trabajador.activo === false ? (
                              <UserCheck className="h-3.5 w-3.5" />
                            ) : (
                              <UserX className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
            
            {/* Fila de totales */}
            <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold">
              <td colSpan={4} className="py-2 px-3 text-center sticky left-0 bg-gray-100 z-10">
                <span className="text-gray-700">TOTALES</span>
              </td>
              <td className="py-2 px-2 text-center text-sm">
                <span className="text-blue-600">
                  {trabajadores.reduce((sum, t) => sum + (t.porcentaje_fijo_estimulo || 0), 0).toFixed(1)}%
                </span>
                {trabajadores.reduce((sum, t) => sum + (t.porcentaje_fijo_estimulo || 0), 0) > 100 && (
                  <span className="text-red-500 ml-1">âš ï¸</span>
                )}
              </td>
              <td className="py-2 px-2 text-center text-sm">
                <span className="text-purple-600">
                  {trabajadores.reduce((sum, t) => sum + (t.porcentaje_variable_estimulo || 0), 0).toFixed(1)}%
                </span>
                {trabajadores.reduce((sum, t) => sum + (t.porcentaje_variable_estimulo || 0), 0) > 100 && (
                  <span className="text-red-500 ml-1">âš ï¸</span>
                )}
              </td>
              <td className="py-2 px-2 text-center">
                <span className="text-gray-600">
                  {trabajadores.reduce((sum, t) => sum + (t.salario_fijo || 0), 0).toFixed(0)}
                </span>
              </td>
              <td className="py-2 px-2 text-center">
                <span className="text-gray-600">
                  {trabajadores.reduce((sum, t) => sum + (t.alimentacion || 0), 0).toFixed(0)}
                </span>
              </td>
              <td className="py-2 px-2 text-center text-sm">
                <span className="text-gray-400">-</span>
              </td>
              <td className="py-2 px-2 text-center text-sm">
                <span className="text-gray-400">-</span>
              </td>
              <td className="py-2 px-2 text-center bg-green-100">
                <span className="font-bold text-green-800 text-base">
                  ${Object.values(salariosCalculados).reduce((sum, salario) => sum + (salario || 0), 0).toFixed(0)}
                </span>
              </td>
              {!isVistaHistorica && (
                <td className="py-2 px-2 text-center text-sm sticky right-0 bg-gray-100 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                  <span className="text-gray-400">-</span>
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dialog del calendario */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              DÃ­as No Trabajados - {trabajadorSeleccionado?.nombre}
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
