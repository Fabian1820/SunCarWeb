"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select"
import { BlogTable } from "@/components/feats/blog/blog-table"
import { BlogForm } from "@/components/feats/blog/blog-form"
import { useBlog } from "@/hooks/use-blog"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { Home, BookOpen, Plus, Search, AlertCircle, Loader2 } from "lucide-react"
import type { Blog, BlogFormData, Categoria, Estado } from "@/lib/blog-types"
import { convertFormToRequest } from "@/lib/blog-types"
import { ModuleHeader } from "@/components/shared/organism/module-header"

export default function BlogPage() {
  const {
    filteredBlogs,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filterCategoria,
    setFilterCategoria,
    filterEstado,
    setFilterEstado,
    createBlog,
    updateBlog,
    deleteBlog,
    validarSlug,
    loadBlogs,
  } = useBlog()

  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null)

  const handleCreate = async (data: BlogFormData) => {
    try {
      const blogRequest = convertFormToRequest(data)
      const success = await createBlog(blogRequest, data.imagenPrincipal || undefined, data.imagenesAdicionales)
      if (success) {
        toast({
          title: "Blog creado",
          description: "El blog ha sido creado exitosamente",
        })
        setIsAddDialogOpen(false)
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error al crear blog",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (data: BlogFormData) => {
    if (!editingBlog) return

    try {
      const blogRequest = convertFormToRequest(data)
      const success = await updateBlog(
        editingBlog.id,
        blogRequest,
        data.imagenPrincipal || undefined,
        data.imagenesAdicionales
      )
      if (success) {
        toast({
          title: "Blog actualizado",
          description: "El blog ha sido actualizado exitosamente",
        })
        setIsEditDialogOpen(false)
        setEditingBlog(null)
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error al actualizar blog",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este blog? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      const success = await deleteBlog(id)
      if (success) {
        toast({
          title: "Blog eliminado",
          description: "El blog ha sido eliminado exitosamente",
        })
      } else {
        toast({
          title: "Error",
          description: "No se pudo eliminar el blog",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error al eliminar blog",
        variant: "destructive",
      })
    }
  }

  const handleOpenEdit = (blog: Blog) => {
    setEditingBlog(blog)
    setIsEditDialogOpen(true)
  }

  if (loading && filteredBlogs.length === 0) {
    return <PageLoader moduleName="Blog" text="Cargando blogs..." />
  }

  if (error && filteredBlogs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full border-l-4 border-l-red-600">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900">Error al cargar blogs</h2>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={loadBlogs} variant="outline">
                Reintentar
              </Button>
              <Link href="/">
                <Button variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <ModuleHeader
        title="Gestión de Blog"
        subtitle="Administrar artículos y contenido del blog"
        badge={{ text: "Contenido", className: "bg-purple-100 text-purple-800" }}
        actions={
          <Button
            size="icon"
            onClick={() => setIsAddDialogOpen(true)}
            className="h-9 w-9 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 touch-manipulation"
            aria-label="Nuevo blog"
            title="Nuevo blog"
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Nuevo blog</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="space-y-6">
          {/* Search and Filter Card */}
          <Card className="border-0 shadow-md border-l-4 border-l-purple-600">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search" className="text-gray-700 mb-2 flex items-center">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Label>
                <Input
                  id="search"
                  placeholder="Buscar por título, autor, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-purple-200 focus:ring-purple-600"
                />
              </div>
              <div>
                <Label htmlFor="filterCategoria" className="text-gray-700 mb-2">
                  Categoría
                </Label>
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger className="border-purple-200">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las categorías</SelectItem>
                    <SelectItem value="instalacion">Instalación</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="casos_exito">Casos de Éxito</SelectItem>
                    <SelectItem value="ahorro_energetico">Ahorro Energético</SelectItem>
                    <SelectItem value="novedades">Novedades</SelectItem>
                    <SelectItem value="normativas">Normativas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filterEstado" className="text-gray-700 mb-2">
                  Estado
                </Label>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="border-purple-200">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="publicado">Publicado</SelectItem>
                    <SelectItem value="archivado">Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                Mostrando {filteredBlogs.length} blog{filteredBlogs.length !== 1 ? "s" : ""}
              </span>
              {(searchTerm || filterCategoria !== "" || filterEstado !== "") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setFilterCategoria("")
                    setFilterEstado("")
                  }}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

          {/* Blog Table Card */}
          <Card className="border-0 shadow-md border-l-4 border-l-purple-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                Lista de Blogs
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                Mostrando {filteredBlogs.length} blog{filteredBlogs.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BlogTable
                blogs={filteredBlogs}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        </div>

        {/* Create Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <Plus className="h-5 w-5 mr-2 text-purple-600" />
                Crear Nuevo Blog
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <BlogForm
                onSubmit={handleCreate}
                onCancel={() => setIsAddDialogOpen(false)}
                onValidarSlug={validarSlug}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open)
            if (!open) setEditingBlog(null)
          }}
        >
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <BookOpen className="h-5 w-5 mr-2 text-purple-600" />
                Editar Blog
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {editingBlog && (
                <BlogForm
                  initialData={editingBlog}
                  onSubmit={handleEdit}
                  onCancel={() => {
                    setIsEditDialogOpen(false)
                    setEditingBlog(null)
                  }}
                  isEditing
                  onValidarSlug={validarSlug}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>

      <Toaster />
    </div>
  )
}
