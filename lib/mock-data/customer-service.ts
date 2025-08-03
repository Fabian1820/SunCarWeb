import type { MensajeCliente, RespuestaMensaje } from '../api-types'

// Datos mock para mensajes de atención al cliente
export const mockMensajes: MensajeCliente[] = [
  {
    _id: "msg_001",
    cliente_numero: "12345",
    cliente_nombre: "María González",
    cliente_email: "maria.gonzalez@email.com",
    cliente_telefono: "555-0123",
    asunto: "Problema con la instalación de paneles solares",
    mensaje: "Hola, tengo un problema con los paneles solares que instalaron la semana pasada. Uno de los paneles no está generando energía correctamente y me gustaría que vengan a revisarlo lo antes posible.",
    tipo: "reclamo",
    prioridad: "alta",
    estado: "nuevo",
    fecha_creacion: "2024-01-15T10:30:00Z",
    respuestas: [],
    adjuntos: []
  },
  {
    _id: "msg_002",
    cliente_numero: "67890",
    cliente_nombre: "Carlos Rodríguez",
    cliente_email: "carlos.rodriguez@email.com",
    cliente_telefono: "555-0456",
    asunto: "Consulta sobre mantenimiento preventivo",
    mensaje: "Buenos días, me gustaría saber cada cuánto tiempo debo realizar mantenimiento a mi sistema solar y qué incluye el servicio de mantenimiento.",
    tipo: "consulta",
    prioridad: "media",
    estado: "respondido",
    fecha_creacion: "2024-01-14T14:15:00Z",
    fecha_actualizacion: "2024-01-14T16:30:00Z",
    respuestas: [
      {
        _id: "resp_001",
        mensaje_id: "msg_002",
        contenido: "Estimado Carlos,\n\nGracias por contactarnos. Le recomendamos realizar mantenimiento preventivo cada 6 meses. El servicio incluye:\n\n- Limpieza de paneles\n- Revisión de conexiones\n- Verificación del inversor\n- Reporte de rendimiento\n\n¿Le gustaría agendar una cita?",
        autor: "12345678",
        autor_nombre: "Ana Martínez",
        fecha_respuesta: "2024-01-14T16:30:00Z",
        es_publica: true
      }
    ]
  },
  {
    _id: "msg_003",
    cliente_numero: "11111",
    cliente_nombre: "José López",
    cliente_email: "jose.lopez@email.com",
    cliente_telefono: "555-0789",
    asunto: "Excelente servicio - Recomendación",
    mensaje: "Quería felicitarlos por el excelente trabajo realizado en mi hogar. Los paneles funcionan perfectamente y ya estoy viendo una reducción significativa en mi factura eléctrica. Los recomendaré a mis vecinos.",
    tipo: "sugerencia",
    prioridad: "baja",
    estado: "cerrado",
    fecha_creacion: "2024-01-13T09:45:00Z",
    fecha_actualizacion: "2024-01-13T11:00:00Z",
    respuestas: [
      {
        _id: "resp_002",
        mensaje_id: "msg_003",
        contenido: "Estimado José,\n\n¡Muchas gracias por sus amables palabras! Nos alegra saber que está satisfecho con nuestro servicio y que ya está viendo los beneficios de su sistema solar.\n\nAgradecemos mucho que nos recomiende. Si necesita algo más, no dude en contactarnos.",
        autor: "87654321",
        autor_nombre: "Luis Hernández",
        fecha_respuesta: "2024-01-13T11:00:00Z",
        es_publica: true
      }
    ]
  },
  {
    _id: "msg_004",
    cliente_numero: "22222",
    cliente_nombre: "Patricia Silva",
    cliente_email: "patricia.silva@email.com",
    cliente_telefono: "555-0321",
    asunto: "Facturación incorrecta en último servicio",
    mensaje: "Estimados, recibí la factura del último mantenimiento y hay un error en los conceptos cobrados. Me cobraron por reemplazo de inversor pero solo fue limpieza de paneles. Por favor revisen y corrijan.",
    tipo: "queja",
    prioridad: "urgente",
    estado: "en_proceso",
    fecha_creacion: "2024-01-16T08:20:00Z",
    fecha_actualizacion: "2024-01-16T10:15:00Z",
    respuestas: [
      {
        _id: "resp_003",
        mensaje_id: "msg_004",
        contenido: "Estimada Patricia,\n\nHemos recibido su reclamo y lo estamos revisando con el departamento de facturación. Le daremos una respuesta en las próximas 24 horas con la corrección correspondiente.",
        autor: "12345678",
        autor_nombre: "Ana Martínez",
        fecha_respuesta: "2024-01-16T10:15:00Z",
        es_publica: true
      },
      {
        _id: "resp_004",
        mensaje_id: "msg_004",
        contenido: "Nota interna: Revisar con Juan del equipo técnico sobre el trabajo realizado el día 10/01. Verificar orden de trabajo.",
        autor: "12345678",
        autor_nombre: "Ana Martínez",
        fecha_respuesta: "2024-01-16T10:16:00Z",
        es_publica: false
      }
    ]
  },
  {
    _id: "msg_005",
    cliente_numero: "33333",
    cliente_nombre: "Roberto Méndez",
    cliente_email: "roberto.mendez@email.com",
    cliente_telefono: "555-0654",
    asunto: "Solicitud de cotización para ampliación",
    mensaje: "Hola, tengo un sistema solar instalado desde hace 2 años y me gustaría ampliarlo. ¿Podrían visitarme para evaluar la posibilidad de agregar más paneles?",
    tipo: "consulta",
    prioridad: "media",
    estado: "nuevo",
    fecha_creacion: "2024-01-16T13:30:00Z",
    respuestas: []
  },
  {
    _id: "msg_006",
    cliente_numero: "44444",
    cliente_nombre: "Carmen Ruiz",
    cliente_email: "carmen.ruiz@email.com",
    cliente_telefono: "555-0987",
    asunto: "Ruido extraño en el inversor",
    mensaje: "Desde ayer escucho un ruido extraño que viene del inversor. Es como un zumbido constante que antes no hacía. ¿Es normal o debo preocuparme?",
    tipo: "reclamo",
    prioridad: "alta",
    estado: "nuevo",
    fecha_creacion: "2024-01-16T16:45:00Z",
    respuestas: []
  },
  {
    _id: "msg_007",
    cliente_numero: "55555",
    cliente_nombre: "Fernando Castro",
    cliente_email: "fernando.castro@email.com",
    cliente_telefono: "555-0111",
    asunto: "Agradecimiento por servicio de emergencia",
    mensaje: "Quería agradecer al equipo técnico que vino ayer domingo por la emergencia. A pesar de ser fin de semana, vinieron rápidamente y solucionaron el problema. Excelente servicio.",
    tipo: "sugerencia",
    prioridad: "baja",
    estado: "respondido",
    fecha_creacion: "2024-01-15T20:30:00Z",
    fecha_actualizacion: "2024-01-16T08:00:00Z",
    respuestas: [
      {
        _id: "resp_005",
        mensaje_id: "msg_007",
        contenido: "Estimado Fernando,\n\n¡Muchas gracias por tomarse el tiempo de escribirnos! Nos alegra saber que pudimos resolver su emergencia rápidamente.\n\nNuestro compromiso es brindar el mejor servicio posible, incluso en fines de semana cuando sea necesario.\n\nSaludos cordiales,\nEquipo SunCar",
        autor: "87654321",
        autor_nombre: "Luis Hernández",
        fecha_respuesta: "2024-01-16T08:00:00Z",
        es_publica: true
      }
    ]
  },
  {
    _id: "msg_008",
    cliente_numero: "66666",
    cliente_nombre: "Isabel Morales",
    cliente_email: "isabel.morales@email.com",
    cliente_telefono: "555-0222",
    asunto: "Consulta sobre garantía de paneles",
    mensaje: "Buenos días, instalaron mi sistema hace 3 años y uno de los paneles tiene una mancha que parece estar creciendo. ¿Esto está cubierto por la garantía?",
    tipo: "consulta",
    prioridad: "media",
    estado: "en_proceso",
    fecha_creacion: "2024-01-12T11:20:00Z",
    fecha_actualizacion: "2024-01-12T15:45:00Z",
    respuestas: [
      {
        _id: "resp_006",
        mensaje_id: "msg_008",
        contenido: "Estimada Isabel,\n\nGracias por contactarnos. Las manchas en los paneles pueden estar cubiertas por garantía dependiendo de la causa.\n\nProgramaremos una visita técnica gratuita para evaluar el panel. ¿Qué días de la semana le convienen más?",
        autor: "12345678",
        autor_nombre: "Ana Martínez",
        fecha_respuesta: "2024-01-12T15:45:00Z",
        es_publica: true
      }
    ]
  }
]

// Estadísticas mock
export const mockEstadisticas = {
  total: mockMensajes.length,
  nuevos: mockMensajes.filter(m => m.estado === 'nuevo').length,
  en_proceso: mockMensajes.filter(m => m.estado === 'en_proceso').length,
  respondidos: mockMensajes.filter(m => m.estado === 'respondido').length,
  cerrados: mockMensajes.filter(m => m.estado === 'cerrado').length,
  por_tipo: {
    queja: mockMensajes.filter(m => m.tipo === 'queja').length,
    consulta: mockMensajes.filter(m => m.tipo === 'consulta').length,
    sugerencia: mockMensajes.filter(m => m.tipo === 'sugerencia').length,
    reclamo: mockMensajes.filter(m => m.tipo === 'reclamo').length,
  },
  por_prioridad: {
    baja: mockMensajes.filter(m => m.prioridad === 'baja').length,
    media: mockMensajes.filter(m => m.prioridad === 'media').length,
    alta: mockMensajes.filter(m => m.prioridad === 'alta').length,
    urgente: mockMensajes.filter(m => m.prioridad === 'urgente').length,
  }
}

// Helper para simular delays de API
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper para generar IDs únicos
export const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`