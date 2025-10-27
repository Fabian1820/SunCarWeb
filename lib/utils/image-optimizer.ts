/**
 * Utilidad para optimizar imágenes antes de subirlas al servidor
 * Convierte cualquier formato a JPG y comprime para web
 * Inspirado en el script PowerShell de optimización agresiva
 */

import heic2any from 'heic2any';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 (0.85 = 85%)
  modoAgresivo?: boolean;
  outputFormat?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1200,
  maxHeight: 800,
  quality: 0.85,
  modoAgresivo: true,
  outputFormat: 'image/jpeg'
};

/**
 * Optimiza una imagen para web
 * - Convierte cualquier formato (incluyendo HEIC) a JPG
 * - Redimensiona manteniendo proporción
 * - Comprime con calidad configurable
 *
 * @param file - Archivo de imagen original
 * @param options - Opciones de optimización
 * @returns Nuevo archivo optimizado
 */
export async function optimizarImagenParaWeb(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Ajustar calidad si es modo agresivo
  if (opts.modoAgresivo) {
    opts.quality = Math.max(opts.quality - 0.10, 0.70); // Mínimo 70% para web
  }

  try {
    // 1. Cargar imagen original
    const imageBitmap = await cargarImagen(file);

    // 2. Calcular nuevas dimensiones manteniendo proporción
    const { width: nuevoAncho, height: nuevoAlto } = calcularNuevasDimensiones(
      imageBitmap.width,
      imageBitmap.height,
      opts.maxWidth,
      opts.maxHeight
    );

    // 3. Crear canvas y redimensionar con alta calidad
    const canvas = document.createElement('canvas');
    canvas.width = nuevoAncho;
    canvas.height = nuevoAlto;

    const ctx = canvas.getContext('2d', {
      alpha: false, // Sin canal alfa para JPG
      desynchronized: false,
      willReadFrequently: false
    });

    if (!ctx) {
      throw new Error('No se pudo crear el contexto 2D del canvas');
    }

    // Configurar renderizado de alta calidad (equivalente a HighQuality en .NET)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fondo blanco para imágenes con transparencia
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, nuevoAncho, nuevoAlto);

    // 4. Dibujar imagen redimensionada
    ctx.drawImage(imageBitmap, 0, 0, nuevoAncho, nuevoAlto);

    // Limpiar bitmap
    imageBitmap.close();

    // 5. Convertir canvas a Blob con compresión
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Error al convertir canvas a blob'));
          }
        },
        opts.outputFormat,
        opts.quality
      );
    });

    // 6. Crear nuevo archivo con nombre optimizado
    const nombreOriginal = file.name.replace(/\.[^/.]+$/, ''); // Sin extensión
    const extension = opts.outputFormat === 'image/webp' ? 'webp' : 'jpg';
    const nombreOptimizado = `${nombreOriginal}_optimizado.${extension}`;

    const archivoOptimizado = new File([blob], nombreOptimizado, {
      type: opts.outputFormat,
      lastModified: Date.now()
    });

    // Log de resultados
    const tamanoOriginal = file.size;
    const tamanoNuevo = archivoOptimizado.size;
    const ahorro = tamanoOriginal - tamanoNuevo;
    const porcentajeAhorro = ((ahorro / tamanoOriginal) * 100).toFixed(1);

    console.log('📸 Imagen optimizada:');
    console.log(`  Original: ${formatearTamano(tamanoOriginal)} (${file.type})`);
    console.log(`  Optimizada: ${formatearTamano(tamanoNuevo)} (${archivoOptimizado.type})`);
    console.log(`  Dimensiones: ${imageBitmap.width}x${imageBitmap.height} → ${nuevoAncho}x${nuevoAlto}px`);
    console.log(`  Ahorro: ${porcentajeAhorro}% (${formatearTamano(ahorro)})`);

    return archivoOptimizado;

  } catch (error) {
    console.error('Error optimizando imagen:', error);
    throw new Error(`No se pudo optimizar la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Carga una imagen desde un archivo usando createImageBitmap
 * Soporta HEIC, PNG, JPG, WebP, etc.
 *
 * Para HEIC/HEIF usa heic2any para convertir a JPG en el navegador
 */
async function cargarImagen(file: File): Promise<ImageBitmap> {
  // Detectar si es HEIC/HEIF
  const esHEIC = file.name.toLowerCase().endsWith('.heic') ||
                 file.name.toLowerCase().endsWith('.heif') ||
                 file.type === 'image/heic' ||
                 file.type === 'image/heif';

  // Si es HEIC, convertir primero a JPG
  if (esHEIC) {
    console.log('🔄 Detectado archivo HEIC/HEIF, convirtiendo a JPG...');
    try {
      const archivoConvertido = await convertirHEICaJPG(file);
      return await createImageBitmap(archivoConvertido, {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'default',
        resizeQuality: 'high'
      });
    } catch (error) {
      console.error('Error convirtiendo HEIC:', error);
      throw new Error(`No se pudo convertir el archivo HEIC: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }
  }

  // Para otros formatos, intentar carga directa
  try {
    return await createImageBitmap(file, {
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'default',
      resizeQuality: 'high'
    });
  } catch (error) {
    console.warn('createImageBitmap falló con el archivo original, intentando con fallback...', error);

    // Intento 2: Usar FileReader + Image para formatos estándar
    try {
      return await cargarImagenConFileReader(file);
    } catch (fallbackError) {
      throw new Error(`No se pudo cargar la imagen: ${fallbackError instanceof Error ? fallbackError.message : 'formato no soportado'}`);
    }
  }
}

/**
 * Convierte un archivo HEIC/HEIF a JPG usando heic2any
 */
async function convertirHEICaJPG(file: File): Promise<Blob> {
  try {
    const resultado = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.95 // Alta calidad para la conversión inicial
    });

    // heic2any puede devolver Blob o Blob[]
    if (Array.isArray(resultado)) {
      return resultado[0];
    }

    return resultado;
  } catch (error) {
    console.error('Error en heic2any:', error);
    throw new Error('No se pudo convertir el archivo HEIC/HEIF. Asegúrate de que el archivo no esté corrupto.');
  }
}

/**
 * Carga imagen usando FileReader (fallback para navegadores que no soporten createImageBitmap directamente)
 */
async function cargarImagenConFileReader(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error('No se pudo leer el archivo'));
          return;
        }

        const blob = new Blob([arrayBuffer], { type: file.type });
        const imageBitmap = await createImageBitmap(blob);
        resolve(imageBitmap);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Calcula nuevas dimensiones manteniendo la proporción
 * Si la imagen es más pequeña que los límites, no se agranda
 */
function calcularNuevasDimensiones(
  anchoOriginal: number,
  altoOriginal: number,
  maxAncho: number,
  maxAlto: number
): { width: number; height: number } {
  const ratioX = maxAncho / anchoOriginal;
  const ratioY = maxAlto / altoOriginal;
  const ratio = Math.min(ratioX, ratioY, 1); // No agrandar si es más pequeña

  return {
    width: Math.round(anchoOriginal * ratio),
    height: Math.round(altoOriginal * ratio)
  };
}

/**
 * Formatea un tamaño en bytes a una representación legible
 */
function formatearTamano(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    return `${bytes} bytes`;
  }
}

/**
 * Verifica si un archivo necesita optimización
 */
export function necesitaOptimizacion(
  file: File,
  maxSize: number = 1024 * 1024 // 1MB por defecto
): boolean {
  // Siempre optimizar HEIC
  if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
    return true;
  }

  // Optimizar si es más grande que el tamaño máximo
  if (file.size > maxSize) {
    return true;
  }

  // Optimizar formatos no web
  const formatosNoWeb = ['image/bmp', 'image/tiff', 'image/tif'];
  if (formatosNoWeb.includes(file.type)) {
    return true;
  }

  return false;
}

/**
 * Opciones preconfiguradas para diferentes casos de uso
 */
export const PRESETS_OPTIMIZACION = {
  /** Para galerías web - Balance entre calidad y tamaño */
  galeria: {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 0.85,
    modoAgresivo: true,
    outputFormat: 'image/jpeg' as const
  },

  /** Para thumbnails - Máxima compresión */
  thumbnail: {
    maxWidth: 300,
    maxHeight: 300,
    quality: 0.75,
    modoAgresivo: true,
    outputFormat: 'image/jpeg' as const
  },

  /** Para banners - Alta calidad */
  banner: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.90,
    modoAgresivo: false,
    outputFormat: 'image/jpeg' as const
  },

  /** Compresión agresiva - Para muchas imágenes */
  agresivo: {
    maxWidth: 1000,
    maxHeight: 700,
    quality: 0.70,
    modoAgresivo: true,
    outputFormat: 'image/jpeg' as const
  }
};
