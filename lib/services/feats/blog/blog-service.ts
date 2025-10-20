/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'
import type { Blog, BlogSimplificado, BlogRequest } from '../../../blog-types'

export class BlogService {
  static async getBlogsPublicados(): Promise<BlogSimplificado[]> {
    console.log('[BlogService] Obteniendo blogs publicados')
    const response = await apiRequest<{ success: boolean; message: string; data: any[] }>('/blog/')
    console.log('[BlogService] Blogs publicados obtenidos:', response.data?.length || 0)
    return response.data || []
  }

  static async getBlogBySlug(slug: string): Promise<Blog | null> {
    console.log('[BlogService] Obteniendo blog por slug:', slug)
    try {
      const response = await apiRequest<{ success: boolean; message: string; data: any | null }>(`/blog/${slug}`)
      console.log('[BlogService] Blog obtenido:', response.data)
      return response.success ? response.data : null
    } catch (error) {
      console.error('[BlogService] Error al obtener blog:', error)
      return null
    }
  }

  static async getAllBlogs(): Promise<Blog[]> {
    console.log('[BlogService] Obteniendo todos los blogs (admin)')
    const response = await apiRequest<{ success: boolean; message: string; data: any[] }>('/blog/admin/all')
    console.log('[BlogService] Total blogs obtenidos:', response.data?.length || 0)
    return response.data || []
  }

  static async getBlogById(blogId: string): Promise<Blog | null> {
    console.log('[BlogService] Obteniendo blog por ID:', blogId)
    try {
      const response = await apiRequest<{ success: boolean; message: string; data: any | null }>(
        `/blog/admin/${blogId}`
      )
      console.log('[BlogService] Blog obtenido:', response.data)
      return response.success ? response.data : null
    } catch (error) {
      console.error('[BlogService] Error al obtener blog:', error)
      return null
    }
  }

  static async createBlog(
    blogData: BlogRequest,
    imagenPrincipal?: File,
    imagenesAdicionales?: File[]
  ): Promise<string> {
    console.log('[BlogService] Creando nuevo blog:', blogData.titulo)

    const formData = new FormData()

    formData.append('titulo', blogData.titulo)
    formData.append('slug', blogData.slug)
    formData.append('resumen', blogData.resumen)
    formData.append('contenido', blogData.contenido)
    formData.append('categoria', blogData.categoria)

    if (blogData.estado) formData.append('estado', blogData.estado)
    if (blogData.autor) formData.append('autor', blogData.autor)
    if (blogData.tags && blogData.tags.length > 0) {
      formData.append('tags', JSON.stringify(blogData.tags))
    }
    if (blogData.seo_meta_descripcion) {
      formData.append('seo_meta_descripcion', blogData.seo_meta_descripcion)
    }
    if (blogData.fecha_publicacion) {
      formData.append('fecha_publicacion', blogData.fecha_publicacion)
    }

    if (imagenPrincipal) {
      formData.append('imagen_principal', imagenPrincipal)
    }
    if (imagenesAdicionales && imagenesAdicionales.length > 0) {
      imagenesAdicionales.forEach((imagen) => {
        formData.append('imagenes_adicionales', imagen)
      })
    }

    const response = await apiRequest<{ success: boolean; message: string; blog_id: string }>('/blog/', {
      method: 'POST',
      body: formData,
    })

    console.log('[BlogService] Blog creado con ID:', response.blog_id)
    return response.blog_id || 'success'
  }

  static async updateBlog(
    blogId: string,
    blogData: Partial<BlogRequest>,
    imagenPrincipal?: File,
    imagenesAdicionales?: File[]
  ): Promise<boolean> {
    console.log('[BlogService] Actualizando blog:', blogId)

    const formData = new FormData()

    if (blogData.titulo !== undefined) formData.append('titulo', blogData.titulo)
    if (blogData.slug !== undefined) formData.append('slug', blogData.slug)
    if (blogData.resumen !== undefined) formData.append('resumen', blogData.resumen)
    if (blogData.contenido !== undefined) formData.append('contenido', blogData.contenido)
    if (blogData.categoria !== undefined) formData.append('categoria', blogData.categoria)
    if (blogData.estado !== undefined) formData.append('estado', blogData.estado)
    if (blogData.autor !== undefined) formData.append('autor', blogData.autor)
    if (blogData.tags !== undefined) {
      formData.append('tags', JSON.stringify(blogData.tags))
    }
    if (blogData.seo_meta_descripcion !== undefined) {
      formData.append('seo_meta_descripcion', blogData.seo_meta_descripcion)
    }
    if (blogData.fecha_publicacion !== undefined) {
      formData.append('fecha_publicacion', blogData.fecha_publicacion)
    }

    if (imagenPrincipal) {
      formData.append('imagen_principal', imagenPrincipal)
    }
    if (imagenesAdicionales && imagenesAdicionales.length > 0) {
      imagenesAdicionales.forEach((imagen) => {
        formData.append('imagenes_adicionales', imagen)
      })
    }

    const response = await apiRequest<{ success: boolean; message: string }>(`/blog/${blogId}`, {
      method: 'PUT',
      body: formData,
    })

    console.log('[BlogService] Blog actualizado:', response.success)
    return response.success === true
  }

  static async deleteBlog(blogId: string): Promise<boolean> {
    console.log('[BlogService] Eliminando blog:', blogId)
    const response = await apiRequest<{ success: boolean; message: string }>(`/blog/${blogId}`, {
      method: 'DELETE',
    })
    console.log('[BlogService] Blog eliminado:', response.success)
    return response.success === true
  }

  static async validarSlug(slug: string, blogId?: string): Promise<{ disponible: boolean; message: string }> {
    console.log('[BlogService] Validando slug:', slug, 'para blog:', blogId || 'nuevo')
    const params = new URLSearchParams({ slug })
    if (blogId) params.append('blog_id', blogId)

    const response = await apiRequest<{
      success: boolean
      message: string
      disponible: boolean
    }>(`/blog/validar/slug?${params.toString()}`)

    console.log('[BlogService] Slug disponible:', response.disponible)
    return {
      disponible: response.disponible,
      message: response.message,
    }
  }
}
