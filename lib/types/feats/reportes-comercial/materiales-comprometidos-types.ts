// Reporte "Materiales comprometidos": GET /reportes-comercial/materiales-comprometidos

import type { ContactoTipo } from "./materiales-ofertas-types"

export interface LineaComprometida {
  /** `id:<material_id>` del catálogo o `cod:<código>` si no se encuentra */
  clave: string
  codigo: string
  descripcion: string | null
  seccion: string | null
  precio: number
  cantidad: number
  /** Lo que ya salió del almacén para esta línea */
  salido: number
  /** Lo salido sale de los vales del cliente, no de lo anotado en la oferta */
  salido_segun_vales: boolean
  /** Lo que aún tiene que salir del almacén */
  pendiente: number
}

export interface OfertaComprometida {
  oferta_id: string
  numero_oferta: string | null
  nombre_oferta: string | null
  contacto_tipo: ContactoTipo | null
  contacto_nombre: string | null
  cliente_numero: string | null
  /** Estado del cliente, o de instalación de la oferta si no hay cliente */
  estado: string
  estado_instalacion_oferta: string | null
  almacen_id: string | null
  fecha_creacion: string | null
  fecha_confirmada: string | null
  precio_final: number | null
  monto_pendiente: number | null
  moneda_pago: string | null
  estado_pago: string | null
  tiene_pago: boolean
  cobrado_usd: number
  num_pagos: number
  fecha_primer_pago: string | null
  fecha_ultimo_pago: string | null
  lineas: LineaComprometida[]
}

export interface MaterialComprometido {
  clave: string
  codigo: string
  material_id: string | null
  nombre: string | null
  descripcion: string | null
  categoria: string | null
  seccion: string | null
  um: string | null
  precio_catalogo: number | null
  costo_unitario: number | null
  costo_fuente: "kardex" | "catalogo" | null
  stockaje_minimo: number | null
  en_catalogo: boolean
}

export interface StockComprometido {
  almacen_id: string
  clave: string
  /** Pools instaladora + indistinto: lo que puede salir para instalar */
  disponible: number
  total: number
  /** Reservas activas de ofertas que no están en el reporte */
  reservado_otros: number
  reservado_propias: number
}

export interface CompraEnCurso {
  clave: string
  compra_id: string
  compra_nombre: string | null
  estado: "solicitado" | "enviado" | "arribado"
  fecha_llegada_aproximada: string | null
  cantidad: number
}

export interface AlmacenReporte {
  id: string
  nombre: string
  activo: boolean
}

export interface MaterialesComprometidosData {
  generado_en: string
  estados_sin_instalar: string[]
  almacenes: AlmacenReporte[]
  ofertas: OfertaComprometida[]
  materiales: MaterialComprometido[]
  stock: StockComprometido[]
  compras_en_curso: CompraEnCurso[]
}

// --- Cálculos del panel -------------------------------------------------------

export interface FiltrosComprometidos {
  incluirSinPago: boolean
  /** Vacío = todos */
  estados: string[]
  /** "todos", "principales" o el nombre de una sección */
  tipoMaterial: string
  /** Almacenes cuyo stock se compara; vacío = ninguno */
  almacenes: string[]
}

export interface OfertaDeMaterial {
  oferta: OfertaComprometida
  cantidad: number
  salido: number
  pendiente: number
  /** Lo salido lo dicen los vales del cliente, no lo anotado en la oferta */
  segunVales: boolean
}

export interface FilaMaterialComprometido {
  material: MaterialComprometido
  ofertas: OfertaDeMaterial[]
  comprometido: number
  salido: number
  pendiente: number
  /** Stock disponible para instalar en los almacenes elegidos */
  stock: number
  reservadoOtros: number
  /** stock − reservado de otros − pendiente; negativo = falta */
  diferencia: number
  enCamino: number
  compras: CompraEnCurso[]
  /** Lo que sigue faltando aunque entren las compras en curso */
  faltanteNeto: number
  /** costo × lo que falta hoy (sin contar compras); null si no hay costo */
  costoFaltante: number | null
  /** Valor de venta de lo pendiente, a precio de línea */
  valorPendiente: number
  primerPago: string | null
  /** Stock disponible en cada almacén (todos, no solo los elegidos) */
  stockPorAlmacen: { almacen_id: string; disponible: number }[]
}

export type EstadoCobertura = "completa" | "incompleta" | "nada_pendiente"

export interface CoberturaOferta {
  oferta: OfertaComprometida
  /** Posición en el orden de pago (1 = pagó primero) */
  turno: number
  estado: EstadoCobertura
  lineasPendientes: number
  faltan: { material: MaterialComprometido; falta: number; pendiente: number }[]
}
