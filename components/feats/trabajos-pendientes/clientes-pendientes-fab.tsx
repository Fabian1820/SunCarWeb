/**
 * Clientes Pendientes FAB (Floating Action Button)
 *
 * Botón flotante que se expande al hover/click mostrando clientes pendientes
 */

import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { Button } from '@/components/shared/atom/button'
import { Badge } from '@/components/shared/atom/badge'
import type { Cliente } from '@/lib/types/feats/customer/cliente-types'

interface ClientesPendientesFABProps {
  clientes: Cliente[]
  onAddToTP: (ci: string) => void
  loading?: boolean
}

export function ClientesPendientesFAB({
  clientes,
  onAddToTP,
  loading = false
}: ClientesPendientesFABProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (loading) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          className="h-14 w-14 rounded-full bg-orange-600 hover:bg-orange-700 shadow-lg"
          disabled
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop cuando está expandido */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Panel expandido */}
      <div
        className={`fixed bottom-24 right-6 z-50 bg-white rounded-lg shadow-2xl border border-orange-200 transition-all duration-300 ${
          isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ width: '380px', maxHeight: '500px' }}
      >
        <div className="p-4 border-b border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">
              Clientes Pendientes de Instalación
            </h3>
          </div>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            {clientes.length}
          </Badge>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
          {clientes.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-gray-500">
                No hay clientes pendientes de instalación
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {clientes.map((cliente, index) => (
                <div
                  key={`${cliente.numero}-${index}`}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-md border border-orange-100 hover:bg-orange-100 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {cliente.nombre}
                    </p>
                    <p className="text-xs text-gray-600">
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
                    onClick={() => {
                      onAddToTP(cliente.carnet_identidad || cliente.numero)
                      setIsExpanded(false)
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 text-xs h-8"
                  >
                    Agregar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {clientes.length > 0 && (
          <div className="p-3 border-t border-orange-100 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              Haz clic en &quot;Agregar&quot; para crear un trabajo pendiente
            </p>
          </div>
        )}
      </div>

      {/* FAB Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          className={`h-14 w-14 rounded-full shadow-lg transition-all duration-300 ${
            isExpanded
              ? 'bg-red-600 hover:bg-red-700 rotate-0'
              : 'bg-orange-600 hover:bg-orange-700'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
          onMouseEnter={() => !isExpanded && setIsExpanded(true)}
          title="Clientes pendientes de instalación"
        >
          {isExpanded ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <>
              <UserPlus className="h-6 w-6 text-white" />
              {clientes.length > 0 && (
                <Badge
                  className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center bg-red-500 text-white border-2 border-white rounded-full p-0 text-xs font-bold"
                >
                  {clientes.length}
                </Badge>
              )}
            </>
          )}
        </Button>
      </div>
    </>
  )
}
