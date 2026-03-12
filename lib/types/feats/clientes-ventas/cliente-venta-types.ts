export interface ClienteVenta {
  id: string;
  numero?: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  ci?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface ClienteVentaCreateData {
  nombre: string;
  direccion?: string;
  telefono?: string;
  ci?: string;
}

export interface ClienteVentaUpdateData {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  ci?: string;
}

export interface ClienteVentaListResponse {
  clientes?: ClienteVenta[];
  data?: ClienteVenta[];
  total?: number;
  skip?: number;
  limit?: number;
}
