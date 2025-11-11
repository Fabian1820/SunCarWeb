# Documentación de Endpoints - Sistema de Trabajos Pendientes

## Trabajos Pendientes

### 1. POST `/api/trabajos-pendientes/`
**Descripción:** Crea un nuevo trabajo pendiente.

**Request Body:**
```json
{
  "CI": string,
  "estado": string,
  "fecha_inicio": datetime (ISO 8601),
  "is_active": boolean (default: true),
  "veces_visitado": integer (default: 0),
  "stopped_by": string | null (opcional),
  "comentario": string | null (opcional),
  "responsable_parada": "nosotros" | "el cliente" | "otro" | null (opcional)
}
```

**Ejemplo de Request:**
```json
{
  "CI": "12345678",
  "estado": "En progreso",
  "fecha_inicio": "2025-01-10T10:00:00Z",
  "is_active": true,
  "veces_visitado": 0,
  "stopped_by": "Falta de materiales",
  "comentario": "Esperando entrega de piezas del proveedor",
  "responsable_parada": "nosotros"
}
```

**Response:**
```json
{
  "success": boolean,
  "message": string,
  "trabajo_id": string
}
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Trabajo pendiente creado exitosamente",
  "trabajo_id": "676012345abc"
}
```

---

### 2. GET `/api/trabajos-pendientes/`
**Descripción:** Obtiene todos los trabajos pendientes. Permite filtrar por estado activo.

**Query Parameters:**
- `is_active`: boolean (opcional) - Filtra por estado activo

**Ejemplos:**
- `/api/trabajos-pendientes/` - Obtiene todos los trabajos
- `/api/trabajos-pendientes/?is_active=true` - Solo trabajos activos
- `/api/trabajos-pendientes/?is_active=false` - Solo trabajos inactivos

**Response:**
```json
{
  "success": boolean,
  "message": string,
  "data": [
    {
      "id": string,
      "CI": string,
      "is_active": boolean,
      "estado": string,
      "fecha_inicio": datetime,
      "veces_visitado": integer,
      "stopped_by": string | null,
      "comentario": string | null,
      "responsable_parada": string | null
    }
  ]
}
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Se encontraron 15 trabajos pendientes",
  "data": [
    {
      "id": "676012345abc",
      "CI": "12345678",
      "is_active": true,
      "estado": "En progreso",
      "fecha_inicio": "2025-01-10T10:00:00Z",
      "veces_visitado": 3,
      "stopped_by": "Falta de materiales",
      "comentario": "Esperando entrega de piezas",
      "responsable_parada": "nosotros"
    }
  ]
}
```

---

### 3. GET `/api/trabajos-pendientes/ci/{ci}`
**Descripción:** Obtiene todos los trabajos pendientes de una persona específica por su CI.

**Path Parameters:**
- `ci`: string (CI de la persona)

**Response:**
```json
{
  "success": boolean,
  "message": string,
  "data": [
    {
      "id": string,
      "CI": string,
      "is_active": boolean,
      "estado": string,
      "fecha_inicio": datetime,
      "veces_visitado": integer,
      "stopped_by": string | null,
      "comentario": string | null,
      "responsable_parada": string | null
    }
  ]
}
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Se encontraron 3 trabajos pendientes para CI 12345678",
  "data": [
    {
      "id": "676012345abc",
      "CI": "12345678",
      "is_active": true,
      "estado": "En progreso",
      "fecha_inicio": "2025-01-10T10:00:00Z",
      "veces_visitado": 2,
      "stopped_by": null,
      "comentario": null,
      "responsable_parada": null
    }
  ]
}
```

---

### 4. GET `/api/trabajos-pendientes/{trabajo_id}`
**Descripción:** Obtiene los detalles de un trabajo pendiente específico por su ID.

**Path Parameters:**
- `trabajo_id`: string (ID del trabajo pendiente)

**Response:**
```json
{
  "success": boolean,
  "message": string,
  "data": {
    "id": string,
    "CI": string,
    "is_active": boolean,
    "estado": string,
    "fecha_inicio": datetime,
    "veces_visitado": integer,
    "stopped_by": string | null,
    "comentario": string | null,
    "responsable_parada": string | null
  } | null
}
```

**Ejemplo de Response (Trabajo encontrado):**
```json
{
  "success": true,
  "message": "Trabajo pendiente encontrado",
  "data": {
    "id": "676012345abc",
    "CI": "12345678",
    "is_active": true,
    "estado": "En progreso",
    "fecha_inicio": "2025-01-10T10:00:00Z",
    "veces_visitado": 5,
    "stopped_by": "Cliente no disponible",
    "comentario": "Reagendar para la próxima semana",
    "responsable_parada": "el cliente"
  }
}
```

**Ejemplo de Response (Trabajo no encontrado):**
```json
{
  "success": false,
  "message": "Trabajo pendiente no encontrado",
  "data": null
}
```

---

### 5. PUT `/api/trabajos-pendientes/{trabajo_id}`
**Descripción:** Actualiza un trabajo pendiente existente. Solo actualiza los campos proporcionados (actualización parcial).

**Path Parameters:**
- `trabajo_id`: string (ID del trabajo pendiente)

**Request Body:**
```json
{
  "CI": string (opcional),
  "estado": string (opcional),
  "fecha_inicio": datetime (opcional),
  "is_active": boolean (opcional),
  "veces_visitado": integer (opcional),
  "stopped_by": string | null (opcional),
  "comentario": string | null (opcional),
  "responsable_parada": "nosotros" | "el cliente" | "otro" | null (opcional)
}
```

**Ejemplo de Request (Actualización parcial):**
```json
{
  "estado": "Completado",
  "is_active": false,
  "comentario": "Trabajo finalizado satisfactoriamente"
}
```

**Response:**
```json
{
  "success": boolean,
  "message": string
}
```

**Ejemplo de Response (Éxito):**
```json
{
  "success": true,
  "message": "Trabajo pendiente actualizado exitosamente"
}
```

**Ejemplo de Response (No encontrado):**
```json
{
  "success": false,
  "message": "Trabajo pendiente no encontrado"
}
```

---

### 6. PATCH `/api/trabajos-pendientes/{trabajo_id}/status`
**Descripción:** Actualiza únicamente el estado activo de un trabajo pendiente.

**Path Parameters:**
- `trabajo_id`: string (ID del trabajo pendiente)

**Request Body:**
```json
{
  "is_active": boolean
}
```

**Ejemplo de Request:**
```json
{
  "is_active": false
}
```

**Response:**
```json
{
  "success": boolean,
  "message": string
}
```

**Ejemplo de Response (Éxito):**
```json
{
  "success": true,
  "message": "Estado actualizado exitosamente"
}
```

**Ejemplo de Response (No encontrado):**
```json
{
  "success": false,
  "message": "Trabajo pendiente no encontrado o sin cambios"
}
```

---

### 7. PATCH `/api/trabajos-pendientes/{trabajo_id}/increment-visits`
**Descripción:** Incrementa automáticamente el contador de visitas de un trabajo pendiente en 1.

**Path Parameters:**
- `trabajo_id`: string (ID del trabajo pendiente)

**Request:**
- No requiere body

**Response:**
```json
{
  "success": boolean,
  "message": string
}
```

**Ejemplo de Response (Éxito):**
```json
{
  "success": true,
  "message": "Visitas incrementadas exitosamente"
}
```

**Ejemplo de Response (No encontrado):**
```json
{
  "success": false,
  "message": "Trabajo pendiente no encontrado"
}
```

---

### 8. DELETE `/api/trabajos-pendientes/{trabajo_id}`
**Descripción:** Elimina un trabajo pendiente por su ID.

**Path Parameters:**
- `trabajo_id`: string (ID del trabajo pendiente)

**Response:**
```json
{
  "success": boolean,
  "message": string
}
```

**Ejemplo de Response (Éxito):**
```json
{
  "success": true,
  "message": "Trabajo pendiente eliminado exitosamente"
}
```

**Ejemplo de Response (No encontrado):**
```json
{
  "success": false,
  "message": "Trabajo pendiente no encontrado"
}
```

---

## Notas Importantes

1. **Formato de Fecha**: El campo `fecha_inicio` debe enviarse en formato ISO 8601:
   - Ejemplo: `"2025-01-10T10:00:00Z"` (UTC)
   - Ejemplo: `"2025-01-10T10:00:00-05:00"` (con timezone)

2. **Campo responsable_parada**: Solo acepta tres valores específicos:
   - `"nosotros"`
   - `"el cliente"`
   - `"otro"`
   - `null` (sin responsable)

3. **Actualización Parcial**: El endpoint PUT permite actualización parcial. Solo los campos enviados en el request serán actualizados, los demás se mantienen sin cambios.

4. **Campos Opcionales**: Los siguientes campos son opcionales y pueden ser `null`:
   - `stopped_by`
   - `comentario`
   - `responsable_parada`

5. **Valores por Defecto**:
   - `is_active`: `true`
   - `veces_visitado`: `0`

6. **Identificadores**:
   - `trabajo_id`: ObjectId de MongoDB como string
   - `CI`: String que representa la cédula de identidad de la persona

7. **Colección MongoDB**:
   - `trabajos_pendientes`: Contiene todos los trabajos pendientes

8. **Estructura de la Colección**:

   **Trabajo Pendiente:**
   ```json
   {
     "_id": ObjectId,
     "CI": string,
     "is_active": boolean,
     "estado": string,
     "fecha_inicio": ISODate,
     "veces_visitado": integer,
     "stopped_by": string | null,
     "comentario": string | null,
     "responsable_parada": "nosotros" | "el cliente" | "otro" | null,
     "created_at": ISODate,
     "updated_at": ISODate
   }
   ```

9. **Timestamps Automáticos**:
   - `created_at`: Se genera automáticamente al crear el registro
   - `updated_at`: Se actualiza automáticamente en cada modificación

10. **Sin Validaciones Externas**: Los endpoints NO validan:
    - Existencia de la persona con el CI especificado en otras colecciones
    - Formato específico del CI (acepta cualquier string)
