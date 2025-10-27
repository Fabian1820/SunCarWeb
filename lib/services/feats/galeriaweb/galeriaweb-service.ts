/**
 * Servicio de API para Galería Web
 * Gestiona las operaciones CRUD para imágenes del bucket S3 'galeria'
 */

import { apiRequest } from '@/lib/api-config';
import {
  FotoGaleria,
  GaleriaWebResponse,
  CarpetaGaleria,
  SubirFotoData,
  EliminarFotoData
} from '@/lib/types/feats/galeriaweb/galeriaweb-types';

const GALERIAWEB_BASE = '/galeriaweb';

export class GaleriaWebService {
  /**
   * Obtiene todas las fotos de todas las carpetas del bucket 'galeria'
   */
  static async getAllFotos(): Promise<FotoGaleria[]> {
    try {
      const response = await apiRequest<GaleriaWebResponse>(
        `${GALERIAWEB_BASE}/`,
        {
          method: 'GET',
        }
      );

      return response.data || [];
    } catch (error) {
      console.error('Error al obtener todas las fotos:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las fotos de una carpeta específica
   * @param carpeta - Nombre de la carpeta (instalaciones_exterior, instalaciones_interior, nosotros)
   */
  static async getFotosPorCarpeta(carpeta: CarpetaGaleria): Promise<FotoGaleria[]> {
    try {
      const response = await apiRequest<GaleriaWebResponse>(
        `${GALERIAWEB_BASE}/${carpeta}`,
        {
          method: 'GET',
        }
      );

      return response.data || [];
    } catch (error) {
      console.error(`Error al obtener fotos de la carpeta ${carpeta}:`, error);
      throw error;
    }
  }

  /**
   * Sube una nueva foto a una carpeta específica
   * @param data - Datos de la foto a subir (carpeta y archivo)
   */
  static async subirFoto(data: SubirFotoData): Promise<GaleriaWebResponse> {
    try {
      const formData = new FormData();
      formData.append('carpeta', data.carpeta);
      formData.append('foto', data.foto);

      const response = await apiRequest<GaleriaWebResponse>(
        `${GALERIAWEB_BASE}/`,
        {
          method: 'POST',
          body: formData,
          // No incluir Content-Type header, fetch lo manejará automáticamente para FormData
        }
      );

      return response;
    } catch (error) {
      console.error('Error al subir foto:', error);
      throw error;
    }
  }

  /**
   * Elimina una foto del bucket
   * @param data - Datos de la foto a eliminar (nombre_archivo completo con carpeta)
   */
  static async eliminarFoto(data: EliminarFotoData): Promise<GaleriaWebResponse> {
    try {
      const formData = new FormData();
      formData.append('nombre_archivo', data.nombre_archivo);

      const response = await apiRequest<GaleriaWebResponse>(
        `${GALERIAWEB_BASE}/`,
        {
          method: 'DELETE',
          body: formData,
        }
      );

      return response;
    } catch (error) {
      console.error('Error al eliminar foto:', error);
      throw error;
    }
  }
}
