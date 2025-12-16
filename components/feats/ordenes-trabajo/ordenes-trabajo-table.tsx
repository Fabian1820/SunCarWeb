"use client"

import React, { useMemo } from "react"
import { Badge } from "@/components/shared/atom/badge"
import { Button } from "@/components/shared/atom/button"
import { FileText, Edit, Trash2, MessageSquare, Calendar, Users, List } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { OrdenTrabajo } from "@/lib/api-types"

interface OrdenesTrabajoTableProps {
  ordenes: OrdenTrabajo[]
  onEdit?: (orden: OrdenTrabajo) => void
  onDelete?: (orden: OrdenTrabajo) => void
  onViewMessage: (orden: OrdenTrabajo | OrdenTrabajo[]) => void
  loading?: boolean
}

export function OrdenesTrabajoTable({
  ordenes,
  onEdit,
  onDelete,
  onViewMessage,
  loading = false,
}: OrdenesTrabajoTableProps) {
  // Agrupar órdenes que fueron creadas juntas
  const ordenesAgrupadas = useMemo(() => {
    if (typeof window === 'undefined') {
      // En servidor, retornar como grupos individuales
      return ordenes.map((orden) => ({ grupoId: orden.id, ordenes: [orden] }))
    }

    const gruposExistentes = JSON.parse(
      localStorage.getItem('ordenes_grupos') || '{}'
    )

    // Crear mapa de grupoId -> ordenes
    const grupos: Record<string, OrdenTrabajo[]> = {}
    const ordenesSinGrupo: OrdenTrabajo[] = []

    ordenes.forEach((orden) => {
      const grupoId = gruposExistentes[orden.id]
      if (grupoId) {
        if (!grupos[grupoId]) {
          grupos[grupoId] = []
        }
        grupos[grupoId].push(orden)
      } else {
        ordenesSinGrupo.push(orden)
      }
    })

    // Convertir a array de grupos
    const gruposArray = Object.values(grupos)
      .filter((grupo) => grupo.length > 1) // Solo grupos con más de una orden
      .map((grupo) => ({
        grupoId: gruposExistentes[grupo[0].id] || grupo[0].id,
        ordenes: grupo.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
      }))

    // Agregar órdenes individuales
    ordenesSinGrupo.forEach((orden) => {
      gruposArray.push({ grupoId: orden.id, ordenes: [orden] })
    })

    return gruposArray
  }, [ordenes])

  const getTipoReporteBadge = (tipo: string) => {
    const badges: Record<string, { color: string; bgColor: string }> = {
      'inversión': { color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300' },
      'avería': { color: 'text-red-700', bgColor: 'bg-red-100 border-red-300' },
      'mantenimiento': { color: 'text-green-700', bgColor: 'bg-green-100 border-green-300' },
    }

    const badge = badges[tipo] || { color: 'text-gray-700', bgColor: 'bg-gray-100 border-gray-300' }

    return (
      <Badge variant="outline" className={`${badge.bgColor} ${badge.color} font-medium`}>
        {tipo.toUpperCase()}
      </Badge>
    )
  }

  if (ordenes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay órdenes de trabajo</h3>
        <p className="text-gray-600">No se encontraron órdenes de trabajo que coincidan con los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Cliente</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Brigada</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha Ejecución</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ordenesAgrupadas.map((grupo) => {
            const esGrupo = grupo.ordenes.length > 1
            return (
              <React.Fragment key={grupo.grupoId}>
                {esGrupo && (
                  <tr className="bg-orange-50 border-b-2 border-orange-200">
                    <td colSpan={5} className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-orange-800">
                        <List className="h-4 w-4" />
                        <span>Lista de {grupo.ordenes.length} órdenes creadas juntas</span>
                      </div>
                    </td>
                  </tr>
                )}
                {grupo.ordenes.map((orden, idx) => (
                  <tr
                    key={orden.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      esGrupo && idx < grupo.ordenes.length - 1 ? 'border-b-orange-100' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-gray-900">{orden.cliente?.nombre || 'Sin nombre'}</p>
                        <p className="text-xs text-gray-500">N° {orden.cliente?.numero}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{orden.brigada?.lider?.nombre || 'Sin asignar'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getTipoReporteBadge(orden.tipo_reporte)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          {format(new Date(orden.fecha), "PP", { locale: es })}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        {esGrupo ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewMessage(grupo.ordenes)}
                            className="border-orange-300 text-orange-700 hover:bg-orange-50"
                            title="Ver mensaje de todas las órdenes del grupo"
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            <span className="text-xs">Ver grupo</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewMessage(orden)}
                            className="border-orange-300 text-orange-700 hover:bg-orange-50"
                            title="Ver mensaje de la orden"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(orden)}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            title="Editar orden"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(orden)}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            title="Eliminar orden"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
