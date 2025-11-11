/**
 * Trabajo Details Modal Component
 *
 * Modal que muestra todos los detalles completos de un trabajo pendiente
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/shared/molecule/dialog'
import { Badge } from '@/components/shared/atom/badge'
import type { TrabajoPendiente } from '@/lib/types/feats/trabajos-pendientes/trabajo-pendiente-types'

interface TrabajoDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trabajo: TrabajoPendiente | null
}

export function TrabajoDetailsModal({
  open,
  onOpenChange,
  trabajo
}: TrabajoDetailsModalProps) {
  if (!trabajo) return null

  // Format date to DD/MM/YYYY
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-indigo-600">
            Detalles del Trabajo Pendiente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Cliente */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Información del Cliente
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">CI</p>
                <p className="font-medium text-gray-900">{trabajo.CI}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="font-medium text-gray-900">
                  {trabajo.Nombre || (
                    <span className="text-gray-400 italic">Sin cliente asociado</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Estado y Actividad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-600 mb-2">Estado</p>
              <Badge
                variant="outline"
                className="bg-blue-100 text-blue-700 border-blue-300 text-base px-3 py-1"
              >
                {trabajo.estado}
              </Badge>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Estado Activo</p>
              <Badge
                variant="outline"
                className={`text-base px-3 py-1 ${
                  trabajo.is_active
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-red-100 text-red-700 border-red-300'
                }`}
              >
                {trabajo.is_active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>

          {/* Fechas y Visitas */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Fechas y Seguimiento</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Fecha de Inicio</p>
                <p className="font-medium text-gray-900 text-sm">
                  {formatDate(trabajo.fecha_inicio)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Veces Visitado</p>
                <p className="font-bold text-orange-600 text-lg">
                  {trabajo.veces_visitado}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Creado el</p>
                <p className="font-medium text-gray-900 text-sm">
                  {formatDate(trabajo.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Información de Parada */}
          {(trabajo.stopped_by || trabajo.responsable_parada) && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Información de Parada
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Detenido Por</p>
                  <p className="font-medium text-gray-900">
                    {trabajo.stopped_by || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Responsable</p>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                    {formatResponsable(trabajo.responsable_parada)}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Comentarios */}
          {trabajo.comentario && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Comentarios
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">{trabajo.comentario}</p>
            </div>
          )}

          {/* Última Actualización */}
          {trabajo.updated_at && (
            <div className="text-center text-sm text-gray-500">
              Última actualización: {formatDate(trabajo.updated_at)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
