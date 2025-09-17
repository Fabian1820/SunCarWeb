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
  tiene_contraseña: boolean; // Nuevo campo, true = jefe
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