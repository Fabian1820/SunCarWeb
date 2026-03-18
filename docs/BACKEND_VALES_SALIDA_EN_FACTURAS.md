# Backend: Vales de Salida en Facturas - Implementación Requerida

## Descripción General

Cuando se agrega un vale de salida a una factura de instaladora, el backend debe:

1. **Recibir el ID del vale de salida** en el campo `id` del vale
2. **Marcar el vale de salida como facturado** (`facturado = true`)
3. **Guardar la referencia** del vale de salida en la factura

## Endpoint Afectado

### 1. Crear Factura con Vales de Salida

```
POST /api/facturas
```

Cuando se crea una factura con vales que tienen campo `id`, el backend debe procesarlos como vales de salida.

### 2. Agregar Vale a Factura Existente

```
POST /api/facturas/{factura_id}/vales
```

Cuando se agrega un vale con campo `id` a una factura existente, el backend debe procesarlo como vale de salida.

## Estructura de Datos Recibida

### Caso 1: Crear Factura con Vales de Salida

```json
POST /api/facturas

{
  "numero_factura": "F-2024-001",
  "tipo": "instaladora",
  "subtipo": "cliente",
  "cliente_id": "12345",
  "vales": [
    {
      "id": "vale_salida_abc123",  // ← ID del vale de salida
      "fecha": "2024-03-17T10:30:00Z",
      "items": [
        {
          "material_id": "mat_123",
          "codigo": "INV-001",
          "descripcion": "Inversor 10kW Growatt",
          "precio": 1500.00,
          "cantidad": 1
        }
      ]
    },
    {
      "id": "vale_salida_def456",  // ← Otro vale de salida
      "fecha": "2024-03-18T14:00:00Z",
      "items": [...]
    }
  ]
}
```

### Caso 2: Agregar Vale a Factura Existente

```json
POST /api/facturas/{factura_id}/vales

{
  "id": "vale_salida_abc123",  // ← ID del vale de salida
  "fecha": "2024-03-17T10:30:00Z",
  "items": [
    {
      "material_id": "mat_123",
      "codigo": "INV-001",
      "descripcion": "Inversor 10kW Growatt",
      "precio": 1500.00,
      "cantidad": 1
    }
  ]
}
```

**IMPORTANTE**: El campo `id` contiene el ID del vale de salida original, NO es un ID generado por el frontend.

**BACKEND**: El backend debe guardar este ID en el campo `id_vale_salida` (Optional[str]) del vale dentro de la factura.

## Lógica Requerida en el Backend

### 1. Endpoint: Crear Factura

```python
@router.post("/")
async def crear_factura(
    factura_data: dict
):
    """
    Crea una nueva factura.
    
    Si la factura contiene vales con campo 'id', se procesan como vales de salida.
    """
    
    # Procesar cada vale en la factura
    vales_procesados = []
    
    for vale_data in factura_data.get("vales", []):
        vale_salida_id = vale_data.get("id")
        
        if vale_salida_id:
            # Este vale proviene de un vale de salida
            vale_procesado = await procesar_vale_desde_vale_salida(
                db, factura_data, vale_salida_id, vale_data
            )
        else:
            # Este es un vale manual
            vale_procesado = await procesar_vale_manual(vale_data)
        
        vales_procesados.append(vale_procesado)
    
    # Crear la factura con los vales procesados
    nueva_factura = {
        "numero_factura": factura_data.get("numero_factura"),
        "tipo": factura_data.get("tipo"),
        "subtipo": factura_data.get("subtipo"),
        "cliente_id": factura_data.get("cliente_id"),
        "vales": vales_procesados,
        "pagada": factura_data.get("pagada", False),
        "terminada": factura_data.get("terminada", False),
        "fecha_creacion": datetime.now(),
        "total": 0.0
    }
    
    # Insertar en base de datos
    result = await db.facturas.insert_one(nueva_factura)
    factura_id = str(result.inserted_id)
    
    # Recalcular total
    await recalcular_total_factura(db, factura_id)
    
    return {"message": "Factura creada correctamente", "id": factura_id}
```

**NOTA**: El frontend envía el ID del vale de salida en el campo `id` del vale. El backend debe guardarlo en el campo `id_vale_salida` (Optional[str]) del modelo de vale en la factura.

### 2. Endpoint: Agregar Vale a Factura Existente

```python
@router.post("/{factura_id}/vales")
async def agregar_vale_a_factura(
    factura_id: str,
    vale_data: dict
):
    # Verificar si el vale tiene un ID (indica que proviene de un vale de salida)
    vale_salida_id = vale_data.get("id")
    
    if vale_salida_id:
        # Este vale proviene de un vale de salida
        await procesar_vale_desde_vale_salida(factura_id, vale_salida_id, vale_data)
    else:
        # Este es un vale manual (creado desde cero)
        await procesar_vale_manual(factura_id, vale_data)
    
    return {"message": "Vale agregado correctamente"}
```

**NOTA**: El frontend envía el ID del vale de salida en el campo `id` del vale. El backend debe guardarlo en el campo `id_vale_salida` (Optional[str]) del modelo de vale en la factura.

### 2. Procesar Vale desde Vale de Salida

```python
async def procesar_vale_desde_vale_salida(
    factura_id: str,
    vale_salida_id: str,
    vale_data: dict
):
    """
    Procesa un vale que proviene de un vale de salida.
    
    Pasos:
    1. Validar que el vale de salida existe
    2. Validar que no esté ya facturado
    3. Validar que pertenezca al cliente de la factura
    4. Marcar el vale de salida como facturado
    5. Agregar el vale a la factura con referencia al vale de salida
    """
    
    # 1. Obtener el vale de salida
    vale_salida = await db.vales_salida.find_one({"id": vale_salida_id})
    
    if not vale_salida:
        raise HTTPException(
            status_code=404,
            detail=f"Vale de salida {vale_salida_id} no encontrado"
        )
    
    # 2. Validar que no esté ya facturado
    if vale_salida.get("facturado") == True:
        raise HTTPException(
            status_code=400,
            detail="Este vale de salida ya fue agregado a otra factura"
        )
    
    # 3. Validar que no esté anulado
    if vale_salida.get("estado") == "anulado":
        raise HTTPException(
            status_code=400,
            detail="No se puede agregar un vale de salida anulado"
        )
    
    # 4. Obtener la factura
    factura = await db.facturas.find_one({"id": factura_id})
    
    if not factura:
        raise HTTPException(
            status_code=404,
            detail=f"Factura {factura_id} no encontrada"
        )
    
    # 5. Validar que el vale pertenezca al cliente de la factura
    solicitud = vale_salida.get("solicitud_material") or vale_salida.get("solicitud_venta")
    
    if solicitud:
        cliente_vale = solicitud.get("cliente") or solicitud.get("cliente_venta")
        cliente_numero_vale = cliente_vale.get("numero") if cliente_vale else None
        
        if cliente_numero_vale != factura.get("cliente_id"):
            raise HTTPException(
                status_code=400,
                detail="El vale de salida no pertenece al cliente de la factura"
            )
    
    # 6. Marcar el vale de salida como facturado
    await db.vales_salida.update_one(
        {"id": vale_salida_id},
        {"$set": {"facturado": True}}
    )
    
    # 7. Agregar el vale a la factura con referencia al vale de salida
    nuevo_vale = {
        "id": generar_id_unico(),  # ID interno del vale en la factura
        "id_vale_salida": vale_salida_id,  # ← Campo Optional[str] en el modelo
        "fecha": vale_data.get("fecha"),
        "items": vale_data.get("items", [])
    }
    
    await db.facturas.update_one(
        {"id": factura_id},
        {"$push": {"vales": nuevo_vale}}
    )
    
    # 8. Recalcular el total de la factura
    await recalcular_total_factura(factura_id)
```

### 3. Procesar Vale Manual

```python
async def procesar_vale_manual(factura_id: str, vale_data: dict):
    """
    Procesa un vale creado manualmente (sin vale de salida asociado).
    """
    
    # Validar que la factura existe
    factura = await db.facturas.find_one({"id": factura_id})
    
    if not factura:
        raise HTTPException(
            status_code=404,
            detail=f"Factura {factura_id} no encontrada"
        )
    
    # Crear el vale sin referencia a vale de salida
    nuevo_vale = {
        "id": generar_id_unico(),
        "id_vale_salida": None,  # ← Campo Optional[str] = None para vales manuales
        "fecha": vale_data.get("fecha"),
        "items": vale_data.get("items", [])
    }
    
    await db.facturas.update_one(
        {"id": factura_id},
        {"$push": {"vales": nuevo_vale}}
    )
    
    # Recalcular el total de la factura
    await recalcular_total_factura(factura_id)
```

## Estructura de Datos en la Base de Datos

### Factura con Vales

```json
{
  "id": "factura_123",
  "numero_factura": "F-2024-001",
  "tipo": "instaladora",
  "cliente_id": "12345",
  "vales": [
    {
      "id": "vale_interno_1",
      "id_vale_salida": "vale_salida_abc123",  // ← Campo Optional[str] con referencia
      "fecha": "2024-03-17T10:30:00Z",
      "items": [
        {
          "material_id": "mat_123",
          "codigo": "INV-001",
          "descripcion": "Inversor 10kW Growatt",
          "precio": 1500.00,
          "cantidad": 1
        }
      ]
    },
    {
      "id": "vale_interno_2",
      "id_vale_salida": null,  // ← Vale manual (sin vale de salida)
      "fecha": "2024-03-18T14:00:00Z",
      "items": [
        {
          "material_id": "mat_456",
          "codigo": "PAN-590",
          "descripcion": "Panel Solar 590W",
          "precio": 180.00,
          "cantidad": 20
        }
      ]
    }
  ],
  "total": 6900.00
}
```

### Vale de Salida Marcado como Facturado

```json
{
  "id": "vale_salida_abc123",
  "codigo": "VS-2024-001",
  "estado": "usado",
  "facturado": true,  // ← Marcado como facturado
  "fecha_creacion": "2024-03-17T10:30:00Z",
  "materiales": [
    {
      "material_id": "mat_123",
      "cantidad": 1,
      "codigo": "INV-001",
      "descripcion": "Inversor 10kW Growatt"
    }
  ]
}
```

## Endpoint para Eliminar Vale de Factura

Cuando se elimina un vale de una factura, si tiene `id_vale_salida`, debe desmarcarse el vale de salida:

```python
@router.delete("/{factura_id}/vales/{vale_id}")
async def eliminar_vale_de_factura(
    factura_id: str,
    vale_id: str
):
    # Obtener la factura
    factura = await db.facturas.find_one({"id": factura_id})
    
    if not factura:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    # Buscar el vale en la factura
    vale = next((v for v in factura.get("vales", []) if v["id"] == vale_id), None)
    
    if not vale:
        raise HTTPException(status_code=404, detail="Vale no encontrado en la factura")
    
    # Si el vale tiene id_vale_salida, desmarcar el vale de salida
    if vale.get("id_vale_salida"):
        await db.vales_salida.update_one(
            {"id": vale["id_vale_salida"]},
            {"$set": {"facturado": False}}
        )
    
    # Eliminar el vale de la factura
    await db.facturas.update_one(
        {"id": factura_id},
        {"$pull": {"vales": {"id": vale_id}}}
    )
    
    # Recalcular el total de la factura
    await recalcular_total_factura(factura_id)
    
    return {"message": "Vale eliminado correctamente"}
```

## Validaciones Importantes

### 1. Evitar Duplicados

```python
# Verificar que el vale de salida no esté ya en la factura
vales_existentes = factura.get("vales", [])
vale_ya_existe = any(
    v.get("id_vale_salida") == vale_salida_id 
    for v in vales_existentes
)

if vale_ya_existe:
    raise HTTPException(
        status_code=400,
        detail="Este vale de salida ya está agregado a esta factura"
    )
```

### 2. Verificar Estado de la Solicitud

```python
# Verificar que la solicitud esté en estado "facturado"
solicitud = vale_salida.get("solicitud_material") or vale_salida.get("solicitud_venta")

if solicitud:
    estado_solicitud = solicitud.get("estado")
    if estado_solicitud != "facturado":
        raise HTTPException(
            status_code=400,
            detail=f"La solicitud debe estar en estado 'facturado', actualmente está en '{estado_solicitud}'"
        )
```

### 3. Validar Permisos

```python
# Verificar que el usuario tenga permisos para modificar la factura
if not usuario_tiene_permiso(usuario_actual, "facturas", "write"):
    raise HTTPException(
        status_code=403,
        detail="No tiene permisos para modificar facturas"
    )
```

## Flujo Completo

```
1. Frontend envía vale con ID del vale de salida
   ↓
2. Backend recibe POST /api/facturas/{id}/vales
   ↓
3. Backend detecta que vale.id existe (es un vale de salida)
   ↓
4. Backend valida:
   - Vale de salida existe
   - No está ya facturado
   - No está anulado
   - Pertenece al cliente de la factura
   - Solicitud está en estado "facturado"
   ↓
5. Backend marca vale_salida.facturado = true
   ↓
6. Backend agrega vale a factura con vale_salida_id
   ↓
7. Backend recalcula total de factura
   ↓
8. Backend retorna éxito
   ↓
9. Frontend recarga facturas y muestra el vale agregado
```

## Respuestas del Endpoint

### Éxito

```json
{
  "message": "Vale agregado correctamente"
}
```

### Errores

```json
// Vale de salida no encontrado
{
  "detail": "Vale de salida vale_abc123 no encontrado"
}

// Vale ya facturado
{
  "detail": "Este vale de salida ya fue agregado a otra factura"
}

// Vale anulado
{
  "detail": "No se puede agregar un vale de salida anulado"
}

// Cliente no coincide
{
  "detail": "El vale de salida no pertenece al cliente de la factura"
}

// Solicitud no facturada
{
  "detail": "La solicitud debe estar en estado 'facturado', actualmente está en 'pendiente'"
}
```

## Testing

### Test 1: Agregar Vale de Salida a Factura

```python
def test_agregar_vale_salida_a_factura():
    # Crear vale de salida
    vale_salida = crear_vale_salida(
        cliente_numero="12345",
        estado="usado",
        facturado=False
    )
    
    # Crear factura
    factura = crear_factura(cliente_id="12345")
    
    # Agregar vale a factura
    response = client.post(
        f"/api/facturas/{factura.id}/vales",
        json={
            "id": vale_salida.id,
            "fecha": "2024-03-17T10:30:00Z",
            "items": [...]
        }
    )
    
    assert response.status_code == 200
    
    # Verificar que el vale de salida fue marcado como facturado
    vale_actualizado = obtener_vale_salida(vale_salida.id)
    assert vale_actualizado.facturado == True
    
    # Verificar que el vale está en la factura
    factura_actualizada = obtener_factura(factura.id)
    assert len(factura_actualizada.vales) == 1
    assert factura_actualizada.vales[0].id_vale_salida == vale_salida.id
```

### Test 2: Evitar Duplicados

```python
def test_no_agregar_vale_ya_facturado():
    # Crear vale de salida ya facturado
    vale_salida = crear_vale_salida(
        cliente_numero="12345",
        estado="usado",
        facturado=True
    )
    
    # Crear factura
    factura = crear_factura(cliente_id="12345")
    
    # Intentar agregar vale a factura
    response = client.post(
        f"/api/facturas/{factura.id}/vales",
        json={
            "id": vale_salida.id,
            "fecha": "2024-03-17T10:30:00Z",
            "items": [...]
        }
    )
    
    assert response.status_code == 400
    assert "ya fue agregado" in response.json()["detail"]
```

### Test 3: Validar Cliente

```python
def test_validar_cliente_del_vale():
    # Crear vale de salida para cliente A
    vale_salida = crear_vale_salida(
        cliente_numero="12345",
        estado="usado",
        facturado=False
    )
    
    # Crear factura para cliente B
    factura = crear_factura(cliente_id="67890")
    
    # Intentar agregar vale a factura
    response = client.post(
        f"/api/facturas/{factura.id}/vales",
        json={
            "id": vale_salida.id,
            "fecha": "2024-03-17T10:30:00Z",
            "items": [...]
        }
    )
    
    assert response.status_code == 400
    assert "no pertenece al cliente" in response.json()["detail"]
```

### Test 4: Eliminar Vale y Desmarcar

```python
def test_eliminar_vale_desmarca_vale_salida():
    # Crear y agregar vale de salida a factura
    vale_salida = crear_vale_salida(facturado=False)
    factura = crear_factura()
    agregar_vale_a_factura(factura.id, vale_salida.id)
    
    # Verificar que está marcado como facturado
    vale_actualizado = obtener_vale_salida(vale_salida.id)
    assert vale_actualizado.facturado == True
    
    # Eliminar vale de la factura
    vale_interno_id = factura.vales[0].id
    response = client.delete(
        f"/api/facturas/{factura.id}/vales/{vale_interno_id}"
    )
    
    assert response.status_code == 200
    
    # Verificar que el vale de salida fue desmarcado
    vale_actualizado = obtener_vale_salida(vale_salida.id)
    assert vale_actualizado.facturado == False
```

## Resumen

1. ✅ El frontend envía el ID del vale de salida en el campo `id` del vale
2. ✅ El backend detecta si el vale proviene de un vale de salida
3. ✅ El backend valida que el vale cumpla todos los requisitos
4. ✅ El backend marca `facturado = true` en el vale de salida
5. ✅ El backend guarda la referencia en el campo `id_vale_salida` (Optional[str]) del vale en la factura
6. ✅ Al eliminar el vale, se desmarca el vale de salida si tiene `id_vale_salida`

Esta implementación asegura la trazabilidad completa y evita que un vale de salida sea facturado múltiples veces.

## Modelo de Datos en el Backend

```python
class Vale(BaseModel):
    id: str
    id_vale_salida: Optional[str] = None  # ← Campo agregado
    fecha: str
    items: List[ItemVale]

class Factura(BaseModel):
    id: str
    numero_factura: str
    tipo: str
    cliente_id: Optional[str] = None
    vales: List[Vale] = []
    total: float = 0.0
```
