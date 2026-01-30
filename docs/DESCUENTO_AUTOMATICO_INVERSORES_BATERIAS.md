# Descuento Automático del 15% para Inversores y Baterías

## Descripción

Los materiales de las categorías **INVERSORES** y **BATERIAS** tienen un descuento automático del 15% aplicado sobre su precio base al momento de agregarlos a una oferta.

## Implementación en Frontend

### Código
```typescript
// En la función agregarMaterial()
const precioBase = (activeStep.id === 'INVERSORES' || activeStep.id === 'BATERIAS') 
  ? Number(((material.precio || 0) * 0.85).toFixed(2))
  : (material.precio || 0)
```

### Características
- **Descuento**: 15% (multiplicador 0.85)
- **Redondeo**: 2 decimales usando `.toFixed(2)`
- **Aplicación**: Automática al agregar el material
- **Categorías afectadas**: 
  - `INVERSORES`
  - `BATERIAS`

## Ejemplos de Cálculo

### Ejemplo 1: Inversor
```
Precio base:        $200.00
Descuento (15%):    $200.00 × 0.85 = $170.00
Precio final:       $170.00
```

### Ejemplo 2: Batería
```
Precio base:        $1,000.00
Descuento (15%):    $1,000.00 × 0.85 = $850.00
Precio final:       $850.00
```

### Ejemplo 3: Inversor con decimales
```
Precio base:        $235.50
Descuento (15%):    $235.50 × 0.85 = $200.175
Redondeado:         $200.18 (2 decimales)
Precio final:       $200.18
```

### Ejemplo 4: Batería con decimales
```
Precio base:        $1,234.56
Descuento (15%):    $1,234.56 × 0.85 = $1,049.376
Redondeado:         $1,049.38 (2 decimales)
Precio final:       $1,049.38
```

## Comportamiento en la Interfaz

### Al Agregar Material
1. Usuario selecciona un inversor o batería
2. El sistema calcula automáticamente el precio con descuento
3. El precio se redondea a 2 decimales
4. Se guarda como `precio` y `precio_original` (ambos con descuento aplicado)
5. `precio_editado` se marca como `false` (no fue editado manualmente)

### Visualización
```
┌─────────────────────────────────────────┐
│ Material: Inversor 5kW Growatt          │
│ Precio Base (BD): $200.00               │
│ Precio en Oferta:  $170.00 (15% desc)   │
│ Cantidad: 2                              │
│ Total: $340.00                           │
└─────────────────────────────────────────┘
```

### Edición Manual
- El usuario PUEDE editar el precio después de agregarlo
- Si edita el precio, `precio_editado` cambia a `true`
- El `precio_original` se mantiene en $170.00 (con descuento)
- Puede restaurar al precio con descuento usando el botón ↺

## Consideraciones para el Backend

### Validación
El backend NO debe recalcular este descuento. El precio ya viene calculado desde el frontend.

```python
# ❌ NO HACER ESTO en el backend
if item["categoria"] in ["INVERSORES", "BATERIAS"]:
    item["precio"] = item["precio"] * 0.85

# ✅ CORRECTO: Usar el precio que viene del frontend
precio = item["precio"]  # Ya tiene el descuento aplicado
```

### Auditoría
Si se necesita saber el precio original sin descuento:
- NO está disponible en la oferta (se pierde)
- Se debe consultar el precio actual del material en la base de datos
- O agregar un campo adicional `precio_base_sin_descuento` si es necesario

### Migración de Datos
Para ofertas antiguas que no tenían este descuento:
- Los precios históricos se mantienen como están
- Solo las nuevas ofertas tendrán el descuento aplicado
- No se recalculan ofertas existentes

## Casos Especiales

### Caso 1: Material con Precio Editado
```
1. Se agrega inversor de $200.00
2. Precio automático: $170.00
3. Usuario edita a $160.00
4. precio_editado = true
5. precio_original = $170.00 (con descuento)
6. precio = $160.00 (editado)
```

### Caso 2: Duplicar Oferta
```
1. Oferta original tiene inversor a $170.00
2. Al duplicar, se mantiene $170.00
3. precio_original = $170.00
4. precio_editado = false
5. NO se recalcula el descuento
```

### Caso 3: Editar Oferta Existente
```
1. Oferta tiene inversor a $170.00
2. En modo edición, se mantiene $170.00
3. Si se agrega un nuevo inversor, se aplica descuento
4. Los inversores existentes NO se recalculan
```

## Preguntas Frecuentes

### ¿Por qué 15%?
Es una política comercial de la empresa para inversores y baterías.

### ¿Se puede cambiar el porcentaje?
Sí, modificando el multiplicador en el código:
```typescript
// Cambiar de 0.85 (15%) a 0.80 (20%)
const precioBase = ... ? Number(((material.precio || 0) * 0.80).toFixed(2)) : ...
```

### ¿Se aplica a otras categorías?
No, solo a `INVERSORES` y `BATERIAS`. Para agregar más categorías:
```typescript
const esDescuentoAutomatico = ['INVERSORES', 'BATERIAS', 'NUEVA_CATEGORIA'].includes(activeStep.id)
const precioBase = esDescuentoAutomatico 
  ? Number(((material.precio || 0) * 0.85).toFixed(2))
  : (material.precio || 0)
```

### ¿El descuento se suma al descuento general de la oferta?
No, son independientes:
1. **Descuento automático (15%)**: Se aplica al precio del material
2. **Descuento de oferta (variable)**: Se aplica al subtotal con margen

Ejemplo completo:
```
Inversor precio base:           $200.00
Descuento automático (15%):     $170.00  ← Precio en oferta
Cantidad: 2                     $340.00
+ Margen (25%):                 $85.00
= Subtotal con margen:          $425.00
- Descuento oferta (10%):       $42.50   ← Descuento adicional
= Subtotal final:               $382.50
```

### ¿Qué pasa si el precio del material cambia en la BD?
Las ofertas existentes mantienen el precio histórico. Solo las nuevas ofertas usarán el precio actualizado con el descuento del 15%.

## Testing

### Casos de Prueba
```javascript
// Test 1: Precio sin decimales
expect(calcularPrecioConDescuento(200.00)).toBe(170.00)

// Test 2: Precio con decimales
expect(calcularPrecioConDescuento(235.50)).toBe(200.18)

// Test 3: Precio muy bajo
expect(calcularPrecioConDescuento(10.00)).toBe(8.50)

// Test 4: Precio muy alto
expect(calcularPrecioConDescuento(10000.00)).toBe(8500.00)

// Test 5: Redondeo hacia arriba
expect(calcularPrecioConDescuento(100.59)).toBe(85.50)

// Test 6: Redondeo hacia abajo
expect(calcularPrecioConDescuento(100.58)).toBe(85.49)
```

### Función de Testing
```typescript
function calcularPrecioConDescuento(precioBase: number): number {
  return Number((precioBase * 0.85).toFixed(2))
}
```

## Resumen

- ✅ Descuento del 15% automático para inversores y baterías
- ✅ Redondeo a 2 decimales
- ✅ Se aplica al agregar el material
- ✅ El usuario puede editar el precio después
- ✅ El backend NO debe recalcular este descuento
- ✅ Es independiente del descuento general de la oferta
