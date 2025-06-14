"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, Package, Plus, Search } from "lucide-react"
import { MaterialsTable } from "@/components/materials-table"
import { MaterialForm } from "@/components/material-form"
import type { Material } from "@/lib/types"

export default function MaterialesPage() {
  const [materials, setMaterials] = useState<Material[]>([
    { id: "1", name: "Panel Solar 450W", type: "Panel Solar", brand: "Canadian Solar" },
    { id: "2", name: "Inversor 5kW", type: "Inversor", brand: "Fronius" },
    { id: "3", name: "Batería Litio 100Ah", type: "Batería", brand: "Tesla" },
    { id: "4", name: "Cable DC 4mm", type: "Cable", brand: "Prysmian" },
    { id: "5", name: "Cable AC 6mm", type: "Cable", brand: "Procables" },
    { id: "6", name: "Estructura Aluminio", type: "Estructura", brand: "Schletter" },
    { id: "7", name: "Tornillos Inox M8", type: "Tornillería", brand: "Hilti" },
    { id: "8", name: "Regulador MPPT 60A", type: "Regulador", brand: "Victron" },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterBrand, setFilterBrand] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  const addMaterial = (material: Omit<Material, "id">) => {
    const newMaterial: Material = {
      ...material,
      id: Date.now().toString(),
    }
    setMaterials([...materials, newMaterial])
    setIsAddDialogOpen(false)
  }

  const updateMaterial = (updatedMaterial: Material) => {
    setMaterials(materials.map((m) => (m.id === updatedMaterial.id ? updatedMaterial : m)))
    setIsEditDialogOpen(false)
    setEditingMaterial(null)
  }

  const deleteMaterial = (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este material?")) {
      setMaterials(materials.filter((m) => m.id !== id))
    }
  }

  const openEditDialog = (material: Material) => {
    setEditingMaterial(material)
    setIsEditDialogOpen(true)
  }

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTypeFilter = filterType === "all" || material.type === filterType
    const matchesBrandFilter = filterBrand === "all" || material.brand === filterBrand
    return matchesSearch && matchesTypeFilter && matchesBrandFilter
  })

  const materialTypes = Array.from(new Set(materials.map((m) => m.type)))
  const materialBrands = Array.from(new Set(materials.map((m) => m.brand)))

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
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-lg">
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
                <Button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Material
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Material</DialogTitle>
                </DialogHeader>
                <MaterialForm
                  onSubmit={addMaterial}
                  onCancel={() => setIsAddDialogOpen(false)}
                  existingTypes={materialTypes}
                  existingBrands={materialBrands}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    placeholder="Buscar por nombre, tipo o marca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="lg:w-48">
                <Label htmlFor="type-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                  Filtrar por Tipo
                </Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {materialTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:w-48">
                <Label htmlFor="brand-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                  Filtrar por Marca
                </Label>
                <Select value={filterBrand} onValueChange={setFilterBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las marcas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las marcas</SelectItem>
                    {materialBrands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
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
          <DialogContent>
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
                existingTypes={materialTypes}
                existingBrands={materialBrands}
                isEditing
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
