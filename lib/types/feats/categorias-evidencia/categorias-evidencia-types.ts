export type TipoTrabajoEvidencia = "instalacion_nueva" | "instalacion_en_proceso" | "averia" | "actualizacion";

export const TIPOS_EVIDENCIA: { valor: TipoTrabajoEvidencia; etiqueta: string }[] = [
  { valor: "instalacion_nueva", etiqueta: "Instalación nueva" },
  { valor: "instalacion_en_proceso", etiqueta: "Instalación en proceso" },
  { valor: "averia", etiqueta: "Avería" },
  { valor: "actualizacion", etiqueta: "Actualización" },
];

/** Qué fotos o vídeos hay que subir en un trabajo diario. */
export interface CategoriaEvidencia {
  id?: string;
  nombre: string;
  descripcion?: string | null;
  tipos_trabajo: TipoTrabajoEvidencia[];
  obligatoria: boolean;
  orden: number;
  activa: boolean;
}
