// Tipos para materiales bajo stock mínimo

export interface MaterialBajoMinimo {
  material_id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  um: string;
  foto: string | null;
  cantidad_actual: number;
  stockaje_minimo: number;
  diferencia: number;
  ubicacion_en_almacen: string | null;
}

export interface AlmacenConMaterialesBajos {
  almacen_id: string;
  almacen: {
    id: string;
    nombre: string;
    codigo: string;
    direccion: string;
    responsable: string;
  };
  total_materiales_bajo_minimo: number;
  materiales: MaterialBajoMinimo[];
}

export interface MaterialesBajoMinimoResponse {
  success: boolean;
  message: string;
  total_almacenes: number;
  data: AlmacenConMaterialesBajos[];
}
