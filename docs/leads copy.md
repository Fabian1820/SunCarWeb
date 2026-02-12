# Leads API - Documentación Actualizada

## ⚠️ IMPORTANTE: Campo `motivo_visita`

El campo `motivo_visita` es un **campo temporal** que:
- ✅ Se envía en el request body cuando `estado = "Pendiente de visita"`
- ✅ Se usa para crear automáticamente un registro en la colección `visitas`
- ❌ **NO se guarda** en el documento del lead
- ❌ **NO se retorna** en la respuesta

**Ver documentación completa:** `docs/BACKEND_CREAR_VISITA_AUTOMATICA.md`

---

## Diferencias con la Versión Anterior

### Campos Nuevos
- **`telefono_adicional`**: Teléfono adicional opcional para el lead
- **`comentario`**: Reemplaza el campo `necesidad`. Comentarios generales sobre el lead
- **`comercial`**: Nombre del comercial que atiende al lead (opcional)
- **`ofertas`**: Lista de ofertas embebidas con cantidad. Cada oferta incluye un snapshot completo de la oferta en el momento de la solicitud
- **`elementos_personalizados`**: Lista de elementos personalizados con descripción y cantidad
- **`motivo_visita`**: Campo temporal para crear visitas (NO se guarda en lead)

### Campos Eliminados
- **`necesidad`**: Ahora se usa el campo `comentario` en su lugar

### Nuevos Endpoints
- **`POST /api/leads/{lead_id}/convertir-a-cliente`**: Endpoint para convertir un lead a cliente

### Cambios en el Modelo
El modelo Lead ahora soporta información completa sobre las ofertas solicitadas y elementos personalizados, permitiendo un seguimiento más detallado de las necesidades del cliente potencial.

---

## Modelo Lead

```typescript
interface ElementoPersonalizado {
  descripcion: string;    // Descripción del elemento
  cantidad: number;       // Cantidad (debe ser mayor a 0)
}

interface OfertaAsignacion {
  oferta_id: string;  // ID de la oferta a asignar (OBLIGATORIO)
  cantidad: number;   // Cantidad solicitada de esta oferta (debe ser mayor a 0)
}

// NOTA: Al crear/actualizar un lead, el backend busca la oferta completa
// por su ID y la guarda embebida en el lead (snapshot completo).
// La oferta embebida que verás al obtener el lead tiene esta estructura:
interface OfertaEmbebida {
  id?: string;                      // ID de la oferta original
  descripcion: string;              // Descripción de la oferta
  descripcion_detallada?: string;   // Descripción detallada
  precio: number;                   // Precio de la oferta
  precio_cliente?: number;          // Precio específico para el cliente
  marca?: string;                   // Marca asociada
  imagen?: string;                  // URL de imagen
  moneda?: string;                  // Moneda (ej: "USD", "EUR")
  financiamiento?: boolean;         // Si tiene financiamiento disponible
  descuentos?: string;              // Información sobre descuentos
  garantias: string[];              // Lista de garantías
  elementos: any[];                 // Elementos de la oferta
  cantidad: number;                 // Cantidad solicitada de esta oferta
}

interface Lead {
  id?: string;

  // Información de contacto
  fecha_contacto: string;           // Obligatorio
  nombre: string;                   // Obligatorio
  telefono: string;                 // Obligatorio
  telefono_adicional?: string;      // Opcional - NUEVO

  // Estado y seguimiento
  estado: string;                   // Obligatorio
  fuente?: string;                  // Opcional
  referencia?: string;              // Opcional
  comercial?: string;               // Opcional - NUEVO (comercial que atiende)

  // Ubicación
  direccion?: string;               // Opcional
  pais_contacto?: string;           // Opcional
  provincia_montaje?: string;       // Opcional

  // Información adicional
  comentario?: string;              // Opcional - NUEVO (reemplaza "necesidad")

  // Ofertas y elementos (al CREAR/ACTUALIZAR)
  ofertas: OfertaAsignacion[];      // Al crear/actualizar: solo envías el ID de oferta + cantidad
  elementos_personalizados: ElementoPersonalizado[];  // Elementos personalizados

  // Campo temporal para crear visitas (NO se guarda en lead)
  motivo_visita?: string;           // Solo se envía cuando estado = "Pendiente de visita"
                                    // Se usa para crear un registro en colección "visitas"
                                    // NO se guarda en el lead, NO se retorna en respuesta

  // NOTA: Al OBTENER un lead, las ofertas vienen como OfertaEmbebida[]
}
```

### Campos Obligatorios
- `fecha_contacto` (string): Fecha de contacto
- `nombre` (string): Nombre del lead
- `telefono` (string): Teléfono de contacto principal
- `estado` (string): Estado del lead (ej: "nuevo", "contactado", "en proceso", "convertido")

### Campos Opcionales
- `telefono_adicional` (string): Teléfono adicional de contacto
- `fuente` (string): Fuente del lead (ej: "página web", "referido", "publicidad")
- `referencia` (string): Referencia o detalle de cómo llegó el lead
- `direccion` (string): Dirección del lead
- `pais_contacto` (string): País de contacto
- `comentario` (string): Comentarios adicionales sobre el lead
- `provincia_montaje` (string): Provincia donde se realizará el montaje
- `comercial` (string): Nombre del comercial que atiende al lead
- `ofertas` (array): Lista de ofertas a asignar. Cada oferta requiere solo `oferta_id` (string) y `cantidad` (number)
- `elementos_personalizados` (array): Lista de elementos personalizados solicitados
- `motivo_visita` (string): **Campo temporal** - Se envía cuando `estado = "Pendiente de visita"`. El backend crea automáticamente un registro en `visitas` con este motivo. **NO se guarda en el lead**.

---

## Endpoints

### 1. Crear Lead
**POST** `/api/leads/`

**Request Body:**
```json
{
  "fecha_contacto": "2024-10-22",
  "nombre": "Juan Pérez",
  "telefono": "+1234567890",
  "telefono_adicional": "+0987654321",
  "estado": "nuevo",
  "fuente": "página web",
  "referencia": "campaña redes sociales",
  "direccion": "Calle 123, Ciudad",
  "pais_contacto": "España",
  "comentario": "Cliente interesado en instalación solar residencial de 5kW",
  "provincia_montaje": "Madrid",
  "comercial": "María González",
  "ofertas": [
    {
      "oferta_id": "67491f8b2e4c3d001234abcd",
      "cantidad": 1
    },
    {
      "oferta_id": "67491f8b2e4c3d001234abce",
      "cantidad": 2
    }
  ],
  "elementos_personalizados": [
    {
      "descripcion": "Estructura de montaje especial para techo inclinado",
      "cantidad": 1
    },
    {
      "descripcion": "Cable de extensión 50m",
      "cantidad": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead creado exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "fecha_contacto": "2024-10-22",
    "nombre": "Juan Pérez",
    "telefono": "+1234567890",
    "telefono_adicional": "+0987654321",
    "estado": "nuevo",
    "fuente": "página web",
    "referencia": "campaña redes sociales",
    "direccion": "Calle 123, Ciudad",
    "pais_contacto": "España",
    "comentario": "Cliente interesado en instalación solar residencial de 5kW",
    "provincia_montaje": "Madrid",
    "comercial": "María González",
    "ofertas": [...],
    "elementos_personalizados": [...]
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
GET /api/leads/?estado=nuevo&comercial=María González
```

**Response:**
```json
{
  "success": true,
  "message": "Leads obtenidos exitosamente",
  "data": [...]
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
    "nombre": "Juan Pérez",
    ...
  }
}
```

### 4. Actualizar Lead
**PATCH** `/api/leads/{lead_id}`

**Request Body (todos los campos son opcionales):**
```json
{
  "estado": "contactado",
  "comentario": "Cliente requiere cotización actualizada",
  "comercial": "Pedro Martínez",
  "ofertas": [
    {
      "oferta_id": "67491f8b2e4c3d001234xyz1",
      "cantidad": 3
    }
  ]
}
```

**NOTA**: Si envías el campo `ofertas`, se reemplazan **todas** las ofertas del lead con las nuevas que envíes.

**Response:**
```json
{
  "success": true,
  "message": "Lead actualizado correctamente",
  "data": {...}
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

### 6. Convertir Lead a Cliente (NUEVO)
**POST** `/api/leads/{lead_id}/convertir-a-cliente`

Este endpoint convierte un lead existente a cliente. Los datos del lead se copian automáticamente al cliente, y el lead se elimina después de la conversión exitosa.

**Request Body:**
```json
{
  "numero": "CLI-2024-001",           // Obligatorio - Número del cliente
  "fecha_montaje": "2024-11-15",      // Opcional
  "latitud": "40.4168",               // Opcional
  "longitud": "-3.7038",              // Opcional
  "carnet_identidad": "12345678A",    // Opcional
  "fecha_instalacion": "2024-11-20T10:00:00"  // Opcional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead convertido exitosamente a cliente CLI-2024-001",
  "data": {
    "numero": "CLI-2024-001",
    "nombre": "Juan Pérez",
    "telefono": "+1234567890",
    "telefono_adicional": "+0987654321",
    "direccion": "Calle 123, Ciudad",
    "fecha_contacto": "2024-10-22",
    "estado": "nuevo",
    "fuente": "página web",
    "comentario": "Cliente interesado en instalación solar residencial de 5kW",
    "comercial": "María González",
    "ofertas": [...],
    "elementos_personalizados": [...],
    "fecha_montaje": "2024-11-15",
    "latitud": "40.4168",
    "longitud": "-3.7038",
    ...
  }
}
```

**Campos que se copian automáticamente del Lead al Cliente:**
- nombre
- telefono
- telefono_adicional
- direccion
- fecha_contacto
- estado
- fuente
- referencia
- pais_contacto
- comentario
- provincia_montaje
- comercial
- ofertas (con todo el detalle embebido)
- elementos_personalizados

**Campos específicos del Cliente (del request):**
- numero (obligatorio)
- fecha_montaje (opcional)
- latitud (opcional)
- longitud (opcional)
- carnet_identidad (opcional)
- fecha_instalacion (opcional)

**Errores:**
- **404**: Lead no encontrado
- **500**: Error al crear el cliente o eliminar el lead

### 7. Buscar Leads por Teléfono
**GET** `/api/leads/telefono/{telefono}`

**Response:**
```json
{
  "success": true,
  "message": "Se encontraron 1 leads con el teléfono +1234567890",
  "data": [...]
}
```

### 8. Verificar si Existe un Lead
**GET** `/api/leads/{lead_id}/existe`

**Response:**
```json
{
  "success": true,
  "message": "Lead encontrado",
  "exists": true
}
```

---

## Códigos de Estado HTTP

- **200 OK**: Operación exitosa
- **404 Not Found**: Lead no encontrado
- **422 Unprocessable Entity**: Error de validación en los datos
- **500 Internal Server Error**: Error interno del servidor

---

## Notas Importantes

1. **Sistema de Ofertas - IMPORTANTE**:
   - **Al crear o actualizar**: Solo envías el `oferta_id` y la `cantidad` en el array de ofertas
   - **El backend automáticamente**:
     - Busca la oferta completa en la base de datos usando el ID
     - Guarda un snapshot completo de la oferta en el lead (embed)
     - Si la oferta no existe, retorna error 404
   - **Al obtener un lead**: Recibes las ofertas como `OfertaEmbebida[]` con todos los detalles
   - **Beneficio**: Si la oferta original cambia de precio o características, el lead conserva los datos exactos del momento en que fue creado

2. **Elementos Personalizados**: Permiten agregar elementos que no están en el catálogo de ofertas, útil para casos especiales o personalizaciones.

3. **Conversión a Cliente**: El proceso de conversión es transaccional:
   - Primero se verifica que el lead existe
   - Se crea el cliente con todos los datos del lead + datos adicionales
   - Solo si la creación es exitosa, se elimina el lead
   - Si algo falla, el lead permanece en el sistema

4. **Campo `comentario`**: Reemplaza al antiguo campo `necesidad`, permitiendo más flexibilidad en los comentarios sobre el lead.

5. **Ordenamiento**: Los leads se ordenan por fecha de contacto más reciente al listarlos.

6. **Búsqueda**: La búsqueda por nombre y teléfono es insensible a mayúsculas/minúsculas y permite coincidencias parciales.

7. **Actualización parcial**: Al actualizar con PATCH, solo se modifican los campos enviados en el request.

---

## Ejemplo de Flujo Completo

### 1. Crear un lead nuevo
```bash
POST /api/leads/
{
  "fecha_contacto": "2024-10-22",
  "nombre": "Ana Torres",
  "telefono": "+34612345678",
  "estado": "nuevo",
  "fuente": "referido",
  "comentario": "Interesada en sistema solar 10kW",
  "comercial": "Carlos Ruiz",
  "ofertas": [...]
}
```

### 2. Actualizar el estado a "contactado"
```bash
PATCH /api/leads/507f1f77bcf86cd799439011
{
  "estado": "contactado",
  "comentario": "Llamada realizada, pendiente de cotización"
}
```

### 3. Convertir a cliente cuando cierra la venta
```bash
POST /api/leads/507f1f77bcf86cd799439011/convertir-a-cliente
{
  "numero": "CLI-2024-042",
  "fecha_montaje": "2024-11-30",
  "latitud": "40.4168",
  "longitud": "-3.7038"
}
```

Después de este paso, el lead ya no existe en el sistema y se ha creado un cliente con número CLI-2024-042 con toda la información del lead más los datos adicionales proporcionados.
