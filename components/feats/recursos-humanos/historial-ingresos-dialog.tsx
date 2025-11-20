"use client"

import { useEffect, useState } from "react"
import { DollarSign, Calendar, TrendingUp, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/shared/molecule/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { IngresoMensualService } from "@/lib/api-services"
import type { IngresoMensual } from "@/lib/recursos-humanos-types"

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function HistorialIngresosDialog() {
  const [ingresos, setIngresos] = useState<IngresoMensual[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadIngresos()
  }, [])

  const loadIngresos = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await IngresoMensualService.getAllIngresos()
      setIngresos(data)
    } catch (err: any) {
      console.error('Error al cargar ingresos:', err)
      setError(err.message || 'Error al cargar el historial de ingresos')
    } finally {
      setLoading(false)
    }
  }

  // Ordenar por fecha (más reciente primero)
  const ingresosOrdenados = [...ingresos].sort((a, b) => {
    if (a.anio !== b.anio) return b.anio - a.anio
    return b.mes - a.mes
  })

  // Calcular estadísticas
  const totalIngresos = ingresos.reduce((sum, ing) => sum + ing.monto, 0)
  const promedioIngresos = ingresos.length > 0 ? totalIngresos / ingresos.length : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando historial de ingresos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-2">❌ Error</div>
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (ingresos.length === 0) {
    return (
      <div className="p-6 text-center">
        <DollarSign className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay ingresos registrados
        </h3>
        <p className="text-gray-600">
          Aún no se ha configurado ningún ingreso mensual.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-purple-600">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total de Períodos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ingresos.length}
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
                <p className="text-sm text-gray-600">Total Acumulado</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalIngresos.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Promedio Mensual</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${promedioIngresos.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de historial */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Período
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Monto
                </div>
              </TableHead>
              <TableHead>Moneda</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingresosOrdenados.map((ingreso) => (
              <TableRow key={ingreso.id} className="hover:bg-purple-50/50">
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {MESES[ingreso.mes - 1]} {ingreso.anio}
                    </span>
                    <span className="text-xs text-gray-500">
                      {String(ingreso.mes).padStart(2, '0')}/{ingreso.anio}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-green-700 text-lg">
                    ${ingreso.monto.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {ingreso.moneda}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Nota informativa */}
      <div className="text-sm text-gray-600 text-center bg-blue-50 p-3 rounded-lg border border-blue-200">
        💡 <strong>Nota:</strong> Este historial muestra todos los ingresos mensuales configurados.
        Los montos se utilizan para calcular los estímulos de los trabajadores.
      </div>
    </div>
  )
}
