/**
 * Trabajos Pendientes Table Component
 *
 * Displays a table of pending work assignments with actions
 * Shows enriched data including client names
 */

import { Edit, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/shared/atom/button'
import { Badge } from '@/components/shared/atom/badge'
import type { TrabajoPendiente } from '@/lib/types/feats/trabajos-pendientes/trabajo-pendiente-types'

interface TrabajosTableProps {
  trabajos: TrabajoPendiente[]
  onEdit: (trabajo: TrabajoPendiente) => void
  onDelete: (trabajo: TrabajoPendiente) => void
  onIncrementVisits: (trabajo: TrabajoPendiente) => void
  loading?: boolean
}

export function TrabajosTable({
  trabajos,
  onEdit,
  onDelete,
  onIncrementVisits,
  loading = false
}: TrabajosTableProps) {
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

  // Format responsable_parada for display
  const formatResponsable = (responsable?: string | null) => {
    if (!responsable) return 'N/A'
    const map: Record<string, string> = {
      nosotros: 'Nosotros',
      'el cliente': 'El Cliente',
      otro: 'Otro'
    }
    return map[responsable] || responsable
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando trabajos pendientes...</p>
      </div>
    )
  }

  if (trabajos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No se encontraron trabajos pendientes
        </h3>
        <p className="text-gray-500">
          Comienza creando un nuevo trabajo pendiente
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">CI</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Nombre</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha de Inicio</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700">Visitas</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Detenido Por</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Responsable</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700">Activo</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {trabajos.map((trabajo) => (
            <tr
              key={trabajo.id}
              className="border-b border-gray-100 hover:bg-orange-50/50 transition-colors"
            >
              <td className="py-4 px-4">
                <span className="font-medium text-gray-900">{trabajo.CI}</span>
              </td>
              <td className="py-4 px-4">
                {trabajo.Nombre ? (
                  <span className="text-gray-700">{trabajo.Nombre}</span>
                ) : (
                  <span className="text-gray-400 italic">Sin cliente asociado</span>
                )}
              </td>
              <td className="py-4 px-4">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  {trabajo.estado}
                </Badge>
              </td>
              <td className="py-4 px-4 text-gray-600">
                {formatDate(trabajo.fecha_inicio)}
              </td>
              <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-semibold text-orange-600">
                    {trabajo.veces_visitado}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onIncrementVisits(trabajo)}
                    className="h-7 w-7 p-0 hover:bg-orange-100"
                    title="Incrementar visitas"
                  >
                    <Plus className="h-4 w-4 text-orange-600" />
                  </Button>
                </div>
              </td>
              <td className="py-4 px-4 text-gray-600">
                {trabajo.stopped_by || 'N/A'}
              </td>
              <td className="py-4 px-4">
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  {formatResponsable(trabajo.responsable_parada)}
                </Badge>
              </td>
              <td className="py-4 px-4 text-center">
                <Badge
                  variant="outline"
                  className={
                    trabajo.is_active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }
                >
                  {trabajo.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(trabajo)}
                    className="hover:bg-blue-50"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(trabajo)}
                    className="hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
