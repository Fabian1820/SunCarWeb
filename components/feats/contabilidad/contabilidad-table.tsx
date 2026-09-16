"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { Button } from "@/components/shared/atom/button"
import { Pencil, SlidersHorizontal, Trash2 } from "lucide-react"
import type { MaterialContabilidad } from "@/lib/types/feats/contabilidad/contabilidad-types"

interface ContabilidadTableProps {
  materiales: MaterialContabilidad[]
  loading?: boolean
  /** Si no se pasan, la tabla se muestra sin columna de acciones. */
  onEditar?: (material: MaterialContabilidad) => void
  onAjustar?: (material: MaterialContabilidad) => void
  onEliminar?: (material: MaterialContabilidad) => void
}

export function ContabilidadTable({
  materiales,
  loading,
  onEditar,
  onAjustar,
  onEliminar,
}: ContabilidadTableProps) {
  const conAcciones = Boolean(onEditar || onAjustar || onEliminar)
  if (materiales.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No hay materiales con código de contabilidad</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código Contabilidad</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-center">U/M</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Precio (CUP)</TableHead>
            {conAcciones && <TableHead className="text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {materiales.map((material) => (
            <TableRow key={material.id}>
              <TableCell className="font-medium">{material.codigoContabilidad}</TableCell>
              <TableCell>{material.nombre || "—"}</TableCell>
              <TableCell>{material.descripcion}</TableCell>
              <TableCell className="text-center">{material.um}</TableCell>
              <TableCell className="text-right">
                {material.cantidadContabilidad.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                {material.precioContabilidad.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                {/* Traza del último cambio de precio. El historial completo está
                    en la auditoría; aquí basta con ver de cuánto venía. */}
                {material.precioAnterior !== undefined && (
                  <div
                    className="text-[10px] text-amber-700"
                    title={
                      material.precioActualizadoEn
                        ? `Cambiado el ${new Date(material.precioActualizadoEn).toLocaleDateString("es-ES")}`
                        : undefined
                    }
                  >
                    antes{" "}
                    {material.precioAnterior.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                )}
              </TableCell>
              {conAcciones && (
                <TableCell className="text-right whitespace-nowrap">
                  <div className="flex justify-end gap-1">
                    {onEditar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditar(material)}
                        title="Editar datos y precio"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onAjustar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAjustar(material)}
                        title="Ajustar cantidad a la baja"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    )}
                    {onEliminar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEliminar(material)}
                        title="Dar de baja de Existencias Contabilidad"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
