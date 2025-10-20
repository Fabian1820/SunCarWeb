# Backend - Código FastAPI para Órdenes de Trabajo

Este archivo contiene el código completo del backend necesario para implementar el CRUD de órdenes de trabajo en FastAPI con MongoDB.

## 📁 Estructura de Archivos Recomendada

```
backend/
├── app/
│   ├── models/
│   │   └── orden_trabajo.py       # Modelos Pydantic
│   ├── routes/
│   │   └── ordenes_trabajo.py     # Endpoints
│   ├── database/
│   │   └── mongodb.py             # Conexión MongoDB
│   └── main.py                    # Aplicación principal
```

---

## 1. Modelos Pydantic (`app/models/orden_trabajo.py`)

```python
"""
Modelos Pydantic para Órdenes de Trabajo
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from bson import ObjectId

# Tipos personalizados
TipoReporte = Literal["inversión", "avería", "mantenimiento"]
EstadoOrden = Literal["pendiente", "en_proceso", "completada", "cancelada"]


class PyObjectId(ObjectId):
    """Manejador personalizado para ObjectId de MongoDB"""
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


class OrdenTrabajoBase(BaseModel):
    """Modelo base para Orden de Trabajo"""
    brigada_id: str = Field(..., description="ID de la brigada asignada")
    cliente_numero: str = Field(..., description="Número del cliente")
    tipo_reporte: TipoReporte = Field(..., description="Tipo de reporte a realizar")
    fecha_ejecucion: str = Field(..., description="Fecha programada de ejecución (ISO format)")
    comentarios: Optional[str] = Field(None, description="Comentarios adicionales sobre la orden")


class CreateOrdenTrabajoRequest(OrdenTrabajoBase):
    """Modelo para crear una nueva orden de trabajo"""
    pass


class UpdateOrdenTrabajoRequest(BaseModel):
    """Modelo para actualizar una orden de trabajo existente"""
    brigada_id: Optional[str] = None
    cliente_numero: Optional[str] = None
    tipo_reporte: Optional[TipoReporte] = None
    fecha_ejecucion: Optional[str] = None
    comentarios: Optional[str] = None
    estado: Optional[EstadoOrden] = None


class OrdenTrabajoInDB(OrdenTrabajoBase):
    """Modelo de Orden de Trabajo en la base de datos"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    brigada_nombre: Optional[str] = None
    cliente_nombre: str
    fecha_creacion: str = Field(default_factory=lambda: datetime.now().isoformat())
    estado: EstadoOrden = Field(default="pendiente")

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class OrdenTrabajoResponse(BaseModel):
    """Modelo de respuesta para operaciones con órdenes"""
    id: str = Field(..., alias="_id")
    brigada_id: str
    brigada_nombre: Optional[str] = None
    cliente_numero: str
    cliente_nombre: str
    tipo_reporte: TipoReporte
    fecha_ejecucion: str
    comentarios: Optional[str] = None
    fecha_creacion: str
    estado: EstadoOrden

    class Config:
        populate_by_name = True


class ApiResponse(BaseModel):
    """Modelo genérico de respuesta de API"""
    success: bool
    message: str
    data: Optional[any] = None
```

---

## 2. Rutas/Endpoints (`app/routes/ordenes_trabajo.py`)

```python
"""
Endpoints FastAPI para gestión de Órdenes de Trabajo
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import logging

from app.models.orden_trabajo import (
    CreateOrdenTrabajoRequest,
    UpdateOrdenTrabajoRequest,
    OrdenTrabajoResponse,
    ApiResponse,
    TipoReporte,
    EstadoOrden
)
from app.database.mongodb import get_database
from app.auth import verify_token  # Función de autenticación

# Configurar logger
logger = logging.getLogger(__name__)

# Crear router
router = APIRouter(
    prefix="/api/ordenes-trabajo",
    tags=["Órdenes de Trabajo"],
    dependencies=[Depends(verify_token)]  # Requiere autenticación
)


def serialize_orden(orden_dict: dict) -> dict:
    """Convertir ObjectId a string para serialización JSON"""
    if orden_dict and "_id" in orden_dict:
        orden_dict["id"] = str(orden_dict["_id"])
        orden_dict["_id"] = str(orden_dict["_id"])
    return orden_dict


async def obtener_info_adicional(db, brigada_id: str, cliente_numero: str) -> tuple:
    """
    Obtener información adicional de brigada y cliente
    Retorna: (brigada_nombre, cliente_nombre)
    """
    brigada_nombre = None
    cliente_nombre = "Cliente"
    
    # Buscar nombre de la brigada
    try:
        brigada = await db.brigadas.find_one({"_id": ObjectId(brigada_id)})
        if brigada:
            brigada_nombre = brigada.get("nombre", "Brigada sin nombre")
    except Exception as e:
        logger.warning(f"Error al buscar brigada: {e}")
    
    # Buscar nombre del cliente
    try:
        cliente = await db.clientes.find_one({"numero": cliente_numero})
        if cliente:
            cliente_nombre = cliente.get("nombre", "Cliente")
    except Exception as e:
        logger.warning(f"Error al buscar cliente: {e}")
    
    return brigada_nombre, cliente_nombre


@router.get("/", response_model=ApiResponse)
async def get_ordenes_trabajo(
    brigada_id: Optional[str] = Query(None, description="Filtrar por ID de brigada"),
    cliente_numero: Optional[str] = Query(None, description="Filtrar por número de cliente"),
    tipo_reporte: Optional[TipoReporte] = Query(None, description="Filtrar por tipo de reporte"),
    estado: Optional[EstadoOrden] = Query(None, description="Filtrar por estado"),
    fecha_inicio: Optional[str] = Query(None, description="Fecha de inicio (ISO format)"),
    fecha_fin: Optional[str] = Query(None, description="Fecha fin (ISO format)"),
    db = Depends(get_database)
):
    """
    Obtener lista de órdenes de trabajo con filtros opcionales.
    
    **Filtros disponibles:**
    - brigada_id: Filtrar por brigada específica
    - cliente_numero: Filtrar por cliente específico
    - tipo_reporte: inversión, avería o mantenimiento
    - estado: pendiente, en_proceso, completada, cancelada
    - fecha_inicio/fecha_fin: Rango de fechas de ejecución
    """
    try:
        logger.info(f"GET /ordenes-trabajo - Filters: brigada={brigada_id}, cliente={cliente_numero}, tipo={tipo_reporte}, estado={estado}")
        
        # Construir query de MongoDB
        query = {}
        
        if brigada_id:
            query["brigada_id"] = brigada_id
        
        if cliente_numero:
            query["cliente_numero"] = cliente_numero
        
        if tipo_reporte:
            query["tipo_reporte"] = tipo_reporte
        
        if estado:
            query["estado"] = estado
        
        # Filtro por rango de fechas
        if fecha_inicio or fecha_fin:
            query["fecha_ejecucion"] = {}
            if fecha_inicio:
                query["fecha_ejecucion"]["$gte"] = fecha_inicio
            if fecha_fin:
                query["fecha_ejecucion"]["$lte"] = fecha_fin
        
        # Consultar MongoDB
        ordenes_cursor = db.ordenes_trabajo.find(query).sort("fecha_creacion", -1)
        ordenes = await ordenes_cursor.to_list(length=None)
        
        # Serializar resultados
        ordenes_serializadas = [serialize_orden(orden) for orden in ordenes]
        
        logger.info(f"Found {len(ordenes_serializadas)} órdenes de trabajo")
        
        return ApiResponse(
            success=True,
            message=f"Se encontraron {len(ordenes_serializadas)} órdenes de trabajo",
            data=ordenes_serializadas
        )
    
    except Exception as e:
        logger.error(f"Error al obtener órdenes de trabajo: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener órdenes de trabajo: {str(e)}"
        )


@router.get("/{orden_id}", response_model=ApiResponse)
async def get_orden_trabajo_by_id(
    orden_id: str,
    db = Depends(get_database)
):
    """
    Obtener una orden de trabajo específica por su ID.
    """
    try:
        logger.info(f"GET /ordenes-trabajo/{orden_id}")
        
        # Validar ObjectId
        if not ObjectId.is_valid(orden_id):
            raise HTTPException(status_code=400, detail="ID de orden inválido")
        
        # Buscar orden en MongoDB
        orden = await db.ordenes_trabajo.find_one({"_id": ObjectId(orden_id)})
        
        if not orden:
            raise HTTPException(
                status_code=404,
                detail=f"Orden de trabajo con ID {orden_id} no encontrada"
            )
        
        # Serializar
        orden_serializada = serialize_orden(orden)
        
        return ApiResponse(
            success=True,
            message="Orden de trabajo encontrada",
            data=orden_serializada
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener orden {orden_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener orden de trabajo: {str(e)}"
        )


@router.post("/", response_model=ApiResponse)
async def create_orden_trabajo(
    orden_data: CreateOrdenTrabajoRequest,
    db = Depends(get_database)
):
    """
    Crear una nueva orden de trabajo.
    
    **Campos requeridos:**
    - brigada_id: ID de la brigada asignada
    - cliente_numero: Número del cliente
    - tipo_reporte: inversión, avería o mantenimiento
    - fecha_ejecucion: Fecha programada (ISO format)
    - comentarios: Comentarios adicionales (opcional)
    """
    try:
        logger.info(f"POST /ordenes-trabajo - Data: {orden_data.dict()}")
        
        # Obtener información adicional de brigada y cliente
        brigada_nombre, cliente_nombre = await obtener_info_adicional(
            db, orden_data.brigada_id, orden_data.cliente_numero
        )
        
        # Crear documento para MongoDB
        nueva_orden = {
            "brigada_id": orden_data.brigada_id,
            "brigada_nombre": brigada_nombre,
            "cliente_numero": orden_data.cliente_numero,
            "cliente_nombre": cliente_nombre,
            "tipo_reporte": orden_data.tipo_reporte,
            "fecha_ejecucion": orden_data.fecha_ejecucion,
            "comentarios": orden_data.comentarios,
            "fecha_creacion": datetime.now().isoformat(),
            "estado": "pendiente"
        }
        
        # Insertar en MongoDB
        result = await db.ordenes_trabajo.insert_one(nueva_orden)
        
        # Agregar ID al documento
        nueva_orden["_id"] = result.inserted_id
        orden_serializada = serialize_orden(nueva_orden)
        
        logger.info(f"Orden de trabajo creada con ID: {result.inserted_id}")
        
        return ApiResponse(
            success=True,
            message="Orden de trabajo creada correctamente",
            data=orden_serializada
        )
    
    except Exception as e:
        logger.error(f"Error al crear orden de trabajo: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear orden de trabajo: {str(e)}"
        )


@router.patch("/{orden_id}", response_model=ApiResponse)
async def update_orden_trabajo(
    orden_id: str,
    updates: UpdateOrdenTrabajoRequest,
    db = Depends(get_database)
):
    """
    Actualizar una orden de trabajo existente.
    
    **Campos actualizables:**
    - brigada_id
    - cliente_numero
    - tipo_reporte
    - fecha_ejecucion
    - comentarios
    - estado (pendiente, en_proceso, completada, cancelada)
    """
    try:
        logger.info(f"PATCH /ordenes-trabajo/{orden_id} - Updates: {updates.dict(exclude_unset=True)}")
        
        # Validar ObjectId
        if not ObjectId.is_valid(orden_id):
            raise HTTPException(status_code=400, detail="ID de orden inválido")
        
        # Verificar que la orden existe
        orden_existente = await db.ordenes_trabajo.find_one({"_id": ObjectId(orden_id)})
        if not orden_existente:
            raise HTTPException(
                status_code=404,
                detail=f"Orden de trabajo con ID {orden_id} no encontrada"
            )
        
        # Construir documento de actualización (solo campos proporcionados)
        update_data = {k: v for k, v in updates.dict(exclude_unset=True).items() if v is not None}
        
        if not update_data:
            return ApiResponse(
                success=True,
                message="No hay cambios para actualizar",
                data=None
            )
        
        # Si se actualiza brigada_id o cliente_numero, actualizar nombres también
        if "brigada_id" in update_data or "cliente_numero" in update_data:
            brigada_id = update_data.get("brigada_id", orden_existente["brigada_id"])
            cliente_numero = update_data.get("cliente_numero", orden_existente["cliente_numero"])
            
            brigada_nombre, cliente_nombre = await obtener_info_adicional(
                db, brigada_id, cliente_numero
            )
            
            if "brigada_id" in update_data:
                update_data["brigada_nombre"] = brigada_nombre
            if "cliente_numero" in update_data:
                update_data["cliente_nombre"] = cliente_nombre
        
        # Actualizar en MongoDB
        result = await db.ordenes_trabajo.update_one(
            {"_id": ObjectId(orden_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            logger.warning(f"Orden {orden_id} no fue modificada")
        
        logger.info(f"Orden de trabajo {orden_id} actualizada correctamente")
        
        return ApiResponse(
            success=True,
            message="Orden de trabajo actualizada correctamente",
            data=None
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar orden {orden_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al actualizar orden de trabajo: {str(e)}"
        )


@router.delete("/{orden_id}", response_model=ApiResponse)
async def delete_orden_trabajo(
    orden_id: str,
    db = Depends(get_database)
):
    """
    Eliminar una orden de trabajo.
    
    **Nota:** Esta operación es permanente y no se puede deshacer.
    """
    try:
        logger.info(f"DELETE /ordenes-trabajo/{orden_id}")
        
        # Validar ObjectId
        if not ObjectId.is_valid(orden_id):
            raise HTTPException(status_code=400, detail="ID de orden inválido")
        
        # Verificar que la orden existe
        orden_existente = await db.ordenes_trabajo.find_one({"_id": ObjectId(orden_id)})
        if not orden_existente:
            raise HTTPException(
                status_code=404,
                detail=f"Orden de trabajo con ID {orden_id} no encontrada"
            )
        
        # Eliminar de MongoDB
        result = await db.ordenes_trabajo.delete_one({"_id": ObjectId(orden_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Error al eliminar la orden de trabajo"
            )
        
        logger.info(f"Orden de trabajo {orden_id} eliminada correctamente")
        
        return ApiResponse(
            success=True,
            message="Orden de trabajo eliminada correctamente",
            data=None
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar orden {orden_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar orden de trabajo: {str(e)}"
        )
```

---

## 3. Integración en `main.py`

```python
from fastapi import FastAPI
from app.routes import ordenes_trabajo

app = FastAPI(
    title="SunCar API",
    description="API para gestión de órdenes de trabajo",
    version="1.0.0"
)

# Incluir router de órdenes de trabajo
app.include_router(ordenes_trabajo.router)

@app.get("/")
async def root():
    return {"message": "SunCar API - Órdenes de Trabajo"}
```

---

## 4. Índices MongoDB Recomendados

Ejecutar en MongoDB shell o Compass:

```javascript
// Crear índices para optimizar búsquedas
db.ordenes_trabajo.createIndex({ "brigada_id": 1 })
db.ordenes_trabajo.createIndex({ "cliente_numero": 1 })
db.ordenes_trabajo.createIndex({ "fecha_ejecucion": -1 })
db.ordenes_trabajo.createIndex({ "estado": 1 })
db.ordenes_trabajo.createIndex({ "fecha_creacion": -1 })

// Índice compuesto para búsquedas frecuentes
db.ordenes_trabajo.createIndex({ "estado": 1, "fecha_ejecucion": -1 })
```

---

## 5. Testing con cURL

### Crear Orden
```bash
curl -X POST "http://localhost:8000/api/ordenes-trabajo/" \
  -H "Authorization: Bearer suncar-token-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "brigada_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "cliente_numero": "12345",
    "tipo_reporte": "inversión",
    "fecha_ejecucion": "2025-11-01T10:00:00",
    "comentarios": "Instalación de panel solar residencial"
  }'
```

### Obtener Todas las Órdenes
```bash
curl -X GET "http://localhost:8000/api/ordenes-trabajo/" \
  -H "Authorization: Bearer suncar-token-2025"
```

### Obtener Orden por ID
```bash
curl -X GET "http://localhost:8000/api/ordenes-trabajo/65a1b2c3d4e5f6g7h8i9j0k1" \
  -H "Authorization: Bearer suncar-token-2025"
```

### Actualizar Orden
```bash
curl -X PATCH "http://localhost:8000/api/ordenes-trabajo/65a1b2c3d4e5f6g7h8i9j0k1" \
  -H "Authorization: Bearer suncar-token-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "completada",
    "comentarios": "Trabajo finalizado satisfactoriamente"
  }'
```

### Eliminar Orden
```bash
curl -X DELETE "http://localhost:8000/api/ordenes-trabajo/65a1b2c3d4e5f6g7h8i9j0k1" \
  -H "Authorization: Bearer suncar-token-2025"
```

---

## 6. Variables de Entorno

Agregar a `.env`:

```bash
# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=suncar

# Autenticación
AUTH_TOKEN=suncar-token-2025

# API
API_PORT=8000
API_HOST=0.0.0.0
```

---

## ✅ Checklist de Implementación Backend

- [ ] Crear archivo `app/models/orden_trabajo.py`
- [ ] Crear archivo `app/routes/ordenes_trabajo.py`
- [ ] Incluir router en `main.py`
- [ ] Configurar conexión MongoDB
- [ ] Crear colección `ordenes_trabajo`
- [ ] Crear índices en MongoDB
- [ ] Implementar función de autenticación
- [ ] Probar todos los endpoints con cURL o Postman
- [ ] Configurar CORS para permitir requests desde frontend
- [ ] Agregar logging en todos los endpoints
- [ ] Desplegar backend en Railway/Vercel
- [ ] Actualizar `NEXT_PUBLIC_BACKEND_URL` en frontend

---

**Última actualización**: 2025-10-20
