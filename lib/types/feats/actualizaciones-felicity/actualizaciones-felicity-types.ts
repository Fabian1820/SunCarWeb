/**
 * Tipos del catálogo de actualizaciones de equipos Felicity.
 *
 * Dos consumidores distintos del mismo backend:
 * - La página pública standalone (app/actualizaciones-felicity) donde Felicity sube.
 * - La página interna (app/equipos-felicity/actualizaciones) donde SunCar busca/descarga.
 */

export interface MaterialBusqueda {
  id: string; // = codigo del material
  categoria: string;
  modelo: string;
  marca_nombre?: string | null;
  potenciaKW?: number | null;
}

export interface ActualizacionFelicity {
  id?: string | null;
  material_codigo: string;
  material_descripcion: string;
  material_categoria?: string | null;
  material_marca?: string | null;
  material_potencia_kw?: number | null;
  cantidad: number;
  configuracion: string;
  version?: string | null;
  notas?: string | null;
  archivo_nombre: string;
  archivo_url: string;
  archivo_tamano?: number | null;
  subido_por?: string | null;
  creado_en: string;
}

export interface CasoActualizacionFelicity extends ActualizacionFelicity {
  ultima_actualizacion: string;
  total_versiones: number;
}

export interface SubirActualizacionPayload {
  material_codigo: string;
  material_descripcion: string;
  material_categoria?: string | null;
  material_marca?: string | null;
  material_potencia_kw?: number | null;
  cantidad: number;
  configuracion: string;
  version?: string;
  notas?: string;
  subido_por?: string;
  archivo: File;
}
