# API de Control de Asistencia - SunCar Backend

## Descripción General

El módulo de Control de Asistencia permite gestionar la entrada y salida de trabajadores, realizar seguimiento de horas trabajadas, y generar reportes de asistencia. Todos los endpoints requieren autenticación JWT.

**Base URL:** `/api/asistencia`

**Autenticación:** Todos los endpoints requieren un token JWT válido en el header:
```
Authorization: Bearer <token>
```

---

## Tabla de Contenidos

1. [Endpoints Personales (Solo JWT)](#endpoints-personales-solo-jwt) ⭐ **NUEVOS**
   - [Ver mi estado actual](#1-ver-mi-estado-actual)
   - [Marcar mi entrada/salida](#2-marcar-mi-entradasalida)
   - [Ver mis marcajes de hoy](#3-ver-mis-marcajes-de-hoy)
2. [Endpoints para Tareas Cotidianas](#endpoints-para-tareas-cotidianas)
   - [Verificar si un trabajador está en la oficina](#4-verificar-si-un-trabajador-está-en-la-oficina)
   - [Obtener días trabajados](#5-obtener-días-trabajados)
   - [Reporte diario de asistencia](#6-reporte-diario-de-asistencia)
   - [Ver quién está en la oficina ahora](#7-ver-quién-está-en-la-oficina-ahora)
3. [Endpoints CRUD Básicos](#endpoints-crud-básicos)
   - [Marcar entrada/salida](#8-marcar-entradasalida)
   - [Obtener historial de un trabajador](#9-obtener-historial-de-un-trabajador)
   - [Obtener un marcaje específico](#10-obtener-un-marcaje-específico)
   - [Corregir un marcaje](#11-corregir-un-marcaje-admin)
   - [Eliminar un marcaje](#12-eliminar-un-marcaje-admin)
4. [Modelos de Datos](#modelos-de-datos)
5. [Códigos de Error](#códigos-de-error)
6. [Flujos de Trabajo Comunes](#flujos-de-trabajo-comunes)

---

## Endpoints Personales (Solo JWT)

Estos endpoints están diseñados para que los trabajadores gestionen su propia asistencia usando únicamente su token JWT. **No requieren enviar el CI** ya que se obtiene automáticamente del token.

### 1. Ver mi estado actual

Obtiene tu estado actual (si estás en la oficina) basándose en tu último marcaje.

**Endpoint:** `GET /api/asistencia/mi-estado`

**Sin parámetros** - Usa el CI del JWT automáticamente

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "Tu estado de oficina obtenido exitosamente",
  "data": {
    "trabajador_ci": "12345678",
    "esta_en_oficina": true,
    "ultimo_marcaje": {
      "id": "507f1f77bcf86cd799439011",
      "tipo": "entrada",
      "timestamp": "2024-01-15T08:30:00",
      "hace": "2 horas 15 minutos"
    }
  }
}
```

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
// No necesitas enviar el CI, se obtiene del token JWT
const response = await fetch(`${API_BASE_URL}/api/asistencia/mi-estado`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log(`Estás ${data.data.esta_en_oficina ? 'dentro' : 'fuera'} de la oficina`);
```

---

### 2. Marcar mi entrada/salida

Marca tu propia entrada o salida. **El tipo se detecta automáticamente** (si tu último marcaje fue entrada, marca salida; si fue salida, marca entrada).

**Endpoint:** `POST /api/asistencia/mi-marcaje`

**Sin body necesario** - Usa el CI del JWT automáticamente

**Response exitoso (201):**
```json
{
  "success": true,
  "message": "Tu entrada fue registrada exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "trabajador_ci": "12345678",
    "tipo": "entrada",
    "timestamp": "2024-01-15T08:30:00",
    "fecha": "2024-01-15",
    "registrado_por": "12345678",
    "comentarios": null
  },
  "tipo_marcaje": "entrada"
}
```

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
// Marcar entrada/salida sin enviar datos
const response = await fetch(`${API_BASE_URL}/api/asistencia/mi-marcaje`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log(data.message); // "Tu entrada fue registrada exitosamente"
```

---

### 3. Ver mis marcajes de hoy

Obtiene todos tus marcajes del día actual. **Útil para verificar si ya marcaste hoy y cuántas veces.**

**Endpoint:** `GET /api/asistencia/mis-marcajes-hoy`

**Sin parámetros** - Usa el CI del JWT automáticamente

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "Tus marcajes de hoy obtenidos exitosamente",
  "data": {
    "trabajador_ci": "12345678",
    "fecha": "2024-01-15",
    "total_marcajes": 2,
    "ha_marcado_hoy": true,
    "marcajes": [
      {
        "id": "507f1f77bcf86cd799439011",
        "trabajador_ci": "12345678",
        "tipo": "entrada",
        "timestamp": "2024-01-15T08:30:00",
        "fecha": "2024-01-15",
        "registrado_por": "12345678",
        "comentarios": null
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "trabajador_ci": "12345678",
        "tipo": "salida",
        "timestamp": "2024-01-15T12:00:00",
        "fecha": "2024-01-15",
        "registrado_por": "12345678",
        "comentarios": null
      }
    ]
  }
}
```

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
const response = await fetch(`${API_BASE_URL}/api/asistencia/mis-marcajes-hoy`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();

if (data.data.ha_marcado_hoy) {
  console.log(`Has marcado ${data.data.total_marcajes} veces hoy`);
  console.log(`Último marcaje: ${data.data.marcajes[0].tipo}`);
} else {
  console.log("Aún no has marcado hoy");
}
```

---

## Endpoints para Tareas Cotidianas

### 4. Verificar si un trabajador está en la oficina

Determina si un trabajador está actualmente en la oficina basándose en su último marcaje.

**Endpoint:** `GET /api/asistencia/trabajador/{ci}/esta-en-oficina`

**Parámetros de URL:**
- `ci` (string, required): CI del trabajador

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "Estado de oficina obtenido exitosamente",
  "data": {
    "trabajador_ci": "12345678",
    "esta_en_oficina": true,
    "ultimo_marcaje": {
      "id": "507f1f77bcf86cd799439011",
      "tipo": "entrada",
      "timestamp": "2024-01-15T08:30:00",
      "hace": "2 horas 15 minutos"
    }
  }
}
```

**Caso: Trabajador nunca ha marcado:**
```json
{
  "success": true,
  "message": "Estado de oficina obtenido exitosamente",
  "data": {
    "trabajador_ci": "12345678",
    "esta_en_oficina": false,
    "ultimo_marcaje": null
  }
}
```

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
const response = await fetch(`${API_BASE_URL}/api/asistencia/trabajador/${ci}/esta-en-oficina`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log(`Trabajador está ${data.data.esta_en_oficina ? 'dentro' : 'fuera'} de la oficina`);
```

---

### 5. Obtener días trabajados

Obtiene un resumen detallado de los días trabajados por un trabajador en un período, incluyendo horas por día y totales.

**Endpoint:** `GET /api/asistencia/trabajador/{ci}/dias-trabajados`

**Parámetros de URL:**
- `ci` (string, required): CI del trabajador

**Query Parameters:**
- `fecha_inicio` (string, optional): Fecha de inicio en formato ISO (YYYY-MM-DD). Default: hace 30 días
- `fecha_fin` (string, optional): Fecha de fin en formato ISO (YYYY-MM-DD). Default: hoy

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "Días trabajados obtenidos exitosamente",
  "data": {
    "trabajador_ci": "12345678",
    "nombre": "Juan Pérez",
    "periodo": {
      "inicio": "2024-01-01",
      "fin": "2024-01-31"
    },
    "resumen": {
      "total_dias_trabajados": 20,
      "total_horas": 168.5,
      "promedio_horas_dia": 8.42
    },
    "dias": [
      {
        "fecha": "2024-01-15",
        "hora_entrada": "08:30:00",
        "hora_salida": "17:45:00",
        "horas_trabajadas": 9.25,
        "marcajes": [
          {
            "tipo": "entrada",
            "timestamp": "2024-01-15T08:30:00"
          },
          {
            "tipo": "salida",
            "timestamp": "2024-01-15T17:45:00"
          }
        ]
      },
      {
        "fecha": "2024-01-14",
        "hora_entrada": "08:15:00",
        "hora_salida": "17:30:00",
        "horas_trabajadas": 9.25,
        "marcajes": [...]
      }
    ]
  }
}
```

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
const fechaInicio = '2024-01-01';
const fechaFin = '2024-01-31';
const response = await fetch(
  `${API_BASE_URL}/api/asistencia/trabajador/${ci}/dias-trabajados?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const data = await response.json();
console.log(`Total horas trabajadas: ${data.data.resumen.total_horas}`);
```

---

### 6. Reporte diario de asistencia

Genera un reporte completo de todos los trabajadores para una fecha específica, incluyendo quién asistió, horas trabajadas y estado actual.

**Endpoint:** `GET /api/asistencia/reporte-diario`

**Query Parameters:**
- `fecha` (string, optional): Fecha en formato ISO (YYYY-MM-DD). Default: hoy

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "Reporte diario generado exitosamente",
  "data": {
    "fecha": "2024-01-15",
    "trabajadores": [
      {
        "trabajador_ci": "12345678",
        "nombre": "Juan Pérez",
        "esta_presente": true,
        "hora_entrada": "08:30:00",
        "hora_salida": "17:45:00",
        "horas_trabajadas": 9.25,
        "estado_actual": "fuera"
      },
      {
        "trabajador_ci": "87654321",
        "nombre": "María García",
        "esta_presente": true,
        "hora_entrada": "08:00:00",
        "hora_salida": null,
        "horas_trabajadas": null,
        "estado_actual": "dentro"
      },
      {
        "trabajador_ci": "11223344",
        "nombre": "Pedro Rodríguez",
        "esta_presente": false,
        "hora_entrada": null,
        "hora_salida": null,
        "horas_trabajadas": null,
        "estado_actual": "fuera"
      }
    ],
    "resumen": {
      "total_trabajadores": 50,
      "presentes_hoy": 45,
      "ausentes": 5,
      "actualmente_en_oficina": 12
    }
  }
}
```

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
// Reporte de hoy
const response = await fetch(`${API_BASE_URL}/api/asistencia/reporte-diario`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Reporte de una fecha específica
const fecha = '2024-01-15';
const response2 = await fetch(`${API_BASE_URL}/api/asistencia/reporte-diario?fecha=${fecha}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response2.json();
console.log(`Presentes hoy: ${data.data.resumen.presentes_hoy} de ${data.data.resumen.total_trabajadores}`);
```

---

### 7. Ver quién está en la oficina ahora

Obtiene la lista de trabajadores que están actualmente en la oficina (última acción fue una entrada).

**Endpoint:** `GET /api/asistencia/quien-esta-ahora`

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "Lista de trabajadores en oficina obtenida exitosamente",
  "data": {
    "total": 12,
    "trabajadores": [
      {
        "trabajador_ci": "12345678",
        "nombre": "Juan Pérez",
        "hora_entrada": "08:30:00",
        "tiempo_en_oficina": "3 horas 45 minutos"
      },
      {
        "trabajador_ci": "87654321",
        "nombre": "María García",
        "hora_entrada": "08:00:00",
        "tiempo_en_oficina": "4 horas 15 minutos"
      }
    ]
  }
}
```

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
const response = await fetch(`${API_BASE_URL}/api/asistencia/quien-esta-ahora`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log(`Hay ${data.data.total} trabajadores en la oficina`);
```

---

## Endpoints CRUD Básicos

### 8. Marcar entrada/salida

Marca entrada o salida de un trabajador. El tipo de marcaje se detecta automáticamente: si el último marcaje fue una entrada, marca salida; si fue una salida (o no hay marcajes), marca entrada.

**Endpoint:** `POST /api/asistencia/marcar`

**Request Body:**
```json
{
  "trabajador_ci": "12345678",
  "comentarios": "Llegada temprano" // opcional
}
```

**Response exitoso (201):**
```json
{
  "success": true,
  "message": "Entrada registrada exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "trabajador_ci": "12345678",
    "tipo": "entrada",
    "timestamp": "2024-01-15T08:30:00",
    "fecha": "2024-01-15",
    "registrado_por": "admin_ci",
    "comentarios": "Llegada temprano"
  },
  "tipo_marcaje": "entrada"
}
```

**Notas importantes:**
- El campo `registrado_por` se obtiene automáticamente del token JWT del usuario autenticado
- El sistema auto-detecta si debe marcar entrada o salida
- `tipo_marcaje` puede ser `"entrada"` o `"salida"`

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
const response = await fetch(`${API_BASE_URL}/api/asistencia/marcar`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    trabajador_ci: "12345678",
    comentarios: "Llegada temprano"
  })
});
const data = await response.json();
console.log(`${data.tipo_marcaje} registrada exitosamente`);
```

---

### 9. Obtener historial de un trabajador

Obtiene el historial completo de marcajes de un trabajador con filtros opcionales.

**Endpoint:** `GET /api/asistencia/trabajador/{ci}/historial`

**Parámetros de URL:**
- `ci` (string, required): CI del trabajador

**Query Parameters:**
- `fecha_inicio` (string, optional): Fecha de inicio en formato ISO
- `fecha_fin` (string, optional): Fecha de fin en formato ISO
- `tipo` (string, optional): Filtrar por tipo ("entrada" o "salida")

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "Historial obtenido exitosamente",
  "data": {
    "trabajador_ci": "12345678",
    "total_marcajes": 120,
    "marcajes": [
      {
        "id": "507f1f77bcf86cd799439011",
        "trabajador_ci": "12345678",
        "tipo": "entrada",
        "timestamp": "2024-01-15T08:30:00",
        "fecha": "2024-01-15",
        "registrado_por": "admin_ci",
        "comentarios": null
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "trabajador_ci": "12345678",
        "tipo": "salida",
        "timestamp": "2024-01-15T17:45:00",
        "fecha": "2024-01-15",
        "registrado_por": "admin_ci",
        "comentarios": null
      }
    ]
  }
}
```

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
// Todo el historial
const response = await fetch(`${API_BASE_URL}/api/asistencia/trabajador/${ci}/historial`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Historial filtrado por fechas
const response2 = await fetch(
  `${API_BASE_URL}/api/asistencia/trabajador/${ci}/historial?fecha_inicio=2024-01-01&fecha_fin=2024-01-31`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

// Solo entradas
const response3 = await fetch(
  `${API_BASE_URL}/api/asistencia/trabajador/${ci}/historial?tipo=entrada`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

---

### 10. Obtener un marcaje específico

Obtiene los detalles de un marcaje específico por su ID.

**Endpoint:** `GET /api/asistencia/{id}`

**Parámetros de URL:**
- `id` (string, required): ID del marcaje (MongoDB ObjectId)

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "Marcaje obtenido exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "trabajador_ci": "12345678",
    "tipo": "entrada",
    "timestamp": "2024-01-15T08:30:00",
    "fecha": "2024-01-15",
    "registrado_por": "admin_ci",
    "comentarios": null
  }
}
```

**Marcaje no encontrado:**
```json
{
  "success": false,
  "message": "Marcaje no encontrado",
  "data": null
}
```

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
const marcajeId = "507f1f77bcf86cd799439011";
const response = await fetch(`${API_BASE_URL}/api/asistencia/${marcajeId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
if (data.success) {
  console.log(`Marcaje de tipo ${data.data.tipo} a las ${data.data.timestamp}`);
}
```

---

### 11. Corregir un marcaje (Admin)

Permite corregir un marcaje existente. Solo usuarios administradores deberían tener acceso a este endpoint.

**Endpoint:** `PUT /api/asistencia/{id}/corregir`

**Parámetros de URL:**
- `id` (string, required): ID del marcaje a corregir

**Request Body:**
```json
{
  "timestamp": "2024-01-15T08:30:00",  // opcional
  "tipo": "entrada",                    // opcional: "entrada" o "salida"
  "comentarios": "Corrección manual: el trabajador llegó temprano"  // opcional
}
```

**Nota:** Todos los campos son opcionales, pero al menos uno debe ser proporcionado.

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "Marcaje corregido exitosamente"
}
```

**Marcaje no encontrado o sin cambios:**
```json
{
  "success": false,
  "message": "Marcaje no encontrado o no se realizaron cambios"
}
```

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
const marcajeId = "507f1f77bcf86cd799439011";
const response = await fetch(`${API_BASE_URL}/api/asistencia/${marcajeId}/corregir`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    timestamp: "2024-01-15T08:30:00",
    comentarios: "Corrección manual: llegó temprano"
  })
});
const data = await response.json();
if (data.success) {
  console.log("Marcaje corregido exitosamente");
}
```

---

### 12. Eliminar un marcaje (Admin)

Elimina un marcaje. Solo usuarios administradores deberían tener acceso a este endpoint.

**Endpoint:** `DELETE /api/asistencia/{id}`

**Parámetros de URL:**
- `id` (string, required): ID del marcaje a eliminar

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "Marcaje eliminado exitosamente"
}
```

**Marcaje no encontrado:**
```json
{
  "success": false,
  "message": "Marcaje no encontrado"
}
```

**Ejemplo de uso (JavaScript/TypeScript):**
```typescript
const marcajeId = "507f1f77bcf86cd799439011";
const response = await fetch(`${API_BASE_URL}/api/asistencia/${marcajeId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
if (data.success) {
  console.log("Marcaje eliminado exitosamente");
}
```

---

## Modelos de Datos

### Asistencia (Marcaje)

```typescript
interface Asistencia {
  id: string;                    // MongoDB ObjectId como string
  trabajador_ci: string;         // CI del trabajador
  tipo: "entrada" | "salida";    // Tipo de marcaje
  timestamp: string;             // ISO 8601 datetime
  fecha: string;                 // Fecha en formato YYYY-MM-DD
  registrado_por: string;        // CI del usuario que registró el marcaje
  comentarios?: string | null;   // Comentarios opcionales
}
```

### ResumenDiaTrabajado

```typescript
interface ResumenDiaTrabajado {
  fecha: string;                 // YYYY-MM-DD
  hora_entrada: string | null;   // HH:MM:SS
  hora_salida: string | null;    // HH:MM:SS
  horas_trabajadas: number | null;  // Horas decimales (ej: 9.25)
  marcajes: Array<{
    tipo: "entrada" | "salida";
    timestamp: string;           // ISO 8601
  }>;
}
```

### ReporteTrabajador

```typescript
interface ReporteTrabajador {
  trabajador_ci: string;
  nombre: string;
  esta_presente: boolean;
  hora_entrada: string | null;   // HH:MM:SS
  hora_salida: string | null;    // HH:MM:SS
  horas_trabajadas: number | null;
  estado_actual: "dentro" | "fuera";
}
```

---

## Códigos de Error

### Errores HTTP

- **200 OK**: Solicitud exitosa
- **201 Created**: Recurso creado exitosamente (marcaje)
- **400 Bad Request**: Parámetros inválidos (ej: formato de fecha incorrecto)
- **401 Unauthorized**: Token JWT inválido o no proporcionado
- **404 Not Found**: Recurso no encontrado
- **500 Internal Server Error**: Error del servidor

### Formato de Error

```json
{
  "detail": "Descripción del error"
}
```

### Ejemplos de Errores

**Formato de fecha inválido:**
```json
{
  "detail": "Formato de fecha inválido: Invalid isoformat string: '2024-13-01'"
}
```

**Tipo de marcaje inválido:**
```json
{
  "detail": "Tipo debe ser 'entrada' o 'salida'"
}
```

**Token no válido:**
```json
{
  "detail": "Token inválido o expirado"
}
```

---

## Flujos de Trabajo Comunes

### 1. Flujo de trabajador marcando su propia asistencia (Recomendado para apps de trabajadores)

```typescript
// En el login o al abrir la app, verificar estado
async function verificarMiEstado() {
  const response = await fetch(`${API_BASE_URL}/api/asistencia/mi-estado`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const estado = await response.json();

  // Mostrar en UI
  if (estado.data.esta_en_oficina) {
    mostrarBoton("Marcar Salida");
    mostrarMensaje(`Entraste hace ${estado.data.ultimo_marcaje.hace}`);
  } else {
    mostrarBoton("Marcar Entrada");
  }
}

// Al presionar el botón de marcar
async function marcarAsistencia() {
  const response = await fetch(`${API_BASE_URL}/api/asistencia/mi-marcaje`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const resultado = await response.json();

  mostrarNotificacion(resultado.message); // "Tu entrada fue registrada exitosamente"
  verificarMiEstado(); // Actualizar UI
}

// Ver si ya marqué hoy
async function verificarSiMarqueHoy() {
  const response = await fetch(`${API_BASE_URL}/api/asistencia/mis-marcajes-hoy`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const datos = await response.json();

  if (datos.data.ha_marcado_hoy) {
    console.log(`Has marcado ${datos.data.total_marcajes} veces hoy`);
    datos.data.marcajes.forEach(m => {
      console.log(`${m.tipo} a las ${new Date(m.timestamp).toLocaleTimeString()}`);
    });
  } else {
    console.log("No has marcado hoy aún");
  }
}
```

### 2. Marcar entrada de un trabajador (Admin marcando por otro trabajador)

```typescript
// Paso 1: Verificar si ya está en la oficina
const estadoResponse = await fetch(
  `${API_BASE_URL}/api/asistencia/trabajador/${ci}/esta-en-oficina`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const estado = await estadoResponse.json();

if (estado.data.esta_en_oficina) {
  console.log("El trabajador ya está en la oficina");
} else {
  // Paso 2: Marcar entrada
  const marcarResponse = await fetch(
    `${API_BASE_URL}/api/asistencia/marcar`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trabajador_ci: ci
      })
    }
  );
  const resultado = await marcarResponse.json();
  console.log(`${resultado.tipo_marcaje} registrada`);
}
```

### 3. Ver reporte de asistencia del día actual

```typescript
// Obtener reporte del día
const response = await fetch(
  `${API_BASE_URL}/api/asistencia/reporte-diario`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const reporte = await response.json();

// Mostrar resumen
console.log(`Fecha: ${reporte.data.fecha}`);
console.log(`Presentes: ${reporte.data.resumen.presentes_hoy}`);
console.log(`Ausentes: ${reporte.data.resumen.ausentes}`);
console.log(`En oficina ahora: ${reporte.data.resumen.actualmente_en_oficina}`);

// Listar trabajadores presentes
reporte.data.trabajadores
  .filter(t => t.esta_presente)
  .forEach(t => {
    console.log(`${t.nombre}: ${t.hora_entrada} - ${t.hora_salida || 'En oficina'}`);
  });
```

### 4. Calcular horas trabajadas del mes

```typescript
const primerDia = new Date(2024, 0, 1).toISOString().split('T')[0];  // 2024-01-01
const ultimoDia = new Date(2024, 0, 31).toISOString().split('T')[0]; // 2024-01-31

const response = await fetch(
  `${API_BASE_URL}/api/asistencia/trabajador/${ci}/dias-trabajados?fecha_inicio=${primerDia}&fecha_fin=${ultimoDia}`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const diasTrabajados = await response.json();

console.log(`Trabajador: ${diasTrabajados.data.nombre}`);
console.log(`Total días trabajados: ${diasTrabajados.data.resumen.total_dias_trabajados}`);
console.log(`Total horas: ${diasTrabajados.data.resumen.total_horas}`);
console.log(`Promedio horas/día: ${diasTrabajados.data.resumen.promedio_horas_dia}`);

// Listar días con menos de 8 horas
diasTrabajados.data.dias
  .filter(d => d.horas_trabajadas && d.horas_trabajadas < 8)
  .forEach(d => {
    console.log(`${d.fecha}: ${d.horas_trabajadas} horas (${d.hora_entrada} - ${d.hora_salida})`);
  });
```

### 5. Dashboard en tiempo real

```typescript
// Función para actualizar dashboard cada minuto
async function actualizarDashboard() {
  // Obtener quién está ahora
  const quienEstaResponse = await fetch(
    `${API_BASE_URL}/api/asistencia/quien-esta-ahora`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  const quienEsta = await quienEstaResponse.json();

  // Mostrar en UI
  document.getElementById('total-en-oficina').textContent = quienEsta.data.total;

  const lista = document.getElementById('lista-trabajadores');
  lista.innerHTML = '';
  quienEsta.data.trabajadores.forEach(t => {
    const item = document.createElement('div');
    item.textContent = `${t.nombre} - ${t.tiempo_en_oficina}`;
    lista.appendChild(item);
  });
}

// Actualizar cada minuto
setInterval(actualizarDashboard, 60000);
actualizarDashboard(); // Ejecutar inmediatamente
```

### 6. Corregir un marcaje erróneo

```typescript
// Escenario: Un trabajador olvidó marcar su salida ayer
// Paso 1: Buscar el marcaje de entrada de ayer
const ayer = new Date();
ayer.setDate(ayer.getDate() - 1);
const fechaAyer = ayer.toISOString().split('T')[0];

const historialResponse = await fetch(
  `${API_BASE_URL}/api/asistencia/trabajador/${ci}/historial?fecha_inicio=${fechaAyer}&fecha_fin=${fechaAyer}`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const historial = await historialResponse.json();

// Paso 2: Si no hay salida, crear una manualmente
const entradas = historial.data.marcajes.filter(m => m.tipo === 'entrada');
const salidas = historial.data.marcajes.filter(m => m.tipo === 'salida');

if (entradas.length > salidas.length) {
  // Marcar salida con timestamp de ayer a las 17:00
  const salidaTimestamp = `${fechaAyer}T17:00:00`;

  const marcarResponse = await fetch(
    `${API_BASE_URL}/api/asistencia/marcar`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trabajador_ci: ci,
        comentarios: "Salida registrada manualmente"
      })
    }
  );

  // Luego corregir el timestamp
  const marcaje = await marcarResponse.json();
  await fetch(
    `${API_BASE_URL}/api/asistencia/${marcaje.data.id}/corregir`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: salidaTimestamp,
        comentarios: "Corrección: salida olvidada"
      })
    }
  );

  console.log("Salida corregida exitosamente");
}
```

---

## Notas Importantes

1. **Autenticación automática**: El campo `registrado_por` se obtiene automáticamente del token JWT. No es necesario enviarlo en los requests.

2. **Auto-detección de tipo**: El endpoint `/marcar` detecta automáticamente si debe marcar entrada o salida basándose en el último marcaje del trabajador.

3. **Formato de fechas**:
   - Las fechas se deben enviar en formato ISO 8601: `YYYY-MM-DD`
   - Los timestamps incluyen hora: `YYYY-MM-DDTHH:MM:SS`

4. **Zona horaria**: Todos los timestamps se manejan en la zona horaria del servidor.

5. **Permisos de admin**: Los endpoints de corrección y eliminación deberían estar restringidos a usuarios administradores en el middleware de autenticación.

6. **Cálculo de horas**: Las horas trabajadas se calculan automáticamente entre el primer marcaje de entrada y el último de salida del día.

---

## Soporte y Contacto

Para reportar issues o solicitar nuevas funcionalidades, contactar al equipo de desarrollo de SunCar Backend.

**Versión de la API:** 2.0.0
**Última actualización:** Enero 2025
