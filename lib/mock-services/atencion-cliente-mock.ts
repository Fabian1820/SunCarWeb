import type { MensajeCliente } from '../api-types'
import { mockMensajes, mockEstadisticas, delay, generateId } from '../mock-data/customer-service'

// Copia local de los datos que se puede modificar
let localMensajes = [...mockMensajes]

export class AtencionClienteMockService {
  // Obtener todos los mensajes con filtros opcionales
  static async getMensajes(params: {
    estado?: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado'
    tipo?: 'queja' | 'consulta' | 'sugerencia' | 'reclamo'
    prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
    cliente_numero?: string
    fecha_inicio?: string
    fecha_fin?: string
  } = {}): Promise<MensajeCliente[]> {
    // Simular delay de API
    await delay(300)

    let filteredMensajes = [...localMensajes]

    // Aplicar filtros
    if (params.estado) {
      filteredMensajes = filteredMensajes.filter(m => m.estado === params.estado)
    }
    if (params.tipo) {
      filteredMensajes = filteredMensajes.filter(m => m.tipo === params.tipo)
    }
    if (params.prioridad) {
      filteredMensajes = filteredMensajes.filter(m => m.prioridad === params.prioridad)
    }
    if (params.cliente_numero) {
      filteredMensajes = filteredMensajes.filter(m => 
        m.cliente_numero.toLowerCase().includes(params.cliente_numero!.toLowerCase()) ||
        m.cliente_nombre.toLowerCase().includes(params.cliente_numero!.toLowerCase())
      )
    }
    if (params.fecha_inicio) {
      filteredMensajes = filteredMensajes.filter(m => 
        new Date(m.fecha_creacion) >= new Date(params.fecha_inicio!)
      )
    }
    if (params.fecha_fin) {
      filteredMensajes = filteredMensajes.filter(m => 
        new Date(m.fecha_creacion) <= new Date(params.fecha_fin!)
      )
    }

    // Ordenar por fecha de creación descendente
    return filteredMensajes.sort((a, b) => 
      new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
    )
  }

  // Obtener un mensaje específico con sus respuestas
  static async getMensaje(mensajeId: string): Promise<MensajeCliente> {
    await delay(200)
    
    const mensaje = localMensajes.find(m => m._id === mensajeId)
    if (!mensaje) {
      throw new Error('Mensaje no encontrado')
    }
    return mensaje
  }

  // Actualizar el estado de un mensaje
  static async actualizarEstadoMensaje(mensajeId: string, estado: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado'): Promise<boolean> {
    await delay(200)
    
    const mensajeIndex = localMensajes.findIndex(m => m._id === mensajeId)
    if (mensajeIndex === -1) {
      throw new Error('Mensaje no encontrado')
    }

    localMensajes[mensajeIndex] = {
      ...localMensajes[mensajeIndex],
      estado,
      fecha_actualizacion: new Date().toISOString()
    }

    return true
  }

  // Crear una respuesta a un mensaje
  static async crearRespuesta(mensajeId: string, contenido: string, autorCi: string, autorNombre: string, esPublica: boolean = true): Promise<string> {
    await delay(300)
    
    const mensajeIndex = localMensajes.findIndex(m => m._id === mensajeId)
    if (mensajeIndex === -1) {
      throw new Error('Mensaje no encontrado')
    }

    const nuevaRespuesta = {
      _id: generateId(),
      mensaje_id: mensajeId,
      contenido,
      autor: autorCi,
      autor_nombre: autorNombre,
      fecha_respuesta: new Date().toISOString(),
      es_publica: esPublica
    }

    localMensajes[mensajeIndex] = {
      ...localMensajes[mensajeIndex],
      respuestas: [...localMensajes[mensajeIndex].respuestas, nuevaRespuesta],
      fecha_actualizacion: new Date().toISOString(),
      // Si es una respuesta pública y el mensaje estaba nuevo, marcarlo como respondido
      estado: esPublica && localMensajes[mensajeIndex].estado === 'nuevo' ? 'respondido' : localMensajes[mensajeIndex].estado
    }

    return nuevaRespuesta._id
  }

  // Obtener estadísticas de mensajes
  static async getEstadisticas(): Promise<{
    total: number
    nuevos: number
    en_proceso: number
    respondidos: number
    cerrados: number
    por_tipo: Record<string, number>
    por_prioridad: Record<string, number>
  }> {
    await delay(150)
    
    // Calcular estadísticas en tiempo real basadas en los datos actuales
    return {
      total: localMensajes.length,
      nuevos: localMensajes.filter(m => m.estado === 'nuevo').length,
      en_proceso: localMensajes.filter(m => m.estado === 'en_proceso').length,
      respondidos: localMensajes.filter(m => m.estado === 'respondido').length,
      cerrados: localMensajes.filter(m => m.estado === 'cerrado').length,
      por_tipo: {
        queja: localMensajes.filter(m => m.tipo === 'queja').length,
        consulta: localMensajes.filter(m => m.tipo === 'consulta').length,
        sugerencia: localMensajes.filter(m => m.tipo === 'sugerencia').length,
        reclamo: localMensajes.filter(m => m.tipo === 'reclamo').length,
      },
      por_prioridad: {
        baja: localMensajes.filter(m => m.prioridad === 'baja').length,
        media: localMensajes.filter(m => m.prioridad === 'media').length,
        alta: localMensajes.filter(m => m.prioridad === 'alta').length,
        urgente: localMensajes.filter(m => m.prioridad === 'urgente').length,
      }
    }
  }

  // Actualizar prioridad de un mensaje
  static async actualizarPrioridad(mensajeId: string, prioridad: 'baja' | 'media' | 'alta' | 'urgente'): Promise<boolean> {
    await delay(200)
    
    const mensajeIndex = localMensajes.findIndex(m => m._id === mensajeId)
    if (mensajeIndex === -1) {
      throw new Error('Mensaje no encontrado')
    }

    localMensajes[mensajeIndex] = {
      ...localMensajes[mensajeIndex],
      prioridad,
      fecha_actualizacion: new Date().toISOString()
    }

    return true
  }

  // Método para resetear los datos a su estado inicial (útil para desarrollo)
  static resetData(): void {
    localMensajes = [...mockMensajes]
  }

  // Método para agregar un nuevo mensaje (útil para testing)
  static async agregarMensaje(mensaje: Omit<MensajeCliente, '_id' | 'fecha_creacion' | 'respuestas'>): Promise<string> {
    await delay(200)
    
    const nuevoMensaje: MensajeCliente = {
      ...mensaje,
      _id: generateId(),
      fecha_creacion: new Date().toISOString(),
      respuestas: []
    }

    localMensajes.unshift(nuevoMensaje)
    return nuevoMensaje._id
  }
}