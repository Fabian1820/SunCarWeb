# Resumen: Vales de Salida en Facturas

## Problema a Resolver

Cuando se agregan vales de salida a una factura (ya sea al crearla o después), el backend debe:

1. **Recibir el ID del vale de salida** en el campo `id` del vale
2. **Marcar el vale como facturado** (`facturado = true`)

Esto aplica en dos escenarios:
- **Crear factura nueva** con vales de salida seleccionados
- **Agregar vale** a una factura existente

## Datos Enviados por el Frontend

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
  "items": [...]
}
```

## Lógica Requerida en el Backend

### Para Crear Factura (POST /api/facturas)

```python
@router.post("/")
async def crear_factura(factura_data: dict):
    vales_procesados = []
    
    for vale_data in factura_data.get("vales", []):
        vale_salida_id = vale_data.get("id")
        
        if vale_salida_id:
            # Validar y procesar vale de salida
            vale_salida = await db.vales_salida.find_one({"id": vale_salida_id})
            
            if not vale_salida:
                raise HTTPException(404, "Vale de salida no encontrado")
            
            if vale_salida.get("facturado") == True:
                raise HTTPException(400, "Este vale ya fue agregado a otra factura")
            
            if vale_salida.get("estado") == "anulado":
                raise HTTPException(400, "No se puede agregar un vale anulado")
            
            # Validar cliente...
            
            # ✅ MARCAR COMO FACTURADO
            await db.vales_salida.update_one(
                {"id": vale_salida_id},
                {"$set": {"facturado": True}}
            )
            
            # Crear vale con referencia
            vale_procesado = {
                "id": generar_id_unico(),
                "id_vale_salida": vale_salida_id,  # ← Guardar referencia
                "fecha": vale_data.get("fecha"),
                "items": vale_data.get("items", [])
            }
        else:
            # Vale manual
            vale_procesado = {
                "id": generar_id_unico(),
                "id_vale_salida": None,
                "fecha": vale_data.get("fecha"),
                "items": vale_data.get("items", [])
            }
        
        vales_procesados.append(vale_procesado)
    
    # Crear factura con vales procesados
    nueva_factura = {
        "numero_factura": factura_data.get("numero_factura"),
        "vales": vales_procesados,
        # ... otros campos
    }
    
    await db.facturas.insert_one(nueva_factura)
    return {"message": "Factura creada correctamente"}
```

### Para Agregar Vale (POST /api/facturas/{factura_id}/vales)

```python
@router.post("/{factura_id}/vales")
async def agregar_vale_a_factura(factura_id: str, vale_data: dict):
    vale_salida_id = vale_data.get("id")
    
    if vale_salida_id:
        # 1. Validar que el vale de salida existe
        vale_salida = await db.vales_salida.find_one({"id": vale_salida_id})
        if not vale_salida:
            raise HTTPException(404, "Vale de salida no encontrado")
        
        # 2. Validar que no esté ya facturado
        if vale_salida.get("facturado") == True:
            raise HTTPException(400, "Este vale ya fue agregado a otra factura")
        
        # 3. Validar que no esté anulado
        if vale_salida.get("estado") == "anulado":
            raise HTTPException(400, "No se puede agregar un vale anulado")
        
        # 4. Validar que pertenezca al cliente de la factura
        factura = await db.facturas.find_one({"id": factura_id})
        solicitud = vale_salida.get("solicitud_material") or vale_salida.get("solicitud_venta")
        cliente_vale = solicitud.get("cliente") or solicitud.get("cliente_venta")
        
        if cliente_vale.get("numero") != factura.get("cliente_id"):
            raise HTTPException(400, "El vale no pertenece al cliente de la factura")
        
        # 5. ✅ MARCAR EL VALE DE SALIDA COMO FACTURADO
        await db.vales_salida.update_one(
            {"id": vale_salida_id},
            {"$set": {"facturado": True}}
        )
        
        # 6. Agregar el vale a la factura con referencia
        nuevo_vale = {
            "id": generar_id_unico(),
            "id_vale_salida": vale_salida_id,  # ← Campo Optional[str] en el modelo
            "fecha": vale_data.get("fecha"),
            "items": vale_data.get("items", [])
        }
        
        await db.facturas.update_one(
            {"id": factura_id},
            {"$push": {"vales": nuevo_vale}}
        )
    else:
        # Vale manual (sin vale de salida asociado)
        nuevo_vale = {
            "id": generar_id_unico(),
            "id_vale_salida": None,  # ← Campo Optional[str] = None
            "fecha": vale_data.get("fecha"),
            "items": vale_data.get("items", [])
        }
        
        await db.facturas.update_one(
            {"id": factura_id},
            {"$push": {"vales": nuevo_vale}}
        )
    
    # Recalcular total de la factura
    await recalcular_total_factura(factura_id)
    
    return {"message": "Vale agregado correctamente"}
```

## Al Eliminar un Vale

```python
@router.delete("/{factura_id}/vales/{vale_id}")
async def eliminar_vale_de_factura(factura_id: str, vale_id: str):
    # Obtener el vale de la factura
    factura = await db.facturas.find_one({"id": factura_id})
    vale = next((v for v in factura.get("vales", []) if v["id"] == vale_id), None)
    
    # Si proviene de un vale de salida, desmarcarlo
    if vale and vale.get("id_vale_salida"):
        await db.vales_salida.update_one(
            {"id": vale["id_vale_salida"]},
            {"$set": {"facturado": False}}  # ← Desmarcar
        )
    
    # Eliminar el vale de la factura
    await db.facturas.update_one(
        {"id": factura_id},
        {"$pull": {"vales": {"id": vale_id}}}
    )
    
    await recalcular_total_factura(factura_id)
    
    return {"message": "Vale eliminado correctamente"}
```

## Estructura de Datos Resultante

### Factura con Vale de Salida

```json
{
  "id": "factura_123",
  "numero_factura": "F-2024-001",
  "cliente_id": "12345",
  "vales": [
    {
      "id": "vale_interno_1",
      "id_vale_salida": "vale_salida_abc123",  // ← Campo Optional[str]
      "fecha": "2024-03-17T10:30:00Z",
      "items": [...]
    }
  ]
}
```

### Vale de Salida Marcado

```json
{
  "id": "vale_salida_abc123",
  "codigo": "VS-2024-001",
  "estado": "usado",
  "facturado": true,  // ← Marcado como facturado
  "materiales": [...]
}
```

## Checklist de Implementación

- [ ] Detectar si `vale_data.id` existe (indica vale de salida)
- [ ] Validar que el vale de salida existe
- [ ] Validar que `facturado == false`
- [ ] Validar que `estado != "anulado"`
- [ ] Validar que pertenece al cliente de la factura
- [ ] Actualizar `facturado = true` en el vale de salida
- [ ] Guardar `id_vale_salida` (Optional[str]) en el vale de la factura
- [ ] Al eliminar vale, desmarcar `facturado = false` si tiene `id_vale_salida`

## Modelo de Datos

```python
class Vale(BaseModel):
    id: str
    id_vale_salida: Optional[str] = None  # ← Campo agregado
    fecha: str
    items: List[ItemVale]
```

## Documentación Completa

Ver `docs/BACKEND_VALES_SALIDA_EN_FACTURAS.md` para:
- Validaciones detalladas
- Casos de error
- Tests unitarios
- Ejemplos completos
