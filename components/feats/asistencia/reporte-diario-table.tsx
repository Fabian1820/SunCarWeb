"use client"

import { CheckCircle2, XCircle, LogIn, LogOut } from "lucide-react"
import { Badge } from "@/components/shared/atom/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shared/molecule/table"
import type { TrabajadorReporte } from "@/lib/types/asistencia-types"

interface ReporteDiarioTableProps {
  trabajadores: TrabajadorReporte[]
  loading: boolean
}

function EstadoBadge({ trabajador }: { trabajador: TrabajadorReporte }) {
  if (!trabajador.esta_presente) {
    return (
      <Badge variant="outline" className="text-gray-400 border-gray-200 gap-1">
        <XCircle className="h-3 w-3" />
        Ausente
      </Badge>
    )
  }
  if (trabajador.estado_actual === "dentro") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        En oficina
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-blue-600 border-blue-200 gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Estuvo
    </Badge>
  )
}

export function ReporteDiarioTable({ trabajadores, loading }: ReporteDiarioTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <span className="text-sm">Cargando reporte...</span>
      </div>
    )
  }

  if (trabajadores.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <span className="text-sm">No hay datos para esta fecha</span>
      </div>
    )
  }

  // Ordenar: presentes primero, luego ausentes
  const ordenados = [...trabajadores].sort((a, b) => {
    if (a.esta_presente && !b.esta_presente) return -1
    if (!a.esta_presente && b.esta_presente) return 1
    if (a.estado_actual === "dentro" && b.estado_actual !== "dentro") return -1
    if (a.estado_actual !== "dentro" && b.estado_actual === "dentro") return 1
    return a.nombre.localeCompare(b.nombre)
  })

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>Nombre</TableHead>
            <TableHead>CI</TableHead>
            <TableHead>
              <span className="flex items-center gap-1"><LogIn className="h-3.5 w-3.5" /> Entrada</span>
            </TableHead>
            <TableHead>
              <span className="flex items-center gap-1"><LogOut className="h-3.5 w-3.5" /> Salida</span>
            </TableHead>
            <TableHead>Horas</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordenados.map((t) => (
            <TableRow
              key={t.trabajador_ci}
              className={!t.esta_presente ? "opacity-50" : undefined}
            >
              <TableCell className="font-medium">{t.nombre}</TableCell>
              <TableCell className="text-gray-500 text-xs font-mono">{t.trabajador_ci}</TableCell>
              <TableCell className="text-sm">
                {t.hora_entrada ? (
                  <span className="font-mono">{t.hora_entrada.slice(0, 5)}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {t.hora_salida ? (
                  <span className="font-mono">{t.hora_salida.slice(0, 5)}</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {t.horas_trabajadas != null ? (
                  <span className="font-mono">{t.horas_trabajadas.toFixed(1)}h</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </TableCell>
              <TableCell>
                <EstadoBadge trabajador={t} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
