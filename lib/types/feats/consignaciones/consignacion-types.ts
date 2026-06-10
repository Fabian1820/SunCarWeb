export type ConsignacionEstado =
  | "activa"
  | "pagada_parcial"
  | "devuelta_parcial"
  | "mixta_parcial"
  | "cerrada_pagada"
  | "cerrada_devuelta"
  | "cerrada_mixta"
  | "anulada";

export const CONSIGNACION_ESTADOS_ABIERTOS: ConsignacionEstado[] = [
  "activa",
  "pagada_parcial",
  "devuelta_parcial",
  "mixta_parcial",
];

export const CONSIGNACION_ESTADOS_CERRADOS: ConsignacionEstado[] = [
  "cerrada_pagada",
  "cerrada_devuelta",
  "cerrada_mixta",
];

export interface MaterialConsignado {
  material_id: string;
  material_codigo?: string | null;
  material_descripcion?: string | null;
  um?: string | null;
  cantidad: number;
  precio_unitario_consignado: number;
  subtotal_consignado: number;
}

export interface MaterialDevuelto {
  material_id: string;
  cantidad: number;
  precio_unitario_consignado: number;
  valor: number;
}

export interface DevolucionConsignacion {
  id: string;
  materiales: MaterialDevuelto[];
  valor_total: number;
  solicitud_entrada_almacen_id?: string | null;
  notas?: string | null;
  fecha: string;
  registrado_por_ci?: string | null;
}

export interface Consignacion {
  id: string;
  solicitud_venta_id: string;
  cliente_venta_id?: string | null;
  almacen_id?: string | null;
  moneda: "USD" | "CUP" | "EUR" | string;
  monto_total: number;
  monto_pagado_efectivo: number;
  valor_devuelto: number;
  monto_pendiente: number;
  saldo_a_favor: number;
  materiales_entregados: MaterialConsignado[];
  devoluciones: DevolucionConsignacion[];
  pagos_ids: string[];
  estado: ConsignacionEstado | string;
  fecha_creacion: string;
  fecha_ultimo_movimiento: string;
  fecha_cierre?: string | null;
  creado_por_ci?: string | null;
  actualizado_por_ci?: string | null;
  notas?: string | null;
}

export interface ConsignacionCreateData {
  solicitud_venta_id: string;
  moneda?: "USD" | "CUP" | "EUR";
  pago_inicial_id?: string | null;
  notas?: string | null;
}

export interface ConsignacionListParams {
  skip?: number;
  limit?: number;
  estado?: ConsignacionEstado | string;
  cliente_venta_id?: string;
  solicitud_venta_id?: string;
}

export interface ConsignacionListResponse {
  data: Consignacion[];
  total: number;
}

export interface DevolucionMaterialPayload {
  material_id: string;
  cantidad: number;
}

export interface RegistrarDevolucionData {
  materiales: DevolucionMaterialPayload[];
  notas?: string | null;
  solicitud_entrada_almacen_id?: string | null;
}

export const CONSIGNACION_ESTADO_LABELS: Record<string, string> = {
  activa: "Activa",
  pagada_parcial: "Pagada parcial",
  devuelta_parcial: "Devuelta parcial",
  mixta_parcial: "Mixta parcial",
  cerrada_pagada: "Cerrada (pagada)",
  cerrada_devuelta: "Cerrada (devuelta)",
  cerrada_mixta: "Cerrada (mixta)",
  anulada: "Anulada",
};

export const CONSIGNACION_ESTADO_BADGE_CLASSES: Record<string, string> = {
  activa: "bg-amber-100 text-amber-800 border-amber-200",
  pagada_parcial: "bg-blue-100 text-blue-800 border-blue-200",
  devuelta_parcial: "bg-purple-100 text-purple-800 border-purple-200",
  mixta_parcial: "bg-indigo-100 text-indigo-800 border-indigo-200",
  cerrada_pagada: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cerrada_devuelta: "bg-slate-100 text-slate-800 border-slate-200",
  cerrada_mixta: "bg-teal-100 text-teal-800 border-teal-200",
  anulada: "bg-red-100 text-red-800 border-red-200",
};
