/**
 * Clientes Pendientes de Instalación Card Component
 *
 * Displays a compact list of clients waiting for installation
 * Allows quick creation of trabajo pendiente from client CI
 */

import { UserPlus } from 'lucide-react'
import { Button } from '@/components/shared/atom/button'
import { Badge } from '@/components/shared/atom/badge'
import type { Cliente } from '@/lib/types/feats/customer/cliente-types'

interface ClientesPendientesCardProps {
  clientes: Cliente[]
  onAddToTP: (ci: string) => void
  loading?: boolean
}

export function ClientesPendientesCard({
  clientes,
  onAddToTP,
  loading = false
}: ClientesPendientesCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-orange-600" />
          Clientes Pendientes de Instalación
        </h3>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-orange-600" />
          Clientes Pendientes de Instalación
        </h3>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          {clientes.length}
        </Badge>
      </div>

      {clientes.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">
            No hay clientes pendientes de instalación
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {clientes.map((cliente) => (
            <div
              key={cliente.numero}
              className="flex items-center justify-between p-3 bg-orange-50 rounded-md border border-orange-100 hover:bg-orange-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {cliente.nombre}
                </p>
                <p className="text-sm text-gray-600">
                  CI: {cliente.carnet_identidad || 'N/A'}
                </p>
                {cliente.telefono && (
                  <p className="text-xs text-gray-500">
                    Tel: {cliente.telefono}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => onAddToTP(cliente.carnet_identidad || cliente.numero)}
                className="bg-orange-600 hover:bg-orange-700 text-white ml-2 shrink-0"
                title="Agregar a Trabajos Pendientes"
              >
                Agregar a TP
              </Button>
            </div>
          ))}
        </div>
      )}

      {clientes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <p className="text-xs text-gray-500 text-center">
            Haz clic en &quot;Agregar a TP&quot; para crear un trabajo pendiente
          </p>
        </div>
      )}
    </div>
  )
}
