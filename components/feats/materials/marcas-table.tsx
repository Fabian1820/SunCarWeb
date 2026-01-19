"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Edit, Trash2 } from "lucide-react"
import type { Marca } from "@/lib/types/feats/marcas/marca-types"

interface MarcasTableProps {
  marcas: Marca[]
  onEdit: (marca: Marca) => void
  onDelete: (marca: Marca) => void
}

export function MarcasTable({ marcas, onEdit, onDelete }: MarcasTableProps) {
  if (marcas.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">No hay marcas registradas</p>
        <p className="text-sm mt-2">Agrega tu primera marca para comenzar</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Nombre</TableHead>
            <TableHead className="font-semibold">Tipos de Material</TableHead>
            <TableHead className="font-semibold text-center">Estado</TableHead>
            <TableHead className="font-semibold text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {marcas.map((marca) => (
            <TableRow key={marca.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">{marca.nombre}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {marca.tipos_material.map((tipo) => (
                    <Badge
                      key={tipo}
                      variant="outline"
                      className="text-xs"
                    >
                      {tipo}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={marca.is_active ? "default" : "secondary"}
                  className={marca.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                >
                  {marca.is_active ? "Activa" : "Inactiva"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onEdit(marca)}
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Editar marca"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(marca)}
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Eliminar marca"
                  >
                    <Trash2 className="h-4 w-4" />
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
