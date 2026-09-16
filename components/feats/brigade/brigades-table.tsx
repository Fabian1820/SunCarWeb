"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent } from "@/components/shared/molecule/card"
import { ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { Trash2, Users, Crown, UserPlus, X } from "lucide-react"
import type { Brigade } from "@/lib/brigade-types"
import { BrigadaService } from "@/lib/api-services"
import { useToast } from "@/hooks/use-toast"

interface BrigadesTableProps {
  brigades: Brigade[]
  onDelete: (liderCi: string) => void
  onRemoveWorker: (liderCi: string, workerCi: string) => void
  onAddWorker: (brigade: Brigade) => void
  onRefresh: () => void
}

export function BrigadesTable({ brigades, onDelete, onRemoveWorker, onAddWorker, onRefresh }: BrigadesTableProps) {
  const [isDeleteBrigadeDialogOpen, setIsDeleteBrigadeDialogOpen] = useState(false)
  const [brigadeToDelete, setBrigadeToDelete] = useState<Brigade | null>(null)
  const [isDeleteWorkerDialogOpen, setIsDeleteWorkerDialogOpen] = useState(false)
  const [workerToDelete, setWorkerToDelete] = useState<{ liderCi: string, workerId: string, workerName: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleDeleteBrigade = async () => {
    if (!brigadeToDelete) return

    setIsLoading(true)
    try {
      // El backend identifica la brigada por el CI del líder (DELETE /brigadas/{lider_ci}),
      // no por su _id de Mongo.
      const eliminada = await BrigadaService.eliminarBrigada(brigadeToDelete.leader.ci)
      if (!eliminada) {
        throw new Error("La brigada no fue encontrada en el servidor")
      }
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
      setBrigadeToDelete(null)
    }
  }

  const handleRemoveWorker = async () => {
    if (!workerToDelete) return

    setIsLoading(true)
    try {
      // El backend identifica la brigada por el CI del líder
      // (DELETE /brigadas/{lider_ci}/trabajadores/{trabajador_ci}).
      const removido = await BrigadaService.eliminarTrabajadorDeBrigada(
        workerToDelete.liderCi,
        workerToDelete.workerId,
      )
      if (!removido) {
        throw new Error("No se encontró la brigada o el trabajador en el servidor")
      }
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
      setWorkerToDelete(null)
    }
  }

  const openDeleteBrigadeDialog = (brigade: Brigade) => {
    setBrigadeToDelete(brigade)
    setIsDeleteBrigadeDialogOpen(true)
  }

  const openDeleteWorkerDialog = (liderCi: string, workerId: string, workerName: string) => {
    setWorkerToDelete({ liderCi, workerId, workerName })
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {brigades.map((brigade) => (
          <Card key={brigade.id || brigade.leader.ci} className="border-gray-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg shrink-0">
                  <Crown className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{brigade.leader.name}</p>
                  <p className="text-xs text-gray-500">CI: {brigade.leader.ci}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDeleteBrigadeDialog(brigade)}
                  className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-600 touch-manipulation"
                  aria-label="Eliminar brigada"
                  title="Eliminar brigada"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[1.75rem]">
                {brigade.members.length > 0 ? (
                  brigade.members.map((member) => (
                    <span
                      key={member.id || member.ci}
                      className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full pl-2.5 pr-1 py-1"
                    >
                      {member.name}
                      <button
                        type="button"
                        onClick={() => openDeleteWorkerDialog(brigade.leader.ci, member.ci, member.name)}
                        className="rounded-full p-0.5 text-gray-400 hover:text-red-600 touch-manipulation"
                        title={`Quitar a ${member.name}`}
                        aria-label={`Quitar a ${member.name} de la brigada`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">Sin integrantes</span>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddWorker(brigade)}
                className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 touch-manipulation"
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                Agregar integrante
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDeleteDialog
        open={isDeleteBrigadeDialogOpen}
        onOpenChange={setIsDeleteBrigadeDialogOpen}
        title="Eliminar Brigada"
        message={`¿Estás seguro de que quieres eliminar la brigada liderada por ${brigadeToDelete?.leader.name}? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteBrigade}
        isLoading={isLoading}
      />

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
