# API: Listar Clientes con Averías

## Endpoint

```
GET /api/clientes/con-averias
```

## Descripción

Obtiene todos los clientes que tienen al menos una avería reportada. Este endpoint filtra automáticamente los clientes que no tienen averías o tienen el array vacío.

## Request

### Método
`GET`

### URL
```
http://localhost:8000/api/clientes/con-averias
```

### Headers
```
Accept: application/json
```

### Parámetros
Ninguno. Este endpoint no acepta parámetros de query.

## Response

### Success (200 OK)

Retorna un array de objetos cliente con todos sus datos y averías.

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "numero": "F0312146",
    "nombre": "Juan Pérez",
    "direccion": "Calle 23 #456",
    "telefono": "53123456",
    "telefono_adicional": "+53 59876543",
    "estado": "Equipo instalado con éxito",
    "fecha_contacto": "10/01/2024",
    "fuente": "Página Web",
    "referencia": "Referido por amigo",
    "pais_contacto": "Cuba",
    "comentario": "Cliente satisfecho",
    "provincia_montaje": "La Habana",
    "municipio": "Playa",
    "comercial": "Carlos Técnico",
    "latitud": "23.1136",
    "longitud": "-82.3666",
    "carnet_identidad": "12345678901",
    "fecha_instalacion": "15/01/2024",
    "fecha_montaje": "14/01/2024",
    "comprobante_pago_url": "https://storage.example.com/comprobante.pdf",
    "metodo_pago": "Transferencia",
    "moneda": "USD",
    "ofertas": [
      {
        "inversor_codigo": "INV-001",
        "inversor_nombre": "Inversor Híbrido 5kW",
        "inversor_cantidad": 1,
        "bateria_codigo": "BAT-001",
        "bateria_nombre": "Batería Litio 5kWh",
        "bateria_cantidad": 2,
        "panel_codigo": "PAN-001",
        "panel_nombre": "Panel Solar 550W",
        "panel_cantidad": 8,
        "elementos_personalizados": "Estructura reforzada",
        "aprobada": true,
        "pagada": true,
        "costo_oferta": 5000,
        "costo_extra": 200,
        "costo_transporte": 100,
        "razon_costo_extra": "Instalación en altura"
      }
    ],
    "averias": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "descripcion": "Inversor no enciende después de apagón",
        "estado": "Pendiente",
        "fecha_reporte": "2024-01-20T10:30:00.123456",
        "fecha_solucion": null
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "descripcion": "Panel solar con grieta",
        "estado": "Solucionada",
        "fecha_reporte": "2024-01-15T08:15:00.000000",
        "fecha_solucion": "2024-01-17T16:45:00.000000"
      }
    ]
  },
  {
    "id": "507f1f77bcf86cd799439012",
    "numero": "F0312148",
    "nombre": "María García",
    "direccion": "Avenida 5ta #789",
    "telefono": "53987654",
    "estado": "Instalado",
    "averias": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "descripcion": "Batería no carga completamente",
        "estado": "Pendiente",
        "fecha_reporte": "2024-01-18T11:20:00.000000",
        "fecha_solucion": null
      }
    ]
  }
]
```

### Array Vacío (200 OK)

Si no hay clientes con averías:

```json
[]
```

### Error (500 Internal Server Error)

```json
{
  "detail": "Error al obtener clientes con averías: [mensaje de error]"
}
```

## Estructura de Datos

### Cliente
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | ID interno de MongoDB |
| `numero` | string | Código único del cliente |
| `nombre` | string | Nombre completo |
| `direccion` | string | Dirección de instalación |
| `telefono` | string | Teléfono principal |
| `telefono_adicional` | string \| null | Teléfono secundario |
| `estado` | string | Estado actual del cliente |
| `fecha_contacto` | string | Fecha de primer contacto (DD/MM/YYYY) |
| `fuente` | string \| null | Origen del contacto |
| `referencia` | string \| null | Referencia o recomendación |
| `pais_contacto` | string \| null | País de contacto |
| `comentario` | string \| null | Comentarios adicionales |
| `provincia_montaje` | string \| null | Provincia de instalación |
| `municipio` | string \| null | Municipio de instalación |
| `comercial` | string \| null | Nombre del comercial asignado |
| `latitud` | string \| null | Coordenada de latitud |
| `longitud` | string \| null | Coordenada de longitud |
| `carnet_identidad` | string \| null | Número de CI |
| `fecha_instalacion` | string \| null | Fecha de instalación (DD/MM/YYYY) |
| `fecha_montaje` | string \| null | Fecha de montaje (DD/MM/YYYY) |
| `comprobante_pago_url` | string \| null | URL del comprobante |
| `metodo_pago` | string \| null | Método de pago utilizado |
| `moneda` | string \| null | Moneda del pago |
| `ofertas` | array | Array de ofertas del cliente |
| `averias` | array | Array de averías (siempre tiene al menos 1) |

### Avería
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | UUID único de la avería |
| `descripcion` | string | Descripción del problema |
| `estado` | string | "Pendiente" o "Solucionada" |
| `fecha_reporte` | string | Fecha y hora del reporte (ISO 8601) |
| `fecha_solucion` | string \| null | Fecha y hora de solución (ISO 8601) |

## Ejemplos de Uso

### cURL

```bash
curl -X GET "http://localhost:8000/api/clientes/con-averias" \
  -H "Accept: application/json"
```

### JavaScript (Fetch)

```javascript
const response = await fetch('http://localhost:8000/api/clientes/con-averias');
const clientes = await response.json();

console.log(`Total de clientes con averías: ${clientes.length}`);

// Filtrar solo clientes con averías pendientes
const conAveriasPendientes = clientes.filter(cliente =>
  cliente.averias.some(averia => averia.estado === 'Pendiente')
);

console.log(`Clientes con averías pendientes: ${conAveriasPendientes.length}`);
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

try {
  const response = await axios.get('http://localhost:8000/api/clientes/con-averias');
  const clientes = response.data;
  
  // Contar total de averías
  const totalAverias = clientes.reduce((sum, cliente) => 
    sum + cliente.averias.length, 0
  );
  
  console.log(`Total de averías: ${totalAverias}`);
} catch (error) {
  console.error('Error al obtener clientes:', error.message);
}
```

### Python (requests)

```python
import requests

response = requests.get('http://localhost:8000/api/clientes/con-averias')

if response.status_code == 200:
    clientes = response.json()
    print(f"Clientes con averías: {len(clientes)}")
    
    for cliente in clientes:
        print(f"\n{cliente['nombre']} ({cliente['numero']})")
        print(f"  Averías: {len(cliente['averias'])}")
        for averia in cliente['averias']:
            print(f"    - {averia['descripcion']} [{averia['estado']}]")
else:
    print(f"Error: {response.status_code}")
```

## Casos de Uso

### 1. Dashboard de Averías

Mostrar un resumen de clientes con problemas:

```javascript
const response = await fetch('/api/clientes/con-averias');
const clientes = await response.json();

const stats = {
  totalClientes: clientes.length,
  totalAverias: clientes.reduce((sum, c) => sum + c.averias.length, 0),
  averiasPendientes: clientes.reduce((sum, c) => 
    sum + c.averias.filter(a => a.estado === 'Pendiente').length, 0
  ),
  averiasSolucionadas: clientes.reduce((sum, c) => 
    sum + c.averias.filter(a => a.estado === 'Solucionada').length, 0
  )
};

console.log(stats);
// {
//   totalClientes: 15,
//   totalAverias: 23,
//   averiasPendientes: 12,
//   averiasSolucionadas: 11
// }
```

### 2. Lista de Clientes Prioritarios

Ordenar clientes por cantidad de averías pendientes:

```javascript
const response = await fetch('/api/clientes/con-averias');
const clientes = await response.json();

const clientesPrioritarios = clientes
  .map(cliente => ({
    numero: cliente.numero,
    nombre: cliente.nombre,
    telefono: cliente.telefono,
    averiasPendientes: cliente.averias.filter(a => a.estado === 'Pendiente').length
  }))
  .filter(c => c.averiasPendientes > 0)
  .sort((a, b) => b.averiasPendientes - a.averiasPendientes);

console.log('Clientes prioritarios:', clientesPrioritarios);
```

### 3. Reporte de Averías por Provincia

Agrupar averías por ubicación:

```javascript
const response = await fetch('/api/clientes/con-averias');
const clientes = await response.json();

const porProvincia = clientes.reduce((acc, cliente) => {
  const provincia = cliente.provincia_montaje || 'Sin provincia';
  if (!acc[provincia]) {
    acc[provincia] = {
      clientes: 0,
      averias: 0,
      pendientes: 0
    };
  }
  acc[provincia].clientes++;
  acc[provincia].averias += cliente.averias.length;
  acc[provincia].pendientes += cliente.averias.filter(a => a.estado === 'Pendiente').length;
  return acc;
}, {});

console.log('Averías por provincia:', porProvincia);
```

### 4. Exportar a CSV

Generar reporte en formato CSV:

```javascript
const response = await fetch('/api/clientes/con-averias');
const clientes = await response.json();

const csvRows = ['Número,Nombre,Teléfono,Total Averías,Pendientes,Solucionadas'];

clientes.forEach(cliente => {
  const totalAverias = cliente.averias.length;
  const pendientes = cliente.averias.filter(a => a.estado === 'Pendiente').length;
  const solucionadas = cliente.averias.filter(a => a.estado === 'Solucionada').length;
  
  csvRows.push(
    `${cliente.numero},${cliente.nombre},${cliente.telefono},${totalAverias},${pendientes},${solucionadas}`
  );
});

const csvContent = csvRows.join('\n');
console.log(csvContent);
```

## Diferencias con Otros Endpoints

| Endpoint | Descripción | Incluye clientes sin averías |
|----------|-------------|------------------------------|
| `GET /api/clientes/` | Lista TODOS los clientes | ✅ Sí |
| `GET /api/clientes/con-averias` | Lista solo clientes CON averías | ❌ No |
| `GET /api/clientes/{numero}` | Obtiene UN cliente específico | N/A |

## Notas Técnicas

### Query MongoDB

El endpoint utiliza el siguiente query para filtrar:

```javascript
{
  "averias": {
    "$exists": true,  // El campo averias existe
    "$ne": []         // Y NO es un array vacío
  }
}
```

### Performance

- **Índice recomendado**: Crear índice en el campo `averias` para mejorar performance
- **Cantidad de datos**: Retorna TODOS los campos del cliente (no hay proyección)
- **Orden**: Los resultados no tienen un orden específico (orden natural de MongoDB)

### Logging

El endpoint registra:
- Inicio de búsqueda
- Cantidad de clientes encontrados
- Errores si ocurren

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| `200` | Éxito - Retorna array de clientes (puede estar vacío) |
| `500` | Error interno del servidor |

## Seguridad

- ✅ No requiere autenticación (ajustar según necesidades)
- ✅ No expone información sensible adicional
- ✅ Manejo de errores sin exponer detalles internos

## Testing

### Caso 1: Clientes con averías existen

**Request:**
```bash
GET /api/clientes/con-averias
```

**Expected Response:**
```
Status: 200 OK
Body: Array con clientes (length > 0)
```

### Caso 2: No hay clientes con averías

**Request:**
```bash
GET /api/clientes/con-averias
```

**Expected Response:**
```
Status: 200 OK
Body: []
```

### Caso 3: Error de base de datos

**Request:**
```bash
GET /api/clientes/con-averias
```

**Expected Response:**
```
Status: 500 Internal Server Error
Body: {"detail": "Error al obtener clientes con averías: ..."}
```

## Changelog

### v1.0.0 (2024-01-16)
- ✅ Implementación inicial del endpoint
- ✅ Filtrado por campo `averias` no vacío
- ✅ Retorna datos completos del cliente
- ✅ Logging de operaciones
- ✅ Manejo de errores

## Soporte

Para reportar problemas o sugerencias sobre este endpoint, contactar al equipo de desarrollo.
