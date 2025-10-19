"use client"

import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { Edit, Trash2, BookOpen, Eye } from "lucide-react"
import type { Blog } from "@/lib/blog-types"
import { getCategoriaDisplayName, getCategoriaColor, getEstadoDisplayName, getEstadoColor } from "@/lib/blog-types"

interface BlogTableProps {
  blogs: Blog[]
  onEdit: (blog: Blog) => void
  onDelete: (id: string) => void
  onView?: (blog: Blog) => void
}

export function BlogTable({ blogs, onEdit, onDelete, onView }: BlogTableProps) {
  if (blogs.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron blogs</h3>
        <p className="text-gray-600">No hay blogs que coincidan con los filtros aplicados.</p>
      </div>
    )
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Título</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Categoría</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Estado</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Autor</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Publicación</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Visitas</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {blogs.map((blog) => (
            <tr key={blog.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-4 px-4">
                <div className="max-w-xs">
                  <p className="font-medium text-gray-900 truncate">{blog.titulo}</p>
                  <p className="text-xs text-gray-500 truncate">{blog.slug}</p>
                </div>
              </td>
              <td className="py-4 px-4">
                <Badge
                  variant="outline"
                  className={`border-${getCategoriaColor(blog.categoria)}-300 text-${getCategoriaColor(blog.categoria)}-700 bg-${getCategoriaColor(blog.categoria)}-50`}
                >
                  {getCategoriaDisplayName(blog.categoria)}
                </Badge>
              </td>
              <td className="py-4 px-4">
                <Badge
                  variant="outline"
                  className={`border-${getEstadoColor(blog.estado)}-300 text-${getEstadoColor(blog.estado)}-700 bg-${getEstadoColor(blog.estado)}-50`}
                >
                  {getEstadoDisplayName(blog.estado)}
                </Badge>
              </td>
              <td className="py-4 px-4 text-gray-700">{blog.autor}</td>
              <td className="py-4 px-4 text-gray-700">{formatDate(blog.fechaPublicacion)}</td>
              <td className="py-4 px-4">
                <div className="flex items-center text-gray-700">
                  <Eye className="h-4 w-4 mr-1 text-gray-400" />
                  {blog.visitas.toLocaleString()}
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center space-x-2">
                  {onView && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(blog)}
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(blog)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(blog.id)}
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
  )
}
