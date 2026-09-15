// Reporte "Materiales en Ofertas": GET /reportes-comercial/materiales-en-ofertas

export type ContactoTipo = "cliente" | "lead" | "lead_sin_agregar"

/** De qué campo sale el estado con el que se filtra y agrupa. */
export type EstadoSegun = "cliente" | "oferta"

export interface MaterialReporteOfertas {
  codigo: string
  nombre: string | null
  descripcion: string | null
  categoria: string | null
  precio_catalogo: number | null
  potencia_kw: number | null
  en_catalogo: boolean
}

export interface LineaMaterialOferta {
  codigo: string
  descripcion: string | null
  seccion: string | null
  /** Precio unitario de la línea, antes de repartir el margen */
  precio: number
  precio_original: number | null
  precio_editado: boolean
  cantidad: number
  importe: number
  oferta_id: string
  numero_oferta: string | null
  nombre_oferta: string | null
  estado_oferta: string | null
  /** Estado de instalación guardado en la oferta; puede no coincidir con el del cliente */
  estado_instalacion_oferta: string | null
  fecha_creacion: string | null
  fecha_confirmada: string | null
  precio_final_oferta: number | null
  moneda_pago: string | null
  estado_pago: string | null
  contacto_tipo: ContactoTipo | null
  contacto_nombre: string | null
  cliente_numero: string | null
  /** Estado del cliente, o del lead si la oferta no tiene cliente */
  estado_contacto: string | null
}

export interface MaterialesEnOfertasData {
  estados_oferta: string[]
  materiales: MaterialReporteOfertas[]
  lineas: LineaMaterialOferta[]
  total_lineas: number
  total_unidades: number
  total_ofertas: number
  truncado: boolean
}

export interface AgregadosLineas {
  unidades: number
  ofertas: number
  importe: number
  unidadesPorEstado: Record<string, number>
  ofertasPorEstado: Record<string, number>
  importePorEstado: Record<string, number>
  /** Fecha de creación ISO de la oferta más antigua y la más reciente */
  primera: string | null
  ultima: string | null
  preciosEditados: number
}

export interface GrupoPrecio extends AgregadosLineas {
  codigo: string
  precio: number
  lineas: LineaMaterialOferta[]
}

export interface ResumenMaterial extends AgregadosLineas {
  material: MaterialReporteOfertas
  grupos: GrupoPrecio[]
}

export interface ResumenMaterialesOfertas extends AgregadosLineas {
  materiales: ResumenMaterial[]
  /** Estados presentes en las líneas, en orden de presentación */
  estados: string[]
}
