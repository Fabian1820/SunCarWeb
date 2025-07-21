"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { Edit, Trash2, Users, Crown, Phone, Mail, UserMinus, Eye, Power, Calendar } from "lucide-react"
import type { Brigade } from "@/lib/brigade-types"
import { BrigadaService, TrabajadorService } from "@/lib/api-services"
import { useToast } from "@/hooks/use-toast"
import { DialogTrigger } from "@/components/shared/molecule/dialog"

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
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [reportBrigadeId, setReportBrigadeId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [category, setCategory] = useState('')
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportResults, setReportResults] = useState<any>(null)
  const fromInputRef = useRef<HTMLInputElement>(null)
  const toInputRef = useRef<HTMLInputElement>(null)

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

  // Abre el modal para una brigada específica o para todas (null)
  const openReportDialog = (brigadeId: string | null = null) => {
    setReportBrigadeId(brigadeId)
    setIsReportDialogOpen(true)
    setReportResults(null)
    setReportError(null)
    setCategory('')
  }
  const closeReportDialog = () => {
    setIsReportDialogOpen(false)
    setReportBrigadeId(null)
    setDateRange({ from: '', to: '' })
    setCategory('')
    setReportResults(null)
    setReportError(null)
  }

  // Lógica para consumir el endpoint y mostrar resultados
  async function handleCalculateReport(e: React.FormEvent) {
    e.preventDefault()
    setIsLoadingReport(true)
    setReportError(null)
    setReportResults(null)
    try {
      let url = ''
      if (reportBrigadeId) {
        url = `/api/brigadas/${reportBrigadeId}/materiales-usados?fecha_inicio=${dateRange.from}&fecha_fin=${dateRange.to}`
        if (category) url += `&categoria=${encodeURIComponent(category)}`
      } else {
        url = `/api/brigadas/materiales-usados-todas?fecha_inicio=${dateRange.from}&fecha_fin=${dateRange.to}`
        if (category) url += `&categoria=${encodeURIComponent(category)}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error al obtener el reporte')
      const data = await res.json()
      if (!data.success) throw new Error(data.message || 'Error desconocido')
      setReportResults(data.data)
    } catch (err: any) {
      setReportError(err.message || 'Error desconocido')
    } finally {
      setIsLoadingReport(false)
    }
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
      {/* Botón general para todas las brigadas */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          className="border-green-400 text-green-700 hover:bg-green-50"
          onClick={() => openReportDialog(null)}
          title="Calcular materiales usados de todas las brigadas"
        >
          <Calendar className="h-5 w-5" />
        </Button>
      </div>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-400 text-green-700 hover:bg-green-50"
                      title="Calcular materiales usados de esta brigada"
                      onClick={() => openReportDialog(brigade.id)}
                    >
                      <Calendar className="h-4 w-4" />
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

      {/* Modal para seleccionar rango de fechas para el reporte */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reportBrigadeId
                ? "Reporte de materiales usados por brigada"
                : "Reporte de materiales usados por todas las brigadas"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCalculateReport}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                <input
                  ref={fromInputRef}
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={dateRange.from}
                  onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                <input
                  ref={toInputRef}
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={dateRange.to}
                  onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría (opcional)</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="Ej: Lubricantes"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeReportDialog}>Cancelar</Button>
              <Button type="submit" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white" disabled={isLoadingReport}>
                {isLoadingReport ? 'Calculando...' : 'Calcular'}
              </Button>
            </div>
          </form>
          {/* Resultados del reporte */}
          {reportError && (
            <div className="mt-4 text-red-600 bg-red-50 border border-red-200 rounded p-3">{reportError}</div>
          )}
          {isLoadingReport && !reportError && (
            <div className="mt-4 text-orange-600">Cargando reporte...</div>
          )}
          {reportResults && (
            <div className="mt-8">
              {reportBrigadeId ? (
                // Tabla para una brigada
                <table className="w-full text-sm border-separate border-spacing-y-2">
                  <thead>
                    <tr className="bg-green-50">
                      <th className="py-2 px-4 text-left font-semibold text-green-900 rounded-tl-lg">Código</th>
                      <th className="py-2 px-4 text-left font-semibold text-green-900">Categoría</th>
                      <th className="py-2 px-4 text-left font-semibold text-green-900">Descripción</th>
                      <th className="py-2 px-4 text-left font-semibold text-green-900 rounded-tr-lg">Cantidad total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(reportResults) && reportResults.length > 0 ? reportResults.map((mat: any, idx: number) => (
                      <tr key={mat.codigo + idx} className="bg-white border-b border-gray-100 hover:bg-green-50">
                        <td className="py-2 px-4">{mat.codigo}</td>
                        <td className="py-2 px-4">{mat.categoria}</td>
                        <td className="py-2 px-4">{mat.descripcion}</td>
                        <td className="py-2 px-4 font-bold text-green-700">{mat.cantidad_total}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="text-center text-gray-500 py-4">No hay materiales usados en este rango</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                // Tabla para todas las brigadas
                <div className="space-y-8">
                  {Array.isArray(reportResults) && reportResults.length > 0 ? reportResults.map((brigada: any, idx: number) => (
                    <div key={brigada.jefe_brigada + idx}>
                      <div className="font-bold text-lg text-green-800 mb-2">Jefe de Brigada: {brigada.jefe_brigada || <span className='text-gray-400'>(Sin nombre)</span>}</div>
                      <table className="w-full text-sm border-separate border-spacing-y-2 mb-4">
                        <thead>
                          <tr className="bg-green-50">
                            <th className="py-2 px-4 text-left font-semibold text-green-900 rounded-tl-lg">Código</th>
                            <th className="py-2 px-4 text-left font-semibold text-green-900">Categoría</th>
                            <th className="py-2 px-4 text-left font-semibold text-green-900">Descripción</th>
                            <th className="py-2 px-4 text-left font-semibold text-green-900 rounded-tr-lg">Cantidad total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.isArray(brigada.materiales) && brigada.materiales.length > 0 ? brigada.materiales.map((mat: any, idx2: number) => (
                            <tr key={mat.codigo + idx2} className="bg-white border-b border-gray-100 hover:bg-green-50">
                              <td className="py-2 px-4">{mat.codigo}</td>
                              <td className="py-2 px-4">{mat.categoria}</td>
                              <td className="py-2 px-4">{mat.descripcion}</td>
                              <td className="py-2 px-4 font-bold text-green-700">{mat.cantidad_total}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={4} className="text-center text-gray-500 py-4">No hay materiales usados en este rango</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-4">No hay materiales usados en este rango</div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
