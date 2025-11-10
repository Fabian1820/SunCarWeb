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
      {/* Header fijo */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Ofertas Personalizadas
                </h1>
                <p className="text-sm text-gray-600">
                  Gestión de ofertas personalizadas para clientes
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Oferta
          </Button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="pt-24 px-6 pb-6 space-y-6">
        {/* Filtros y búsqueda */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="md:col-span-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por ID de cliente..."
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
