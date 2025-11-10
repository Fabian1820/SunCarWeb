# API Ofertas Personalizadas - Documentación Frontend

Esta documentación describe las tres nuevas funcionalidades agregadas al backend de SunCar:
- **Marcas** (nomenclador de marcas)
- **Servicios** (catálogo de servicios)
- **Ofertas Personalizadas** (ofertas con inversores, baterías, paneles, útiles y servicios)

## Autenticación

**IMPORTANTE:** Todos los endpoints requieren autenticación mediante JWT Bearer Token.

```http
Authorization: Bearer {token}
```

---

## 1. Marcas API

**Base URL:** `/api/marcas`

### Schemas TypeScript

```typescript
// Entidad Marca
interface Marca {
  id?: string;                    // ID de MongoDB (string)
  nombre: string;                 // Nombre de la marca (requerido)
  descripcion?: string;           // Descripción de la marca (opcional)
  is_active: boolean;             // Indica si está activa (default: true)
}

// Request para crear marca
interface MarcaCreateRequest {
  nombre: string;                 // Requerido
  descripcion?: string;           // Opcional
  is_active?: boolean;            // Opcional, default: true
}

// Request para actualizar marca
interface MarcaUpdateRequest {
  nombre?: string;                // Opcional
  descripcion?: string;           // Opcional
  is_active?: boolean;            // Opcional
}
```

### Endpoints

#### 1. GET `/api/marcas/`
**Descripción:** Obtiene todas las marcas.

**Request:** Ningún parámetro requerido.

**Response:**
```json
{
  "success": true,
  "message": "Marcas obtenidas exitosamente",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "nombre": "Canadian Solar",
      "descripcion": "Fabricante de paneles solares",
      "is_active": true
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "nombre": "Huawei",
      "descripcion": "Inversores solares",
      "is_active": true
    }
  ]
}
```

---

#### 2. GET `/api/marcas/{marca_id}`
**Descripción:** Obtiene una marca por ID.

**Path Parameters:**
- `marca_id` (string, requerido): ID de la marca

**Response (éxito):**
```json
{
  "success": true,
  "message": "Marca encontrada",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "nombre": "Canadian Solar",
    "descripcion": "Fabricante de paneles solares",
    "is_active": true
  }
}
```

**Response (no encontrada):**
```json
{
  "success": false,
  "message": "Marca no encontrada",
  "data": null
}
```

---

#### 3. POST `/api/marcas/`
**Descripción:** Crea una nueva marca.

**Request Body:**
```json
{
  "nombre": "Canadian Solar",
  "descripcion": "Fabricante de paneles solares",
  "is_active": true
}
```

**Campos:**
- `nombre` (string, **requerido**): Nombre de la marca
- `descripcion` (string, opcional): Descripción de la marca
- `is_active` (boolean, opcional, default: true): Si la marca está activa

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Marca creada exitosamente",
  "marca_id": "507f1f77bcf86cd799439011"
}
```

---

#### 4. PUT `/api/marcas/{marca_id}`
**Descripción:** Actualiza una marca existente.

**Path Parameters:**
- `marca_id` (string, requerido): ID de la marca a actualizar

**Request Body (solo campos a actualizar):**
```json
{
  "nombre": "Canadian Solar Premium",
  "descripcion": "Fabricante líder de paneles solares"
}
```

**Campos (todos opcionales):**
- `nombre` (string): Nombre de la marca
- `descripcion` (string): Descripción de la marca
- `is_active` (boolean): Si la marca está activa

**Response (éxito):**
```json
{
  "success": true,
  "message": "Marca actualizada exitosamente"
}
```

**Response (no encontrada):**
```json
{
  "success": false,
  "message": "Marca no encontrada o sin cambios"
}
```

---

#### 5. DELETE `/api/marcas/{marca_id}`
**Descripción:** Elimina una marca.

**Path Parameters:**
- `marca_id` (string, requerido): ID de la marca a eliminar

**Request Body:** Ninguno

**Response (éxito):**
```json
{
  "success": true,
  "message": "Marca eliminada exitosamente"
}
```

**Response (no encontrada):**
```json
{
  "success": false,
  "message": "Marca no encontrada"
}
```

---

## 2. Servicios API

**Base URL:** `/api/servicios`

### Schemas TypeScript

```typescript
// Entidad Servicio
interface Servicio {
  id?: string;                    // ID de MongoDB (string)
  descripcion: string;            // Descripción del servicio (requerido)
  is_active: boolean;             // Indica si está activo (default: true)
}

// Request para crear servicio
interface ServicioCreateRequest {
  descripcion: string;            // Requerido
  is_active?: boolean;            // Opcional, default: true
}

// Request para actualizar servicio
interface ServicioUpdateRequest {
  descripcion?: string;           // Opcional
  is_active?: boolean;            // Opcional
}
```

**Nota:** El costo del servicio NO se almacena en el catálogo porque es variable por cliente. El costo se define en cada oferta personalizada.

### Endpoints

#### 1. GET `/api/servicios/`
**Descripción:** Obtiene todos los servicios.

**Request:** Ningún parámetro requerido.

**Response:**
```json
{
  "success": true,
  "message": "Servicios obtenidos exitosamente",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "descripcion": "Instalación de paneles solares",
      "is_active": true
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "descripcion": "Mantenimiento preventivo anual",
      "is_active": true
    }
  ]
}
```

---

#### 2. GET `/api/servicios/{servicio_id}`
**Descripción:** Obtiene un servicio por ID.

**Path Parameters:**
- `servicio_id` (string, requerido): ID del servicio

**Response (éxito):**
```json
{
  "success": true,
  "message": "Servicio encontrado",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "descripcion": "Instalación de paneles solares",
    "is_active": true
  }
}
```

**Response (no encontrado):**
```json
{
  "success": false,
  "message": "Servicio no encontrado",
  "data": null
}
```

---

#### 3. POST `/api/servicios/`
**Descripción:** Crea un nuevo servicio.

**Request Body:**
```json
{
  "descripcion": "Instalación de paneles solares",
  "is_active": true
}
```

**Campos:**
- `descripcion` (string, **requerido**): Descripción del servicio
- `is_active` (boolean, opcional, default: true): Si el servicio está activo

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Servicio creado exitosamente",
  "servicio_id": "507f1f77bcf86cd799439011"
}
```

---

#### 4. PUT `/api/servicios/{servicio_id}`
**Descripción:** Actualiza un servicio existente.

**Path Parameters:**
- `servicio_id` (string, requerido): ID del servicio a actualizar

**Request Body (solo campos a actualizar):**
```json
{
  "descripcion": "Instalación y configuración de paneles solares"
}
```

**Campos (todos opcionales):**
- `descripcion` (string): Descripción del servicio
- `is_active` (boolean): Si el servicio está activo

**Response (éxito):**
```json
{
  "success": true,
  "message": "Servicio actualizado exitosamente"
}
```

**Response (no encontrado):**
```json
{
  "success": false,
  "message": "Servicio no encontrado o sin cambios"
}
```

---

#### 5. DELETE `/api/servicios/{servicio_id}`
**Descripción:** Elimina un servicio.

**Path Parameters:**
- `servicio_id` (string, requerido): ID del servicio a eliminar

**Request Body:** Ninguno

**Response (éxito):**
```json
{
  "success": true,
  "message": "Servicio eliminado exitosamente"
}
```

**Response (no encontrado):**
```json
{
  "success": false,
  "message": "Servicio no encontrado"
}
```

---

## 3. Ofertas Personalizadas API

**Base URL:** `/api/ofertas-personalizadas`

### Schemas TypeScript

```typescript
// Subdocumentos para items
interface InversorItem {
  cantidad?: number;              // Cantidad de inversores
  potencia?: number;              // Potencia del inversor (W o kW)
  marca?: string;                 // Marca del inversor
  descripcion?: string;           // Descripción del inversor
  codigo_equipo?: string;         // Código de equipo del inversor
}

interface BateriaItem {
  cantidad?: number;              // Cantidad de baterías
  potencia?: number;              // Potencia de la batería (W o kW)
  marca?: string;                 // Marca de la batería
  descripcion?: string;           // Descripción de la batería
}

interface PanelItem {
  cantidad?: number;              // Cantidad de paneles
  potencia?: number;              // Potencia del panel (W)
  marca?: string;                 // Marca del panel
  descripcion?: string;           // Descripción del panel
}

interface UtilItem {
  cantidad?: number;              // Cantidad de útiles
  descripcion?: string;           // Descripción del útil
}

interface ServicioOfertaItem {
  descripcion?: string;           // Descripción del servicio
  costo?: number;                 // Costo del servicio para esta oferta
}

// Entidad principal
interface OfertaPersonalizada {
  id?: string;                              // ID de MongoDB (string)
  cliente_id?: string;                      // ID del cliente (ObjectId como string)
  inversores?: InversorItem[];              // Lista de inversores
  baterias?: BateriaItem[];                 // Lista de baterías
  paneles?: PanelItem[];                    // Lista de paneles solares
  utiles?: UtilItem[];                      // Lista de útiles
  servicios?: ServicioOfertaItem[];         // Lista de servicios
  precio?: number;                          // Precio total de la oferta
  pagada: boolean;                          // Indica si está pagada (default: false)
}

// Request para crear oferta personalizada
interface OfertaPersonalizadaCreateRequest {
  cliente_id?: string;
  inversores?: InversorItem[];
  baterias?: BateriaItem[];
  paneles?: PanelItem[];
  utiles?: UtilItem[];
  servicios?: ServicioOfertaItem[];
  precio?: number;
  pagada?: boolean;                         // Default: false
}

// Request para actualizar oferta personalizada (todos los campos opcionales)
interface OfertaPersonalizadaUpdateRequest {
  cliente_id?: string;
  inversores?: InversorItem[];
  baterias?: BateriaItem[];
  paneles?: PanelItem[];
  utiles?: UtilItem[];
  servicios?: ServicioOfertaItem[];
  precio?: number;
  pagada?: boolean;
}
```

**Nota:** Todos los campos son opcionales según requerimiento del negocio.

### Endpoints

#### 1. GET `/api/ofertas-personalizadas/`
**Descripción:** Obtiene todas las ofertas personalizadas.

**Request:** Ningún parámetro requerido.

**Response:**
```json
{
  "success": true,
  "message": "Ofertas personalizadas obtenidas exitosamente",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "cliente_id": "507f1f77bcf86cd799439020",
      "inversores": [
        {
          "cantidad": 2,
          "potencia": 5000,
          "marca": "Huawei",
          "descripcion": "Inversor trifásico 5kW",
          "codigo_equipo": "SUN2000-5KTL-M1"
        }
      ],
      "baterias": [
        {
          "cantidad": 4,
          "potencia": 5000,
          "marca": "BYD",
          "descripcion": "Batería LiFePO4 5kWh"
        }
      ],
      "paneles": [
        {
          "cantidad": 10,
          "potencia": 550,
          "marca": "Canadian Solar",
          "descripcion": "Panel monocristalino 550W"
        }
      ],
      "utiles": [
        {
          "cantidad": 100,
          "descripcion": "Metros de cable solar 6mm"
        }
      ],
      "servicios": [
        {
          "descripcion": "Instalación completa del sistema",
          "costo": 1500.00
        }
      ],
      "precio": 12500.00,
      "pagada": false
    }
  ]
}
```

---

#### 2. GET `/api/ofertas-personalizadas/{oferta_id}`
**Descripción:** Obtiene una oferta personalizada por ID.

**Path Parameters:**
- `oferta_id` (string, requerido): ID de la oferta personalizada

**Response (éxito):**
```json
{
  "success": true,
  "message": "Oferta personalizada encontrada",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "cliente_id": "507f1f77bcf86cd799439020",
    "inversores": [...],
    "baterias": [...],
    "paneles": [...],
    "utiles": [...],
    "servicios": [...],
    "precio": 12500.00,
    "pagada": false
  }
}
```

**Response (no encontrada):**
```json
{
  "success": false,
  "message": "Oferta personalizada no encontrada",
  "data": null
}
```

---

#### 3. GET `/api/ofertas-personalizadas/cliente/{cliente_id}`
**Descripción:** Obtiene TODAS las ofertas personalizadas de un cliente (pagadas y no pagadas).

**Path Parameters:**
- `cliente_id` (string, requerido): ID del cliente

**Response:**
```json
{
  "success": true,
  "message": "Ofertas del cliente obtenidas exitosamente",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "cliente_id": "507f1f77bcf86cd799439020",
      "inversores": [...],
      "precio": 12500.00,
      "pagada": false
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "cliente_id": "507f1f77bcf86cd799439020",
      "inversores": [...],
      "precio": 8500.00,
      "pagada": true
    }
  ]
}
```

---

#### 4. GET `/api/ofertas-personalizadas/cliente/{cliente_id}/pagadas`
**Descripción:** Obtiene SOLO las ofertas PAGADAS de un cliente específico.

**Path Parameters:**
- `cliente_id` (string, requerido): ID del cliente

**Response:**
```json
{
  "success": true,
  "message": "Ofertas pagadas del cliente obtenidas exitosamente (2 ofertas)",
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "cliente_id": "507f1f77bcf86cd799439020",
      "inversores": [...],
      "precio": 8500.00,
      "pagada": true
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "cliente_id": "507f1f77bcf86cd799439020",
      "precio": 3200.00,
      "pagada": true
    }
  ]
}
```

---

#### 5. GET `/api/ofertas-personalizadas/cliente/{cliente_id}/total-gastado`
**Descripción:** Calcula el TOTAL GASTADO por un cliente (suma de precios de todas las ofertas pagadas).

**Path Parameters:**
- `cliente_id` (string, requerido): ID del cliente

**Response:**
```json
{
  "success": true,
  "message": "Total gastado calculado exitosamente",
  "cliente_id": "507f1f77bcf86cd799439020",
  "total_gastado": 11700.00,
  "moneda": "USD"
}
```

**Nota:** Si el cliente no tiene ofertas pagadas o no existen ofertas con precio, `total_gastado` será `0.0`.

---

#### 6. POST `/api/ofertas-personalizadas/`
**Descripción:** Crea una nueva oferta personalizada.

**Request Body (ejemplo completo):**
```json
{
  "cliente_id": "507f1f77bcf86cd799439020",
  "inversores": [
    {
      "cantidad": 2,
      "potencia": 5000,
      "marca": "Huawei",
      "descripcion": "Inversor trifásico 5kW",
      "codigo_equipo": "SUN2000-5KTL-M1"
    }
  ],
  "baterias": [
    {
      "cantidad": 4,
      "potencia": 5000,
      "marca": "BYD",
      "descripcion": "Batería LiFePO4 5kWh"
    }
  ],
  "paneles": [
    {
      "cantidad": 10,
      "potencia": 550,
      "marca": "Canadian Solar",
      "descripcion": "Panel monocristalino 550W"
    }
  ],
  "utiles": [
    {
      "cantidad": 100,
      "descripcion": "Metros de cable solar 6mm"
    },
    {
      "cantidad": 20,
      "descripcion": "Conectores MC4"
    }
  ],
  "servicios": [
    {
      "descripcion": "Instalación completa del sistema",
      "costo": 1500.00
    },
    {
      "descripcion": "Mantenimiento anual (primer año incluido)",
      "costo": 200.00
    }
  ],
  "precio": 12500.00,
  "pagada": false
}
```

**Request Body (ejemplo mínimo - todos los campos son opcionales):**
```json
{
  "cliente_id": "507f1f77bcf86cd799439020",
  "precio": 5000.00
}
```

**Campos (todos opcionales):**
- `cliente_id` (string): ID del cliente
- `inversores` (array): Lista de inversores
- `baterias` (array): Lista de baterías
- `paneles` (array): Lista de paneles
- `utiles` (array): Lista de útiles
- `servicios` (array): Lista de servicios con costos específicos
- `precio` (number): Precio total de la oferta
- `pagada` (boolean, default: false): Si la oferta está pagada

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Oferta personalizada creada exitosamente",
  "oferta_id": "507f1f77bcf86cd799439011"
}
```

---

#### 7. PUT `/api/ofertas-personalizadas/{oferta_id}`
**Descripción:** Actualiza una oferta personalizada existente.

**Path Parameters:**
- `oferta_id` (string, requerido): ID de la oferta a actualizar

**Request Body (solo campos a actualizar):**
```json
{
  "precio": 13000.00,
  "pagada": true,
  "paneles": [
    {
      "cantidad": 12,
      "potencia": 550,
      "marca": "Canadian Solar",
      "descripcion": "Panel monocristalino 550W - Actualizado"
    }
  ]
}
```

**Campos (todos opcionales):**
- Cualquier campo de la entidad OfertaPersonalizada puede ser actualizado
- Solo se envían los campos que se desean modificar

**Response (éxito):**
```json
{
  "success": true,
  "message": "Oferta personalizada actualizada exitosamente"
}
```

**Response (no encontrada):**
```json
{
  "success": false,
  "message": "Oferta personalizada no encontrada o sin cambios"
}
```

---

#### 8. DELETE `/api/ofertas-personalizadas/{oferta_id}`
**Descripción:** Elimina una oferta personalizada.

**Path Parameters:**
- `oferta_id` (string, requerido): ID de la oferta a eliminar

**Request Body:** Ninguno

**Response (éxito):**
```json
{
  "success": true,
  "message": "Oferta personalizada eliminada exitosamente"
}
```

**Response (no encontrada):**
```json
{
  "success": false,
  "message": "Oferta personalizada no encontrada"
}
```

---

## Resumen de Endpoints

### Marcas (`/api/marcas`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar todas las marcas |
| GET | `/{marca_id}` | Obtener marca por ID |
| POST | `/` | Crear nueva marca |
| PUT | `/{marca_id}` | Actualizar marca |
| DELETE | `/{marca_id}` | Eliminar marca |

### Servicios (`/api/servicios`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar todos los servicios |
| GET | `/{servicio_id}` | Obtener servicio por ID |
| POST | `/` | Crear nuevo servicio |
| PUT | `/{servicio_id}` | Actualizar servicio |
| DELETE | `/{servicio_id}` | Eliminar servicio |

### Ofertas Personalizadas (`/api/ofertas-personalizadas`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar todas las ofertas |
| GET | `/{oferta_id}` | Obtener oferta por ID |
| GET | `/cliente/{cliente_id}` | Obtener todas las ofertas de un cliente |
| GET | `/cliente/{cliente_id}/pagadas` | Obtener solo ofertas pagadas de un cliente |
| GET | `/cliente/{cliente_id}/total-gastado` | Calcular total gastado por cliente |
| POST | `/` | Crear nueva oferta |
| PUT | `/{oferta_id}` | Actualizar oferta |
| DELETE | `/{oferta_id}` | Eliminar oferta |

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Operación exitosa |
| 201 | Created - Recurso creado exitosamente |
| 401 | Unauthorized - Token inválido o no proporcionado |
| 404 | Not Found - Recurso no encontrado |
| 422 | Unprocessable Entity - Error de validación en datos enviados |
| 500 | Internal Server Error - Error en el servidor |

---

## Ejemplos de Uso (JavaScript/TypeScript)

### Crear una Marca

```typescript
const createMarca = async (nombre: string, descripcion?: string) => {
  const response = await fetch('http://localhost:8000/api/marcas/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      nombre,
      descripcion,
      is_active: true
    })
  });

  const data = await response.json();
  return data;
};
```

### Obtener Todas las Ofertas de un Cliente

```typescript
const getOfertasCliente = async (clienteId: string) => {
  const response = await fetch(
    `http://localhost:8000/api/ofertas-personalizadas/cliente/${clienteId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data.data; // Array de ofertas
};
```

### Obtener Solo Ofertas Pagadas de un Cliente

```typescript
const getOfertasPagadasCliente = async (clienteId: string) => {
  const response = await fetch(
    `http://localhost:8000/api/ofertas-personalizadas/cliente/${clienteId}/pagadas`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data.data; // Array de ofertas pagadas
};
```

### Obtener Total Gastado por un Cliente

```typescript
const getTotalGastado = async (clienteId: string) => {
  const response = await fetch(
    `http://localhost:8000/api/ofertas-personalizadas/cliente/${clienteId}/total-gastado`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data.total_gastado; // number
};
```

### Crear Oferta Personalizada Completa

```typescript
interface CreateOfertaData {
  cliente_id?: string;
  inversores?: InversorItem[];
  baterias?: BateriaItem[];
  paneles?: PanelItem[];
  utiles?: UtilItem[];
  servicios?: ServicioOfertaItem[];
  precio?: number;
  pagada?: boolean;
}

const createOferta = async (ofertaData: CreateOfertaData) => {
  const response = await fetch('http://localhost:8000/api/ofertas-personalizadas/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(ofertaData)
  });

  const data = await response.json();
  return data;
};
```

### Marcar Oferta como Pagada

```typescript
const marcarOfertaPagada = async (ofertaId: string) => {
  const response = await fetch(
    `http://localhost:8000/api/ofertas-personalizadas/${ofertaId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ pagada: true })
    }
  );

  const data = await response.json();
  return data;
};
```

### Actualizar Precio de una Oferta

```typescript
const actualizarPrecioOferta = async (ofertaId: string, nuevoPrecio: number) => {
  const response = await fetch(
    `http://localhost:8000/api/ofertas-personalizadas/${ofertaId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ precio: nuevoPrecio })
    }
  );

  const data = await response.json();
  return data;
};
```

---

## Colecciones MongoDB

Las tres nuevas funcionalidades crean las siguientes colecciones en MongoDB:

- **`marcas`** - Nomenclador de marcas
- **`servicios`** - Catálogo de servicios
- **`ofertas_personalizadas`** - Ofertas personalizadas con todos sus componentes

---

## Notas Importantes para el Frontend

1. **Autenticación Obligatoria:** Todos los endpoints requieren el header `Authorization: Bearer {token}`

2. **IDs de MongoDB:** Los IDs son strings que representan ObjectIds de MongoDB (formato: 24 caracteres hexadecimales)

3. **Campos Opcionales:** En OfertaPersonalizada, TODOS los campos son opcionales. El frontend debe manejar valores `null` o `undefined`

4. **Relación Cliente:** El campo `cliente_id` en OfertaPersonalizada debe ser un ID válido de un cliente existente en la colección `clientes`

5. **Arrays Vacíos vs Null:** Los arrays pueden ser `null`, `undefined` o `[]` (array vacío). El backend acepta cualquiera de estas formas

6. **Actualización Parcial:** En los endpoints PUT, solo se envían los campos que se desean actualizar. Los campos con valor `null` no se actualizarán.

7. **Estado de Pago:** El campo `pagada` por defecto es `false`. Para cambiar el estado de pago, usar el endpoint PUT.

8. **Total Gastado:** El endpoint `/cliente/{cliente_id}/total-gastado` solo suma ofertas donde `pagada=true` y `precio` existe y no es null.

9. **Marca en Items:** El campo `marca` en inversores, baterías y paneles puede ser un string libre (no necesariamente del nomenclador de marcas).

10. **Validación de Esquemas:** El backend usa Pydantic para validación. Si se envía un campo con tipo incorrecto, se recibirá un error 422.

---

## Documentación Swagger/OpenAPI

Una vez el servidor esté corriendo, puedes acceder a la documentación interactiva en:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

En Swagger UI podrás:
- Ver todos los esquemas de datos
- Probar todos los endpoints directamente desde el navegador
- Ver ejemplos de request/response
- Autenticarte con el Bearer Token

---

## Archivos Creados en el Backend

### Domain Layer (3 archivos)
- `domain/entities/marca.py`
- `domain/entities/servicio.py`
- `domain/entities/oferta_personalizada.py`

### Application Layer (3 archivos)
- `application/services/marca_service.py`
- `application/services/servicio_service.py`
- `application/services/oferta_personalizada_service.py`

### Infrastructure Layer (3 archivos)
- `infrastucture/repositories/marca_repository.py`
- `infrastucture/repositories/servicio_repository.py`
- `infrastucture/repositories/oferta_personalizada_repository.py`

### Presentation Layer (6 archivos)
- `presentation/routers/marcas_router.py`
- `presentation/routers/servicios_router.py`
- `presentation/routers/ofertas_personalizadas_router.py`
- `presentation/schemas/requests/marcas_requests.py`
- `presentation/schemas/requests/servicios_requests.py`
- `presentation/schemas/requests/ofertas_personalizadas_requests.py`
- `presentation/schemas/responses/marcas_responses.py`
- `presentation/schemas/responses/servicios_responses.py`
- `presentation/schemas/responses/ofertas_personalizadas_responses.py`

### Archivos Modificados
- `infrastucture/dependencies.py` - Agregadas DI para las 3 nuevas entidades
- `main.py` - Registrados los 3 nuevos routers
