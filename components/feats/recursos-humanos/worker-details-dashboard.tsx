"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Badge } from "@/components/shared/atom/badge"
import { AsistenciaBadge } from "./asistencia-badge"
import { User, Briefcase, DollarSign, Calendar, TrendingUp, Utensils, CheckCircle, XCircle } from "lucide-react"
import type { TrabajadorRRHH } from "@/lib/recursos-humanos-types"

interface WorkerDetailsDashboardProps {
  trabajador: TrabajadorRRHH
  salarioCalculado: number | null
  montoTotalEstimulos: number
  mes: number
  anio: number
  estadoAsistencia?: Map<string, boolean>
  loadingAsistencia?: boolean
}

export function WorkerDetailsDashboard({
  trabajador,
  salarioCalculado,
  montoTotalEstimulos,
  mes,
  anio,
  estadoAsistencia,
  loadingAsistencia
}: WorkerDetailsDashboardProps) {
  const diasTrabajados = trabajador.dias_trabajables - (trabajador.dias_no_trabajados?.length || 0)
  const salarioProporcional = trabajador.salario_fijo && trabajador.dias_trabajables
    ? (trabajador.salario_fijo / trabajador.dias_trabajables) * diasTrabajados
    : 0
  const estimuloFijo = montoTotalEstimulos * 0.30 * ((trabajador.porcentaje_fijo_estimulo || 0) / 100)
  const estimuloVariable = trabajador.porcentaje_variable_estimulo > 0
    ? montoTotalEstimulos * 0.70 * ((trabajador.porcentaje_variable_estimulo || 0) / 100)
    : 0

  return (
    <div className="space-y-6 max-h-[75vh] sm:max-h-[80vh] overflow-y-auto p-1 sm:p-2">
      {/* Información Principal del Trabajador */}
      <Card className="border-l-4 border-l-purple-600 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-16 w-16 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {trabajador.nombre.charAt(0)}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl sm:text-2xl text-gray-900 truncate">{trabajador.nombre}</CardTitle>
                <p className="text-sm text-gray-600 mt-1">CI: {trabajador.CI}</p>
              </div>
            </div>
            {!trabajador.is_brigadista && (
              <AsistenciaBadge
                estaEnOficina={estadoAsistencia?.get(trabajador.CI) ?? false}
                loading={loadingAsistencia}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Cargo</p>
                <p className="font-semibold text-gray-900">{trabajador.cargo}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Tipo de Trabajador</p>
                <Badge variant={trabajador.is_brigadista ? "default" : "secondary"}>
                  {trabajador.is_brigadista ? "Brigadista" : "Oficina"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600">Período</p>
                <p className="font-semibold text-gray-900">
                  {String(mes).padStart(2, '0')}/{anio}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salario Total Destacado */}
      <Card className="border-l-4 border-l-green-600 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
        <CardContent className="pt-6 pb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="h-10 w-10 text-green-700" />
              <h3 className="text-lg font-semibold text-gray-700">Salario Total Calculado</h3>
            </div>
            {salarioCalculado !== null && salarioCalculado !== undefined ? (
              <p className="text-3xl sm:text-5xl font-bold text-green-700">
                ${salarioCalculado.toFixed(2)}
              </p>
            ) : (
              <p className="text-2xl text-gray-500 italic">Datos incompletos</p>
            )}
            <p className="text-sm text-gray-600 mt-2">
              Incluye salario base, estímulos y alimentación
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Desglose Financiero */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Desglose Financiero
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Salario Fijo */}
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Salario Fijo (Mensual)</span>
              <span className="font-bold text-gray-900">${trabajador.salario_fijo?.toFixed(2) || '0.00'}</span>
            </div>

            {/* Salario Proporcional */}
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-blue-700">Salario Proporcional</span>
                <p className="text-xs text-blue-600">
                  {diasTrabajados} de {trabajador.dias_trabajables} días trabajados
                </p>
              </div>
              <span className="font-bold text-blue-700">${salarioProporcional.toFixed(2)}</span>
            </div>

            {/* Estímulo Fijo */}
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-purple-700">Estímulo Fijo (30%)</span>
                <p className="text-xs text-purple-600">
                  {trabajador.porcentaje_fijo_estimulo}% de ${(montoTotalEstimulos * 0.30).toFixed(2)}
                </p>
              </div>
              <span className="font-bold text-purple-700">${estimuloFijo.toFixed(2)}</span>
            </div>

            {/* Estímulo Variable */}
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-orange-700">Estímulo Variable (70%)</span>
                <p className="text-xs text-orange-600">
                  {trabajador.porcentaje_variable_estimulo}% de ${(montoTotalEstimulos * 0.70).toFixed(2)}
                </p>
              </div>
              <span className="font-bold text-orange-700">${estimuloVariable.toFixed(2)}</span>
            </div>

            {/* Alimentación */}
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Alimentación</span>
              </div>
              <span className="font-bold text-green-700">${trabajador.alimentacion?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de Asistencia */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Asistencia y Días Laborables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-blue-600 mb-1">Días Trabajables</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-700">{trabajador.dias_trabajables || 0}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <p className="text-sm text-red-600 mb-1">Días No Trabajados</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-700">{trabajador.dias_no_trabajados?.length || 0}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <p className="text-sm text-green-600 mb-1">Días Efectivos</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-700">{diasTrabajados}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <p className="text-sm text-purple-600 mb-1">% Asistencia</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-700">
                {trabajador.dias_trabajables > 0
                  ? ((diasTrabajados / trabajador.dias_trabajables) * 100).toFixed(1)
                  : '0'}%
              </p>
            </div>
          </div>

          {/* Listado de días no trabajados */}
          {trabajador.dias_no_trabajados && trabajador.dias_no_trabajados.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Días No Trabajados
              </h4>
              <div className="flex flex-wrap gap-2">
                {trabajador.dias_no_trabajados.map((dia) => (
                  <Badge key={dia} variant="destructive" className="text-xs">
                    {dia}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información Complementaria (datos de la tabla con menos prioridad visual) */}
      <Card className="shadow-md border-gray-200">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-base text-gray-700">Información Complementaria</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between p-2 bg-white rounded border border-gray-200">
              <span className="text-gray-600">CI:</span>
              <span className="font-medium text-gray-900">{trabajador.CI}</span>
            </div>
            <div className="flex justify-between p-2 bg-white rounded border border-gray-200">
              <span className="text-gray-600">Cargo:</span>
              <span className="font-medium text-gray-900">{trabajador.cargo}</span>
            </div>
            <div className="flex justify-between p-2 bg-white rounded border border-gray-200">
              <span className="text-gray-600">% Est. Fijo:</span>
              <span className="font-medium text-gray-900">{trabajador.porcentaje_fijo_estimulo}%</span>
            </div>
            <div className="flex justify-between p-2 bg-white rounded border border-gray-200">
              <span className="text-gray-600">% Est. Variable:</span>
              <span className="font-medium text-gray-900">{trabajador.porcentaje_variable_estimulo}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
