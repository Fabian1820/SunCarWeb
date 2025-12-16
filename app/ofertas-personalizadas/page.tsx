"use client"

import { useState } from 'react'
import { ArrowLeft, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/shared/atom/button'
import { Input } from '@/components/shared/molecule/input'
import { Card } from '@/components/shared/molecule/card'
import { Label } from '@/components/shared/atom/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/atom/select'
import { useToast } from '@/hooks/use-toast'
import { useOfertasPersonalizadas } from '@/hooks/use-ofertas-personalizadas'
import { OfertasPersonalizadasTable } from '@/components/feats/ofertas-personalizadas/ofertas-personalizadas-table'
import { CreateOfertaDialog } from '@/components/feats/ofertas-personalizadas/create-oferta-dialog'
import { EditOfertaDialog } from '@/components/feats/ofertas-personalizadas/edit-oferta-dialog'
import type {
  OfertaPersonalizada,
  OfertaPersonalizadaCreateRequest,
  OfertaPersonalizadaUpdateRequest,
} from '@/lib/types/feats/ofertas-personalizadas/oferta-personalizada-types'

export default function OfertasPersonalizadasPage() {
  const { toast } = useToast()
  const {
    filteredOfertas,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    createOferta,
    updateOferta,
    deleteOferta,
  } = useOfertasPersonalizadas()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingOferta, setEditingOferta] = useState<OfertaPersonalizada | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateOferta = async (data: OfertaPersonalizadaCreateRequest) => {
    setIsSubmitting(true)
    try {
      const success = await createOferta(data)
      if (success) {
        toast({
          title: 'Éxito',
          description: 'Oferta personalizada creada exitosamente',
        })
        setIsCreateDialogOpen(false)
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo crear la oferta personalizada',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating oferta:', error)
      toast({
        title: 'Error',
        description: 'Error al crear la oferta personalizada',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditOferta = async (
    id: string,
    data: OfertaPersonalizadaUpdateRequest
  ) => {
    setIsSubmitting(true)
    try {
      const success = await updateOferta(id, data)
      if (success) {
        toast({
          title: 'Éxito',
          description: 'Oferta personalizada actualizada exitosamente',
        })
        setIsEditDialogOpen(false)
        setEditingOferta(null)
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar la oferta personalizada',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating oferta:', error)
      toast({
        title: 'Error',
        description: 'Error al actualizar la oferta personalizada',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteOferta = async (id: string) => {
    try {
      const success = await deleteOferta(id)
      if (success) {
        toast({
          title: 'Éxito',
          description: 'Oferta personalizada eliminada exitosamente',
        })
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo eliminar la oferta personalizada',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting oferta:', error)
      toast({
        title: 'Error',
        description: 'Error al eliminar la oferta personalizada',
        variant: 'destructive',
      })
    }
  }

  const handleEditClick = (oferta: OfertaPersonalizada) => {
    setEditingOferta(oferta)
    setIsEditDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-6 gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Volver al Dashboard</span>
                  <span className="sm:hidden">Volver</span>
                </Button>
              </Link>
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                <img src="/logo.png" alt="Logo SunCar" className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  Ofertas Personalizadas
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Ventas
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Gestión de ofertas personalizadas para clientes y leads.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Oferta
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filtros y búsqueda */}
        <Card className="mb-8 border-l-4 border-l-amber-600 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="md:col-span-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por ID de cliente o lead..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro por estado */}
            <div>
              <Label>Estado de Pago</Label>
              <Select
                value={filters.pagada === 'all' ? 'all' : filters.pagada ? 'true' : 'false'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    pagada: value === 'all' ? 'all' : value === 'true',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Pagadas</SelectItem>
                  <SelectItem value="false">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limpiar filtros */}
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchTerm('')
                  setFilters({ pagada: 'all' })
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </Card>

        {/* Mensaje de error */}
        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-red-600">{error}</p>
          </Card>
        )}

        {/* Tabla de ofertas */}
        <OfertasPersonalizadasTable
          ofertas={filteredOfertas}
          onEdit={handleEditClick}
          onDelete={handleDeleteOferta}
          loading={loading}
        />
      </main>

      {/* Dialog de crear oferta */}
      <CreateOfertaDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateOferta}
        isLoading={isSubmitting}
      />

      {/* Dialog de editar oferta */}
      <EditOfertaDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        oferta={editingOferta}
        onSubmit={handleEditOferta}
        isLoading={isSubmitting}
      />
    </div>
  )
}
