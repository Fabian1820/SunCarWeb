/** Lo que devuelve GET /operaciones/vales-salida/entregas-devoluciones/dia. */

export interface MaterialEntregado {
  material_id: string;
  material_codigo?: string | null;
  material_descripcion?: string | null;
  um?: string | null;
  cantidad: number;
  /** Lo devuelto de ese material en todas las devoluciones del vale. */
  devuelto: number;
}

export interface MaterialDevuelto {
  material_id: string;
  material_codigo?: string | null;
  material_descripcion?: string | null;
  um?: string | null;
  cantidad: number;
}

export interface DevolucionRegistrada {
  id: string;
  /** ISO en hora de Cuba. */
  fecha?: string | null;
  /** Quién devolvió el material. */
  responsable?: string | null;
  comentario?: string | null;
  /** Quién registró la devolución en el sistema. */
  registrado_por?: string | null;
  materiales: MaterialDevuelto[];
}

export interface ValeEntregado {
  vale_id: string;
  codigo: string;
  estado: "usado" | "anulado" | "devuelto";
  tipo: "material" | "venta";
  fecha?: string | null;
  solicitud_codigo?: string | null;
  almacen_id?: string | null;
  almacen_nombre?: string | null;
  cliente_numero?: string | null;
  cliente_nombre?: string | null;
  cliente_direccion?: string | null;
  recogido_por?: string | null;
  entregado_por?: string | null;
  motivo_anulacion?: string | null;
}

export interface EntregaDelDia extends ValeEntregado {
  materiales: MaterialEntregado[];
  devoluciones: DevolucionRegistrada[];
  devolucion_total: boolean;
}

export interface DevolucionOtroDia extends DevolucionRegistrada {
  vale: ValeEntregado;
}

export interface EntregasDelDia {
  fecha: string;
  totales: {
    entregas: number;
    anulados: number;
    clientes: number;
    con_devolucion: number;
    devoluciones_otros_dias: number;
  };
  almacenes: { id: string; nombre: string }[];
  entregas: EntregaDelDia[];
  devoluciones_otros_dias: DevolucionOtroDia[];
}
