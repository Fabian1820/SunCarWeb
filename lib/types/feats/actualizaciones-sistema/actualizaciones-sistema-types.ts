/** Changelog interno: lo que los desarrolladores publican en Inicio. */

export type CategoriaActualizacion =
  | "mejora"
  | "arreglo"
  | "nueva_funcion"
  | "otro";

export const ETIQUETA_CATEGORIA: Record<CategoriaActualizacion, string> = {
  mejora: "Mejora",
  arreglo: "Arreglo",
  nueva_funcion: "Nueva función",
  otro: "Otro",
};

export const CLASE_CATEGORIA: Record<CategoriaActualizacion, string> = {
  mejora: "bg-blue-100 text-blue-800 border-blue-200",
  arreglo: "bg-amber-100 text-amber-800 border-amber-200",
  nueva_funcion: "bg-emerald-100 text-emerald-800 border-emerald-200",
  otro: "bg-slate-100 text-slate-600 border-slate-200",
};

export interface ActualizacionSistema {
  id: string;
  titulo: string;
  mensaje: string;
  categoria: CategoriaActualizacion;
  autor_ci?: string | null;
  autor_nombre?: string | null;
  fecha_creacion: string;
}

export interface ActualizacionSistemaCreateData {
  titulo: string;
  mensaje: string;
  categoria: CategoriaActualizacion;
}
