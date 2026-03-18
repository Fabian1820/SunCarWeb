# Flujo Completo: Vales de Salida en Facturas

## Resumen Ejecutivo

El sistema permite agregar vales de salida existentes a facturas de instaladora de dos formas:

1. **Al crear una factura nueva**: Seleccionar vales de salida durante la creación
2. **Agregar a factura existente**: Usar la acción "Agregar Vale" en una factura ya creada

En ambos casos:
1. El frontend envía el ID del vale de salida en el campo `id`
2. El backend guarda la referencia en `id_vale_salida` (Optional[str])
3. El backend marca el vale de salida como `facturado = true`
4. Al eliminar el vale, se desmarca automáticamente

## Flujo Paso a Paso

### Opción 1: Crear Factura con Vales de Salida

```
Usuario → "Nueva Factura" → Tipo: Instaladora → Subtipo: Cliente → Seleccionar Cliente
       → Seleccionar vales de salida → "Crear Factura"
```

El frontend:
1. Carga vales disponibles del cliente (estado: "usado", facturado: false)
2. Usuario selecciona uno o más vales
3. Al crear la factura, envía los vales con sus IDs

### Opción 2: Agregar Vale a Factura Existente

```
Usuario → Factura → "Agregar Vale" → "Desde Vales de Salida" → Seleccionar vales
```

El frontend:
1. Carga vales disponibles del cliente
2. Usuario selecciona uno o más vales
3. Envía cada vale con su ID al endpoint de agregar vale

### 1. Frontend Envía Datos (Ambos Casos)

```http
POST /api/facturas/{factura_id}/vales

{
  "id": "65f8a1b2c3d4e5f6g7h8i9j0",  // ← ID del vale de salida
  "fecha": "2024-03-17T10:30:00Z",
  "items": [
    {
      "material_id": "mat_123",
      "codigo": "INV-001",
      "descripcion": "Inversor 10kW",
      "precio": 1500.00,
      "cantidad": 1
    }
  ]
}
```

### 2. Backend Recibe Solicitud

**Opción 1: Crear Factura**
```http
POST /api/facturas

{
  "numero_factura": "F-2024-001",
  "tipo": "instaladora",
  "subtipo": "cliente",
  "cliente_id": "12345",
  "vales": [
    {
      "id": "65f8a1b2c3d4e5f6g7h8i9j0",  // ← ID del vale de salida
      "fecha": "2024-03-17T10:30:00Z",
      "items": [...]
    },
    {
      "id": "65f8a1b2c3d4e5f6g7h8i9j1",  // ← Otro vale de salida
      "fecha": "2024-03-18T14:00:00Z",
      "items": [...]
    }
  ]
}
```

**Opción 2: Agregar Vale a Factura Existente**
```http
POST /api/facturas/{factura_id}/vales

{
  "id": "65f8a1b2c3d4e5f6g7h8i9j0",  // ← ID del vale de salida
  "fecha": "2024-03-17T10:30:00Z",
  "items": [...]
}
```

### 3. Backend Procesa la Solicitud

**Para cada vale con campo `id`**:

```python
vale_salida_id = vale_data.get("id")  # "65f8a1b2c3d4e5f6g7h8i9j0"

if vale_salida_id:
    # Es un vale de salida
    vale_salida = await db.vales_salida.find_one({"_id": ObjectId(vale_salida_id)})
    
    # Validaciones...
    
    # Marcar como facturado
    await db.vales_salida.update_one(
        {"_id": ObjectId(vale_salida_id)},
        {"$set": {"facturado": True}}
    )
```


### 4. Backend Guarda el Vale en la Factura

```python
nuevo_vale = {
    "id": str(ObjectId()),  # Nuevo ID interno
    "id_vale_salida": vale_salida_id,  # ← Referencia al vale de salida
    "fecha": vale_data.get("fecha"),
    "items": vale_data.get("items", [])
}

await db.facturas.update_one(
    {"_id": ObjectId(factura_id)},
    {"$push": {"vales": nuevo_vale}}
)
```

### 5. Estado Final en Base de Datos

**Vale de Salida (marcado como facturado)**:
```json
{
  "_id": ObjectId("65f8a1b2c3d4e5f6g7h8i9j0"),
  "codigo": "VS-2024-001",
  "estado": "usado",
  "facturado": true,  // ← Marcado
  "materiales": [...]
}
```

**Factura (con referencia al vale)**:
```json
{
  "_id": ObjectId("factura_123"),
  "numero_factura": "F-2024-001",
  "vales": [
    {
      "id": "vale_interno_1",
      "id_vale_salida": "65f8a1b2c3d4e5f6g7h8i9j0",  // ← Referencia
      "fecha": "2024-03-17T10:30:00Z",
      "items": [...]
    }
  ]
}
```

## Flujo de Eliminación

### 1. Usuario Elimina Vale de Factura

```
Usuario → Factura → Ver Vales → Eliminar Vale
```

### 2. Frontend Envía Solicitud

```http
DELETE /api/facturas/{factura_id}/vales/{vale_interno_id}
```

### 3. Backend Desmarca el Vale de Salida

```python
# Obtener el vale de la factura
factura = await db.facturas.find_one({"_id": ObjectId(factura_id)})
vale = next((v for v in factura["vales"] if v["id"] == vale_id), None)

# Si tiene referencia a vale de salida, desmarcarlo
if vale and vale.get("id_vale_salida"):
    await db.vales_salida.update_one(
        {"_id": ObjectId(vale["id_vale_salida"])},
        {"$set": {"facturado": False}}  # ← Desmarcar
    )

# Eliminar el vale de la factura
await db.facturas.update_one(
    {"_id": ObjectId(factura_id)},
    {"$pull": {"vales": {"id": vale_id}}}
)
```

## Validaciones Importantes

### 1. Vale Ya Facturado

```python
if vale_salida.get("facturado") == True:
    raise HTTPException(400, "Este vale ya fue agregado a otra factura")
```

### 2. Vale Anulado

```python
if vale_salida.get("estado") == "anulado":
    raise HTTPException(400, "No se puede agregar un vale anulado")
```

### 3. Cliente No Coincide

```python
solicitud = vale_salida.get("solicitud_material") or vale_salida.get("solicitud_venta")
cliente_vale = solicitud.get("cliente") or solicitud.get("cliente_venta")

if cliente_vale.get("numero") != factura.get("cliente_id"):
    raise HTTPException(400, "El vale no pertenece al cliente de la factura")
```

### 4. Vale Duplicado en la Misma Factura

```python
vale_ya_existe = any(
    v.get("id_vale_salida") == vale_salida_id 
    for v in factura.get("vales", [])
)

if vale_ya_existe:
    raise HTTPException(400, "Este vale ya está en esta factura")
```

## Casos de Uso

### Caso 1: Crear Factura con Vales de Salida

```
1. Usuario crea factura para cliente "ABC Corp"
2. Usuario selecciona 2 vales de salida disponibles
3. Usuario hace clic en "Crear Factura"
4. Sistema crea la factura con ambos vales
5. Backend marca ambos vales de salida como facturados
```

### Caso 2: Agregar Vale a Factura Existente

```
1. Usuario abre factura F-2024-001
2. Usuario hace clic en "Agregar Vale"
3. Usuario selecciona "Desde Vales de Salida"
4. Usuario selecciona 1 vale disponible
5. Sistema agrega el vale a la factura
6. Backend marca el vale de salida como facturado
```

### Caso 3: Vale Manual (Sin Vale de Salida)

```
1. Cliente tiene vale de salida VS-2024-001 (usado, no facturado)
2. Usuario crea factura F-2024-001 para el cliente
3. Usuario agrega vale VS-2024-001 a la factura
4. Sistema marca VS-2024-001 como facturado
5. Sistema guarda referencia en la factura
```

### Caso 2: Vale Manual

```
1. Cliente tiene vale de salida VS-2024-001 (usado, no facturado)
2. Usuario crea factura F-2024-002 para el cliente
3. Usuario agrega vale manual (sin seleccionar vale de salida)
4. Sistema guarda vale con id_vale_salida = null
5. No se marca ningún vale de salida
```

### Caso 4: Eliminar Vale de Salida

```
1. Factura F-2024-001 tiene vale VS-2024-001
2. Usuario elimina el vale de la factura
3. Sistema desmarca VS-2024-001 (facturado = false)
4. Vale VS-2024-001 queda disponible para otra factura
```

### Caso 5: Intento de Duplicar

```
1. Vale VS-2024-001 ya está en factura F-2024-001
2. Usuario intenta agregar VS-2024-001 nuevamente
3. Sistema rechaza: "Este vale ya fue agregado a otra factura"
```

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│ AGREGAR VALE DE SALIDA A FACTURA                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Frontend envía vale    │
              │ con id = vale_salida_id│
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Backend detecta id     │
              │ (es vale de salida)    │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Validar vale existe    │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Validar no facturado   │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Validar no anulado     │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Validar cliente        │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Marcar facturado=true  │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Guardar en factura con │
              │ id_vale_salida         │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Recalcular total       │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Retornar éxito         │
              └────────────────────────┘
```

## Puntos Clave

1. ✅ El campo `id_vale_salida` es `Optional[str]` en el modelo de Vale
2. ✅ Solo se llena cuando el vale proviene de un vale de salida
3. ✅ Los vales manuales tienen `id_vale_salida = None`
4. ✅ El campo permite trazabilidad completa
5. ✅ Al eliminar, se desmarca automáticamente el vale de salida
6. ✅ Evita duplicados y facturación múltiple

## Referencias

- `docs/BACKEND_VALES_SALIDA_EN_FACTURAS.md` - Documentación completa
- `docs/RESUMEN_VALES_SALIDA_FACTURAS.md` - Resumen ejecutivo
- `docs/VALES_SALIDA_EN_FACTURAS.md` - Integración frontend
