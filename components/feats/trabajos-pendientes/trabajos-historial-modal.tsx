/**
 * Trabajos Historial Modal Component
 *
 * Modal con tabla completa de todos los trabajos (incluyendo finalizados)
 * Incluye filtros y paginación
 */

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/shared/molecule/dialog'
import { Button } from '@/components/shared/atom/button'
import { Input } from '@/components/shared/molecule/input'
import { Label } from '@/components/shared/atom/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/shared/atom/select'
import { Badge } from '@/components/shared/atom/badge'
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import type { TrabajoPendiente } from '@/lib/types/feats/trabajos-pendientes/trabajo-pendiente-types'

interface TrabajosHistorialModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trabajos: TrabajoPendiente[]
  onViewDetails: (trabajo: TrabajoPendiente) => void
}

const ITEMS_PER_PAGE = 10

export function TrabajosHistorialModal({
  open,
  onOpenChange,
  trabajos,
  onViewDetails
}: TrabajosHistorialModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<string>('all')
  const [activoFilter, setActivoFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Format date to DD/MM/YYYY
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  // Filtered trabajos
  const filteredTrabajos = useMemo(() => {
    return trabajos.filter((trabajo) => {
      const matchesSearch =
        !searchTerm.trim() ||
        trabajo.CI.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trabajo.Nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trabajo.estado.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesEstado =
        estadoFilter === 'all' || trabajo.estado.toLowerCase() === estadoFilter.toLowerCase()

      const matchesActivo =
        activoFilter === 'all' ||
        (activoFilter === 'active' && trabajo.is_active) ||
        (activoFilter === 'inactive' && !trabajo.is_active)

      return matchesSearch && matchesEstado && matchesActivo
    })
  }, [trabajos, searchTerm, estadoFilter, activoFilter])

  // Pagination
  const totalPages = Math.ceil(filteredTrabajos.length / ITEMS_PER_PAGE)
  const paginatedTrabajos = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredTrabajos.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredTrabajos, currentPage])

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-indigo-600">
            Historial de Trabajos Pendientes
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="space-y-4 border-b border-gray-200 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <Label htmlFor="search-historial">Buscar</Label>
              <Input
                id="search-historial"
                placeholder="CI, nombre, estado..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  handleFilterChange()
                }}
              />
            </div>

            {/* Estado Filter */}
            <div>
              <Label htmlFor="estado-filter">Filtrar por Estado</Label>
              <Select
                value={estadoFilter}
                onValueChange={(value) => {
                  setEstadoFilter(value)
                  handleFilterChange()
                }}
              >
                <SelectTrigger id="estado-filter">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Activo Filter */}
            <div>
              <Label htmlFor="activo-filter">Filtrar por Activo</Label>
              <Select
                value={activoFilter}
                onValueChange={(value) => {
                  setActivoFilter(value)
                  handleFilterChange()
                }}
              >
                <SelectTrigger id="activo-filter">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-600">
            Mostrando {paginatedTrabajos.length} de {filteredTrabajos.length} trabajos
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">CI</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Nombre</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Estado</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Fecha Inicio</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Visitas</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Activo</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Acción</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrabajos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No se encontraron trabajos con los filtros aplicados
                  </td>
                </tr>
              ) : (
                paginatedTrabajos.map((trabajo) => (
                  <tr
                    key={trabajo.id}
                    className="border-b border-gray-100 hover:bg-indigo-50/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm">
                      <span className="font-medium text-gray-900">{trabajo.CI}</span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {trabajo.Nombre ? (
                        <span className="text-gray-700">{trabajo.Nombre}</span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Sin cliente</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          trabajo.estado.toLowerCase() === 'pendiente'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : trabajo.estado.toLowerCase() === 'finalizado'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : trabajo.estado.toLowerCase() === 'cancelado'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {trabajo.estado}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-gray-600">
                      {formatDate(trabajo.fecha_inicio)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-orange-600 text-sm">
                        {trabajo.veces_visitado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          trabajo.is_active
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {trabajo.is_active ? 'Sí' : 'No'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onViewDetails(trabajo)
                          onOpenChange(false)
                        }}
                        className="hover:bg-indigo-50"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4 text-indigo-600" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
