# API de Planificación Diaria de Trabajos

## Descripción General
Sistema para guardar y recuperar la planificación diaria de trabajos (visitas, instalaciones, entregas, averías) asignados a brigadas y técnicos.

---

## Endpoints Necesarios

### 1. Guardar Planificación del Día

**Endpoint:** `POST /planificacion-diaria/`

**Descripción:** Guarda o actualiza la planificación de trabajos para una fecha específica.

**Request Body:**
```json
{
  "fecha": "2024-03-15",
  "items": [
    {
      "tipo": "visita",
      "contactoTipo": "cliente",
      "contactoId": "C001",
      "ofertaId": "67890abcdef",
      "brigadaId": "brigada:BR001",
      "comentario": "Revisar instalación eléctrica"
    },
    {
      "tipo": "instalacion_nueva",
      "contactoTipo": "lead",
      "contactoId": "L456",
      "ofertaId": "12345abcdef",
      "brigadaId": "tecnico:T001",
      "comentario": "Llevar paneles e inversor a las 9:00 AM"
    },
    {
      "tipo": "averia",
      "contactoTipo": "cliente",
      "contactoId": "C003",
      "averiaId": "AV123",
      "brigadaId": "brigada:BR002",
      "comentario": "Atender urgente"
    }
  ]
}
```

**Campos del Request:**

- `fecha` (string, requerido): Fecha de la planificación en formato YYYY-MM-DD
- `items` (array, requerido): Lista de trabajos planificados

**Campos de cada item:**

- `tipo` (string, requerido): Tipo de trabajo. Valores: `"visita"`, `"entrega_equipamiento"`, `"instalacion_nueva"`, `"instalacion_en_proceso"`, `"averia"`
- `contactoTipo` (string, requerido): Tipo de contacto (`"cliente"` o `"lead"`)
- `contactoId` (string, requerido): ID del cliente o lead
- `ofertaId` (string, opcional): ID de la oferta relacionada (si aplica)
- `averiaId` (string, opcional): ID de la avería (solo si tipo es "averia")
- `brigadaId` (string, requerido): ID de la brigada o técnico asignado (formato: `brigada:ID` o `tecnico:ID`)
- `comentario` (string, opcional): Comentarios de planificación para este trabajo

**Response Exitoso (200):**
```json
{
  "success": true,
  "message": "Planificación guardada exitosamente",
  "data": {
    "fecha": "2024-03-15",
    "total_trabajos": 2,
    "actualizadoEn": "2024-03-14T15:30:00Z"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "Fecha inválida o items vacíos"
}
```

---

### 2. Obtener Planificación del Día

**Endpoint:** `GET /planificacion-diaria/{fecha}`

**Descripción:** Recupera la planificación guardada para una fecha específica.

**Parámetros de URL:**
- `fecha` (string, requerido): Fecha en formato YYYY-MM-DD

**Ejemplo:** `GET /planificacion-diaria/2024-03-15`

**Response Exitoso (200):**
```json
{
  "success": true,
  "data": {
    "fecha": "2024-03-15",
    "actualizadoEn": "2024-03-14T15:30:00Z",
    "items": [
      {
        "tipo": "visita",
        "contactoTipo": "cliente",
        "contactoId": "C001",
        "ofertaId": "67890abcdef",
        "brigadaId": "brigada:BR001",
        "comentario": "Revisar instalación eléctrica",
        "cliente": {
          "numero": "C001",
          "nombre": "Juan Pérez",
          "telefono": "+53 5555-1234",
          "direccion": "Calle 23 #456, Vedado"
        },
        "oferta": {
          "numero_oferta": "OF-2024-001",
          "nombre": "Instalación 5kW"
        },
        "brigada": {
          "nombre": "Brigada Carlos López"
        }
      },
      {
        "tipo": "averia",
        "contactoTipo": "cliente",
        "contactoId": "C003",
        "averiaId": "AV123",
        "brigadaId": "brigada:BR002",
        "comentario": "Atender urgente",
        "cliente": {
          "numero": "C003",
          "nombre": "Pedro Gómez",
          "telefono": "+53 5555-9999",
          "direccion": "Calle 10 #123"
        },
        "averia": {
          "descripcion": "Inversor no enciende",
          "estado": "Pendiente"
        },
        "brigada": {
          "nombre": "Brigada Mantenimiento"
        }
      }
    ]
  }
}
```

**Nota:** El backend debe hacer "populate" o "join" para incluir los datos del cliente/lead, oferta (si aplica), avería (si aplica) y brigada/técnico al devolver la planificación.

**Response cuando no existe (404):**
```json
{
  "success": false,
  "error": "No existe planificación para esta fecha"
}
```

---

### 3. Listar Planificaciones (Opcional)

**Endpoint:** `GET /planificacion-diaria/`

**Descripción:** Lista todas las planificaciones guardadas con filtros opcionales.

**Query Parameters:**
- `fecha_desde` (string, opcional): Fecha inicial (YYYY-MM-DD)
- `fecha_hasta` (string, opcional): Fecha final (YYYY-MM-DD)
- `brigada_id` (string, opcional): Filtrar por brigada específica
- `limit` (number, opcional): Límite de resultados (default: 30)
- `skip` (number, opcional): Saltar resultados (paginación)

**Ejemplo:** `GET /planificacion-diaria/?fecha_desde=2024-03-01&fecha_hasta=2024-03-31`

**Response Exitoso (200):**
```json
{
  "success": true,
  "data": {
    "planificaciones": [
      {
        "fecha": "2024-03-15",
        "total_trabajos": 5,
        "actualizadoEn": "2024-03-14T15:30:00Z"
      },
      {
        "fecha": "2024-03-16",
        "total_trabajos": 3,
        "actualizadoEn": "2024-03-15T10:20:00Z"
      }
    ],
    "total": 2
  }
}
```

---

### 4. Eliminar Planificación

**Endpoint:** `DELETE /planificacion-diaria/{fecha}`

**Descripción:** Elimina la planificación de una fecha específica.

**Parámetros de URL:**
- `fecha` (string, requerido): Fecha en formato YYYY-MM-DD

**Response Exitoso (200):**
```json
{
  "success": true,
  "message": "Planificación eliminada exitosamente"
}
```

---

## Modelo de Datos Sugerido (MongoDB)

```javascript
{
  _id: ObjectId,
  fecha: Date,  // Fecha de la planificación (índice único)
  items: [
    {
      tipo: String,  // visita, entrega_equipamiento, instalacion_nueva, instalacion_en_proceso, averia
      contactoTipo: String,  // cliente, lead
      contactoId: String,  // ID del cliente o lead
      ofertaId: String,  // ID de la oferta (opcional)
      averiaId: String,  // ID de la avería (solo si tipo es "averia")
      brigadaId: String,  // ID de la brigada o técnico (formato: brigada:ID o tecnico:ID)
      comentario: String  // Comentario específico de planificación
    }
  ],
  createdAt: Date,
  updatedAt: Date,
  createdBy: String,  // Usuario que creó la planificación
  updatedBy: String   // Usuario que actualizó por última vez
}
```

**Índices recomendados:**
- `fecha` (único)
- `items.contactoId`
- `items.ofertaId`
- `items.brigadaId`
- `items.tipo`
- `createdAt`

**Campos esenciales guardados:**

1. ✅ `tipo` - Tipo de trabajo
2. ✅ `contactoId` - ID del lead o cliente
3. ✅ `ofertaId` - ID de la oferta (si aplica)
4. ✅ `fecha` - Fecha de la planificación
5. ✅ `comentario` - Comentario de planificación
6. ✅ `brigadaId` - ID de la brigada o técnico
7. ✅ `averiaId` - ID de la avería (si es avería)

**Ventajas:**

1. **Mínimo necesario:** Solo guarda lo esencial para identificar el trabajo
2. **Sin duplicación:** Todos los demás datos se obtienen por referencia
3. **Ligero:** Cada item ocupa muy poco espacio
4. **Trazabilidad:** Se puede saber qué oferta específica se está trabajando

---

## Notas de Implementación

1. **Validaciones:**
   - La fecha debe ser válida
   - Cada item debe tener brigadaId asignado
   - El contactoId debe existir en la colección de clientes o leads
   - El brigadaId debe existir en la colección de brigadas o trabajadores

2. **Populate/Join al consultar:**
   - Al devolver una planificación, el backend debe hacer "populate" de:
     - Cliente o Lead (nombre, teléfono, dirección, etc.)
     - Oferta (si ofertaId está presente)
     - Avería (si averiaId está presente)
     - Brigada o Técnico (nombre, etc.)
   - Esto asegura que siempre se devuelven datos actualizados

3. **Seguridad:**
   - Requiere autenticación
   - Solo usuarios con rol de "planificador" o "administrador" pueden crear/modificar
   - Todos pueden ver las planificaciones

4. **Comportamiento:**
   - Si ya existe una planificación para la fecha, se sobrescribe completamente
   - El campo `updatedAt` se actualiza automáticamente
   - Se guarda el usuario que realizó la última modificación

5. **Integración con Frontend:**
   - El frontend envía solo las referencias (IDs) y comentarios
   - Al recibir la respuesta, reconstruye los objetos completos
   - Mantener localStorage como caché local con los datos completos
   - Al cargar, intentar primero desde backend, luego localStorage

---

## Ejemplo de Uso desde Frontend

```typescript
// Preparar datos para guardar (solo lo esencial)
const prepararDatosParaGuardar = (planEnCurso: PlanTrabajoItem[], trabajosByUid: Map<string, TrabajoPlanificable>) => {
  return planEnCurso.map(item => {
    const trabajo = trabajosByUid.get(item.uid);
    
    // Extraer ofertaId si existe
    let ofertaId = null;
    if (trabajo?.ofertas && Array.isArray(trabajo.ofertas) && trabajo.ofertas.length > 0) {
      const primeraOferta = trabajo.ofertas[0] as any;
      ofertaId = primeraOferta?.id || primeraOferta?._id || primeraOferta?.oferta_id;
    }
    
    // Extraer averiaId del uid si es avería
    let averiaId = null;
    if (item.tipo === 'averia') {
      const parts = item.uid.split(':');
      averiaId = parts[3]; // formato: averia:cliente:C001:AV123
    }
    
    return {
      tipo: item.tipo,
      contactoTipo: trabajo?.contactoTipo || 'cliente',
      contactoId: trabajo?.contactoId || '',
      ofertaId,
      averiaId,
      brigadaId: item.brigadaId,
      comentario: item.comentario,
    };
  });
};

// Guardar planificación
const guardarPlanificacion = async (fecha: string, planEnCurso: PlanTrabajoItem[], trabajosByUid: Map<string, TrabajoPlanificable>) => {
  const items = prepararDatosParaGuardar(planEnCurso, trabajosByUid);
  const response = await apiRequest('/planificacion-diaria/', {
    method: 'POST',
    body: JSON.stringify({ fecha, items }),
  });
  return response;
};

// Cargar planificación (el backend devuelve datos completos con populate)
const cargarPlanificacion = async (fecha: string) => {
  try {
    const response = await apiRequest(`/planificacion-diaria/${fecha}`);
    // El backend ya hizo el populate, los datos vienen completos
    return response.data;
  } catch (error) {
    // Si no existe en backend, intentar desde localStorage
    return readPlansFromStorage()[fecha] || null;
  }
};
```

---

## Próximos Pasos

1. Implementar los endpoints en el backend
2. Actualizar el componente de planificación para usar el backend
3. Agregar sincronización automática
4. Implementar notificaciones para las brigadas asignadas
5. Agregar historial de cambios en la planificación
