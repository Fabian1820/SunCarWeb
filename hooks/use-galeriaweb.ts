/**
 * Hook personalizado para gestión de Galería Web
 * Maneja el estado y operaciones CRUD para las imágenes del bucket S3
 */

import { useState, useEffect, useCallback } from 'react';
import { GaleriaWebService } from '@/lib/api-services';
import {
  FotoGaleria,
  CarpetaGaleria,
  SubirFotoData,
  EliminarFotoData
} from '@/lib/types/feats/galeriaweb/galeriaweb-types';
import { toast } from 'sonner';
import { optimizarImagenParaWeb, PRESETS_OPTIMIZACION } from '@/lib/utils/image-optimizer';

interface UseGaleriaWebReturn {
  // Estado
  fotos: FotoGaleria[];
  fotosFiltradas: FotoGaleria[];
  isLoading: boolean;
  error: string | null;
  carpetaActual: CarpetaGaleria | 'todas';

  // Acciones
  cargarTodasFotos: () => Promise<void>;
  subirFoto: (data: SubirFotoData) => Promise<boolean>;
  eliminarFoto: (data: EliminarFotoData) => Promise<boolean>;
  cambiarCarpeta: (carpeta: CarpetaGaleria | 'todas') => void;
  refetch: () => Promise<void>;
}

export function useGaleriaWeb(): UseGaleriaWebReturn {
  const [fotos, setFotos] = useState<FotoGaleria[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carpetaActual, setCarpetaActual] = useState<CarpetaGaleria | 'todas'>('todas');

  // Filtrar fotos según la carpeta actual
  const fotosFiltradas = carpetaActual === 'todas' 
    ? fotos 
    : fotos.filter(foto => foto.carpeta === carpetaActual);

  /**
   * Carga todas las fotos del bucket
   */
  const cargarTodasFotos = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await GaleriaWebService.getAllFotos();
      setFotos(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cargar las fotos';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sube una nueva foto
   * Optimiza la imagen antes de subirla (convierte a JPG, redimensiona y comprime)
   */
  const subirFoto = useCallback(async (data: SubirFotoData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Optimizar imagen antes de subir
      toast.info('Optimizando imagen...', { duration: 2000 });

      const fotoOptimizada = await optimizarImagenParaWeb(
        data.foto,
        PRESETS_OPTIMIZACION.galeria // Usa preset para galerías web
      );

      // 2. Subir foto optimizada
      toast.info('Subiendo foto al servidor...', { duration: 2000 });

      const response = await GaleriaWebService.subirFoto({
        carpeta: data.carpeta,
        foto: fotoOptimizada
      });

      if (response.success) {
        toast.success(response.message || 'Foto subida exitosamente');

        // Recargar todas las fotos
        await cargarTodasFotos();

        return true;
      } else {
        toast.error(response.message || 'Error al subir la foto');
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al subir la foto';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [cargarTodasFotos]);

  /**
   * Elimina una foto
   */
  const eliminarFoto = useCallback(async (data: EliminarFotoData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await GaleriaWebService.eliminarFoto(data);

      if (response.success) {
        toast.success(response.message || 'Foto eliminada exitosamente');

        // Recargar todas las fotos
        await cargarTodasFotos();

        return true;
      } else {
        toast.error(response.message || 'Error al eliminar la foto');
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al eliminar la foto';
      setError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [cargarTodasFotos]);

  /**
   * Cambia la carpeta actual (solo cambia el filtro, no recarga datos)
   */
  const cambiarCarpeta = useCallback((carpeta: CarpetaGaleria | 'todas') => {
    setCarpetaActual(carpeta);
  }, []);

  /**
   * Recarga todas las fotos
   */
  const refetch = useCallback(async () => {
    await cargarTodasFotos();
  }, [cargarTodasFotos]);

  // Carga inicial de todas las fotos
  useEffect(() => {
    cargarTodasFotos();
  }, [cargarTodasFotos]);

  return {
    fotos,
    fotosFiltradas,
    isLoading,
    error,
    carpetaActual,
    cargarTodasFotos,
    subirFoto,
    eliminarFoto,
    cambiarCarpeta,
    refetch
  };
}
