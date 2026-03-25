"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/atom/input"
import { Search, Edit } from "lucide-react"
import type { Material } from "@/lib/api-types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table"

interface SeleccionarMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materiales: Material[]
  loading: boolean
  onSelectMaterial: (material: Material) => void
}

export function SeleccionarMaterialDialog({
  open,
  onOpenChange,
  materiales,
  loading,
  onSelectMaterial,
}: SeleccionarMaterialDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Filtrar materiales por nombre o código
  const filteredMateriales = useMemo(() => {
    if (!searchTerm.trim()) return materiales

    const term = searchTerm.toLowerCase()
    return materiales.filter(
      (material) =>
        material.nombre?.toLowerCase().includes(term) ||
        material.descripcion?.toLowerCase().includes(term) ||
        material.codigo?.toLowerCase().includes(term) ||
        material.codigo_contabilidad?.toLowerCase().includes(term)
    )
  }, [materiales, searchTerm])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar Material para Editar</DialogTitle>
        </DialogHeader>

        {/* Buscador */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, descripción, código o código contabilidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabla de materiales */}
        <div className="flex-1 overflow-auto border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando materiales...</p>
              </div>
            </div>
          ) : filteredMateriales.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">
                {searchTerm
                  ? "No se encontraron materiales con ese criterio"
                  : "No hay materiales disponibles"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Cód. Contabilidad</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio (CUP)</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMateriales.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-mono text-sm">
                      {material.codigo}
                    </TableCell>
                    <TableCell>
                      {material.nombre || material.descripcion}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {material.categoria}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {material.codigo_contabilidad || "-"}
                    </TableCell>
                    <TableCell>
                      {material.cantidad_contabilidad?.toFixed(2) || "-"}
                    </TableCell>
                    <TableCell>
                      {material.precio_contabilidad
                        ? `$${material.precio_contabilidad.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onSelectMaterial(material)
                          onOpenChange(false)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer con contador */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-600">
            Mostrando {filteredMateriales.length} de {materiales.length}{" "}
            materiales
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
