"use client"

import { Calendar, DollarSign, Users, FileText, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { Button } from "@/components/shared/atom/button"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import type { ArchivoNominaRH } from "@/lib/types/feats/recursos-humanos/archivo-rh-types"
import type { ExportOptions } from "@/lib/export-service"

interface ArchivoNominaDetailProps {
  nomina: ArchivoNominaRH
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function ArchivoNominaDetail({ nomina }: ArchivoNominaDetailProps) {
  const mesNombre = MESES[nomina.mes - 1]
  const fechaCreacion = new Date(nomina.fecha_creacion).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Preparar opciones de exportación
  const getExportOptions = (): Omit<ExportOptions, 'filename'> => {
    return {
      title: `Nómina Archivada - ${mesNombre} ${nomina.anio}`,
      subtitle: `Guardada el ${fechaCreacion} | Total: $${nomina.total_salario_calculado.toFixed(2)}`,
      columns: [
        { header: 'CI', key: 'CI', width: 15 },
        { header: 'Nombre', key: 'nombre', width: 25 },
        { header: 'Cargo', key: 'cargo', width: 20 },
        { header: 'Salario Fijo', key: 'salario_fijo', width: 15 },
        { header: '% Estímulo Fijo', key: 'porcentaje_fijo_estimulo', width: 15 },
        { header: '% Estímulo Variable', key: 'porcentaje_variable_estimulo', width: 18 },
        { header: 'Alimentación', key: 'alimentacion', width: 15 },
        { header: 'Días Trabajables', key: 'dias_trabajables', width: 15 },
        { header: 'Días No Trabajados', key: 'dias_no_trabajados', width: 18 },
        { header: 'Salario Calculado', key: 'salario_calculado', width: 18 },
      ],
      data: nomina.trabajadores
    }
  }

  return (
    <div className="space-y-6">
      {/* Información del período */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-purple-600">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Período</p>
                <p className="text-lg font-bold text-gray-900">
                  {mesNombre} {nomina.anio}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Ingreso Mensual</p>
                <p className="text-lg font-bold text-gray-900">
                  ${nomina.ingreso_mensual_monto.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Trabajadores</p>
                <p className="text-lg font-bold text-gray-900">
                  {nomina.trabajadores.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-600">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Total Calculado</p>
                <p className="text-lg font-bold text-gray-900">
                  ${nomina.total_salario_calculado.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de totales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de Totales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total Salario Fijo</p>
              <p className="text-xl font-bold text-gray-900">
                ${nomina.total_salario_fijo.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total Alimentación</p>
              <p className="text-xl font-bold text-gray-900">
                ${nomina.total_alimentacion.toFixed(2)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Fecha de Guardado</p>
              <p className="text-lg font-semibold text-gray-900">
                {fechaCreacion}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de trabajadores */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Detalle de Trabajadores</CardTitle>
            <ExportButtons
              exportOptions={getExportOptions()}
              baseFilename={`nomina_archivada_${String(nomina.mes).padStart(2, '0')}_${nomina.anio}`}
              variant="compact"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CI</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-right">Salario Fijo</TableHead>
                  <TableHead className="text-right">% Est. Fijo</TableHead>
                  <TableHead className="text-right">% Est. Var.</TableHead>
                  <TableHead className="text-right">Alimentación</TableHead>
                  <TableHead className="text-right">D. Trab.</TableHead>
                  <TableHead className="text-right">D. No Trab.</TableHead>
                  <TableHead className="text-right">Salario Calc.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nomina.trabajadores.map((trabajador) => (
                  <TableRow key={trabajador.CI}>
                    <TableCell className="font-mono text-sm">
                      {trabajador.CI}
                    </TableCell>
                    <TableCell className="font-medium">
                      {trabajador.nombre}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                        {trabajador.cargo}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${trabajador.salario_fijo.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {trabajador.porcentaje_fijo_estimulo.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {trabajador.porcentaje_variable_estimulo.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      ${trabajador.alimentacion.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {trabajador.dias_trabajables}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={trabajador.dias_no_trabajados.length > 0 ? 'text-red-600 font-semibold' : ''}>
                        {trabajador.dias_no_trabajados.length > 0
                          ? `${trabajador.dias_no_trabajados.length} días [${trabajador.dias_no_trabajados.join(', ')}]`
                          : '0'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-purple-700">
                      ${trabajador.salario_calculado.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Nota sobre inmutabilidad */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              Nómina Archivada (Solo Lectura)
            </h4>
            <p className="text-sm text-blue-800">
              Esta nómina fue guardada el {fechaCreacion} y es inmutable.
              Los datos mostrados representan un snapshot histórico del período {mesNombre} {nomina.anio}
              y no se pueden editar ni eliminar.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
