"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/shared/atom/button"
import { Pencil, UserCheck, UserX, Eye } from "lucide-react"
import { AsistenciaBadge } from "./asistencia-badge"
import { useToast } from "@/hooks/use-toast"
import type { TrabajadorRRHH } from "@/lib/recursos-humanos-types"
import type { Sede, Departamento } from "@/lib/api-types"

interface RecursosHumanosTableProps {
  trabajadores: TrabajadorRRHH[]
  mes: number
  anio: number
  montoTotalEstimulos: number
  sedes: Sede[]
  departamentos: Departamento[]
  estadoAsistencia?: Map<string, boolean>
  loadingAsistencia?: boolean
  onEditar?: (trabajador: TrabajadorRRHH) => void
  onCambiarEstadoTrabajador?: (
    ci: string,
    nombre: string,
    activoActual: boolean,
  ) => Promise<void>
  onVerDetalles?: (trabajador: TrabajadorRRHH) => void
  isVistaHistorica?: boolean
}

function calcularSalario(
  trabajador: TrabajadorRRHH,
  montoTotalEstimulos: number,
  totalTrabajadores: number,
  trabajadoresDestacados: number
): number | null {
  if (
    trabajador.salario_fijo === undefined || trabajador.salario_fijo === null ||
    trabajador.alimentacion === undefined || trabajador.alimentacion === null ||
    trabajador.dias_trabajables === undefined || trabajador.dias_trabajables === null ||
    trabajador.dias_no_trabajados === undefined || trabajador.dias_no_trabajados === null ||
    trabajador.porcentaje_fijo_estimulo === undefined || trabajador.porcentaje_fijo_estimulo === null ||
    trabajador.porcentaje_variable_estimulo === undefined || trabajador.porcentaje_variable_estimulo === null ||
    montoTotalEstimulos < 0 ||
    totalTrabajadores <= 0
  ) {
    return null
  }

  const diasTrabajados = trabajador.dias_trabajables - trabajador.dias_no_trabajados.length
  const salarioProporcional = (trabajador.salario_fijo / trabajador.dias_trabajables) * diasTrabajados
  const estimuloFijo = montoTotalEstimulos * 0.30 * (trabajador.porcentaje_fijo_estimulo / 100)
  const estimuloVariable = trabajador.porcentaje_variable_estimulo > 0
    ? montoTotalEstimulos * 0.70 * (trabajador.porcentaje_variable_estimulo / 100)
    : 0

  return salarioProporcional + estimuloFijo + estimuloVariable + trabajador.alimentacion
}

export function RecursosHumanosTableFinal({
  trabajadores,
  mes,
  anio,
  montoTotalEstimulos,
  sedes,
  departamentos,
  estadoAsistencia,
  loadingAsistencia,
  onEditar,
  onCambiarEstadoTrabajador,
  onVerDetalles,
  isVistaHistorica = false,
}: RecursosHumanosTableProps) {
  const [salariosCalculados, setSalariosCalculados] = useState<Record<string, number | null>>({})
  const [filaResaltada, setFilaResaltada] = useState<string | null>(null)
  const { toast } = useToast()

  const sedesMap = useMemo(() => new Map(sedes.map((s) => [s.id, s.nombre])), [sedes])
  const departamentosMap = useMemo(() => new Map(departamentos.map((d) => [d.id, d.nombre])), [departamentos])

  useEffect(() => {
    const totalTrabajadores = trabajadores.length
    const trabajadoresDestacados = trabajadores.filter((t) => t.porcentaje_variable_estimulo > 0).length

    const sumaPorcentajesFijos = trabajadores.reduce((sum, t) => sum + (t.porcentaje_fijo_estimulo || 0), 0)
    const sumaPorcentajesVariables = trabajadores.reduce((sum, t) => sum + (t.porcentaje_variable_estimulo || 0), 0)

    if (sumaPorcentajesFijos > 100) {
      toast({ variant: "destructive", title: `La suma de % fijos excede el 100%: ${sumaPorcentajesFijos.toFixed(1)}%`, description: "Ajusta los porcentajes para que no excedan el 100% en total" })
    }
    if (sumaPorcentajesVariables > 100) {
      toast({ variant: "destructive", title: `La suma de % variables excede el 100%: ${sumaPorcentajesVariables.toFixed(1)}%`, description: "Ajusta los porcentajes para que no excedan el 100% en total" })
    }

    const nuevosSalarios: Record<string, number | null> = {}
    trabajadores.forEach((t) => {
      nuevosSalarios[t.CI] = calcularSalario(t, montoTotalEstimulos, totalTrabajadores, trabajadoresDestacados)
    })
    setSalariosCalculados(nuevosSalarios)
  }, [trabajadores, montoTotalEstimulos])

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
            <th className="text-left py-3 px-3 font-semibold text-gray-900 sticky left-0 bg-white z-10 min-w-[160px]">Nombre</th>
            <th className="text-left py-3 px-3 font-semibold text-gray-900 min-w-[130px]">Cargo</th>
            <th className="text-left py-3 px-3 font-semibold text-gray-900 min-w-[120px]">Teléfono</th>
            <th className="text-left py-3 px-3 font-semibold text-gray-900 min-w-[150px]">Sede</th>
            <th className="text-left py-3 px-3 font-semibold text-gray-900 min-w-[150px]">Departamento</th>
            <th className="text-center py-3 px-2 font-semibold text-gray-900 text-sm w-[70px]">% Fijo</th>
            <th className="text-center py-3 px-2 font-semibold text-gray-900 text-sm w-[70px]">% Var.</th>
            <th className="text-center py-3 px-2 font-semibold text-gray-900 w-[100px]">Salario</th>
            <th className="text-center py-3 px-2 font-semibold text-gray-900 w-[90px]">Aliment.</th>
            <th className="text-center py-3 px-2 font-semibold text-gray-900 text-sm w-[60px]">Días T.</th>
            <th className="text-center py-3 px-2 font-semibold text-gray-900 text-sm w-[60px]">NT</th>
            <th className="text-center py-3 px-2 font-semibold text-gray-900 bg-green-50 w-[110px]">Total</th>
            {!isVistaHistorica && (
              <th className="text-center py-3 px-2 font-semibold text-gray-900 text-sm sticky right-0 bg-white z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] w-[100px]">Acc.</th>
            )}
          </tr>
        </thead>
        <tbody>
          {trabajadores.map((trabajador) => {
            const salarioCalculado = salariosCalculados[trabajador.CI]
            const estaResaltada = filaResaltada === trabajador.CI

            return (
              <tr
                key={trabajador.CI}
                className={`border-b border-gray-100 transition-colors duration-150 group ${
                  estaResaltada ? "bg-purple-200/60" : "hover:bg-purple-50/30"
                }`}
              >
                {/* Nombre */}
                <td
                  className={`py-3 px-3 sticky left-0 z-10 transition-colors duration-150 ${
                    estaResaltada ? "bg-purple-200/60" : "bg-white group-hover:bg-purple-50/30"
                  }`}
                  onMouseEnter={() => setFilaResaltada(trabajador.CI)}
                  onMouseLeave={() => setFilaResaltada(null)}
                >
                  <div>
                    <div className="font-medium text-gray-900">{trabajador.nombre}</div>
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

                {/* Cargo */}
                <td className={`py-3 px-3 text-left text-sm text-gray-700 transition-colors duration-150 ${estaResaltada ? "bg-purple-200/60" : ""}`}>
                  {trabajador.cargo || <span className="text-gray-400 italic">—</span>}
                </td>

                {/* Teléfono */}
                <td className={`py-3 px-3 text-left text-sm text-gray-700 transition-colors duration-150 ${estaResaltada ? "bg-purple-200/60" : ""}`}>
                  {trabajador.telefono || <span className="text-gray-400 italic">—</span>}
                </td>

                {/* Sede */}
                <td className={`py-3 px-3 text-left text-sm text-gray-700 transition-colors duration-150 ${estaResaltada ? "bg-purple-200/60" : ""}`}>
                  {trabajador.sede_id
                    ? sedesMap.get(trabajador.sede_id) || trabajador.sede_id
                    : <span className="text-gray-400 italic">No asignada</span>}
                </td>

                {/* Departamento */}
                <td className={`py-3 px-3 text-left text-sm text-gray-700 transition-colors duration-150 ${estaResaltada ? "bg-purple-200/60" : ""}`}>
                  {trabajador.departamento_id
                    ? departamentosMap.get(trabajador.departamento_id) || trabajador.departamento_id
                    : <span className="text-gray-400 italic">No asignado</span>}
                </td>

                {/* % Fijo */}
                <td className={`py-3 px-2 text-center text-sm text-gray-700 transition-colors duration-150 ${estaResaltada ? "bg-purple-200/60" : ""}`}>
                  {trabajador.porcentaje_fijo_estimulo}
                </td>

                {/* % Variable */}
                <td className={`py-3 px-2 text-center text-sm text-gray-700 transition-colors duration-150 ${estaResaltada ? "bg-purple-200/60" : ""}`}>
                  {trabajador.porcentaje_variable_estimulo}
                </td>

                {/* Salario Fijo */}
                <td className={`py-3 px-2 text-center text-sm text-gray-700 transition-colors duration-150 ${estaResaltada ? "bg-purple-200/60" : ""}`}>
                  {trabajador.salario_fijo}
                </td>

                {/* Alimentación */}
                <td className={`py-3 px-2 text-center text-sm text-gray-700 transition-colors duration-150 ${estaResaltada ? "bg-purple-200/60" : ""}`}>
                  {trabajador.alimentacion}
                </td>

                {/* Días Trabajables */}
                <td className={`py-3 px-2 text-center text-sm text-gray-700 transition-colors duration-150 ${estaResaltada ? "bg-purple-200/60" : ""}`}>
                  {trabajador.dias_trabajables}
                </td>

                {/* Días No Trabajados */}
                <td className={`py-3 px-2 text-center text-sm text-gray-700 transition-colors duration-150 ${estaResaltada ? "bg-purple-200/60" : ""}`}>
                  {trabajador.dias_no_trabajados.length}
                </td>

                {/* Salario Total */}
                <td className={`py-3 px-2 transition-colors duration-150 ${
                  estaResaltada ? "bg-green-200/80" : "bg-green-50 group-hover:bg-green-100/50"
                }`}>
                  <div className="text-center">
                    {salarioCalculado !== null && salarioCalculado !== undefined ? (
                      <span className="font-bold text-green-700 text-base">
                        ${salarioCalculado.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs italic">N/A</span>
                    )}
                  </div>
                </td>

                {/* Acciones */}
                {!isVistaHistorica && (
                  <td className={`py-3 px-2 sticky right-0 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] transition-colors duration-150 ${
                    estaResaltada ? "bg-purple-200/60" : "bg-white group-hover:bg-purple-50/30"
                  }`}>
                    <div className="flex items-center justify-center gap-1">
                      {onEditar && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditar(trabajador)}
                          className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 h-7 w-7 p-0"
                          title="Editar trabajador"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
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
            <td colSpan={5} className="py-2 px-3 text-center sticky left-0 bg-gray-100 z-10">
              <span className="text-gray-700">TOTALES</span>
            </td>
            <td className="py-2 px-2 text-center text-sm">
              <span className="text-blue-600">
                {trabajadores.reduce((sum, t) => sum + (t.porcentaje_fijo_estimulo || 0), 0).toFixed(1)}%
              </span>
              {trabajadores.reduce((sum, t) => sum + (t.porcentaje_fijo_estimulo || 0), 0) > 100 && (
                <span className="text-red-500 ml-1">⚠</span>
              )}
            </td>
            <td className="py-2 px-2 text-center text-sm">
              <span className="text-purple-600">
                {trabajadores.reduce((sum, t) => sum + (t.porcentaje_variable_estimulo || 0), 0).toFixed(1)}%
              </span>
              {trabajadores.reduce((sum, t) => sum + (t.porcentaje_variable_estimulo || 0), 0) > 100 && (
                <span className="text-red-500 ml-1">⚠</span>
              )}
            </td>
            <td className="py-2 px-2 text-center text-sm text-gray-600">
              {trabajadores.reduce((sum, t) => sum + (t.salario_fijo || 0), 0).toFixed(0)}
            </td>
            <td className="py-2 px-2 text-center text-sm text-gray-600">
              {trabajadores.reduce((sum, t) => sum + (t.alimentacion || 0), 0).toFixed(0)}
            </td>
            <td className="py-2 px-2 text-center text-sm text-gray-400">—</td>
            <td className="py-2 px-2 text-center text-sm text-gray-400">—</td>
            <td className="py-2 px-2 text-center bg-green-100">
              <span className="font-bold text-green-800 text-base">
                ${Object.values(salariosCalculados).reduce<number>((sum, s) => sum + (s ?? 0), 0).toFixed(0)}
              </span>
            </td>
            {!isVistaHistorica && (
              <td className="py-2 px-2 text-center text-sm sticky right-0 bg-gray-100 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)] text-gray-400">—</td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
