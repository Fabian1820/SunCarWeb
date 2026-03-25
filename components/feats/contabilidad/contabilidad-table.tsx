"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import type { MaterialContabilidad } from "@/lib/types/feats/contabilidad/contabilidad-types"

interface ContabilidadTableProps {
  materiales: MaterialContabilidad[]
  loading?: boolean
}

export function ContabilidadTable({ materiales, loading }: ContabilidadTableProps) {
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
