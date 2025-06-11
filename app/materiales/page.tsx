"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, Package, Plus, Search, Loader2 } from "lucide-react"
import { MaterialsTable } from "@/components/materials-table"
import { MaterialForm } from "@/components/material-form"
import type { Material, MaterialType, MaterialBrand } from "@/lib/types"

export default function MaterialesPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])
  const [materialBrands, setMaterialBrands] = useState<MaterialBrand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterBrand, setFilterBrand] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [materialsRes, typesRes, brandsRes] = await Promise.all([
        fetch("/api/materials"),
        fetch("/api/material-types"),
        fetch("/api/material-brands"),
      ])

      const [materialsData, typesData, brandsData] = await Promise.all([
        materialsRes.json(),
        typesRes.json(),
        brandsRes.json(),
      ])

      if (materialsData.success) setMaterials(materialsData.data)
      if (typesData.success) setMaterialTypes(typesData.data)
      if (brandsData.success) setMaterialBrands(brandsData.data)
    } catch (error) {
      console.error("Error loading data:", error)
      alert("Error al cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  const addMaterial = async (material: Omit<Material, "id">) => {
    try {
      const response = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(material),
      })

      const data = await response.json()

      if (data.success) {
        setMaterials([...materials, data.data])
        setIsAddDialogOpen(false)
        alert("Material agregado exitosamente")
      } else {
        alert(data.error || "Error al agregar material")
      }
    } catch (error) {
      console.error("Error adding material:", error)
      alert("Error al agregar material")
    }
  }

  const updateMaterial = async (updatedMaterial: Material) => {
    try {
      const response = await fetch(`/api/materials/${updatedMaterial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updatedMaterial.name,
          type: updatedMaterial.type,
          brand: updatedMaterial.brand,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMaterials(materials.map((m) => (m.id === updatedMaterial.id ? updatedMaterial : m)))
        setIsEditDialogOpen(false)
        setEditingMaterial(null)
        alert("Material actualizado exitosamente")
      } else {
        alert(data.error || "Error al actualizar material")
      }
    } catch (error) {
      console.error("Error updating material:", error)
      alert("Error al actualizar material")
    }
  }

  const deleteMaterial = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este material?")) return

    try {
      const response = await fetch(`/api/materials/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        setMaterials(materials.filter((m) => m.id !== id))
        alert("Material eliminado exitosamente")
      } else {
        alert(data.error || "Error al eliminar material")
      }
    } catch (error) {
      console.error("Error deleting material:", error)
      alert("Error al eliminar material")
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
    const matchesType = filterType === "all" || material.type === filterType
    const matchesBrand = filterBrand === "all" || material.brand === filterBrand
    return matchesSearch && matchesType && matchesBrand
  })

  const uniqueTypes = Array.from(new Set(materials.map((m) => m.type)))
  const uniqueBrands = Array.from(new Set(materials.map((m) => m.brand)))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando materiales...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100">
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
                  materialTypes={materialTypes}
                  materialBrands={materialBrands}
                  onTypeAdded={(newType) => setMaterialTypes([...materialTypes, newType])}
                  onBrandAdded={(newBrand) => setMaterialBrands([...materialBrands, newBrand])}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <Card className="border-0 shadow-md mb-6">
          <CardHeader>
            <CardTitle>Filtros y Búsqueda</CardTitle>
            <CardDescription>Encuentra materiales específicos en tu catálogo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
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
              <div>
                <Label htmlFor="filter-type" className="text-sm font-medium text-gray-700 mb-2 block">
                  Filtrar por Tipo
                </Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-brand" className="text-sm font-medium text-gray-700 mb-2 block">
                  Filtrar por Marca
                </Label>
                <Select value={filterBrand} onValueChange={setFilterBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las marcas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las marcas</SelectItem>
                    {uniqueBrands.map((brand) => (
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
                materialTypes={materialTypes}
                materialBrands={materialBrands}
                onTypeAdded={(newType) => setMaterialTypes([...materialTypes, newType])}
                onBrandAdded={(newBrand) => setMaterialBrands([...materialBrands, newBrand])}
                isEditing
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
