# Endpoint: Vales Disponibles para Factura

## Descripción

Endpoint optimizado para obtener vales de salida que pueden ser agregados a una factura de instaladora. Este endpoint debe filtrar directamente en la base de datos para mejorar el rendimiento.

## Endpoint

```
GET /api/operaciones/vales-salida/disponibles-para-factura
```

## Parámetros Query (Requeridos)

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `cliente_numero` | string | Número del cliente de la factura |

## Filtros que debe aplicar el Backend

El endpoint debe retornar SOLO los vales que cumplan TODAS estas condiciones:

### 1. Estado del Vale
```python
estado == "usado"
```
- Solo vales que ya fueron utilizados (recogidos del almacén)
- Excluye automáticamente vales anulados

### 2. Campo Facturado
```python
facturado == False
```
- Solo vales que NO han sido agregados a otra factura
- Este campo ya existe en el modelo `ValeSalida`

### 3. Cliente de la Solicitud
```python
# Para solicitudes de material:
solicitud_material.cliente.numero == cliente_numero

# O para solicitudes de venta:
solicitud_venta.cliente_venta.numero == cliente_numero
```
- El vale debe pertenecer al cliente especificado
- Comparar por el campo `numero` del cliente (no por `id`)
- Verificar en ambos tipos de solicitud (material y venta)

### 4. Proyección de Datos (Optimización)

Para mejorar el rendimiento, incluir solo los campos necesarios:

```python
{
    "id": vale.id,
    "codigo": vale.codigo,
    "estado": vale.estado,
    "facturado": vale.facturado,
    "fecha_creacion": vale.fecha_creacion,
    "recogido_por": vale.recogido_por,
    "materiales": [
        {
            "material_id": material.material_id,
            "cantidad": material.cantidad,
            "codigo": material.material_codigo,
            "descripcion": material.material_descripcion,
            "material": {
                "precio": material.material.precio
            }
        }
    ],
    # NO incluir campos pesados como:
    # - movimientos_ids completos
    # - solicitud completa (solo necesitamos validar, no retornar)
}
```

## Ejemplo de Implementación (Python/FastAPI)

```python
from fastapi import APIRouter, Query, HTTPException
from typing import List

router = APIRouter()

@router.get("/disponibles-para-factura")
async def obtener_vales_disponibles_para_factura(
    cliente_numero: str = Query(..., description="Número del cliente")
) -> List[dict]:
    """
    Obtiene vales de salida disponibles para agregar a una factura.
    
    Filtros aplicados:
    - estado = "usado"
    - facturado = False
    - Pertenece al cliente especificado
    """
    
    # Query optimizada en MongoDB
    query = {
        "estado": "usado",
        "facturado": False,
        "$or": [
            {"solicitud_material.cliente.numero": cliente_numero},
            {"solicitud_venta.cliente_venta.numero": cliente_numero}
        ]
    }
    
    # Proyección para incluir solo campos necesarios
    projection = {
        "id": 1,
        "codigo": 1,
        "estado": 1,
        "facturado": 1,
        "fecha_creacion": 1,
        "recogido_por": 1,
        "materiales.material_id": 1,
        "materiales.cantidad": 1,
        "materiales.material_codigo": 1,
        "materiales.material_descripcion": 1,
        "materiales.material.precio": 1,
        # Excluir campos pesados
        "movimientos_ids": 0,
        "solicitud_material": 0,
        "solicitud_venta": 0,
    }
    
    # Ejecutar query
    vales = await db.vales_salida.find(query, projection).to_list(length=None)
    
    return vales
```

## Ejemplo de Query MongoDB

```javascript
db.vales_salida.find({
  "estado": "usado",
  "facturado": false,
  "$or": [
    { "solicitud_material.cliente.numero": "12345" },
    { "solicitud_venta.cliente_venta.numero": "12345" }
  ]
}, {
  // Proyección
  "id": 1,
  "codigo": 1,
  "estado": 1,
  "facturado": 1,
  "fecha_creacion": 1,
  "recogido_por": 1,
  "materiales.material_id": 1,
  "materiales.cantidad": 1,
  "materiales.material_codigo": 1,
  "materiales.material_descripcion": 1,
  "materiales.material.precio": 1
})
```

## Índices Recomendados (Optimización)

Para mejorar el rendimiento de este endpoint, crear estos índices en MongoDB:

```javascript
// Índice compuesto para filtros principales
db.vales_salida.createIndex({
  "estado": 1,
  "facturado": 1
})

// Índice para búsqueda por cliente en solicitud_material
db.vales_salida.createIndex({
  "solicitud_material.cliente.numero": 1
})

// Índice para búsqueda por cliente en solicitud_venta
db.vales_salida.createIndex({
  "solicitud_venta.cliente_venta.numero": 1
})

// Índice compuesto óptimo (recomendado)
db.vales_salida.createIndex({
  "estado": 1,
  "facturado": 1,
  "solicitud_material.cliente.numero": 1
})

db.vales_salida.createIndex({
  "estado": 1,
  "facturado": 1,
  "solicitud_venta.cliente_venta.numero": 1
})
```

## Respuesta Exitosa

**Status Code:** `200 OK`

```json
[
  {
    "id": "vale_abc123",
    "codigo": "VS-2024-001",
    "estado": "usado",
    "facturado": false,
    "fecha_creacion": "2024-03-17T10:30:00Z",
    "recogido_por": "Juan Pérez",
    "materiales": [
      {
        "material_id": "mat_123",
        "cantidad": 2,
        "codigo": "INV-001",
        "descripcion": "Inversor 10kW Growatt",
        "material": {
          "precio": 1500.00
        }
      },
      {
        "material_id": "mat_456",
        "cantidad": 20,
        "codigo": "PAN-590",
        "descripcion": "Panel Solar 590W JA Solar",
        "material": {
          "precio": 180.00
        }
      }
    ]
  }
]
```

## Errores

### 400 Bad Request
```json
{
  "detail": "El parámetro cliente_numero es requerido"
}
```

### 404 Not Found
```json
{
  "detail": "No se encontraron vales disponibles para este cliente"
}
```

## Beneficios de este Endpoint

1. ✅ **Rendimiento**: Filtra en la base de datos, no en el frontend
2. ✅ **Optimización**: Proyección de campos reduce el tamaño de la respuesta
3. ✅ **Índices**: Queries rápidas con índices apropiados
4. ✅ **Específico**: Diseñado para un caso de uso concreto
5. ✅ **Escalable**: Funciona bien con miles de vales

## Comparación de Rendimiento

### Antes (Sin endpoint optimizado)
```
1. Frontend: GET /api/operaciones/vales-salida/ (sin filtros)
2. Backend: Retorna TODOS los vales (ej: 5000 vales)
3. Frontend: Filtra en JavaScript
4. Tiempo: ~3-5 segundos
5. Datos transferidos: ~5-10 MB
```

### Después (Con endpoint optimizado)
```
1. Frontend: GET /api/operaciones/vales-salida/disponibles-para-factura?cliente_numero=12345
2. Backend: Filtra en MongoDB con índices
3. Backend: Retorna solo vales relevantes (ej: 5-10 vales)
4. Tiempo: ~200-500 ms
5. Datos transferidos: ~50-100 KB
```

**Mejora esperada: 10-20x más rápido**

## Integración en el Frontend

Una vez implementado el endpoint, actualizar el servicio:

```typescript
// lib/services/feats/vales-salida/vale-salida-service.ts

static async getValesDisponiblesParaFactura(
  clienteNumero: string
): Promise<ValeSalida[]> {
  const endpoint = `${BASE_ENDPOINT}/disponibles-para-factura?cliente_numero=${encodeURIComponent(clienteNumero)}`;
  
  const raw = await apiRequest<any>(endpoint);
  const error = extractApiError(raw);
  if (error) throw new Error(error);
  
  const payload = raw?.data ?? raw;
  if (Array.isArray(payload)) return payload;
  return payload?.vales || payload?.data || [];
}
```

Y usar en el componente:

```typescript
const cargarValesDisponibles = async () => {
  if (!facturaForVale?.cliente_id) return;

  setLoadingValesSalida(true);
  try {
    // Llamar al endpoint optimizado
    const vales = await ValeSalidaService.getValesDisponiblesParaFactura(
      facturaForVale.cliente_id
    );
    
    setValesDisponibles(vales);
    
    if (vales.length === 0) {
      toast({
        title: "Sin vales disponibles",
        description: "No hay vales de salida disponibles para este cliente.",
      });
    }
  } catch (error) {
    console.error("Error cargando vales:", error);
    toast({
      title: "Error",
      description: "No se pudieron cargar los vales disponibles.",
      variant: "destructive",
    });
  } finally {
    setLoadingValesSalida(false);
  }
};
```

## Notas Adicionales

1. **Caché**: Considerar implementar caché de 30-60 segundos para este endpoint
2. **Paginación**: Si un cliente tiene muchos vales, agregar paginación (skip/limit)
3. **Ordenamiento**: Ordenar por `fecha_creacion` descendente por defecto
4. **Logging**: Agregar logs para monitorear el rendimiento del endpoint

## Testing

```python
# Test 1: Cliente con vales disponibles
response = client.get("/api/operaciones/vales-salida/disponibles-para-factura?cliente_numero=12345")
assert response.status_code == 200
assert len(response.json()) > 0

# Test 2: Cliente sin vales disponibles
response = client.get("/api/operaciones/vales-salida/disponibles-para-factura?cliente_numero=99999")
assert response.status_code == 200
assert len(response.json()) == 0

# Test 3: Sin parámetro cliente_numero
response = client.get("/api/operaciones/vales-salida/disponibles-para-factura")
assert response.status_code == 400

# Test 4: Verificar que no retorna vales facturados
response = client.get("/api/operaciones/vales-salida/disponibles-para-factura?cliente_numero=12345")
vales = response.json()
for vale in vales:
    assert vale["facturado"] == False
    assert vale["estado"] == "usado"
```
