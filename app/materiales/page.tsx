"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/atom/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/molecule/dialog"
import { ArrowLeft, Package, Plus, Search, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { MaterialsTable } from "@/components/feats/materials/materials-table"
import { MaterialForm } from "@/components/feats/materials/material-form"
import { useMaterials } from "@/hooks/use-materials"
import type { Material } from "@/lib/material-types"

export default function MaterialesPage() {
  const { materials, categories, loading, error, refetch } = useMaterials()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  const addMaterial = (material: Omit<Material, "id">) => {
    // Función deshabilitada en MVP
    console.log('Agregar material (deshabilitado en MVP):', material)
    setIsAddDialogOpen(false)
  }

  const updateMaterial = (updatedMaterial: Material | Omit<Material, "id">) => {
    // Función deshabilitada en MVP
    console.log('Actualizar material (deshabilitado en MVP):', updatedMaterial)
    setIsEditDialogOpen(false)
    setEditingMaterial(null)
  }

  const deleteMaterial = (id: string) => {
    // Función deshabilitada en MVP
    console.log('Eliminar material (deshabilitado en MVP):', id)
  }

  const openEditDialog = (material: Material) => {
    setEditingMaterial(material)
    setIsEditDialogOpen(true)
  }

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.codigo.toString().includes(searchTerm) ||
      material.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategoryFilter = selectedCategory === "all" || material.categoria === selectedCategory
    return matchesSearch && matchesCategoryFilter
  })

  // Obtener unidades únicas de los materiales
  const units = Array.from(new Set(materials.map(m => m.um))).sort()

  const handleCloseModal = () => {
    refetch();
    setIsAddDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando materiales...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar materiales</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refetch} className="bg-amber-600 hover:bg-amber-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-amber-700 to-amber-800 p-2 rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Gestión de Materiales</h1>
                  <p className="text-sm text-gray-600">Administrar catálogo de materiales y equipos</p>
                </div>
              </div>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Material
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Material</DialogTitle>
                </DialogHeader>
                <MaterialForm
                  onSubmit={addMaterial}
                  onCancel={handleCloseModal}
                  onClose={handleCloseModal}
                  existingCategories={categories}
                  existingUnits={units}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* MVP Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">Modo MVP</h3>
              <p className="text-sm text-blue-700">
                Las funciones de edición, eliminación y creación están deshabilitadas para esta versión de demostración.
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="border-0 shadow-md mb-6">
          <CardHeader>
            <CardTitle>Filtros y Búsqueda</CardTitle>
            <CardDescription>Encuentra materiales específicos en tu catálogo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                  Buscar Material
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Buscar por código o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="lg:w-48">
                <Label htmlFor="category-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                  Filtrar por Categoría
                </Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((category, idx) => (
                      <SelectItem key={category || idx} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Materials Table */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle>Catálogo de Materiales</CardTitle>
            <CardDescription>
              Mostrando {filteredMaterials.length} de {materials.length} materiales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MaterialsTable materials={filteredMaterials} onEdit={openEditDialog} onDelete={deleteMaterial} />
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Material</DialogTitle>
            </DialogHeader>
            {editingMaterial && (
              <MaterialForm
                initialData={editingMaterial}
                onSubmit={updateMaterial}
                onCancel={() => {
                  setIsEditDialogOpen(false)
                  setEditingMaterial(null)
                }}
                existingCategories={categories}
                existingUnits={units}
                isEditing
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
