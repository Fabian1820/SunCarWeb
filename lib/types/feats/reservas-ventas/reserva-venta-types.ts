export type ReservaEstado = "activa" | "cancelada" | "expirada" | "consumida";
export type ReservaOrigen = "instaladora" | "ventas";
export type ReservaClienteTipo = "cliente" | "cliente_venta";

export interface MaterialReserva {
  material_id: string;
  cantidad_reservada: number;
  cantidad_consumida: number;
}

export interface MaterialReservaConsumir {
  material_id: string;
  cantidad_consumida: number;
}

export interface Reserva {
  id: string;
  reserva_id: string;
  almacen_id: string;
  materiales: MaterialReserva[];
  estado: ReservaEstado;
  origen: ReservaOrigen;
  oferta_id?: string | null;
  cliente_id: string;
  cliente_tipo: ReservaClienteTipo;
  fecha_reserva: string;
  fecha_expiracion: string;
  fecha_cierre?: string | null;
  creado_por: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  // Campos populados opcionales (si el backend los incluye)
  almacen_nombre?: string;
  cliente_nombre?: string;
  creado_por_nombre?: string;
}

export interface ReservaCreateData {
  almacen_id: string;
  materiales: MaterialReserva[];
  cliente_id: string;
  cliente_tipo: ReservaClienteTipo;
  fecha_expiracion: string;
  oferta_id?: string;
}

export interface ReservaUpdateData {
  fecha_expiracion?: string;
  materiales?: MaterialReserva[];
}

export interface ReservaConsumirData {
  materiales: MaterialReservaConsumir[];
}

export interface ReservaListParams {
  estado?: ReservaEstado;
  origen?: ReservaOrigen;
  almacen_id?: string;
  cliente_id?: string;
  oferta_id?: string;
  skip?: number;
  limit?: number;
}

export interface ReservaListResponse {
  success: boolean;
  message: string;
  data: Reserva[];
  total: number;
  skip: number;
  limit: number;
}
