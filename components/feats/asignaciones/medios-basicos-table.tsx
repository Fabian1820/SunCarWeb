"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shared/molecule/table"
import { Button } from "@/components/shared/atom/button"
import { Pencil, Trash2 } from "lucide-react"
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
            <TableHead>Nombre</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id}>
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
