// Blog Types - Backend & Frontend type definitions

// Backend types (match FastAPI response from blog_api.md)
export interface BackendBlog {
  id: string
  titulo: string
  slug: string
  resumen: string
  contenido: string
  imagen_principal: string | null
  imagenes_adicionales: string[]
  categoria: Categoria
  tags: string[]
  autor: string
  estado: Estado
  fecha_creacion: string // ISO 8601
  fecha_publicacion: string | null // ISO 8601
  fecha_actualizacion: string // ISO 8601
  seo_meta_descripcion: string | null
  visitas: number
}

// Backend simplified blog (for list views)
export interface BackendBlogSimplificado {
  id: string
  titulo: string
  slug: string
  resumen: string
  imagen_principal: string | null
  categoria: Categoria
  tags: string[]
  autor: string
  fecha_publicacion: string | null
  visitas: number
}

// Frontend types (internal data model)
export interface Blog {
  id: string
  titulo: string
  slug: string
  resumen: string
  contenido: string
  imagenPrincipal: string | null
  imagenesAdicionales: string[]
  categoria: Categoria
  tags: string[]
  autor: string
  estado: Estado
  fechaCreacion: Date
  fechaPublicacion: Date | null
  fechaActualizacion: Date
  seoMetaDescripcion: string | null
  visitas: number
}

// Simplified blog for list views
export interface BlogSimplificado {
  id: string
  titulo: string
  slug: string
  resumen: string
  imagenPrincipal: string | null
  categoria: Categoria
  tags: string[]
  autor: string
  fechaPublicacion: Date | null
  visitas: number
}

// Request type for creating/updating blogs
export interface BlogRequest {
  titulo: string
  slug: string
  resumen: string
  contenido: string
  categoria: Categoria
  estado?: Estado
  autor?: string
  tags?: string[]
  seo_meta_descripcion?: string
  fecha_publicacion?: string // ISO 8601
}

// Form data type for create/edit forms
export interface BlogFormData {
  titulo: string
  slug: string
  resumen: string
  contenido: string
  categoria: Categoria
  estado: Estado
  autor: string
  tags: string[]
  seoMetaDescripcion: string
  fechaPublicacion: Date | null
  imagenPrincipal?: File | null
  imagenesAdicionales?: File[]
}

// Categorías según blog_api.md
export type Categoria =
  | "instalacion"        // Artículos sobre instalación de sistemas solares
  | "mantenimiento"      // Guías de mantenimiento preventivo y correctivo
  | "casos_exito"        // Historias de clientes y proyectos exitosos
  | "ahorro_energetico"  // Tips y estrategias de ahorro energético
  | "novedades"          // Noticias y novedades del sector
  | "normativas"         // Regulaciones y normativas legales

// Estados del blog
export type Estado =
  | "borrador"    // En edición, no visible públicamente
  | "publicado"   // Visible públicamente
  | "archivado"   // Archivado, no visible públicamente

// Helper to get category display name
export function getCategoriaDisplayName(categoria: Categoria): string {
  const nombres: Record<Categoria, string> = {
    instalacion: "Instalación",
    mantenimiento: "Mantenimiento",
    casos_exito: "Casos de Éxito",
    ahorro_energetico: "Ahorro Energético",
    novedades: "Novedades",
    normativas: "Normativas",
  }
  return nombres[categoria]
}

// Helper to get category color for UI
export function getCategoriaColor(categoria: Categoria): string {
  const colores: Record<Categoria, string> = {
    instalacion: "blue",
    mantenimiento: "green",
    casos_exito: "orange",
    ahorro_energetico: "emerald",
    novedades: "purple",
    normativas: "gray",
  }
  return colores[categoria]
}

// Helper to get estado display name
export function getEstadoDisplayName(estado: Estado): string {
  const nombres: Record<Estado, string> = {
    borrador: "Borrador",
    publicado: "Publicado",
    archivado: "Archivado",
  }
  return nombres[estado]
}

// Helper to get estado color for UI
export function getEstadoColor(estado: Estado): string {
  const colores: Record<Estado, string> = {
    borrador: "yellow",
    publicado: "green",
    archivado: "gray",
  }
  return colores[estado]
}

// Convert backend blog to frontend
export function convertBackendToFrontend(blog: BackendBlog): Blog {
  return {
    id: blog.id,
    titulo: blog.titulo,
    slug: blog.slug,
    resumen: blog.resumen,
    contenido: blog.contenido,
    imagenPrincipal: blog.imagen_principal,
    imagenesAdicionales: blog.imagenes_adicionales,
    categoria: blog.categoria,
    tags: blog.tags,
    autor: blog.autor,
    estado: blog.estado,
    fechaCreacion: new Date(blog.fecha_creacion),
    fechaPublicacion: blog.fecha_publicacion ? new Date(blog.fecha_publicacion) : null,
    fechaActualizacion: new Date(blog.fecha_actualizacion),
    seoMetaDescripcion: blog.seo_meta_descripcion,
    visitas: blog.visitas,
  }
}

// Convert backend simplified blog to frontend
export function convertBackendSimplificadoToFrontend(
  blog: BackendBlogSimplificado
): BlogSimplificado {
  return {
    id: blog.id,
    titulo: blog.titulo,
    slug: blog.slug,
    resumen: blog.resumen,
    imagenPrincipal: blog.imagen_principal,
    categoria: blog.categoria,
    tags: blog.tags,
    autor: blog.autor,
    fechaPublicacion: blog.fecha_publicacion ? new Date(blog.fecha_publicacion) : null,
    visitas: blog.visitas,
  }
}

// Convert frontend form data to API request
export function convertFormToRequest(formData: BlogFormData): BlogRequest {
  const request: BlogRequest = {
    titulo: formData.titulo,
    slug: formData.slug,
    resumen: formData.resumen,
    contenido: formData.contenido,
    categoria: formData.categoria,
    estado: formData.estado,
    autor: formData.autor,
    tags: formData.tags,
    seo_meta_descripcion: formData.seoMetaDescripcion || undefined,
    fecha_publicacion: formData.fechaPublicacion
      ? formData.fechaPublicacion.toISOString()
      : undefined,
  }
  return request
}

// Validate slug format (kebab-case)
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  return slugRegex.test(slug)
}

// Generate slug from title
export function generateSlugFromTitulo(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD") // Normalize to decomposed form
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
}
