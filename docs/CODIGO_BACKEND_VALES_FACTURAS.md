# Código Backend: Vales de Salida en Facturas

## Modelo de Datos (Pydantic)

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ItemVale(BaseModel):
    material_id: str
    codigo: str
    descripcion: str
    precio: float
    cantidad: int

class Vale(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    id_vale_salida: Optional[str] = None  # ← Campo agregado
    fecha: str
    items: List[ItemVale] = []

class Factura(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    numero_factura: str
    tipo: str
    cliente_id: Optional[str] = None
    vales: List[Vale] = []
    total: float = 0.0
    fecha_creacion: datetime = Field(default_factory=datetime.now)
```

## Endpoint: Agregar Vale a Factura

```python
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from typing import Dict, Any

router = APIRouter(prefix="/api/facturas", tags=["facturas"])

@router.post("/{factura_id}/vales")
async def agregar_vale_a_factura(
    factura_id: str,
    vale_data: Dict[str, Any],
    db = Depends(get_database)
):
    """
    Agrega un vale a una factura.
    
    Si vale_data contiene 'id', se trata como un vale de salida.
    Si no, se trata como un vale manual.
    """
    
    # Validar que la factura existe
    try:
        factura_oid = ObjectId(factura_id)
    except:
        raise HTTPException(400, "ID de factura inválido")
    
    factura = await db.facturas.find_one({"_id": factura_oid})
    if not factura:
        raise HTTPException(404, "Factura no encontrada")
    
    # Detectar si es un vale de salida
    vale_salida_id = vale_data.get("id")
    
    if vale_salida_id:
        # Procesar como vale de salida
        nuevo_vale = await procesar_vale_desde_vale_salida(
            db, factura, vale_salida_id, vale_data
        )
    else:
        # Procesar como vale manual
        nuevo_vale = await procesar_vale_manual(vale_data)
    
    # Agregar el vale a la factura
    await db.facturas.update_one(
        {"_id": factura_oid},
        {"$push": {"vales": nuevo_vale}}
    )
    
    # Recalcular total
    await recalcular_total_factura(db, factura_id)
    
    return {"message": "Vale agregado correctamente"}
```


## Función: Procesar Vale desde Vale de Salida

```python
async def procesar_vale_desde_vale_salida(
    db,
    factura: Dict[str, Any],
    vale_salida_id: str,
    vale_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Procesa un vale que proviene de un vale de salida.
    
    Validaciones:
    1. Vale de salida existe
    2. No está facturado
    3. No está anulado
    4. Pertenece al cliente de la factura
    5. No está duplicado en la factura
    
    Acciones:
    1. Marca el vale de salida como facturado
    2. Retorna el vale con id_vale_salida
    """
    
    # 1. Validar ObjectId
    try:
        vale_salida_oid = ObjectId(vale_salida_id)
    except:
        raise HTTPException(400, "ID de vale de salida inválido")
    
    # 2. Obtener el vale de salida
    vale_salida = await db.vales_salida.find_one({"_id": vale_salida_oid})
    
    if not vale_salida:
        raise HTTPException(404, f"Vale de salida {vale_salida_id} no encontrado")
    
    # 3. Validar que no esté ya facturado
    if vale_salida.get("facturado") == True:
        raise HTTPException(
            400,
            "Este vale de salida ya fue agregado a otra factura"
        )
    
    # 4. Validar que no esté anulado
    if vale_salida.get("estado") == "anulado":
        raise HTTPException(
            400,
            "No se puede agregar un vale de salida anulado"
        )
    
    # 5. Validar que pertenezca al cliente de la factura
    solicitud = vale_salida.get("solicitud_material") or vale_salida.get("solicitud_venta")
    
    if solicitud:
        cliente_vale = solicitud.get("cliente") or solicitud.get("cliente_venta")
        cliente_numero_vale = cliente_vale.get("numero") if cliente_vale else None
        
        if cliente_numero_vale != factura.get("cliente_id"):
            raise HTTPException(
                400,
                "El vale de salida no pertenece al cliente de la factura"
            )
    
    # 6. Validar que no esté duplicado en la factura
    vales_existentes = factura.get("vales", [])
    vale_ya_existe = any(
        v.get("id_vale_salida") == vale_salida_id 
        for v in vales_existentes
    )
    
    if vale_ya_existe:
        raise HTTPException(
            400,
            "Este vale de salida ya está agregado a esta factura"
        )
    
    # 7. Marcar el vale de salida como facturado
    await db.vales_salida.update_one(
        {"_id": vale_salida_oid},
        {"$set": {"facturado": True}}
    )
    
    # 8. Crear el vale con referencia
    nuevo_vale = {
        "id": str(ObjectId()),
        "id_vale_salida": vale_salida_id,  # ← Guardar referencia
        "fecha": vale_data.get("fecha"),
        "items": vale_data.get("items", [])
    }
    
    return nuevo_vale


async def procesar_vale_manual(vale_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Procesa un vale creado manualmente (sin vale de salida).
    """
    
    nuevo_vale = {
        "id": str(ObjectId()),
        "id_vale_salida": None,  # ← Sin referencia
        "fecha": vale_data.get("fecha"),
        "items": vale_data.get("items", [])
    }
    
    return nuevo_vale
```

## Función: Recalcular Total de Factura

```python
async def recalcular_total_factura(db, factura_id: str):
    """
    Recalcula el total de una factura sumando todos los items de todos los vales.
    """
    
    try:
        factura_oid = ObjectId(factura_id)
    except:
        return
    
    factura = await db.facturas.find_one({"_id": factura_oid})
    
    if not factura:
        return
    
    total = 0.0
    
    for vale in factura.get("vales", []):
        for item in vale.get("items", []):
            precio = item.get("precio", 0)
            cantidad = item.get("cantidad", 0)
            total += precio * cantidad
    
    await db.facturas.update_one(
        {"_id": factura_oid},
        {"$set": {"total": total}}
    )
```

## Endpoint: Eliminar Vale de Factura

```python
@router.delete("/{factura_id}/vales/{vale_id}")
async def eliminar_vale_de_factura(
    factura_id: str,
    vale_id: str,
    db = Depends(get_database)
):
    """
    Elimina un vale de una factura.
    
    Si el vale tiene id_vale_salida, desmarca el vale de salida.
    """
    
    # Validar factura_id
    try:
        factura_oid = ObjectId(factura_id)
    except:
        raise HTTPException(400, "ID de factura inválido")
    
    # Obtener la factura
    factura = await db.facturas.find_one({"_id": factura_oid})
    
    if not factura:
        raise HTTPException(404, "Factura no encontrada")
    
    # Buscar el vale en la factura
    vale = next(
        (v for v in factura.get("vales", []) if v.get("id") == vale_id),
        None
    )
    
    if not vale:
        raise HTTPException(404, "Vale no encontrado en la factura")
    
    # Si el vale tiene id_vale_salida, desmarcar el vale de salida
    if vale.get("id_vale_salida"):
        try:
            vale_salida_oid = ObjectId(vale["id_vale_salida"])
            await db.vales_salida.update_one(
                {"_id": vale_salida_oid},
                {"$set": {"facturado": False}}
            )
        except Exception as e:
            print(f"Error desmarcando vale de salida: {e}")
            # Continuar con la eliminación aunque falle el desmarcado
    
    # Eliminar el vale de la factura
    await db.facturas.update_one(
        {"_id": factura_oid},
        {"$pull": {"vales": {"id": vale_id}}}
    )
    
    # Recalcular total
    await recalcular_total_factura(db, factura_id)
    
    return {"message": "Vale eliminado correctamente"}
```

## Endpoint: Actualizar Vale de Factura

```python
@router.patch("/{factura_id}/vales/{vale_id}")
async def actualizar_vale_de_factura(
    factura_id: str,
    vale_id: str,
    vale_data: Dict[str, Any],
    db = Depends(get_database)
):
    """
    Actualiza un vale existente en una factura.
    
    IMPORTANTE: No se puede cambiar el id_vale_salida de un vale.
    """
    
    # Validar factura_id
    try:
        factura_oid = ObjectId(factura_id)
    except:
        raise HTTPException(400, "ID de factura inválido")
    
    # Obtener la factura
    factura = await db.facturas.find_one({"_id": factura_oid})
    
    if not factura:
        raise HTTPException(404, "Factura no encontrada")
    
    # Buscar el vale en la factura
    vale_index = next(
        (i for i, v in enumerate(factura.get("vales", [])) if v.get("id") == vale_id),
        None
    )
    
    if vale_index is None:
        raise HTTPException(404, "Vale no encontrado en la factura")
    
    # Obtener el vale actual
    vale_actual = factura["vales"][vale_index]
    
    # Actualizar solo fecha e items (NO id_vale_salida)
    vale_actualizado = {
        "id": vale_actual["id"],
        "id_vale_salida": vale_actual.get("id_vale_salida"),  # Mantener el original
        "fecha": vale_data.get("fecha", vale_actual.get("fecha")),
        "items": vale_data.get("items", vale_actual.get("items", []))
    }
    
    # Actualizar el vale en la factura
    await db.facturas.update_one(
        {"_id": factura_oid},
        {"$set": {f"vales.{vale_index}": vale_actualizado}}
    )
    
    # Recalcular total
    await recalcular_total_factura(db, factura_id)
    
    return {"message": "Vale actualizado correctamente"}
```

## Endpoint Auxiliar: Obtener Vales Disponibles

```python
@router.get("/vales-salida/disponibles")
async def obtener_vales_disponibles_para_factura(
    cliente_numero: str,
    db = Depends(get_database)
):
    """
    Obtiene vales de salida disponibles para agregar a una factura.
    
    Filtros:
    - estado = "usado"
    - facturado = False
    - Pertenece al cliente especificado
    """
    
    # Query optimizada
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
    }
    
    # Ejecutar query
    cursor = db.vales_salida.find(query, projection)
    vales = await cursor.to_list(length=None)
    
    # Convertir ObjectId a string
    for vale in vales:
        vale["id"] = str(vale["_id"])
        del vale["_id"]
    
    return vales
```

## Ejemplo de Uso Completo

```python
# 1. Crear factura
factura_data = {
    "numero_factura": "F-2024-001",
    "tipo": "instaladora",
    "cliente_id": "12345"
}

response = await client.post("/api/facturas", json=factura_data)
factura_id = response.json()["id"]

# 2. Obtener vales disponibles
response = await client.get(
    "/api/facturas/vales-salida/disponibles",
    params={"cliente_numero": "12345"}
)
vales_disponibles = response.json()

# 3. Agregar vale de salida a factura
vale_salida = vales_disponibles[0]
vale_data = {
    "id": vale_salida["id"],  # ← ID del vale de salida
    "fecha": vale_salida["fecha_creacion"],
    "items": [
        {
            "material_id": m["material_id"],
            "codigo": m["material_codigo"],
            "descripcion": m["material_descripcion"],
            "precio": m["material"]["precio"],
            "cantidad": m["cantidad"]
        }
        for m in vale_salida["materiales"]
    ]
}

response = await client.post(
    f"/api/facturas/{factura_id}/vales",
    json=vale_data
)

# 4. Verificar que el vale de salida fue marcado
response = await client.get(f"/api/vales-salida/{vale_salida['id']}")
vale_actualizado = response.json()
assert vale_actualizado["facturado"] == True

# 5. Eliminar vale de factura
response = await client.delete(
    f"/api/facturas/{factura_id}/vales/{vale_interno_id}"
)

# 6. Verificar que el vale de salida fue desmarcado
response = await client.get(f"/api/vales-salida/{vale_salida['id']}")
vale_actualizado = response.json()
assert vale_actualizado["facturado"] == False
```

## Índices Recomendados

```python
# Índice para búsqueda de vales disponibles
await db.vales_salida.create_index([
    ("estado", 1),
    ("facturado", 1),
    ("solicitud_material.cliente.numero", 1)
])

await db.vales_salida.create_index([
    ("estado", 1),
    ("facturado", 1),
    ("solicitud_venta.cliente_venta.numero", 1)
])

# Índice para búsqueda de facturas por cliente
await db.facturas.create_index([
    ("cliente_id", 1),
    ("fecha_creacion", -1)
])
```

## Resumen

1. ✅ Campo `id_vale_salida: Optional[str]` en modelo Vale
2. ✅ Detectar vale de salida por presencia de `id` en vale_data
3. ✅ Validar y marcar `facturado = true`
4. ✅ Guardar referencia en `id_vale_salida`
5. ✅ Desmarcar al eliminar vale
6. ✅ Endpoint auxiliar para obtener vales disponibles
