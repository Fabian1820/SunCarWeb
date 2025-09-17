"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, ConfirmDeleteDialog } from "@/components/shared/molecule/dialog"
import { Edit, Trash2, Phone, Mail, Eye, Calendar, MapPin, Building } from "lucide-react"
import type { Lead } from "@/lib/api-types"
import { useToast } from "@/hooks/use-toast"

interface LeadsTableProps {
  leads: Lead[]
  onEdit: (lead: Lead) => void
  onDelete: (id: string) => void
  loading?: boolean
}

export function LeadsTable({ leads, onEdit, onDelete, loading }: LeadsTableProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const { toast } = useToast()

  const openDetailDialog = (lead: Lead) => {
    setSelectedLead(lead)
    setIsDetailDialogOpen(true)
  }

  const handleDeleteClick = (lead: Lead) => {
    setLeadToDelete(lead)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (leadToDelete?.id) {
      onDelete(leadToDelete.id)
      setIsDeleteDialogOpen(false)
      setLeadToDelete(null)
    }
  }

  const getEstadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      nuevo: 'bg-blue-100 text-blue-800',
      contactado: 'bg-yellow-100 text-yellow-800',
      calificado: 'bg-purple-100 text-purple-800',
      propuesta: 'bg-orange-100 text-orange-800',
      negociacion: 'bg-pink-100 text-pink-800',
      cerrado_ganado: 'bg-green-100 text-green-800',
      cerrado_perdido: 'bg-red-100 text-red-800',
      descartado: 'bg-gray-100 text-gray-800'
    }
    return colors[estado] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    // Si ya está en formato DD/MM/YYYY, devolverlo tal como está
    if (dateString && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateString
    }

    // Si está en formato ISO (YYYY-MM-DD), convertir a DD/MM/YYYY
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    }

    return dateString
  }

  if (loading && leads.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando leads...</p>
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-gray-400">
          <Phone className="h-24 w-24" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay leads</h3>
        <p className="mt-1 text-sm text-gray-500">Comienza creando tu primer lead.</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden border border-gray-200 rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[160px]">
                  Lead
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[130px]">
                  Contacto
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Estado
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[110px]">
                  Fuente
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Fecha
                </th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] w-[120px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-2 py-3 whitespace-nowrap min-w-[160px]">
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {lead.nombre}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {lead.direccion || 'Sin dirección'}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap min-w-[130px]">
                    <div className="text-sm text-gray-900 truncate">
                      {lead.telefono}
                    </div>
                    {lead.pais_contacto && (
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="truncate">{lead.pais_contacto}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap min-w-[100px]">
                    <div className="w-full">
                      <Badge className={`${getEstadoBadge(lead.estado)} text-xs truncate max-w-[90px] inline-block`}>
                        {lead.estado}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap min-w-[110px]">
                    <div className="text-sm text-gray-900 truncate">
                      {lead.fuente || 'No especificada'}
                    </div>
                    {lead.referencia && (
                      <div className="text-xs text-gray-500 truncate">
                        Ref: {lead.referencia}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap min-w-[100px]">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Calendar className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{formatDate(lead.fecha_contacto)}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-right text-sm font-medium min-w-[120px] w-[120px]">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailDialog(lead)}
                        className="text-blue-600 hover:text-blue-800 h-7 w-7 p-0"
                        title="Ver detalles"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(lead)}
                        className="text-orange-600 hover:text-orange-800 h-7 w-7 p-0"
                        title="Editar"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(lead)}
                        className="text-red-600 hover:text-red-800 h-7 w-7 p-0"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Información Personal</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm">{selectedLead.nombre}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm">{selectedLead.telefono}</span>
                    </div>
                    {selectedLead.direccion && (
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                        <span className="text-sm">{selectedLead.direccion}</span>
                      </div>
                    )}
                    {selectedLead.pais_contacto && (
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-sm">{selectedLead.pais_contacto}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Estado y Seguimiento</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm">Contacto: {formatDate(selectedLead.fecha_contacto)}</span>
                    </div>
                    <div className="flex items-center">
                      <Badge className={getEstadoBadge(selectedLead.estado)}>
                        {selectedLead.estado}
                      </Badge>
                    </div>
                    {selectedLead.fuente && (
                      <div className="text-sm">
                        <span className="text-gray-500">Fuente:</span> {selectedLead.fuente}
                      </div>
                    )}
                    {selectedLead.referencia && (
                      <div className="text-sm">
                        <span className="text-gray-500">Referencia:</span> {selectedLead.referencia}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedLead.necesidad && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Necesidad</h3>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {selectedLead.necesidad}
                  </p>
                </div>
              )}

              {selectedLead.provincia_montaje && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Provincia de Montaje</h3>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-sm">{selectedLead.provincia_montaje}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Eliminar Lead"
        message={`¿Estás seguro de que quieres eliminar el lead de ${leadToDelete?.nombre}? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Eliminar Lead"
      />
    </>
  )
}