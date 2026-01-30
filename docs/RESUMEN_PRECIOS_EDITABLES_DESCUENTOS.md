# Resumen: Precios Editables y Sistema de Descuentos

## Cambios Implementados en el Frontend

### 1. Precios Editables por Material

**Características:**
- Cada material ahora tiene un campo de precio editable
- Se mantiene el precio original para referencia
- Indicador visual cuando un precio ha sido editado (fondo amarillo)
- Botón para restaurar el precio original (↺)
- Muestra el precio original debajo del campo editado

**Interfaz:**
```
┌─────────────────────────────────────┐
│ Material: Panel Solar 550W          │
│ P.Unit: [180.00] ↺  ← Editado      │
│         Original: $200.00           │
└─────────────────────────────────────┘
```

**Funciones agregadas:**
- `actualizarPrecio(id, nuevoPrecio)`: Actualiza el precio de un item
- `restaurarPrecioOriginal(id)`: Restaura el precio original del material

### 2. Sistema de Descuentos

**Características:**
- Campo para ingresar porcentaje de descuento (0-100%)
- El descuento se aplica sobre el subtotal con margen
- Muestra el monto del descuento calculado
- Muestra el subtotal después del descuento
- Diseño visual distintivo (fondo morado)

**Interfaz:**
```
┌─────────────────────────────────────┐
│ Descuento (%)          [10.0]       │
├─────────────────────────────────────┤
│ Subtotal antes:      $2,075.00      │
│ Descuento (10%):     - $207.50      │
│ Subtotal con desc:   $1,867.50      │
└─────────────────────────────────────┘
```

### 3. Flujo de Cálculo Actualizado

```
1. Total Materiales (con precios editados si aplica)
   ↓
2. + Margen Comercial (materiales + instalación)
   ↓
3. = Subtotal con Margen
   ↓
4. - Descuento (% sobre subtotal con margen)
   ↓
5. = Subtotal con Descuento
   ↓
6. + Costos Adicionales (transportación, personalizados, extras)
   ↓
7. + Contribución (opcional, % sobre subtotal + costos)
   ↓
8. = Precio Final (redondeado)
```

### 4. Estructura de Datos Actualizada

**OfertaItem:**
```typescript
interface OfertaItem {
  id: string
  materialCodigo: string
  descripcion: string
  precio: number              // Precio actual (puede ser editado)
  precioOriginal: number      // Precio original del material (NUEVO)
  precioEditado: boolean      // Indica si fue editado (NUEVO)
  cantidad: number
  categoria: string
  seccion: string
}
```

**Estados agregados:**
```typescript
const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0)
```

**Cálculos agregados:**
```typescript
const montoDescuento = subtotalConMargen * (descuentoPorcentaje / 100)
const subtotalConDescuento = subtotalConMargen - montoDescuento
```

### 5. Visualización en Precio Final

El resumen de precio final ahora muestra:
```
Materiales base:                    $1,800.00
Margen sobre materiales (50%):        $225.00
Servicio de instalación (50%):        $225.00
Descuento (10%):                    - $207.50  ← NUEVO
Transportación:                        $50.00
─────────────────────────────────────────────
Precio Final:                       $1,918.00
```

## Cambios Necesarios en el Backend

### Campos a Agregar en Base de Datos

**Tabla `oferta_items`:**
- `precio_original` (DECIMAL): Precio original del material
- `precio_editado` (BOOLEAN): Indica si el precio fue modificado

**Tabla `ofertas_confeccionadas`:**
- `descuento_porcentaje` (DECIMAL): Porcentaje de descuento aplicado
- `monto_descuento` (DECIMAL): Monto calculado del descuento
- `subtotal_con_descuento` (DECIMAL): Subtotal después del descuento

### Endpoints a Actualizar

1. **POST /ofertas/confeccion/**
   - Recibir y validar `precio_original` y `precio_editado` en items
   - Recibir y validar `descuento_porcentaje`, `monto_descuento`, `subtotal_con_descuento`
   - Validar que los cálculos sean correctos

2. **PUT /ofertas/confeccion/{id}**
   - Mismas validaciones que POST
   - Mantener histórico de cambios de precios (opcional)

3. **GET /ofertas/confeccion/{id}**
   - Devolver los nuevos campos en la respuesta
   - Asegurar compatibilidad con ofertas antiguas (valores por defecto)

### Validaciones Recomendadas

```python
# Validar precios
- precio >= 0
- precio_original >= 0
- Si precio_editado = True, entonces precio != precio_original

# Validar descuento
- 0 <= descuento_porcentaje <= 100
- monto_descuento = subtotal_con_margen * (descuento_porcentaje / 100)
- subtotal_con_descuento = subtotal_con_margen - monto_descuento
```

## Ejemplo de Request al Backend

```json
{
  "tipo_oferta": "personalizada",
  "cliente_numero": "CLI-001",
  "almacen_id": "ALM-001",
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
  "costo_transportacion": 50.00,
  "precio_final": 1918.00
}
```

**Nota:** El inversor tiene precio $170.00 porque se aplicó automáticamente el descuento del 15% sobre el precio base ($200.00 × 0.85 = $170.00, redondeado a 2 decimales).

## Beneficios

1. **Flexibilidad**: Los usuarios pueden ajustar precios según negociaciones con clientes
2. **Transparencia**: Se mantiene el precio original para referencia
3. **Descuentos**: Sistema estándar de descuentos porcentuales
4. **Auditoría**: Se puede rastrear qué precios fueron modificados
5. **UX Mejorada**: Indicadores visuales claros de precios editados

## Próximos Pasos

1. ✅ Implementar cambios en frontend (COMPLETADO)
2. ⏳ Actualizar modelos en backend
3. ⏳ Crear migración de base de datos
4. ⏳ Actualizar endpoints de API
5. ⏳ Agregar validaciones
6. ⏳ Testing de integración
7. ⏳ Documentar en API docs

## Notas Importantes

- El descuento se aplica DESPUÉS del margen, no antes
- Los precios editados se mantienen al duplicar ofertas
- En modo edición, los precios editados se preservan
- El precio original NUNCA cambia, solo el precio actual
- **Inversores y Baterías**: Tienen un descuento automático del 15% aplicado al precio base, redondeado a 2 decimales (ej: $200.00 × 0.85 = $170.00)
