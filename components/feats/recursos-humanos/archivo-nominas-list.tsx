"use client"

import { useState } from "react"
import { FileText, Eye, Calendar, DollarSign, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent } from "@/components/shared/molecule/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { useArchivoRH } from "@/hooks/use-archivo-rh"
import { toast } from "sonner"
import type { ArchivoNominaSimplificado, ArchivoNominaRH } from "@/lib/types/feats/recursos-humanos/archivo-rh-types"

interface ArchivoNominasListProps {
  nominas: ArchivoNominaSimplificado[]
  onVerDetalle: (nomina: ArchivoNominaRH) => void
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function ArchivoNominasList({ nominas, onVerDetalle }: ArchivoNominasListProps) {
  const [anioFiltro, setAnioFiltro] = useState<number | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState<string | null>(null)
  const { loadNominaPorPeriodo } = useArchivoRH()

  const handleVerDetalle = async (nomina: ArchivoNominaSimplificado) => {
    const key = `${nomina.mes}-${nomina.anio}`
    setCargandoDetalle(key)
    try {
      const result = await loadNominaPorPeriodo(nomina.mes, nomina.anio)
      if (result.success && result.data) {
        onVerDetalle(result.data)
      } else {
        toast.error(result.error || `No se encontró nómina para el período ${nomina.periodo}`)
      }
    } catch (error: any) {
      toast.error(`Error al cargar detalles: ${error.message || 'Error desconocido'}`)
    } finally {
      setCargandoDetalle(null)
    }
  }

  // Obtener años únicos de las nóminas
  const aniosDisponibles = Array.from(new Set(nominas.map(n => n.anio))).sort((a, b) => b - a)

  // Filtrar nóminas por año si hay filtro activo
  const nominasFiltradas = anioFiltro
    ? nominas.filter(n => n.anio === anioFiltro)
    : nominas

  // Ordenar por fecha (más reciente primero)
  const nominasOrdenadas = [...nominasFiltradas].sort((a, b) => {
    if (a.anio !== b.anio) return b.anio - a.anio
    return b.mes - a.mes
  })

  if (nominas.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay nóminas archivadas
          </h3>
          <p className="text-gray-600">
            Aún no se ha guardado ninguna nómina mensual. Use el botón "Guardar Nómina Actual" para crear el primer archivo.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtro por año */}
      {aniosDisponibles.length > 1 && (
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-sm font-medium text-gray-700">Filtrar por año:</span>
          <Button
            variant={anioFiltro === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAnioFiltro(null)}
            className={anioFiltro === null ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            Todos
          </Button>
          {aniosDisponibles.map(anio => (
            <Button
              key={anio}
              variant={anioFiltro === anio ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAnioFiltro(anio)}
              className={anioFiltro === anio ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              {anio}
            </Button>
          ))}
        </div>
      )}

      {/* Tabla de nóminas */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px] text-black">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Período
                </div>
              </TableHead>
              <TableHead className="text-black">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Ingreso Mensual
                </div>
              </TableHead>
              <TableHead className="text-black">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Trabajadores
                </div>
              </TableHead>
              <TableHead className="text-black">Total Salario Fijo</TableHead>
              <TableHead className="text-black">Total Alimentación</TableHead>
              <TableHead className="text-black">Total Calculado</TableHead>
              <TableHead className="text-right text-black">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nominasOrdenadas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No hay nóminas para el año seleccionado
                </TableCell>
              </TableRow>
            ) : (
              nominasOrdenadas.map((nomina) => (
                <TableRow key={`${nomina.mes}-${nomina.anio}`} className="hover:bg-purple-50/50">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {MESES[nomina.mes - 1]} {nomina.anio}
                      </span>
                      <span className="text-xs text-gray-500">
                        {String(nomina.mes).padStart(2, '0')}/{nomina.anio}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-green-700">
                      ${nomina.ingreso_mensual_monto.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {nomina.cantidad_trabajadores}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-black">
                      ${nomina.total_salario_fijo.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-black">
                      ${nomina.total_alimentacion.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-purple-700">
                      ${nomina.total_salario_calculado.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerDetalle(nomina)}
                      disabled={cargandoDetalle === `${nomina.mes}-${nomina.anio}`}
                      className="hover:bg-purple-50 hover:border-purple-300"
                    >
                      {cargandoDetalle === `${nomina.mes}-${nomina.anio}` ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalle
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Resumen */}
      <div className="text-sm text-gray-600 text-center">
        Mostrando {nominasOrdenadas.length} de {nominas.length} nóminas archivadas
      </div>
    </div>
  )
}
