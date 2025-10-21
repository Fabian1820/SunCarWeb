// Blog feature types and helpers derived from the documented API.

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
  fecha_creacion: string
  fecha_publicacion: string | null
  fecha_actualizacion: string
  seo_meta_descripcion: string | null
  visitas: number
}

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
  fecha_publicacion?: string
}

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

export type Categoria =
  | 'instalacion'
  | 'mantenimiento'
  | 'casos_exito'
  | 'ahorro_energetico'
  | 'novedades'
  | 'normativas'

export type Estado = 'borrador' | 'publicado' | 'archivado'

export function getCategoriaDisplayName(categoria: Categoria): string {
  const nombres: Record<Categoria, string> = {
    instalacion: 'Instalación',
    mantenimiento: 'Mantenimiento',
    casos_exito: 'Casos de Éxito',
    ahorro_energetico: 'Ahorro Energético',
    novedades: 'Novedades',
    normativas: 'Normativas',
  }
  return nombres[categoria]
}

export function getCategoriaColor(categoria: Categoria): string {
  const colores: Record<Categoria, string> = {
    instalacion: 'blue',
    mantenimiento: 'green',
    casos_exito: 'orange',
    ahorro_energetico: 'emerald',
    novedades: 'purple',
    normativas: 'gray',
  }
  return colores[categoria]
}

export function getEstadoDisplayName(estado: Estado): string {
  const nombres: Record<Estado, string> = {
    borrador: 'Borrador',
    publicado: 'Publicado',
    archivado: 'Archivado',
  }
  return nombres[estado]
}

export function getEstadoColor(estado: Estado): string {
  const colores: Record<Estado, string> = {
    borrador: 'yellow',
    publicado: 'green',
    archivado: 'gray',
  }
  return colores[estado]
}

export function generateSlugFromTitulo(titulo: string): string {
  if (!titulo) return ''

  const normalized = titulo
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

  return normalized
}

export function isValidSlug(slug: string): boolean {
  if (!slug) return false
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}
