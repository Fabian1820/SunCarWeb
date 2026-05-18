"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shared/molecule/table"
import { Button } from "@/components/shared/atom/button"
import { Pencil, Trash2, Package } from "lucide-react"
import { LazyImage } from "@/components/shared/atom/lazy-image"
import type { MedioBasico } from "@/lib/types/feats/asignaciones/asignacion-types"

interface MediosBasicosTableProps {
  items: MedioBasico[]
  onEdit: (item: MedioBasico) => void
  onDelete: (id: string) => void
  loading?: boolean
}

export function MediosBasicosTable({ items, onEdit, onDelete, loading }: MediosBasicosTableProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500 text-sm">No hay medios básicos registrados</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[64px]">Foto</TableHead>
            <TableHead className="w-[140px]">Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="w-[120px]">Precio</TableHead>
            <TableHead className="text-right w-[120px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id}>
              <TableCell>
                {item.foto ? (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                    <LazyImage
                      src={item.foto}
                      alt={item.nombre}
                      className="relative w-full h-full"
                      imgClassName="w-full h-full object-contain p-1"
                      fallback={
                        <div className="absolute inset-0 bg-orange-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-orange-700" />
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                    <Package className="h-5 w-5 text-orange-300" />
                  </div>
                )}
              </TableCell>
              <TableCell>
                {item.codigo
                  ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-orange-100 text-orange-700">{item.codigo}</span>
                  : <span className="text-gray-300 text-xs">—</span>}
              </TableCell>
              <TableCell className="font-medium">{item.nombre}</TableCell>
              <TableCell>
                {item.precio != null
                  ? <span className="text-green-700 font-semibold">${item.precio.toFixed(2)}</span>
                  : <span className="text-gray-400 text-xs">Sin precio</span>}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => onEdit(item)} disabled={loading}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(item.id)} disabled={loading}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
