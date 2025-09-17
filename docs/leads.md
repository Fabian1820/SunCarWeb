# Leads API Documentation

## Modelo Lead

```typescript
interface Lead {
  id?: string;
  fecha_contacto: string;     // Obligatorio
  nombre: string;             // Obligatorio
  telefono: string;           // Obligatorio
  estado: string;             // Obligatorio
  fuente?: string;            // Opcional
  referencia?: string;        // Opcional
  direccion?: string;         // Opcional
  pais_contacto?: string;     // Opcional
  necesidad?: string;         // Opcional
  provincia_montaje?: string; // Opcional
}
```

### Campos Obligatorios
- `fecha_contacto` (string): Fecha de contacto
- `nombre` (string): Nombre del lead
- `telefono` (string): Teléfono de contacto
- `estado` (string): Estado del lead

### Campos Opcionales
- `fuente` (string): Fuente del lead
- `referencia` (string): Referencia del lead
- `direccion` (string): Dirección
- `pais_contacto` (string): País de contacto
- `necesidad` (string): Necesidad específica
- `provincia_montaje` (string): Provincia de montaje

## Endpoints

### 1. Crear Lead
**POST** `/api/leads/`

**Request Body:**
```json
{
  "fecha_contacto": "2024-01-15",
  "nombre": "Juan Pérez",
  "telefono": "+1234567890",
  "estado": "nuevo",
  "fuente": "página web",
  "referencia": "cliente anterior",
  "direccion": "Calle 123, Ciudad",
  "pais_contacto": "España",
  "necesidad": "instalación solar residencial",
  "provincia_montaje": "Madrid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead creado exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "fecha_contacto": "2024-01-15",
    "nombre": "Juan Pérez",
    "telefono": "+1234567890",
    "estado": "nuevo",
    "fuente": "página web",
    "referencia": "cliente anterior",
    "direccion": "Calle 123, Ciudad",
    "pais_contacto": "España",
    "necesidad": "instalación solar residencial",
    "provincia_montaje": "Madrid"
  }
}
```

### 2. Listar Leads
**GET** `/api/leads/`

**Query Parameters (todos opcionales):**
- `nombre` (string): Búsqueda parcial por nombre
- `telefono` (string): Búsqueda parcial por teléfono
- `estado` (string): Filtro exacto por estado
- `fuente` (string): Filtro exacto por fuente

**Ejemplo:**
```
GET /api/leads/?estado=nuevo&fuente=página web
```

**Response:**
```json
{
  "success": true,
  "message": "Leads obtenidos exitosamente",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "fecha_contacto": "2024-01-15",
      "nombre": "Juan Pérez",
      "telefono": "+1234567890",
      "estado": "nuevo",
      "fuente": "página web",
      "referencia": "cliente anterior",
      "direccion": "Calle 123, Ciudad",
      "pais_contacto": "España",
      "necesidad": "instalación solar residencial",
      "provincia_montaje": "Madrid"
    }
  ]
}
```

### 3. Obtener Lead por ID
**GET** `/api/leads/{lead_id}`

**Response:**
```json
{
  "success": true,
  "message": "Lead encontrado",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "fecha_contacto": "2024-01-15",
    "nombre": "Juan Pérez",
    "telefono": "+1234567890",
    "estado": "nuevo",
    "fuente": "página web",
    "referencia": "cliente anterior",
    "direccion": "Calle 123, Ciudad",
    "pais_contacto": "España",
    "necesidad": "instalación solar residencial",
    "provincia_montaje": "Madrid"
  }
}
```

**Response (no encontrado):**
```json
{
  "success": false,
  "message": "Lead no encontrado",
  "data": null
}
```

### 4. Actualizar Lead
**PATCH** `/api/leads/{lead_id}`

**Request Body (todos los campos son opcionales):**
```json
{
  "estado": "contactado",
  "necesidad": "instalación solar comercial",
  "provincia_montaje": "Barcelona"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead actualizado correctamente",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "fecha_contacto": "2024-01-15",
    "nombre": "Juan Pérez",
    "telefono": "+1234567890",
    "estado": "contactado",
    "fuente": "página web",
    "referencia": "cliente anterior",
    "direccion": "Calle 123, Ciudad",
    "pais_contacto": "España",
    "necesidad": "instalación solar comercial",
    "provincia_montaje": "Barcelona"
  }
}
```

### 5. Eliminar Lead
**DELETE** `/api/leads/{lead_id}`

**Response:**
```json
{
  "success": true,
  "message": "Lead eliminado correctamente",
  "data": {
    "lead_id": "507f1f77bcf86cd799439011"
  }
}
```

**Response (no encontrado):**
```json
{
  "success": false,
  "message": "Lead no encontrado",
  "data": null
}
```

### 6. Buscar Leads por Teléfono
**GET** `/api/leads/telefono/{telefono}`

**Response:**
```json
{
  "success": true,
  "message": "Se encontraron 2 leads con el teléfono +1234567890",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "fecha_contacto": "2024-01-15",
      "nombre": "Juan Pérez",
      "telefono": "+1234567890",
      "estado": "nuevo",
      "fuente": "página web",
      "referencia": "cliente anterior",
      "direccion": "Calle 123, Ciudad",
      "pais_contacto": "España",
      "necesidad": "instalación solar residencial",
      "provincia_montaje": "Madrid"
    }
  ]
}
```

### 7. Verificar si Existe un Lead
**GET** `/api/leads/{lead_id}/existe`

**Response:**
```json
{
  "success": true,
  "message": "Lead encontrado",
  "exists": true
}
```

**Response (no existe):**
```json
{
  "success": true,
  "message": "Lead no encontrado",
  "exists": false
}
```

## Códigos de Estado HTTP

- **200 OK**: Operación exitosa
- **404 Not Found**: Lead no encontrado
- **422 Unprocessable Entity**: Error de validación en los datos
- **500 Internal Server Error**: Error interno del servidor

## Notas

- Los leads se ordenan por fecha de contacto más reciente al listarlos
- La búsqueda por nombre y teléfono es insensible a mayúsculas/minúsculas
- Al actualizar, solo se modifican los campos enviados en el request
- El campo `id` se genera automáticamente al crear un lead