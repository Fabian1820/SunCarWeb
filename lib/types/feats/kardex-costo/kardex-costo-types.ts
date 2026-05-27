export interface KardexCosto {
  id: string;
  material_id: string;
  almacen_id: string;
  fecha: string;
  movimiento_id?: string;
  compra_id?: string;
  solicitud_entrada_id?: string;
  cantidad_anterior: number;
  costo_anterior: number;
  cantidad_entrada: number;
  costo_entrada: number;
  cantidad_nueva: number;
  costo_nuevo: number;
  registrado_por_ci?: string;
  nota?: string;
}

export interface KardexEntradaCreateData {
  material_id: string;
  almacen_id: string;
  cantidad_entrada: number;
  costo_entrada: number;
  compra_id?: string;
  movimiento_id?: string;
  solicitud_entrada_id?: string;
  nota?: string;
}

export interface KardexHistorialParams {
  material_id?: string;
  almacen_id?: string;
  skip?: number;
  limit?: number;
}

export interface CostoActualResponse {
  material_id: string;
  almacen_id: string;
  costo_actual: number | null;
}
