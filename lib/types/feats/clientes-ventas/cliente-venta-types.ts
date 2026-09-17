export interface ClienteVenta {
  id: string;
  numero?: string;
  nombre: string;
  direccion?: string;
  provincia?: string;
  municipio?: string;
  telefono?: string;
  ci?: string;
  comercial?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  creado_por_ci?: string;
  actualizado_por_ci?: string;
  /** Los clientes creados antes de la anulacion no traen el campo: ausente = activo. */
  activo?: boolean;
  anulado_en?: string;
  anulado_por_ci?: string;
  /** Cliente interno (ej. Direccion Ejecutiva): sus ofertas/solicitudes nuevas nacen en precio 0. */
  precio_cero?: boolean;
}

export interface ClienteVentaCreateData {
  nombre: string;
  direccion?: string;
  provincia?: string;
  municipio?: string;
  telefono?: string;
  ci?: string;
  comercial?: string | null;
  precio_cero?: boolean;
}

export interface ClienteVentaUpdateData {
  nombre?: string;
  direccion?: string;
  provincia?: string;
  municipio?: string;
  telefono?: string;
  ci?: string;
  comercial?: string | null;
  precio_cero?: boolean;
}

export interface ClienteVentaListResponse {
  clientes?: ClienteVenta[];
  data?: ClienteVenta[];
  total?: number;
  skip?: number;
  limit?: number;
}
