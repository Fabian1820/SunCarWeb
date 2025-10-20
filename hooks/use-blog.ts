import { useState, useEffect, useCallback, useMemo } from 'react'
import { BlogService } from '@/lib/api-services'
import type { Blog, BlogRequest } from '@/lib/blog-types'

interface UseBlogReturn {
  blogs: Blog[]
  filteredBlogs: Blog[]
  loading: boolean
  error: string | null
  searchTerm: string
  setSearchTerm: (term: string) => void
  filterCategoria: string
  setFilterCategoria: (categoria: string) => void
  filterEstado: string
  setFilterEstado: (estado: string) => void
  loadBlogs: () => Promise<void>
  createBlog: (
    data: BlogRequest,
    imagenPrincipal?: File,
    imagenesAdicionales?: File[]
  ) => Promise<boolean>
  updateBlog: (
    id: string,
    data: Partial<BlogRequest>,
    imagenPrincipal?: File,
    imagenesAdicionales?: File[]
  ) => Promise<boolean>
  deleteBlog: (id: string) => Promise<boolean>
  validarSlug: (slug: string, blogId?: string) => Promise<{ disponible: boolean; message: string }>
  clearError: () => void
}

export function useBlog(): UseBlogReturn {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterEstado, setFilterEstado] = useState('')

  // Load all blogs (admin endpoint)
  const loadBlogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await BlogService.getAllBlogs()
      setBlogs(Array.isArray(data) ? data : [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar blogs'
      setError(message)
      console.error('[useBlog] Error loading blogs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Filter blogs based on search term, category, and status
  const filteredBlogs = useMemo(() => {
    let result = blogs

    // Filter by search term (titulo, resumen, autor, tags)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      result = result.filter(
        (blog) =>
          blog.titulo?.toLowerCase().includes(searchLower) ||
          blog.resumen?.toLowerCase().includes(searchLower) ||
          blog.autor?.toLowerCase().includes(searchLower) ||
          blog.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      )
    }

    // Filter by category
    if (filterCategoria && filterCategoria !== 'todas') {
      result = result.filter((blog) => blog.categoria === filterCategoria)
    }

    // Filter by status
    if (filterEstado && filterEstado !== 'todos') {
      result = result.filter((blog) => blog.estado === filterEstado)
    }

    return result
  }, [blogs, searchTerm, filterCategoria, filterEstado])

  // Create new blog
  const createBlog = useCallback(
    async (
      data: BlogRequest,
      imagenPrincipal?: File,
      imagenesAdicionales?: File[]
    ): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await BlogService.createBlog(data, imagenPrincipal, imagenesAdicionales)
        await loadBlogs() // Reload blogs after creation
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al crear blog'
        setError(message)
        console.error('[useBlog] Error creating blog:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadBlogs]
  )

  // Update existing blog
  const updateBlog = useCallback(
    async (
      id: string,
      data: Partial<BlogRequest>,
      imagenPrincipal?: File,
      imagenesAdicionales?: File[]
    ): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const success = await BlogService.updateBlog(id, data, imagenPrincipal, imagenesAdicionales)
        if (success) {
          await loadBlogs() // Reload blogs after update
          return true
        }
        setError('No se pudo actualizar el blog')
        return false
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar blog'
        setError(message)
        console.error('[useBlog] Error updating blog:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadBlogs]
  )

  // Delete blog
  const deleteBlog = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        const success = await BlogService.deleteBlog(id)
        if (success) {
          await loadBlogs() // Reload blogs after deletion
          return true
        }
        setError('No se pudo eliminar el blog')
        return false
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar blog'
        setError(message)
        console.error('[useBlog] Error deleting blog:', err)
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadBlogs]
  )

  // Validate slug availability
  const validarSlug = useCallback(
    async (slug: string, blogId?: string): Promise<{ disponible: boolean; message: string }> => {
      try {
        const result = await BlogService.validarSlug(slug, blogId)
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al validar slug'
        console.error('[useBlog] Error validating slug:', err)
        return { disponible: false, message }
      }
    },
    []
  )

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Load blogs on mount
  useEffect(() => {
    loadBlogs()
  }, [loadBlogs])

  return {
    blogs,
    filteredBlogs,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filterCategoria,
    setFilterCategoria,
    filterEstado,
    setFilterEstado,
    loadBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
    validarSlug,
    clearError,
  }
}
