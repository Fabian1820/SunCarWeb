/**
 * Hook personalizado para gestión de Galería Web
 * Maneja el estado y operaciones CRUD para las imágenes del bucket S3
 */

import { useState, useEffect, useCallback } from "react";
import { GaleriaWebService } from "@/lib/api-services";
import {
  FotoGaleria,
  CarpetaGaleria,
  SubirFotoData,
  EliminarFotoData,
} from "@/lib/types/feats/galeriaweb/galeriaweb-types";
import { toast } from "sonner";
import {
  optimizarImagenParaWeb,
  PRESETS_OPTIMIZACION,
} from "@/lib/utils/image-optimizer";

interface UseGaleriaWebReturn {
  // Estado
  fotos: FotoGaleria[];
  fotosFiltradas: FotoGaleria[];
  isLoading: boolean;
  error: string | null;
  carpetaActual: CarpetaGaleria | "todas";

  // Acciones
  cargarTodasFotos: () => Promise<void>;
  subirFoto: (data: SubirFotoData) => Promise<boolean>;
  subirMultiplesFotos: (
    carpeta: CarpetaGaleria,
    fotos: File[],
  ) => Promise<boolean>;
  eliminarFoto: (data: EliminarFotoData) => Promise<boolean>;
  cambiarCarpeta: (carpeta: CarpetaGaleria | "todas") => void;
  refetch: () => Promise<void>;
}

export function useGaleriaWeb(): UseGaleriaWebReturn {
  const [fotos, setFotos] = useState<FotoGaleria[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carpetaActual, setCarpetaActual] = useState<CarpetaGaleria | "todas">(
    "todas",
  );

  // Filtrar fotos según la carpeta actual
  const fotosFiltradas =
    carpetaActual === "todas"
      ? fotos
      : fotos.filter((foto) => foto.carpeta === carpetaActual);

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
      const errorMsg =
        err instanceof Error ? err.message : "Error al cargar las fotos";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sube una nueva foto (single)
   * Optimiza la imagen antes de subirla (convierte a JPG, redimensiona y comprime)
   */
  const subirFoto = useCallback(
    async (data: SubirFotoData): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        toast.info("Optimizando imagen...", { duration: 2000 });

        const fotoOptimizada = await optimizarImagenParaWeb(
          data.foto,
          PRESETS_OPTIMIZACION.galeria,
        );

        toast.info("Subiendo foto al servidor...", { duration: 2000 });

        const response = await GaleriaWebService.subirFoto({
          carpeta: data.carpeta,
          foto: fotoOptimizada,
        });

        if (response.success) {
          toast.success(response.message || "Foto subida exitosamente");
          await cargarTodasFotos();
          return true;
        } else {
          toast.error(response.message || "Error al subir la foto");
          return false;
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Error al subir la foto";
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [cargarTodasFotos],
  );

  /**
   * Sube múltiples fotos secuencialmente
   * Cada foto se optimiza individualmente antes de subirse
   */
  const subirMultiplesFotos = useCallback(
    async (carpeta: CarpetaGaleria, archivos: File[]): Promise<boolean> => {
      if (archivos.length === 0) return false;

      // Si es una sola foto, usar el flujo simple
      if (archivos.length === 1) {
        return subirFoto({ carpeta, foto: archivos[0] });
      }

      setIsLoading(true);
      setError(null);

      let exitosas = 0;
      let fallidas = 0;

      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        const num = i + 1;

        try {
          // Optimizar
          toast.info(`Optimizando imagen ${num}/${archivos.length}...`, {
            duration: 1500,
          });
          const fotoOptimizada = await optimizarImagenParaWeb(
            archivo,
            PRESETS_OPTIMIZACION.galeria,
          );

          // Subir
          toast.info(`Subiendo foto ${num}/${archivos.length}...`, {
            duration: 1500,
          });
          const response = await GaleriaWebService.subirFoto({
            carpeta,
            foto: fotoOptimizada,
          });

          if (response.success) {
            exitosas++;
          } else {
            fallidas++;
            console.error(
              `Error subiendo "${archivo.name}":`,
              response.message,
            );
          }
        } catch (err) {
          fallidas++;
          const errorMsg =
            err instanceof Error ? err.message : "Error desconocido";
          console.error(`Error procesando "${archivo.name}":`, errorMsg);
        }
      }

      // Mostrar resumen
      if (fallidas === 0) {
        toast.success(
          `${exitosas} ${exitosas === 1 ? "foto subida" : "fotos subidas"} exitosamente`,
        );
      } else if (exitosas > 0) {
        toast.warning(`${exitosas} subidas, ${fallidas} fallidas`);
      } else {
        toast.error("No se pudo subir ninguna foto");
      }

      // Recargar galería
      await cargarTodasFotos();
      setIsLoading(false);

      return fallidas === 0;
    },
    [subirFoto, cargarTodasFotos],
  );

  /**
   * Elimina una foto
   */
  const eliminarFoto = useCallback(
    async (data: EliminarFotoData): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await GaleriaWebService.eliminarFoto(data);

        if (response.success) {
          toast.success(response.message || "Foto eliminada exitosamente");
          await cargarTodasFotos();
          return true;
        } else {
          toast.error(response.message || "Error al eliminar la foto");
          return false;
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Error al eliminar la foto";
        setError(errorMsg);
        toast.error(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [cargarTodasFotos],
  );

  /**
   * Cambia la carpeta actual (solo cambia el filtro, no recarga datos)
   */
  const cambiarCarpeta = useCallback((carpeta: CarpetaGaleria | "todas") => {
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
    subirMultiplesFotos,
    eliminarFoto,
    cambiarCarpeta,
    refetch,
  };
}
