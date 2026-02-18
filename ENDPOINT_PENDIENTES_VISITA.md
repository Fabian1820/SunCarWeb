# Endpoint: Pendientes de Visita

## Descripción General

Este endpoint devuelve todos los **leads** y **clientes** que tienen el estado **"Pendiente de visita"**, proporcionando información completa de cada uno para facilitar la gestión de visitas comerciales.

---

## Información del Endpoint

- **URL**: `/api/pendientes-visita/`
- **Método HTTP**: `GET`
- **Autenticación**: Requerida (JWT Bearer Token)
- **Tags**: `["Pendientes de Visita"]`

## Request

### Headers

```http
Authorization: Bearer <jwt_token>
```

### Query Parameters

Este endpoint **no requiere parámetros**. Devuelve todos los leads y clientes con estado "Pendiente de visita".

---

## Response

### Código de Estado: `200 OK`

### Estructura de Respuesta

```json
{
  "leads": [
    {
      "id": "string | null",
      "nombre": "string",
      "telefono": "string",
      "telefono_adicional": "string | null",
      "direccion": "string | null",
      "fecha_contacto": "string",
      "estado": "string",
      "fuente": "string | null",
      "referencia": "string | null",
      "pais_contacto": "string | null",
      "comentario": "string | null",
      "provincia_montaje": "string | null",
      "municipio": "string | null",
      "comercial": "string | null",
      "prioridad": "string"
    }
  ],
  "clientes": [
    {
      "numero": "string",
      "nombre": "string",
      "telefono": "string | null",
      "telefono_adicional": "string | null",
      "direccion": "string",
      "fecha_contacto": "string | null",
      "estado": "string | null",
      "fuente": "string | null",
      "referencia": "string | null",
      "pais_contacto": "string | null",
      "comentario": "string | null",
      "provincia_montaje": "string | null",
      "municipio": "string | null",
      "comercial": "string | null",
      "prioridad": "string",
      "carnet_identidad": "string | null",
      "latitud": "string | null",
      "longitud": "string | null"
    }
  ],
  "total_leads": 0,
  "total_clientes": 0,
  "total_general": 0
}
```

---

## Campos de Respuesta

### Objeto Principal: `PendientesVisitaResponse`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `leads` | `List[LeadPendienteVisitaResponse]` | Lista de leads pendientes de visita |
| `clientes` | `List[ClientePendienteVisitaResponse]` | Lista de clientes pendientes de visita |
| `total_leads` | `int` | Total de leads pendientes |
| `total_clientes` | `int` | Total de clientes pendientes |
| `total_general` | `int` | Total general de pendientes (leads + clientes) |

### Objeto: `LeadPendienteVisitaResponse`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | `string \| null` | No | ID del lead |
| `nombre` | `string` | Sí | Nombre del lead |
| `telefono` | `string` | Sí | Teléfono principal |
| `telefono_adicional` | `string \| null` | No | Teléfono adicional |
| `direccion` | `string \| null` | No | Dirección |
| `fecha_contacto` | `string` | Sí | Fecha de contacto (formato: YYYY-MM-DD) |
| `estado` | `string` | Sí | Estado del lead (siempre "Pendiente de visita") |
| `fuente` | `string \| null` | No | Fuente del lead (ej: "Facebook", "Referido") |
| `referencia` | `string \| null` | No | Referencia o persona que refirió |
| `pais_contacto` | `string \| null` | No | País de contacto |
| `comentario` | `string \| null` | No | Comentarios adicionales |
| `provincia_montaje` | `string \| null` | No | Provincia donde se realizará el montaje |
| `municipio` | `string \| null` | No | Municipio |
| `comercial` | `string \| null` | No | Comercial asignado |
| `prioridad` | `string` | No | Prioridad del lead (default: "Baja") |

### Objeto: `ClientePendienteVisitaResponse`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `numero` | `string` | Sí | Número de cliente (código único de 10 caracteres) |
| `nombre` | `string` | Sí | Nombre del cliente |
| `telefono` | `string \| null` | No | Teléfono principal |
| `telefono_adicional` | `string \| null` | No | Teléfono adicional |
| `direccion` | `string` | Sí | Dirección |
| `fecha_contacto` | `string \| null` | No | Fecha de contacto (formato: YYYY-MM-DD) |
| `estado` | `string \| null` | No | Estado del cliente (siempre "Pendiente de visita") |
| `fuente` | `string \| null` | No | Fuente del cliente |
| `referencia` | `string \| null` | No | Referencia |
| `pais_contacto` | `string \| null` | No | País de contacto |
| `comentario` | `string \| null` | No | Comentarios adicionales |
| `provincia_montaje` | `string \| null` | No | Provincia de montaje |
| `municipio` | `string \| null` | No | Municipio |
| `comercial` | `string \| null` | No | Comercial asignado |
| `prioridad` | `string` | No | Prioridad del cliente (default: "Baja") |
| `carnet_identidad` | `string \| null` | No | Carnet de identidad |
| `latitud` | `string \| null` | No | Latitud de ubicación |
| `longitud` | `string \| null` | No | Longitud de ubicación |

---

## Ejemplo de Respuesta Exitosa

```json
{
  "leads": [
    {
      "id": "507f1f77bcf86cd799439011",
      "nombre": "Juan Pérez",
      "telefono": "+5355123456",
      "telefono_adicional": "+5355654321",
      "direccion": "Calle 23 #456, Vedado",
      "fecha_contacto": "2025-02-01",
      "estado": "Pendiente de visita",
      "fuente": "Facebook",
      "referencia": "María González",
      "pais_contacto": "Cuba",
      "comentario": "Interesado en sistema de 5kW",
      "provincia_montaje": "La Habana",
      "municipio": "Plaza de la Revolución",
      "comercial": "Carlos Rodríguez",
      "prioridad": "Alta"
    }
  ],
  "clientes": [
    {
      "numero": "H100500124",
      "nombre": "Ana López",
      "telefono": "+5355789012",
      "telefono_adicional": null,
      "direccion": "Ave. 26 #789, Nuevo Vedado",
      "fecha_contacto": "2025-01-28",
      "estado": "Pendiente de visita",
      "fuente": "Referido",
      "referencia": "Pedro Martínez",
      "pais_contacto": "Cuba",
      "comentario": "Cliente requiere visita técnica",
      "provincia_montaje": "La Habana",
      "municipio": "Plaza de la Revolución",
      "comercial": "Luis Fernández",
      "prioridad": "Media",
      "carnet_identidad": "85010112345",
      "latitud": "23.1136",
      "longitud": "-82.3666"
    }
  ],
  "total_leads": 1,
  "total_clientes": 1,
  "total_general": 2
}
```

---

## Respuestas de Error

### Código de Estado: `500 Internal Server Error`

Ocurre cuando hay un error al consultar la base de datos o procesar los datos.

```json
{
  "detail": "Error al obtener pendientes de visita: <mensaje de error>"
}
```

### Código de Estado: `401 Unauthorized`

Ocurre cuando no se proporciona un token JWT válido.

```json
{
  "detail": "No autenticado"
}
```

---

## Lógica de Negocio

### Filtrado por Estado

El endpoint consulta dos colecciones en MongoDB:

1. **Colección `leads`**: Busca todos los documentos con `estado = "Pendiente de visita"`
2. **Colección `clientes`**: Busca todos los documentos con `estado = "Pendiente de visita"`

### Servicios Utilizados

- **LeadsService**: `get_leads_pendientes_visita()`
  - Llama a `LeadsRepository.get_by_estado("Pendiente de visita")`
  
- **ClientService**: `get_clientes_pendientes_visita()`
  - Llama a `ClientRepository.get_by_estado("Pendiente de visita")`

### Flujo de Ejecución

```
1. Request → Router (pendientes_visita_router.py)
2. Router → LeadsService.get_leads_pendientes_visita()
3. Router → ClientService.get_clientes_pendientes_visita()
4. Servicios → Repositorios (consulta MongoDB)
5. Repositorios → Retornan listas de diccionarios
6. Router → Convierte a modelos Pydantic (Response schemas)
7. Router → Construye PendientesVisitaResponse
8. Router → Retorna JSON al cliente
```

---

## Casos de Uso

### 1. Dashboard de Visitas Comerciales

El frontend puede usar este endpoint para mostrar una lista de todos los leads y clientes que requieren visita, permitiendo a los comerciales planificar su agenda.

### 2. Asignación de Visitas

Los administradores pueden ver todos los pendientes y asignar comerciales según la ubicación geográfica (provincia/municipio).

### 3. Priorización de Visitas

El campo `prioridad` permite ordenar las visitas por urgencia (Alta, Media, Baja).

### 4. Seguimiento de Conversión

Permite identificar cuántos leads están en estado "Pendiente de visita" vs cuántos clientes ya convertidos aún requieren visita.

---

## Notas Técnicas

### Diferencias entre Lead y Cliente

- **Lead**: Prospecto que aún no ha sido convertido a cliente
  - Tiene `id` (ObjectId de MongoDB)
  - No tiene `numero` de cliente
  - No tiene `carnet_identidad`, `latitud`, `longitud`

- **Cliente**: Lead convertido con código de cliente asignado
  - Tiene `numero` (código de 10 caracteres)
  - Puede tener `carnet_identidad`, `latitud`, `longitud`
  - Puede tener ofertas asociadas y datos de instalación

### Prioridad

El campo `prioridad` puede tener los valores:
- `"Alta"`: Requiere atención inmediata
- `"Media"`: Prioridad normal
- `"Baja"`: Puede esperar (valor por defecto)

### Ubicación Geográfica

- `provincia_montaje` y `municipio` son campos de texto libre
- Para clientes, `latitud` y `longitud` permiten ubicación exacta en mapas
- Los leads no tienen coordenadas GPS

---

## Ejemplo de Uso con cURL

```bash
curl -X GET "https://api.suncar.cu/api/pendientes-visita/" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## Ejemplo de Uso con JavaScript (Fetch)

```javascript
const token = 'tu_jwt_token_aqui';

fetch('https://api.suncar.cu/api/pendientes-visita/', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => {
    console.log('Leads pendientes:', data.leads);
    console.log('Clientes pendientes:', data.clientes);
    console.log('Total general:', data.total_general);
  })
  .catch(error => console.error('Error:', error));
```

---

## Ejemplo de Uso con Python (requests)

```python
import requests

url = "https://api.suncar.cu/api/pendientes-visita/"
headers = {
    "Authorization": "Bearer tu_jwt_token_aqui",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    print(f"Leads pendientes: {data['total_leads']}")
    print(f"Clientes pendientes: {data['total_clientes']}")
    print(f"Total general: {data['total_general']}")
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

---

## Archivos Relacionados

### Router
- `presentation/routers/pendientes_visita_router.py`

### Schemas
- `presentation/schemas/responses/pendientes_visita_responses.py`

### Servicios
- `application/services/leads_service.py` → `get_leads_pendientes_visita()`
- `application/services/client_service.py` → `get_clientes_pendientes_visita()`

### Repositorios
- `infrastucture/repositories/leads_repository.py` → `get_by_estado()`
- `infrastucture/repositories/client_repository.py` → `get_by_estado()`

### Registro en Main
- `main.py` → Línea 421-425

```python
app.include_router(
    pendientes_visita_router,
    prefix="/api/pendientes-visita",
    tags=["Pendientes de Visita"]
)
```

---

## Testing

### Archivo de Test HTTP
- `test/test_pendientes_visita.http`

### Ejemplo de Test

```http
### Obtener pendientes de visita
GET {{base_url}}/api/pendientes-visita/
Authorization: Bearer {{token}}
```

---

## Mejoras Futuras

1. **Filtros adicionales**:
   - Por provincia/municipio
   - Por comercial asignado
   - Por rango de fechas
   - Por prioridad

2. **Paginación**:
   - Agregar parámetros `limit` y `offset` para grandes volúmenes

3. **Ordenamiento**:
   - Por fecha de contacto
   - Por prioridad
   - Por nombre

4. **Estadísticas**:
   - Tiempo promedio en estado "Pendiente de visita"
   - Tasa de conversión de visitas

---

## Changelog

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2025-02-09 | 1.0.0 | Documentación inicial del endpoint |
