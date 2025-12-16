import type { Etiqueta, Chat, Mensaje } from '@/lib/types/feats/whatsapp/whatsapp-types'

// Catálogo de etiquetas predefinidas
export const MOCK_ETIQUETAS: Etiqueta[] = [
  { id: 'etq-1', nombre: 'Cliente Nuevo', color: '#10b981' },
  { id: 'etq-2', nombre: 'Presupuesto Enviado', color: '#3b82f6' },
  { id: 'etq-3', nombre: 'Urgente', color: '#ef4444' },
  { id: 'etq-4', nombre: 'Instalación Pendiente', color: '#f59e0b' },
  { id: 'etq-5', nombre: 'Mantenimiento', color: '#8b5cf6' },
  { id: 'etq-6', nombre: 'Seguimiento', color: '#06b6d4' },
  { id: 'etq-7', nombre: 'Garantía', color: '#ec4899' },
  { id: 'etq-8', nombre: 'Venta Cerrada', color: '#22c55e' },
]

// Función auxiliar para crear mensajes
const crearMensaje = (
  id: string,
  contenido: string,
  timestamp: string,
  enviado: boolean,
  leido: boolean = true
): Mensaje => ({
  id,
  contenido,
  timestamp: new Date(timestamp),
  enviado,
  leido,
  tipo: 'text',
})

// Mock de chats con conversaciones
export const MOCK_CHATS: Chat[] = [
  {
    id: 'chat-1',
    contactoNombre: 'María González',
    contactoTelefono: '+591 70123456',
    contactoAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
    ultimoMensaje: '¿Cuándo pueden venir a instalar?',
    ultimoMensajeTimestamp: new Date('2025-12-03T14:30:00'),
    noLeidos: 2,
    etiquetas: [
      MOCK_ETIQUETAS[0], // Cliente Nuevo
      MOCK_ETIQUETAS[3], // Instalación Pendiente
    ],
    mensajes: [
      crearMensaje('msg-1-1', 'Hola, buenos días. Estoy interesada en los paneles solares', '2025-12-03T09:00:00', false),
      crearMensaje('msg-1-2', '¡Buenos días María! Claro que sí, con gusto te ayudamos. ¿Qué tipo de instalación necesitas?', '2025-12-03T09:05:00', true),
      crearMensaje('msg-1-3', 'Es para mi casa, necesito que me ayuden con un presupuesto', '2025-12-03T09:10:00', false),
      crearMensaje('msg-1-4', 'Perfecto. ¿Me podrías pasar tu dirección para hacer una evaluación técnica?', '2025-12-03T09:15:00', true),
      crearMensaje('msg-1-5', 'Claro, es en la Av. Banzer km 9', '2025-12-03T09:20:00', false),
      crearMensaje('msg-1-6', 'Excelente. Te envío el presupuesto en un momento', '2025-12-03T09:25:00', true),
      crearMensaje('msg-1-7', 'Gracias! Y ¿cuándo pueden venir a instalar?', '2025-12-03T14:30:00', false, false),
    ],
    activo: false,
  },
  {
    id: 'chat-2',
    contactoNombre: 'Carlos Méndez',
    contactoTelefono: '+591 75987654',
    contactoAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    ultimoMensaje: 'Perfecto, muchas gracias por la atención',
    ultimoMensajeTimestamp: new Date('2025-12-03T13:45:00'),
    noLeidos: 0,
    etiquetas: [
      MOCK_ETIQUETAS[7], // Venta Cerrada
    ],
    mensajes: [
      crearMensaje('msg-2-1', 'Buenas tardes, necesito información sobre los kits de energía solar', '2025-12-03T11:00:00', false),
      crearMensaje('msg-2-2', 'Buenas tardes Carlos. Tenemos varios kits disponibles. ¿Para cuántas personas es?', '2025-12-03T11:05:00', true),
      crearMensaje('msg-2-3', 'Es para una casa de 4 personas', '2025-12-03T11:10:00', false),
      crearMensaje('msg-2-4', 'Te recomiendo el Kit Premium que incluye paneles de 400W. Te envío los detalles', '2025-12-03T11:15:00', true),
      crearMensaje('msg-2-5', 'Me interesa, ¿cuál es el precio?', '2025-12-03T11:20:00', false),
      crearMensaje('msg-2-6', 'El kit completo con instalación está en $us 3,500. Incluye garantía de 10 años', '2025-12-03T11:25:00', true),
      crearMensaje('msg-2-7', 'Excelente, quiero proceder con la compra', '2025-12-03T13:30:00', false),
      crearMensaje('msg-2-8', 'Genial! Te contacto para coordinar la instalación', '2025-12-03T13:40:00', true),
      crearMensaje('msg-2-9', 'Perfecto, muchas gracias por la atención', '2025-12-03T13:45:00', false),
    ],
    activo: false,
  },
  {
    id: 'chat-3',
    contactoNombre: 'Ana Rodríguez',
    contactoTelefono: '+591 71234567',
    contactoAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
    ultimoMensaje: 'Necesito que vengan urgente!',
    ultimoMensajeTimestamp: new Date('2025-12-03T15:00:00'),
    noLeidos: 1,
    etiquetas: [
      MOCK_ETIQUETAS[2], // Urgente
      MOCK_ETIQUETAS[6], // Garantía
    ],
    mensajes: [
      crearMensaje('msg-3-1', 'Hola, tengo un problema con los paneles que instalaron hace 3 meses', '2025-12-03T14:30:00', false),
      crearMensaje('msg-3-2', 'Hola Ana, lamento escuchar eso. ¿Qué problema presentan?', '2025-12-03T14:35:00', true),
      crearMensaje('msg-3-3', 'Uno de los paneles no está generando energía', '2025-12-03T14:40:00', false),
      crearMensaje('msg-3-4', 'Entiendo. Voy a programar una visita técnica para mañana. ¿Te viene bien en la mañana?', '2025-12-03T14:45:00', true),
      crearMensaje('msg-3-5', 'Necesito que vengan urgente!', '2025-12-03T15:00:00', false, false),
    ],
    activo: false,
  },
  {
    id: 'chat-4',
    contactoNombre: 'Roberto Paz',
    contactoTelefono: '+591 76543210',
    contactoAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto',
    ultimoMensaje: 'Ok, esperaré el presupuesto',
    ultimoMensajeTimestamp: new Date('2025-12-03T12:20:00'),
    noLeidos: 0,
    etiquetas: [
      MOCK_ETIQUETAS[1], // Presupuesto Enviado
      MOCK_ETIQUETAS[5], // Seguimiento
    ],
    mensajes: [
      crearMensaje('msg-4-1', 'Buenos días, quisiera información sobre los calentadores solares', '2025-12-03T10:00:00', false),
      crearMensaje('msg-4-2', 'Buenos días Roberto! Claro, tenemos modelos de 150L y 200L. ¿Para cuántas personas?', '2025-12-03T10:05:00', true),
      crearMensaje('msg-4-3', 'Para 5 personas', '2025-12-03T10:10:00', false),
      crearMensaje('msg-4-4', 'Te recomiendo el de 200L. Te preparo un presupuesto detallado', '2025-12-03T10:15:00', true),
      crearMensaje('msg-4-5', 'Ok, esperaré el presupuesto', '2025-12-03T12:20:00', false),
    ],
    activo: false,
  },
  {
    id: 'chat-5',
    contactoNombre: 'Laura Fernández',
    contactoTelefono: '+591 77654321',
    contactoAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Laura',
    ultimoMensaje: '¿Tienen stock disponible?',
    ultimoMensajeTimestamp: new Date('2025-12-03T11:30:00'),
    noLeidos: 1,
    etiquetas: [
      MOCK_ETIQUETAS[0], // Cliente Nuevo
    ],
    mensajes: [
      crearMensaje('msg-5-1', 'Hola, me pasaron su contacto. Necesito paneles solares', '2025-12-03T11:00:00', false),
      crearMensaje('msg-5-2', 'Hola Laura! Bienvenida. ¿Qué potencia necesitas?', '2025-12-03T11:10:00', true),
      crearMensaje('msg-5-3', 'Me recomendaron de 300W', '2025-12-03T11:20:00', false),
      crearMensaje('msg-5-4', 'Perfecto, tenemos paneles de 300W y 400W disponibles', '2025-12-03T11:25:00', true),
      crearMensaje('msg-5-5', '¿Tienen stock disponible?', '2025-12-03T11:30:00', false, false),
    ],
    activo: false,
  },
  {
    id: 'chat-6',
    contactoNombre: 'Diego Vargas',
    contactoTelefono: '+591 78123456',
    contactoAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diego',
    ultimoMensaje: 'Excelente servicio, gracias',
    ultimoMensajeTimestamp: new Date('2025-12-02T16:00:00'),
    noLeidos: 0,
    etiquetas: [
      MOCK_ETIQUETAS[4], // Mantenimiento
    ],
    mensajes: [
      crearMensaje('msg-6-1', 'Hola, necesito agendar un mantenimiento', '2025-12-02T14:00:00', false),
      crearMensaje('msg-6-2', 'Hola Diego. Claro, ¿para cuándo te gustaría?', '2025-12-02T14:10:00', true),
      crearMensaje('msg-6-3', 'Esta semana si es posible', '2025-12-02T14:15:00', false),
      crearMensaje('msg-6-4', 'Te agendamos para el viernes en la tarde', '2025-12-02T14:20:00', true),
      crearMensaje('msg-6-5', 'Excelente servicio, gracias', '2025-12-02T16:00:00', false),
    ],
    activo: false,
  },
]

// Función para obtener todos los chats
export const getAllChats = (): Chat[] => {
  return MOCK_CHATS
}

// Función para obtener todas las etiquetas
export const getAllEtiquetas = (): Etiqueta[] => {
  return MOCK_ETIQUETAS
}

// Función para buscar chats
export const searchChats = (chats: Chat[], query: string): Chat[] => {
  if (!query.trim()) return chats

  const lowerQuery = query.toLowerCase()
  return chats.filter(chat =>
    chat.contactoNombre.toLowerCase().includes(lowerQuery) ||
    chat.contactoTelefono.includes(query)
  )
}

// Función para filtrar chats por etiquetas
export const filterChatsByEtiquetas = (chats: Chat[], etiquetaIds: string[]): Chat[] => {
  if (etiquetaIds.length === 0) return chats

  return chats.filter(chat =>
    chat.etiquetas.some(etiqueta => etiquetaIds.includes(etiqueta.id))
  )
}
