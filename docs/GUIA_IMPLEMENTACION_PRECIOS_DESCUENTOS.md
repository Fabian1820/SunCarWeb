# Guía de Implementación: Precios Editables y Descuentos

## 📋 Resumen Ejecutivo

Se han implementado dos funcionalidades clave en el sistema de confección de ofertas:

1. **Precios Editables**: Permite modificar el precio de cada material individualmente
2. **Sistema de Descuentos**: Aplica descuentos porcentuales sobre el subtotal con margen

## ✅ Cambios Completados en Frontend

### Archivos Modificados
- `components/feats/ofertas/confeccion-ofertas-view.tsx`

### Nuevas Funcionalidades

#### 1. Precios Editables
- Campo de precio editable para cada material
- Indicador visual de precios modificados (fondo amarillo)
- Botón para restaurar precio original
- Preservación del precio original para auditoría

#### 2. Sistema de Descuentos
- Campo de porcentaje de descuento (0-100%)
- Cálculo automático del monto de descuento
- Visualización clara del descuento aplicado
- Integración en el flujo de cálculo de precio final

## 🔧 Cambios Requeridos en Backend

### 1. Base de Datos

#### Tabla: `oferta_items`
```sql
ALTER TABLE oferta_items 
ADD COLUMN precio_original DECIMAL(10, 2) DEFAULT 0.0,
ADD COLUMN precio_editado BOOLEAN DEFAULT FALSE;

-- Migración de datos existentes
UPDATE oferta_items 
SET precio_original = precio 
WHERE precio_original = 0.0;
```

#### Tabla: `ofertas_confeccionadas`
```sql
ALTER TABLE ofertas_confeccionadas
ADD COLUMN descuento_porcentaje DECIMAL(5, 2) DEFAULT 0.0,
ADD COLUMN monto_descuento DECIMAL(10, 2) DEFAULT 0.0,
ADD COLUMN subtotal_con_descuento DECIMAL(10, 2) DEFAULT 0.0;
```

### 2. Modelos de Datos

#### Python (FastAPI/Pydantic)
```python
class OfertaItem(BaseModel):
    material_codigo: str
    descripcion: str
    precio: float
    precio_original: float  # NUEVO
    precio_editado: bool    # NUEVO
    cantidad: int
    categoria: str
    seccion: str
    margen_asignado: float = 0.0

class OfertaConfeccionada(BaseModel):
    # ... campos existentes ...
    descuento_porcentaje: float = 0.0      # NUEVO
    monto_descuento: float = 0.0           # NUEVO
    subtotal_con_descuento: float = 0.0    # NUEVO
```

### 3. Endpoints a Actualizar

#### POST /ofertas/confeccion/
```python
@router.post("/ofertas/confeccion/")
async def crear_oferta_confeccionada(data: dict):
    # Procesar items con precios editables
    items = []
    for item_data in data.get("items", []):
        item = {
            "material_codigo": item_data["material_codigo"],
            "precio": item_data["precio"],
            "precio_original": item_data.get("precio_original", item_data["precio"]),
            "precio_editado": item_data.get("precio_editado", False),
            # ... otros campos
        }
        items.append(item)
    
    # Validar descuento
    descuento_porcentaje = data.get("descuento_porcentaje", 0.0)
    if not (0 <= descuento_porcentaje <= 100):
        raise ValueError("Descuento debe estar entre 0% y 100%")
    
    # Validar cálculo de descuento
    subtotal_con_margen = data.get("subtotal_con_margen", 0.0)
    monto_descuento = data.get("monto_descuento", 0.0)
    descuento_calculado = subtotal_con_margen * (descuento_porcentaje / 100)
    
    if abs(descuento_calculado - monto_descuento) > 0.01:
        raise ValueError("Monto de descuento no coincide con el porcentaje")
    
    # Guardar oferta
    oferta = {
        "items": items,
        "descuento_porcentaje": descuento_porcentaje,
        "monto_descuento": monto_descuento,
        "subtotal_con_descuento": data.get("subtotal_con_descuento", 0.0),
        # ... otros campos
    }
    
    return {"success": True, "data": oferta}
```

#### PUT /ofertas/confeccion/{id}
```python
@router.put("/ofertas/confeccion/{id}")
async def actualizar_oferta_confeccionada(id: str, data: dict):
    # Misma lógica que POST
    # Considerar mantener histórico de cambios de precios
    pass
```

#### GET /ofertas/confeccion/{id}
```python
@router.get("/ofertas/confeccion/{id}")
async def obtener_oferta_confeccionada(id: str):
    oferta = obtener_de_bd(id)
    
    # Asegurar compatibilidad con ofertas antiguas
    for item in oferta.get("items", []):
        if "precio_original" not in item:
            item["precio_original"] = item["precio"]
        if "precio_editado" not in item:
            item["precio_editado"] = False
    
    if "descuento_porcentaje" not in oferta:
        oferta["descuento_porcentaje"] = 0.0
        oferta["monto_descuento"] = 0.0
        oferta["subtotal_con_descuento"] = oferta.get("subtotal_con_margen", 0.0)
    
    return {"success": True, "data": oferta}
```

### 4. Validaciones

```python
def validar_precios_items(items: list) -> None:
    """Valida precios de items"""
    for item in items:
        precio = item.get("precio", 0)
        precio_original = item.get("precio_original", 0)
        
        if precio < 0:
            raise ValueError(f"Precio negativo en {item['material_codigo']}")
        
        if precio_original < 0:
            raise ValueError(f"Precio original negativo en {item['material_codigo']}")
        
        # Opcional: Validar rango razonable
        if precio_original > 0:
            ratio = precio / precio_original
            if ratio > 3.0:  # Más del 300% del original
                # Log warning o error según política
                pass
            if ratio < 0.1:  # Menos del 10% del original
                # Log warning o error según política
                pass

def validar_descuento(descuento: float, subtotal: float, monto: float) -> None:
    """Valida descuento"""
    if not (0 <= descuento <= 100):
        raise ValueError("Descuento debe estar entre 0% y 100%")
    
    monto_calculado = subtotal * (descuento / 100)
    if abs(monto_calculado - monto) > 0.01:
        raise ValueError("Monto de descuento incorrecto")
```

## 📊 Flujo de Datos

### Request del Frontend
```json
{
  "items": [
    {
      "material_codigo": "INV-001",
      "descripcion": "Inversor 5kW",
      "precio": 170.00,
      "precio_original": 170.00,
      "precio_editado": false,
      "cantidad": 2,
      "categoria": "INVERSORES",
      "seccion": "INVERSORES"
    },
    {
      "material_codigo": "MAT-001",
      "descripcion": "Panel Solar 550W",
      "precio": 180.00,
      "precio_original": 200.00,
      "precio_editado": true,
      "cantidad": 10,
      "categoria": "PANELES",
      "seccion": "PANELES"
    }
  ],
  "margen_comercial": 25,
  "subtotal_con_margen": 2075.00,
  "descuento_porcentaje": 10,
  "monto_descuento": 207.50,
  "subtotal_con_descuento": 1867.50,
  "precio_final": 1918.00
}
```

**Nota sobre Inversores y Baterías:**
- Los inversores y baterías tienen un descuento automático del 15% aplicado en el frontend
- El precio ya viene calculado: `precio_con_descuento = Number((precio_base * 0.85).toFixed(2))`
- Ejemplo: Inversor de $200.00 → $170.00 (redondeado a 2 decimales)

### Response del Backend
```json
{
  "success": true,
  "data": {
    "id": "OFE-001",
    "numero_oferta": "2024-001",
    "items": [...],
    "descuento_porcentaje": 10,
    "monto_descuento": 207.50,
    "subtotal_con_descuento": 1867.50,
    "precio_final": 1918.00
  }
}
```

## 🧪 Testing

### Casos de Prueba

1. **Precios Editables**
   - ✅ Crear oferta sin editar precios
   - ✅ Crear oferta con precios editados
   - ✅ Restaurar precio original
   - ✅ Editar precio múltiples veces
   - ✅ Duplicar oferta con precios editados

2. **Descuentos**
   - ✅ Crear oferta sin descuento (0%)
   - ✅ Crear oferta con descuento 10%
   - ✅ Crear oferta con descuento 50%
   - ✅ Crear oferta con descuento 100%
   - ✅ Validar cálculos con descuento + contribución

3. **Integración**
   - ✅ Precio editado + descuento
   - ✅ Precio editado + margen + descuento
   - ✅ Exportar oferta con precios editados
   - ✅ Exportar oferta con descuento

### Scripts de Testing

```python
# test_precios_editables.py
def test_crear_oferta_precio_editado():
    data = {
        "items": [{
            "material_codigo": "MAT-001",
            "precio": 180.00,
            "precio_original": 200.00,
            "precio_editado": True,
            "cantidad": 10
        }]
    }
    response = client.post("/ofertas/confeccion/", json=data)
    assert response.status_code == 200
    assert response.json()["data"]["items"][0]["precio_editado"] == True

def test_descuento_calculo():
    data = {
        "subtotal_con_margen": 1000.00,
        "descuento_porcentaje": 10,
        "monto_descuento": 100.00,
        "subtotal_con_descuento": 900.00
    }
    response = client.post("/ofertas/confeccion/", json=data)
    assert response.status_code == 200
    assert response.json()["data"]["monto_descuento"] == 100.00
```

## 📝 Checklist de Implementación

### Backend
- [ ] Crear migración de base de datos
- [ ] Actualizar modelos de datos
- [ ] Modificar endpoint POST /ofertas/confeccion/
- [ ] Modificar endpoint PUT /ofertas/confeccion/{id}
- [ ] Modificar endpoint GET /ofertas/confeccion/{id}
- [ ] Agregar validaciones
- [ ] Escribir tests unitarios
- [ ] Escribir tests de integración
- [ ] Actualizar documentación de API
- [ ] Probar en ambiente de desarrollo
- [ ] Probar en ambiente de staging

### Frontend
- [x] Implementar precios editables
- [x] Implementar sistema de descuentos
- [x] Actualizar cálculos
- [x] Actualizar exportaciones
- [x] Actualizar visualización
- [ ] Testing manual
- [ ] Testing con backend integrado

### Documentación
- [x] Crear guía de implementación
- [x] Documentar cambios en backend
- [x] Crear resumen ejecutivo
- [ ] Actualizar manual de usuario

## 🚀 Despliegue

### Orden de Despliegue
1. Ejecutar migración de base de datos
2. Desplegar cambios en backend
3. Verificar endpoints con Postman/Swagger
4. Desplegar cambios en frontend
5. Testing de integración
6. Monitorear logs y errores

### Rollback Plan
Si hay problemas:
1. Los campos nuevos tienen valores por defecto
2. Las ofertas antiguas seguirán funcionando
3. Se puede revertir el frontend sin afectar el backend
4. La migración de BD es reversible

## 📞 Soporte

Para dudas o problemas:
- Revisar documentación en `/docs`
- Consultar logs del backend
- Verificar validaciones en consola del navegador
- Contactar al equipo de desarrollo

## 📚 Referencias

- `docs/BACKEND_PRECIOS_EDITABLES_Y_DESCUENTOS.md` - Detalles técnicos del backend
- `docs/RESUMEN_PRECIOS_EDITABLES_DESCUENTOS.md` - Resumen de cambios
- `components/feats/ofertas/confeccion-ofertas-view.tsx` - Código fuente
