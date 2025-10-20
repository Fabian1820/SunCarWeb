// Customer service (atención al cliente) messaging types.

export interface RespuestaMensaje {
  _id: string
  mensaje_id: string
  contenido: string
  autor: string
  autor_nombre: string
  fecha_respuesta: string
  es_publica: boolean
}

export interface MensajeCliente {
  _id: string
  cliente_numero: string
  cliente_nombre: string
  cliente_email?: string
  cliente_telefono?: string
  asunto: string
  mensaje: string
  tipo: 'queja' | 'consulta' | 'sugerencia' | 'reclamo'
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  estado: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado'
  fecha_creacion: string
  fecha_actualizacion?: string
  respuestas: RespuestaMensaje[]
  adjuntos?: string[]
}
