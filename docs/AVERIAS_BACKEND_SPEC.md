# Especificación Backend - Sistema de Averías

## Descripción General

Sistema para gestionar averías de clientes. Cada cliente puede tener múltiples averías, cada una con su descripción y estado (Pendiente o Solucionada).

## Endpoints Requeridos

### 1. Agregar Avería a Cliente

**Endpoint**: `POST /api/clientes/{numero}/averias/`

**Descripción**: Agrega una nueva avería a un cliente específico.

**Request Body**:
```json
{
  "descripcion": "Inversor no enciende",
  "estado": "Pendiente"
}
```

**Campos**:
- `descripcion` (string, requerido): Descripción de la avería
- `estado` (string, opcional): Estado inicial ("Pendiente" por defecto)

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Avería agregada correctamente",
  "data": {
    "id": "uuid-123",
    "descripcion": "Inversor no enciende",
    "estado": "Pendiente",
    "fecha_reporte": "2024-01-15T10:30:00Z",
    "fecha_solucion": null
  }
}
```

---

### 2. Actualizar Avería

**Endpoint**: `PATCH /api/clientes/{numero}/averias/{averia_id}/`

**Descripción**: Actualiza una avería existente (principalmente para cambiar el estado).

**Request Body**:
```json
{
  "estado": "Solucionada"
}
```

**Campos opcionales**:
- `descripcion` (string): Nueva descripción
- `estado` (string): Nuevo estado ("Pendiente" o "Solucionada")

**Nota**: Al cambiar el estado a "Solucionada", el backend debe establecer automáticamente `fecha_solucion` con la fecha/hora actual.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Avería actualizada correctamente",
  "data": {
    "id": "uuid-123",
    "descripcion": "Inversor no enciende",
    "estado": "Solucionada",
    "fecha_reporte": "2024-01-15T10:30:00Z",
    "fecha_solucion": "2024-01-16T14:20:00Z"
  }
}
```

---

### 3. Eliminar Avería

**Endpoint**: `DELETE /api/clientes/{numero}/averias/{averia_id}/`

**Descripción**: Elimina una avería de un cliente.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Avería eliminada correctamente"
}
```

**Response** (404 Not Found):
```json
{
  "success": false,
  "message": "Avería no encontrada"
}
```

---

### 4. Obtener Cliente con Averías

**Endpoint**: `GET /api/clientes/{numero}/`

**Descripción**: Obtiene los datos de un cliente incluyendo sus averías.

**Response** (200 OK):
```json
{
  "numero": "F0312146",
  "nombre": "Juan Pérez",
  "telefono": "53123456",
  "direccion": "Calle 23 #456",
  "estado": "Equipo instalado con éxito",
  "averias": [
    {
      "id": "uuid-123",
      "descripcion": "Inversor no enciende",
      "estado": "Solucionada",
      "fecha_reporte": "2024-01-15T10:30:00Z",
      "fecha_solucion": "2024-01-16T14:20:00Z"
    },
    {
      "id": "uuid-456",
      "descripcion": "Panel dañado por tormenta",
      "estado": "Pendiente",
      "fecha_reporte": "2024-01-20T09:15:00Z",
      "fecha_solucion": null
    }
  ]
}
```

---

### 5. Listar Todos los Clientes (con averías)

**Endpoint**: `GET /api/clientes/`

**Descripción**: Lista todos los clientes, cada uno con su array de averías.

**Response** (200 OK):
```json
[
  {
    "numero": "F0312146",
    "nombre": "Juan Pérez",
    "averias": [
      {
        "id": "uuid-123",
        "descripcion": "Inversor no enciende",
        "estado": "Pendiente",
        "fecha_reporte": "2024-01-15T10:30:00Z",
        "fecha_solucion": null
      }
    ]
  },
  {
    "numero": "F0312147",
    "nombre": "María García",
    "averias": []
  }
]
```

---

## Modelo de Datos

### Avería

```python
class Averia:
    id: str  # UUID o ID único
    descripcion: str  # Descripción de la avería
    estado: str  # "Pendiente" o "Solucionada"
    fecha_reporte: str  # Fecha ISO cuando se reportó (auto)
    fecha_solucion: str | None  # Fecha ISO cuando se solucionó (auto al marcar como solucionada)
```

### Cliente (actualizado)

```python
class Cliente:
    # ... campos existentes ...
    averias: List[Averia]  # Array de averías del cliente
```

---

## Validaciones

1. **Al crear avería**:
   - `descripcion` es requerido y no puede estar vacío
   - `estado` por defecto es "Pendiente"
   - `fecha_reporte` se establece automáticamente con la fecha/hora actual
   - `fecha_solucion` es null

2. **Al actualizar avería**:
   - Si se cambia `estado` a "Solucionada", establecer `fecha_solucion` automáticamente
   - Si se cambia `estado` de "Solucionada" a "Pendiente", establecer `fecha_solucion` a null

3. **Estados válidos**:
   - Solo "Pendiente" o "Solucionada"
   - Cualquier otro valor debe rechazarse con error 400

---

## Casos de Uso

### Flujo 1: Agregar Avería
1. Cliente reporta problema
2. Frontend envía POST a `/api/clientes/{numero}/averias/`
3. Backend crea avería con estado "Pendiente"
4. Backend establece `fecha_reporte` automáticamente
5. Backend retorna avería creada

### Flujo 2: Marcar como Solucionada
1. Técnico soluciona el problema
2. Frontend envía PATCH a `/api/clientes/{numero}/averias/{id}/` con `{"estado": "Solucionada"}`
3. Backend actualiza estado
4. Backend establece `fecha_solucion` automáticamente
5. Backend retorna avería actualizada

### Flujo 3: Eliminar Avería
1. Usuario decide eliminar registro de avería
2. Frontend envía DELETE a `/api/clientes/{numero}/averias/{id}/`
3. Backend elimina la avería
4. Backend retorna confirmación

---

## Notas de Implementación

1. **Relación**: Un cliente puede tener múltiples averías (relación 1:N)
2. **Persistencia**: Las averías deben persistirse en la base de datos
3. **Cascada**: Al eliminar un cliente, eliminar también sus averías
4. **Ordenamiento**: Retornar averías ordenadas por `fecha_reporte` descendente (más recientes primero)
5. **Formato de fechas**: Usar formato ISO 8601 (ej: "2024-01-15T10:30:00Z")

---

## Errores Comunes

### 400 Bad Request
- Descripción vacía o faltante
- Estado inválido (no es "Pendiente" ni "Solucionada")

### 404 Not Found
- Cliente no existe
- Avería no existe

### 500 Internal Server Error
- Error al guardar en base de datos
- Error al actualizar fechas
