"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit, Trash2, Users, Crown, Phone, Mail, UserMinus, Eye, Power } from "lucide-react"
import type { Brigade } from "@/lib/brigade-types"

interface BrigadesTableProps {
  brigades: Brigade[]
  onEdit: (brigade: Brigade) => void
  onDelete: (id: string) => void
  onToggleStatus: (id: string) => void
  onRemoveWorker: (brigadeId: string, workerId: string) => void
}

export function BrigadesTable({ brigades, onEdit, onDelete, onToggleStatus, onRemoveWorker }: BrigadesTableProps) {
  const [selectedBrigade, setSelectedBrigade] = useState<Brigade | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const openDetailDialog = (brigade: Brigade) => {
    setSelectedBrigade(brigade)
    setIsDetailDialogOpen(true)
  }

  if (brigades.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron brigadas</h3>
        <p className="text-gray-600">No hay brigadas que coincidan con los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Brigada</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Jefe</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Miembros</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha Creación</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {brigades.map((brigade) => (
              <tr key={brigade.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{brigade.name}</p>
                      <p className="text-sm text-gray-600">ID: {brigade.id}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <Crown className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="font-medium text-gray-900">{brigade.leader.name}</p>
                      {brigade.leader.phone && (
                        <p className="text-sm text-gray-600 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {brigade.leader.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-gray-50">
                      {brigade.members.length} trabajadores
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDetailDialog(brigade)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Badge className={brigade.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {brigade.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <span className="text-gray-700">{new Date(brigade.createdAt).toLocaleDateString("es-CO")}</span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleStatus(brigade.id)}
                      className={
                        brigade.isActive
                          ? "border-red-300 text-red-700 hover:bg-red-50"
                          : "border-green-300 text-green-700 hover:bg-green-50"
                      }
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(brigade)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(brigade.id)}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de {selectedBrigade?.name}</DialogTitle>
          </DialogHeader>
          {selectedBrigade && (
            <div className="space-y-6">
              {/* Jefe de Brigada */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Crown className="h-5 w-5 text-orange-500" />
                    <span>Jefe de Brigada</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">{selectedBrigade.leader.name}</p>
                    {selectedBrigade.leader.phone && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        {selectedBrigade.leader.phone}
                      </p>
                    )}
                    {selectedBrigade.leader.email && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        {selectedBrigade.leader.email}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Trabajadores */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span>Trabajadores ({selectedBrigade.members.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedBrigade.members.length > 0 ? (
                    <div className="space-y-3">
                      {selectedBrigade.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              {member.phone && (
                                <span className="flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {member.phone}
                                </span>
                              )}
                              {member.email && (
                                <span className="flex items-center">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {member.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRemoveWorker(selectedBrigade.id, member.id)}
                            className="border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No hay trabajadores asignados a esta brigada</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
