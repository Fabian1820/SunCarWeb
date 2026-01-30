# Backend: Precios Editables y Sistema de Descuentos

## Resumen de Cambios

Se han implementado dos nuevas funcionalidades en el frontend de confección de ofertas:

1. **Precios Editables**: Los usuarios pueden modificar el precio de cada material individualmente
2. **Sistema de Descuentos**: Se aplica un descuento porcentual sobre el subtotal con margen

## Cambios Necesarios en el Backend

### 1. Modelo de Items de Oferta

Agregar nuevos campos al modelo de items:

```python
# En el modelo OfertaItem o similar
class OfertaItem:
    material_codigo: str
    descripcion: str
    precio: float  # Precio actual (puede ser editado)
    precio_original: float  # Precio original del material (nuevo campo)
    precio_editado: bool  # Indica si el precio fue modificado (nuevo campo)
    cantidad: int
    categoria: str
    seccion: str
    margen_asignado: float
```

### 2. Modelo de Oferta

Agregar nuevos campos al modelo principal de oferta:

```python
# En el modelo Oferta o OfertaConfeccionada
class Oferta:
    # ... campos existentes ...
    
    # Nuevos campos para descuentos
    descuento_porcentaje: float = 0.0  # Porcentaje de descuento aplicado
    monto_descuento: float = 0.0  # Monto calculado del descuento
    subtotal_con_descuento: float = 0.0  # Subtotal después de aplicar descuento
```

### 3. Endpoint de Creación/Actualización

Actualizar el endpoint `POST /ofertas/confeccion/` y `PUT /ofertas/confeccion/{id}`:

```python
@router.post("/ofertas/confeccion/")
async def crear_oferta_confeccionada(data: dict):
    # Validar y procesar items con precios editables
    items = []
    for item_data in data.get("items", []):
        item = {
            "material_codigo": item_data["material_codigo"],
            "descripcion": item_data["descripcion"],
            "precio": item_data["precio"],  # Precio actual (puede ser editado)
            "precio_original": item_data.get("precio_original", item_data["precio"]),
            "precio_editado": item_data.get("precio_editado", False),
            "cantidad": item_data["cantidad"],
            "categoria": item_data["categoria"],
            "seccion": item_data["seccion"],
            "margen_asignado": item_data.get("margen_asignado", 0)
        }
        items.append(item)
    
    # Procesar descuento
    descuento_porcentaje = data.get("descuento_porcentaje", 0.0)
    subtotal_con_margen = data.get("subtotal_con_margen", 0.0)
    monto_descuento = data.get("monto_descuento", 0.0)
    subtotal_con_descuento = data.get("subtotal_con_descuento", 0.0)
    
    # Validar que el cálculo del descuento sea correcto
    descuento_calculado = subtotal_con_margen * (descuento_porcentaje / 100)
    if abs(descuento_calculado - monto_descuento) > 0.01:
        raise ValueError("El monto del descuento no coincide con el porcentaje aplicado")
    
    # Crear oferta con los nuevos campos
    oferta = {
        # ... campos existentes ...
        "items": items,
        "descuento_porcentaje": descuento_porcentaje,
        "monto_descuento": monto_descuento,
        "subtotal_con_descuento": subtotal_con_descuento,
        # ... resto de campos ...
    }
    
    # Guardar en base de datos
    # ...
    
    return {"success": True, "data": oferta}
```

### 4. Endpoint de Lectura

Actualizar el endpoint `GET /ofertas/confeccion/{id}` para devolver los nuevos campos:

```python
@router.get("/ofertas/confeccion/{id}")
async def obtener_oferta_confeccionada(id: str):
    oferta = obtener_oferta_de_bd(id)
    
    # Asegurar que los items incluyan los nuevos campos
    items_procesados = []
    for item in oferta.get("items", []):
        item_procesado = {
            "material_codigo": item["material_codigo"],
            "descripcion": item["descripcion"],
            "precio": item["precio"],
            "precio_original": item.get("precio_original", item["precio"]),
            "precio_editado": item.get("precio_editado", False),
            "cantidad": item["cantidad"],
            "categoria": item["categoria"],
            "seccion": item["seccion"],
            "margen_asignado": item.get("margen_asignado", 0)
        }
        items_procesados.append(item_procesado)
    
    return {
        "success": True,
        "data": {
            **oferta,
            "items": items_procesados,
            "descuento_porcentaje": oferta.get("descuento_porcentaje", 0.0),
            "monto_descuento": oferta.get("monto_descuento", 0.0),
            "subtotal_con_descuento": oferta.get("subtotal_con_descuento", 0.0)
        }
    }
```

### 5. Migración de Base de Datos

Si usas migraciones, crear una para agregar los nuevos campos:

```sql
-- Agregar campos a la tabla de items
ALTER TABLE oferta_items 
ADD COLUMN precio_original DECIMAL(10, 2) DEFAULT 0.0,
ADD COLUMN precio_editado BOOLEAN DEFAULT FALSE;

-- Agregar campos a la tabla de ofertas
ALTER TABLE ofertas_confeccionadas
ADD COLUMN descuento_porcentaje DECIMAL(5, 2) DEFAULT 0.0,
ADD COLUMN monto_descuento DECIMAL(10, 2) DEFAULT 0.0,
ADD COLUMN subtotal_con_descuento DECIMAL(10, 2) DEFAULT 0.0;

-- Actualizar registros existentes con precio_original = precio
UPDATE oferta_items SET precio_original = precio WHERE precio_original = 0.0;
```

### 6. Validaciones Adicionales

Agregar validaciones en el backend:

```python
def validar_precios_items(items: list) -> bool:
    """Valida que los precios editados sean razonables"""
    for item in items:
        precio = item.get("precio", 0)
        precio_original = item.get("precio_original", 0)
        
        # Validar que el precio no sea negativo
        if precio < 0:
            raise ValueError(f"El precio del item {item['material_codigo']} no puede ser negativo")
        
        # Opcional: Validar que el precio editado no sea muy diferente del original
        # (por ejemplo, no más del 200% ni menos del 10% del original)
        if precio_original > 0:
            ratio = precio / precio_original
            if ratio > 2.0 or ratio < 0.1:
                # Advertencia o error según la lógica de negocio
                pass
    
    return True

def validar_descuento(descuento_porcentaje: float) -> bool:
    """Valida que el descuento esté en un rango válido"""
    if descuento_porcentaje < 0 or descuento_porcentaje > 100:
        raise ValueError("El descuento debe estar entre 0% y 100%")
    
    return True
```

## Flujo de Cálculo

El orden de cálculo en el frontend es:

1. **Total Materiales**: Suma de (precio × cantidad) de todos los items
2. **Margen Comercial**: Se aplica el porcentaje de margen sobre materiales
3. **Subtotal con Margen**: Total Materiales + Margen Comercial
4. **Descuento**: Se aplica el porcentaje de descuento sobre el Subtotal con Margen
5. **Subtotal con Descuento**: Subtotal con Margen - Monto Descuento
6. **Costos Adicionales**: Transportación, elementos personalizados, costos extras
7. **Contribución** (opcional): Se aplica sobre el subtotal con descuento + costos adicionales
8. **Precio Final**: Subtotal con Descuento + Costos Adicionales + Contribución

## Ejemplo de Datos Enviados

```json
{
  "tipo_oferta": "personalizada",
  "cliente_numero": "CLI-001",
  "almacen_id": "ALM-001",
  "items": [
    {
      "material_codigo": "INV-001",
      "descripcion": "Inversor 5kW Growatt",
      "precio": 170.00,
      "precio_original": 170.00,
      "precio_editado": false,
      "cantidad": 2,
      "categoria": "INVERSORES",
      "seccion": "INVERSORES",
      "margen_asignado": 42.50
    },
    {
      "material_codigo": "BAT-001",
      "descripcion": "Batería LiFePO4 5.12kWh",
      "precio": 850.00,
      "precio_original": 850.00,
      "precio_editado": false,
      "cantidad": 2,
      "categoria": "BATERIAS",
      "seccion": "BATERIAS",
      "margen_asignado": 212.50
    },
    {
      "material_codigo": "PAN-001",
      "descripcion": "Panel Solar 550W",
      "precio": 180.00,
      "precio_original": 200.00,
      "precio_editado": true,
      "cantidad": 10,
      "categoria": "PANELES",
      "seccion": "PANELES",
      "margen_asignado": 90.00
    }
  ],
  "margen_comercial": 25,
  "porcentaje_margen_materiales": 50,
  "porcentaje_margen_instalacion": 50,
  "margen_total": 450.00,
  "margen_materiales": 225.00,
  "margen_instalacion": 225.00,
  "descuento_porcentaje": 10,
  "monto_descuento": 207.50,
  "subtotal_con_margen": 2075.00,
  "subtotal_con_descuento": 1867.50,
  "costo_transportacion": 50.00,
  "total_materiales": 1800.00,
  "precio_final": 1918.00
}
```

**Nota sobre precios de Inversores y Baterías:**
- Los inversores y baterías tienen un descuento automático del 15% aplicado al precio base
- El cálculo es: `precio_con_descuento = Math.round(precio_base * 0.85 * 100) / 100`
- Ejemplo: Inversor de $200.00 → $200.00 × 0.85 = $170.00
- Ejemplo: Batería de $1000.00 → $1000.00 × 0.85 = $850.00
- Este precio ya viene calculado desde el frontend con 2 decimales

## Consideraciones Importantes

1. **Precios Editados**: Cuando un usuario edita un precio, se debe mantener el `precio_original` para referencia y auditoría
2. **Descuentos**: El descuento se aplica DESPUÉS del margen comercial, no antes
3. **Descuento Automático Inversores/Baterías**: Los inversores y baterías tienen un descuento automático del 15% aplicado al precio base, redondeado a 2 decimales (ej: $200.00 × 0.85 = $170.00)
4. **Validación**: El backend debe validar que los cálculos sean correctos
5. **Auditoría**: Considerar guardar un log de cambios de precios para auditoría
6. **Permisos**: Evaluar si todos los usuarios pueden editar precios o solo ciertos roles

## Testing

Casos de prueba recomendados:

1. Crear oferta con precios sin editar
2. Crear oferta con precios editados
3. Crear oferta con descuento del 0%
4. Crear oferta con descuento del 10%, 25%, 50%
5. Editar oferta existente cambiando precios
6. Editar oferta existente cambiando descuento
7. Validar que el precio_original no cambie al editar
8. Validar cálculos con descuento + contribución
