/**
 * Recomprime una imagen en el navegador antes de subirla: la reduce a un
 * tamaño máximo razonable para portada/miniatura y la reencodea en WebP,
 * sin que se note la pérdida a simple vista (misma calidad visual que ya
 * se usa en las fotos de las ofertas genéricas: 900px, calidad 0.8).
 *
 * Si el navegador no soporta exportar WebP desde canvas (algunos Safari
 * viejos), devuelve el archivo original tal cual — mejor subir sin
 * comprimir que fallar la subida.
 */
export async function comprimirImagen(
  file: File,
  opciones: { maxLado?: number; calidad?: number } = {},
): Promise<File> {
  const { maxLado = 900, calidad = 0.8 } = opciones;

  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  try {
    const bitmap = await cargarBitmap(file);
    const { width, height } = escalarDentroDe(
      bitmap.width,
      bitmap.height,
      maxLado,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", calidad),
    );
    if (!blob) return file;

    // Si por lo que sea salió más pesado que el original (imágenes ya muy
    // comprimidas, o el navegador cayendo a un formato más pesado), no vale
    // la pena reemplazar el archivo.
    if (blob.size >= file.size) return file;

    const nuevoNombre = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], nuevoNombre, { type: "image/webp" });
  } catch {
    return file;
  }
}

function cargarBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function escalarDentroDe(
  anchoOriginal: number,
  altoOriginal: number,
  maxLado: number,
): { width: number; height: number } {
  const ladoMayor = Math.max(anchoOriginal, altoOriginal);
  if (ladoMayor <= maxLado) {
    return { width: anchoOriginal, height: altoOriginal };
  }
  const factor = maxLado / ladoMayor;
  return {
    width: Math.round(anchoOriginal * factor),
    height: Math.round(altoOriginal * factor),
  };
}

/**
 * Reescala y recomprime la foto de un vale firmado antes de subirla.
 *
 * Distinta de `comprimirImagen` a propósito: aquello es para portadas y
 * miniaturas (900px WebP), y aquí lo que se fotografía es un papel con una
 * firma que hay que poder leer. 2000px en JPEG deja el archivo en cientos de
 * KB sin perder legibilidad, lo que importa bastante subiendo desde datos
 * móviles. JPEG y no WebP porque el archivo acaba abriéndose y a veces
 * imprimiéndose desde cualquier visor.
 *
 * Si algo falla (formato que el navegador no decodifica, canvas bloqueado,
 * HEIC de iPhone donde no se soporta) devuelve el original: es mejor subir
 * 6 MB que no subir nada.
 */
const LADO_MAXIMO_VALE_PX = 2000;
const CALIDAD_JPEG_VALE = 0.85;
/** Por debajo de esto no vale la pena recomprimir. */
const TAMANO_MINIMO_PARA_COMPRIMIR = 700 * 1024;

export async function comprimirImagenSiAplica(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // El GIF puede estar animado y recomprimirlo lo destruiría.
  if (file.type === "image/gif") return file;
  if (file.size <= TAMANO_MINIMO_PARA_COMPRIMIR) return file;
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  try {
    const bitmap = await cargarBitmap(file);
    const { width, height } = escalarDentroDe(
      bitmap.width,
      bitmap.height,
      LADO_MAXIMO_VALE_PX,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPEG_VALE),
    );
    if (!blob || blob.size >= file.size) return file;

    const nuevoNombre = (file.name.replace(/\.[^.]+$/, "") || "foto") + ".jpg";
    return new File([blob], nuevoNombre, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export function formatearTamano(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
