// Tipos de API que coinciden con el backend FastAPI

// Tipos del backend
export interface BackendMaterial {
  codigo: string
  descripcion: string
  um: string
}

export interface BackendCatalogoProductos {
  id: string
  categoria: string
  materiales: BackendMaterial[]
}

export interface BackendCategoria {
  id: string
  categoria: string
}

// Tipos del frontend (ya definidos en material-types.ts)
export interface Material {
  id: string
  codigo: number
  categoria: string
  descripcion: string
  um: string
}

// Convertidores entre backend y frontend
export function transformBackendToFrontend(catalogos: BackendCatalogoProductos[]): Material[] {
  const materials: Material[] = []
  
  catalogos.forEach(catalogo => {
    catalogo.materiales.forEach(material => {
      materials.push({
        id: `${catalogo.id}_${material.codigo}`,
        codigo: Number(material.codigo),
        categoria: catalogo.categoria,
        descripcion: material.descripcion,
        um: material.um
      })
    })
  })
  
  return materials
}

export function transformCategories(categorias: BackendCategoria[]): string[] {
  return categorias.map(cat => cat.categoria).sort()
}

// Tipos para Leads
export interface Lead {
  id?: string
  fecha_contacto: string
  nombre: string
  telefono: string
  estado: string
  fuente?: string
  referencia?: string
  direccion?: string
  pais_contacto?: string
  necesidad?: string
  provincia_montaje?: string
}

export interface LeadResponse {
  success: boolean
  message: string
  data: Lead | Lead[] | null
}

export interface LeadCreateData {
  fecha_contacto: string
  nombre: string
  telefono: string
  estado: string
  fuente?: string
  referencia?: string
  direccion?: string
  pais_contacto?: string
  necesidad?: string
  provincia_montaje?: string
}

export interface LeadUpdateData {
  fecha_contacto?: string
  nombre?: string
  telefono?: string
  estado?: string
  fuente?: string
  referencia?: string
  direccion?: string
  pais_contacto?: string
  necesidad?: string
  provincia_montaje?: string
}

export interface Trabajador {
  id: string;
  CI: string;
  nombre: string;
  tiene_contraseña: boolean; // true = jefe de brigada
  is_brigadista?: boolean; // true = puede ser asignado a brigadas
}

export interface Brigada {
  _id: string;
  lider: string; // CI del jefe
  integrantes: string[]; // CIs de los trabajadores
}

// Tipos para el sistema de atención al cliente
export interface MensajeCliente {
  _id: string;
  cliente_numero: string;
  cliente_nombre: string;
  cliente_email?: string;
  cliente_telefono?: string;
  asunto: string;
  mensaje: string;
  tipo: 'queja' | 'consulta' | 'sugerencia' | 'reclamo';
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  estado: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado';
  fecha_creacion: string;
  fecha_actualizacion?: string;
  respuestas: RespuestaMensaje[];
  adjuntos?: string[];
}

export interface RespuestaMensaje {
  _id: string;
  mensaje_id: string;
  contenido: string;
  autor: string; // CI del empleado que responde
  autor_nombre: string;
  fecha_respuesta: string;
  es_publica: boolean; // si es visible para el cliente
}

// Tipos para el sistema de ofertas
export interface ElementoOferta {
  categoria?: string | null; // opcional
  descripcion: string; // requerido
  cantidad: number; // requerido, mayor a 0, permite decimales
  foto?: string | null; // URL de la foto almacenada, solo en respuesta
}

// Tipo para crear elementos (input)
export interface CreateElementoRequest {
  categoria?: string; // opcional
  descripcion: string; // requerido
  cantidad: number; // requerido, mayor a 0, permite decimales
  foto?: File | null; // archivo de imagen opcional
}

// Tipo para actualizar elementos (input) - todos los campos opcionales
export interface UpdateElementoRequest {
  categoria?: string; // opcional
  descripcion?: string; // opcional
  cantidad?: number; // opcional, mayor a 0, permite decimales
  foto?: File | null; // archivo de imagen opcional
}

export interface Oferta {
  id: string; // solo respuesta del backend
  descripcion: string; // requerido
  descripcion_detallada?: string | null; // opcional - descripción extendida
  precio: number; // requerido
  precio_cliente?: number | null; // opcional - precio específico para el cliente
  imagen?: string | null; // URL, opcional
  moneda?: string | null; // opcional - moneda de la oferta (ej: "usd", "cup", "mlc")
  financiamiento?: boolean; // opcional, por defecto false - indica si tiene financiamiento disponible
  descuentos?: string | null; // opcional - información detallada sobre descuentos aplicables
  garantias: string[]; // array de strings
  elementos: ElementoOferta[]; // array de elementos
}

export interface OfertaSimplificada {
  id: string; // solo respuesta del backend
  descripcion: string; // requerido
  descripcion_detallada?: string | null; // opcional
  precio: number; // requerido
  precio_cliente?: number | null; // opcional
  imagen?: string | null; // URL, opcional
  moneda?: string | null; // opcional
  financiamiento?: boolean; // opcional, por defecto false
  descuentos?: string | null; // opcional
}

// Tipo para crear ofertas (sin elementos - se gestionan por separado)
export interface CreateOfertaRequest {
  descripcion: string; // requerido - título o nombre corto
  precio: number; // requerido - precio base
  descripcion_detallada?: string | null; // opcional - descripción extendida y detallada
  precio_cliente?: number | null; // opcional - precio específico para el cliente
  moneda?: string | null; // opcional - moneda (ej: "usd", "cup", "mlc")
  financiamiento?: boolean; // opcional - si tiene financiamiento disponible
  descuentos?: string | null; // opcional - información detallada sobre descuentos
  imagen?: File | null; // archivo de imagen opcional
  garantias: string[]; // solo garantías, elementos se agregan por separado
}

// Tipo para actualizar ofertas (sin elementos - se gestionan por separado)
export interface UpdateOfertaRequest extends Partial<CreateOfertaRequest> {}

// Tipos para Órdenes de Trabajo
export type TipoReporte = 'inversión' | 'avería' | 'mantenimiento'

export interface OrdenTrabajo {
  id: string
  brigada_id: string
  brigada_nombre?: string // nombre del líder de la brigada para mostrar
  cliente_numero: string
  cliente_nombre: string
  tipo_reporte: TipoReporte
  fecha_ejecucion: string // formato ISO: YYYY-MM-DD
  comentarios?: string
  fecha_creacion: string
  estado?: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada'
}

export interface CreateOrdenTrabajoRequest {
  brigada_id: string
  cliente_numero: string
  tipo_reporte: TipoReporte
  fecha_ejecucion: string // formato ISO: YYYY-MM-DD
  comentarios?: string
}

export interface UpdateOrdenTrabajoRequest extends Partial<CreateOrdenTrabajoRequest> {
  estado?: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada'
}

export interface OrdenTrabajoResponse {
  success: boolean
  message: string
  data: OrdenTrabajo | OrdenTrabajo[] | null
}