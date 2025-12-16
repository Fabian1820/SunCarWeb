// WhatsApp Module Types

export interface Etiqueta {
  id: string
  nombre: string
  color: string
}

export interface Mensaje {
  id: string
  contenido: string
  timestamp: Date
  enviado: boolean // true = enviado por nosotros, false = recibido
  leido: boolean
  tipo: 'text' | 'image' | 'audio' | 'document'
  mediaUrl?: string
}

export interface Chat {
  id: string
  contactoNombre: string
  contactoTelefono: string
  contactoAvatar?: string
  ultimoMensaje: string
  ultimoMensajeTimestamp: Date
  noLeidos: number
  etiquetas: Etiqueta[]
  mensajes: Mensaje[]
  activo: boolean // true si el chat está activo en la conversación
}

export interface WhatsAppState {
  chats: Chat[]
  chatSeleccionado: Chat | null
  busqueda: string
  etiquetasFiltro: string[]
  todasLasEtiquetas: Etiqueta[]
}

// Mock Data Types
export interface MockChatData {
  id: string
  contactoNombre: string
  contactoTelefono: string
  contactoAvatar?: string
  ultimoMensaje: string
  ultimoMensajeTimestamp: string
  noLeidos: number
  etiquetas: string[] // IDs de etiquetas
  mensajes: MockMensajeData[]
  activo: boolean
}

export interface MockMensajeData {
  id: string
  contenido: string
  timestamp: string
  enviado: boolean
  leido: boolean
  tipo: 'text' | 'image' | 'audio' | 'document'
  mediaUrl?: string
}
