/**
 * Tipos para el módulo de Galería Web
 * Gestiona las imágenes del bucket S3 'galeria' organizadas por carpetas
 */

/**
 * Carpetas válidas en el bucket de galería
 */
export type CarpetaGaleria =
  | 'instalaciones_exterior'
  | 'instalaciones_interior'
  | 'nosotros';

/**
 * Estructura de una foto en la galería
 */
export interface FotoGaleria {
  nombre_archivo: string;  // Nombre completo incluyendo carpeta (ej: "instalaciones_exterior/foto1.jpg")
  url: string;             // URL pública para acceder a la imagen
  carpeta: CarpetaGaleria; // Carpeta donde se encuentra la imagen
  tamano: number;          // Tamaño del archivo en bytes
  fecha_subida: string;    // Fecha y hora de subida (ISO format)
}

/**
 * Respuesta estándar del API para operaciones de galería
 */
export interface GaleriaWebResponse {
  success: boolean;
  message: string;
  data?: FotoGaleria[];
  url?: string;
  nombre_archivo?: string;
}

/**
 * Datos para subir una nueva foto
 */
export interface SubirFotoData {
  carpeta: CarpetaGaleria;
  foto: File;
}

/**
 * Datos para eliminar una foto
 */
export interface EliminarFotoData {
  nombre_archivo: string;  // Formato: {carpeta}/{nombre_imagen}
}

/**
 * Información de carpetas con sus descripciones
 */
export const CARPETAS_INFO: Record<CarpetaGaleria, { label: string; descripcion: string }> = {
  instalaciones_exterior: {
    label: 'Instalaciones Exterior',
    descripcion: 'Fotos de instalaciones solares exteriores'
  },
  instalaciones_interior: {
    label: 'Instalaciones Interior',
    descripcion: 'Fotos de instalaciones solares interiores'
  },
  nosotros: {
    label: 'Nosotros',
    descripcion: 'Fotos del equipo y empresa'
  }
};

/**
 * Extensiones de imagen válidas
 */
export const EXTENSIONES_VALIDAS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Content types de imagen válidos
 */
export const CONTENT_TYPES_VALIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
