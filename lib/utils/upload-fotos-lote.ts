/**
 * Utilidades compartidas por los diálogos de "agregar fotos/videos" de clientes
 * y de leads.
 *
 * El backend acepta un archivo por petición (`POST /clientes/{numero}/fotos` y
 * `POST /leads/{id}/fotos`), así que un lote se sube de uno en uno y puede
 * quedar a medias: los archivos que fallan vuelven al diálogo para reintentarlos
 * sin repetir los que ya se guardaron.
 */

export interface UploadFotoFallido {
  file: File;
  message: string;
}

export interface UploadFotosResultado {
  subidos: number;
  fallidos: UploadFotoFallido[];
}

/** Identidad de un archivo elegido, para deduplicar entre selecciones. */
export const fileKey = (file: File) =>
  `${file.name}-${file.size}-${file.lastModified}`;

export const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Agrega archivos recién elegidos a los que ya estaban en la lista, sin
 * duplicados. El input de tipo file reemplaza su selección en cada `change`,
 * y aquí interesa poder ir sumando de tandas distintas.
 */
export const agregarArchivosSinDuplicar = (previos: File[], nuevos: File[]) => {
  const claves = new Set(previos.map(fileKey));
  return [...previos, ...nuevos.filter((file) => !claves.has(fileKey(file)))];
};

/**
 * Sube un lote llamando a `subirUno` archivo por archivo, informando cuántos
 * lleva procesados (subidos + fallidos) para que la UI muestre el progreso.
 */
export const subirFotosEnLote = async (
  files: File[],
  subirUno: (file: File) => Promise<void>,
  onProgress?: (procesados: number) => void,
): Promise<UploadFotosResultado> => {
  const fallidos: UploadFotoFallido[] = [];
  let subidos = 0;

  for (const file of files) {
    try {
      await subirUno(file);
      subidos += 1;
    } catch (error: unknown) {
      fallidos.push({
        file,
        message:
          error instanceof Error ? error.message : "No se pudo subir el archivo",
      });
    }
    onProgress?.(subidos + fallidos.length);
  }

  return { subidos, fallidos };
};

/** Texto del toast de error/parcial: detalla los primeros fallos del lote. */
export const describirFallidos = (fallidos: UploadFotoFallido[]) => {
  const detalle = fallidos
    .slice(0, 3)
    .map((fallido) => `${fallido.file.name}: ${fallido.message}`)
    .join(" • ");
  const resto = fallidos.length > 3 ? ` (+${fallidos.length - 3} más)` : "";
  return `${detalle}${resto}`;
};
