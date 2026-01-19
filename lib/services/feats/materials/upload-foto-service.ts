/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiRequest } from '../../../api-config'

export class UploadFotoService {
  /**
   * Sube una foto de material a MinIO y retorna la URL pública
   */
  static async uploadFoto(file: File): Promise<string> {
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen')
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('La imagen no debe superar 5MB')
    }

    const formData = new FormData()
    formData.append('foto', file)

    try {
      const result = await apiRequest<{ success: boolean; message: string; url: string }>(
        '/productos/upload-foto',
        {
          method: 'POST',
          body: formData,
          headers: {}, // Dejar que el navegador establezca Content-Type para FormData
        }
      )

      if (!result.success || !result.url) {
        throw new Error(result.message || 'Error al subir la foto')
      }

      return result.url
    } catch (error: any) {
      console.error('[UploadFotoService] Error al subir foto:', error)
      throw new Error(error.message || 'Error al subir la foto')
    }
  }
}
