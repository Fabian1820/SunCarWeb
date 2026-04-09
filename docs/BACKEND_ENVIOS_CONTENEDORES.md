# Backend: Envío de Contenedores

## Objetivo
Implementar el módulo `Envío de Contenedores` para registrar y consultar envíos con:
- Nombre del contenedor
- Descripción opcional
- Fecha de envío
- Fecha aproximada de llegada
- Estado del envío
- Lista de materiales con cantidad

Este documento está alineado con el frontend actual de `SunCarWeb`.

---

## Módulo de permisos
Registrar el módulo con el nombre exacto:

- `envio-contenedores`

Este nombre es el que usa `RouteGuard` en frontend.

---

## Estados permitidos
Se recomienda usar estos valores exactos en backend:

- `despachado`
- `recibido`
- `cancelado`

Mapeo visual frontend:
- `despachado` -> Despachado
- `recibido` -> Recibido
- `cancelado` -> Cancelado

---

## Modelo de datos (MongoDB)
Colección recomendada: `envios_contenedores`

```json
{
  "_id": "ObjectId",
  "nombre": "Contenedor Solar Abril 2026",
  "descripcion": "Opcional",
  "fecha_envio": "2026-04-09",
  "fecha_llegada_aproximada": "2026-05-10",
  "estado": "despachado",
  "materiales": [
    {
      "material_id": "6809f5...",
      "material_codigo": "5401090096",
      "material_nombre": "Estructura Sunfer Fototermia 09V6",
      "cantidad": 20
    }
  ],
  "created_at": "2026-04-09T14:00:00Z",
  "updated_at": "2026-04-09T14:00:00Z",
  "deleted": false
}
```

## Importante
No guardar en cada material:
- `material_descripcion`
- `um`

Solo se guardan:
- `material_id`
- `material_codigo`
- `material_nombre`
- `cantidad`

---

## Schemas Pydantic (referencia)

```python
from datetime import date, datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator

EstadoEnvio = Literal["despachado", "recibido", "cancelado"]

class EnvioMaterial(BaseModel):
    material_id: str
    material_codigo: str
    material_nombre: str
    cantidad: float = Field(gt=0)

class EnvioContenedorCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=180)
    descripcion: Optional[str] = ""
    fecha_envio: date
    fecha_llegada_aproximada: date
    estado: EstadoEnvio = "despachado"
    materiales: List[EnvioMaterial] = Field(min_length=1)

    @field_validator("fecha_llegada_aproximada")
    @classmethod
    def validar_fechas(cls, v, info):
        fecha_envio = info.data.get("fecha_envio")
        if fecha_envio and v < fecha_envio:
            raise ValueError("fecha_llegada_aproximada no puede ser menor que fecha_envio")
        return v

class EnvioContenedorUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_envio: Optional[date] = None
    fecha_llegada_aproximada: Optional[date] = None
    estado: Optional[EstadoEnvio] = None
    materiales: Optional[List[EnvioMaterial]] = None

class EnvioContenedorOut(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str] = ""
    fecha_envio: date
    fecha_llegada_aproximada: date
    estado: EstadoEnvio
    materiales: List[EnvioMaterial]
    created_at: datetime
    updated_at: datetime
```

---

## Endpoints
Base path recomendado:

- `/api/envios-contenedores`

### 1) Crear envío
`POST /api/envios-contenedores/`

Body:
```json
{
  "nombre": "Contenedor Solar Abril 2026",
  "descripcion": "Salida por puerto de Valencia",
  "fecha_envio": "2026-04-09",
  "fecha_llegada_aproximada": "2026-05-10",
  "estado": "despachado",
  "materiales": [
    {
      "material_id": "6809f5...",
      "material_codigo": "5401090096",
      "material_nombre": "Estructura Sunfer Fototermia 09V6",
      "cantidad": 20
    }
  ]
}
```

Respuesta `201`:
```json
{
  "id": "6810ab...",
  "nombre": "Contenedor Solar Abril 2026",
  "descripcion": "Salida por puerto de Valencia",
  "fecha_envio": "2026-04-09",
  "fecha_llegada_aproximada": "2026-05-10",
  "estado": "despachado",
  "materiales": [
    {
      "material_id": "6809f5...",
      "material_codigo": "5401090096",
      "material_nombre": "Estructura Sunfer Fototermia 09V6",
      "cantidad": 20
    }
  ],
  "created_at": "2026-04-09T14:00:00Z",
  "updated_at": "2026-04-09T14:00:00Z"
}
```

### 2) Listar envíos
`GET /api/envios-contenedores/`

Query params sugeridos:
- `q`: búsqueda libre en `nombre`, `descripcion`, `materiales.material_codigo`, `materiales.material_nombre`
- `estado`: `despachado|recibido|cancelado`
- `skip`: paginación (default 0)
- `limit`: paginación (default 50, max 200)

Respuesta sugerida:
```json
{
  "data": [
    {
      "id": "6810ab...",
      "nombre": "Contenedor Solar Abril 2026",
      "descripcion": "...",
      "fecha_envio": "2026-04-09",
      "fecha_llegada_aproximada": "2026-05-10",
      "estado": "despachado",
      "materiales": [
        {
          "material_id": "6809f5...",
          "material_codigo": "5401090096",
          "material_nombre": "Estructura Sunfer Fototermia 09V6",
          "cantidad": 20
        }
      ],
      "created_at": "2026-04-09T14:00:00Z",
      "updated_at": "2026-04-09T14:00:00Z"
    }
  ],
  "total": 1,
  "skip": 0,
  "limit": 50
}
```

### 3) Obtener detalle
`GET /api/envios-contenedores/{envio_id}`

Respuesta `200`: mismo formato de `EnvioContenedorOut`.

### 4) Actualizar envío
`PATCH /api/envios-contenedores/{envio_id}`

Body parcial (`EnvioContenedorUpdate`).

Ejemplo:
```json
{
  "estado": "recibido"
}
```

Respuesta `200`: objeto actualizado.

### 5) Eliminar envío (borrado lógico recomendado)
`DELETE /api/envios-contenedores/{envio_id}`

Acción recomendada:
- `deleted = true`
- `updated_at = now`

Respuesta sugerida:
```json
{
  "success": true,
  "message": "Envío eliminado correctamente"
}
```

---

## Validaciones recomendadas

1. `nombre` obligatorio y no vacío.
2. `materiales` obligatorio con al menos 1 item.
3. Cada material debe tener:
   - `material_id` no vacío
   - `material_codigo` no vacío
   - `material_nombre` no vacío
   - `cantidad > 0`
4. `fecha_llegada_aproximada >= fecha_envio`.
5. `estado` dentro de valores permitidos.
6. Excluir documentos `deleted=true` en listados y detalle.

---

## Índices Mongo recomendados

```js
db.envios_contenedores.createIndex({ deleted: 1, fecha_envio: -1 })
db.envios_contenedores.createIndex({ estado: 1, fecha_envio: -1 })
db.envios_contenedores.createIndex(
  {
    nombre: "text",
    descripcion: "text",
    "materiales.material_codigo": "text",
    "materiales.material_nombre": "text"
  },
  { default_language: "spanish" }
)
```

---

## Compatibilidad con frontend actual
El frontend consume por `lib/services/feats/envios-contenedores/envio-contenedor-service.ts` con:

- `GET /envios-contenedores/`
- `POST /envios-contenedores/`
- `GET /envios-contenedores/{id}`

Soporta respuestas directas o envueltas (`{ data: ... }`).

---

## Migración de datos (si ya guardaste campos eliminados)
Si existen documentos con `material_descripcion` o `um`, eliminarlos:

```js
db.envios_contenedores.updateMany(
  {},
  {
    $unset: {
      "materiales.$[].material_descripcion": "",
      "materiales.$[].um": ""
    }
  }
)
```

---

## Ejemplo de router FastAPI (mínimo)

```python
@router.post("/", response_model=EnvioContenedorOut, status_code=201)
async def create_envio(payload: EnvioContenedorCreate):
    ...

@router.get("/")
async def list_envios(
    q: str | None = None,
    estado: str | None = None,
    skip: int = 0,
    limit: int = 50,
):
    ...

@router.get("/{envio_id}", response_model=EnvioContenedorOut)
async def get_envio(envio_id: str):
    ...

@router.patch("/{envio_id}", response_model=EnvioContenedorOut)
async def update_envio(envio_id: str, payload: EnvioContenedorUpdate):
    ...

@router.delete("/{envio_id}")
async def delete_envio(envio_id: str):
    ...
```

