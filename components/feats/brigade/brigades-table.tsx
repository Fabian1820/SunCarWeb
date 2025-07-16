"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { Edit, Trash2, Users, Crown, Phone, Mail, UserMinus, Eye, Power } from "lucide-react"
import type { Brigade } from "@/lib/brigade-types"
import { BrigadaService, TrabajadorService } from "@/lib/api-services"
import { useToast } from "@/hooks/use-toast"

interface BrigadesTableProps {
  brigades: Brigade[]
  onEdit: (brigade: Brigade) => void
  onDelete: (id: string) => void
  onRemoveWorker: (brigadeId: string, workerId: string) => void
  onRefresh: () => void
}

export function BrigadesTable({ brigades, onEdit, onDelete, onRemoveWorker, onRefresh }: BrigadesTableProps) {
  const [selectedBrigade, setSelectedBrigade] = useState<Brigade | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isDeleteBrigadeDialogOpen, setIsDeleteBrigadeDialogOpen] = useState(false)
  const [isDeleteWorkerDialogOpen, setIsDeleteWorkerDialogOpen] = useState(false)
  const [workerToDelete, setWorkerToDelete] = useState<{ brigadeId: string, workerId: string, workerName: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const openDetailDialog = (brigade: Brigade) => {
    setSelectedBrigade(brigade)
    setIsDetailDialogOpen(true)
  }

  const handleDeleteBrigade = async () => {
    if (!selectedBrigade) return
    
    setIsLoading(true)
    try {
      await BrigadaService.eliminarBrigada(selectedBrigade.id)
      toast({
        title: "Brigada eliminada",
        description: "La brigada ha sido eliminada exitosamente.",
        variant: "default",
      })
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la brigada",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveWorker = async () => {
    if (!workerToDelete) return
    
    setIsLoading(true)
    try {
      // Cambiar a BrigadaService y asegurar orden correcto de parámetros
      await BrigadaService.eliminarTrabajadorDeBrigada(workerToDelete.brigadeId, workerToDelete.workerId)
      toast({
        title: "Trabajador removido",
        description: "El trabajador ha sido removido de la brigada exitosamente.",
        variant: "default",
      })
      onRefresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al remover el trabajador de la brigada",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openDeleteBrigadeDialog = (brigade: Brigade) => {
    setSelectedBrigade(brigade)
    setIsDeleteBrigadeDialogOpen(true)
  }

  const openDeleteWorkerDialog = (brigadeId: string, workerId: string, workerName: string) => {
    setWorkerToDelete({ brigadeId, workerId, workerName })
    setIsDeleteWorkerDialogOpen(true)
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
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Jefe (Nombre y CI)</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Miembros</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {brigades.map((brigade) => (
              <tr key={brigade.id || brigade.leader.ci} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Crown className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{brigade.leader.name}</p>
                      <p className="text-sm text-gray-600">CI: {brigade.leader.ci}</p>
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
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(brigade)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 opacity-50 cursor-not-allowed"
                      disabled
                      title="Editar brigada (Próximamente)"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteBrigadeDialog(brigade)}
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
            <DialogTitle>Detalles de la Brigada</DialogTitle>
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
                    <p className="text-sm text-gray-600">CI: {selectedBrigade.leader.ci}</p>
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
                        <div key={member.id || member.ci} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-600">CI: {member.ci}</p>
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
                            onClick={() => openDeleteWorkerDialog(selectedBrigade.id, member.ci, member.name)}
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

      {/* Confirm Delete Brigade Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteBrigadeDialogOpen}
        onOpenChange={setIsDeleteBrigadeDialogOpen}
        title="Eliminar Brigada"
        message={`¿Estás seguro de que quieres eliminar la brigada liderada por ${selectedBrigade?.leader.name}? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteBrigade}
        isLoading={isLoading}
      />

      {/* Confirm Delete Worker Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteWorkerDialogOpen}
        onOpenChange={setIsDeleteWorkerDialogOpen}
        title="Remover Trabajador"
        message={`¿Estás seguro de que quieres remover a ${workerToDelete?.workerName} de la brigada? El trabajador permanecerá en la base de datos.`}
        onConfirm={handleRemoveWorker}
        confirmText="Remover"
        isLoading={isLoading}
      />
    </>
  )
}
