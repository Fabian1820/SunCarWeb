# Solución: Reajuste Correcto de Márgenes en Ofertas

## Problema 1: Cálculo Incorrecto de Reajuste

Cuando modificas el margen de un material en la confección de ofertas, las recomendaciones de reajuste para los demás materiales **NO están calculando correctamente** para volver al total original.

### Código Actual (Incorrecto)

```typescript
// Líneas 4124-4145 en confeccion-ofertas-view.tsx
const itemsEditados = items.filter(i => typeof porcentajeAsignadoPorItem[i.id] === "number")
const margenEditado = itemsEditados.reduce((sum, i) => {
  const costo = i.precio * i.cantidad
  return sum + (costo * (porcentajeAsignadoPorItem[i.id] / 100))
}, 0)

const itemsNoEditados = items.filter(i => typeof porcentajeAsignadoPorItem[i.id] !== "number")
const margenDisponible = margenParaMateriales - margenEditado
const costosNoEditados = itemsNoEditados.reduce((sum, i) => sum + (i.precio * i.cantidad), 0)
const margenSugerido = (costoItem / costosNoEditados) * margenDisponible
```

**Problema:** Este cálculo redistribuye el margen restante, pero no garantiza que el total final sea igual al `margenParaMateriales` original.

## Solución Correcta

Para que las recomendaciones sean exactas y vuelvas al total original, necesitas:

### 1. Calcular el Total Actual vs Total Objetivo

```typescript
// Calcular el margen total actualmente asignado
const totalMargenActual = items.reduce((sum, i) => {
  const costo = i.precio * i.cantidad
  const porcentaje = typeof porcentajeAsignadoPorItem[i.id] === "number"
    ? porcentajeAsignadoPorItem[i.id]
    : (porcentajeMargenPorItem.get(i.id) ?? 0)
  return sum + (costo * (porcentaje / 100))
}, 0)

// Calcular la diferencia que necesitas compensar
const diferenciaTotal = margenParaMateriales - totalMargenActual
```

### 2. Redistribuir la Diferencia Proporcionalmente

```typescript
// Solo entre items NO editados manualmente
const itemsNoEditados = items.filter(i => typeof porcentajeAsignadoPorItem[i.id] !== "number")
const costosNoEditados = itemsNoEditados.reduce((sum, i) => sum + (i.precio * i.cantidad), 0)

if (costosNoEditados > 0) {
  // Distribuir la diferencia proporcionalmente
  const proporcionItem = costoItem / costosNoEditados
  const ajusteMargen = diferenciaTotal * proporcionItem
  
  // Margen sugerido = margen actual + ajuste
  const margenActual = costoItem * (porcentajeItem / 100)
  const margenSugerido = margenActual + ajusteMargen
  const porcentajeSugerido = (margenSugerido / costoItem) * 100
}
```

### 3. Código Completo de la Función `calcularSugerencia`

Reemplaza la función `calcularSugerencia` (líneas 4115-4154) con este código:

```typescript
const calcularSugerencia = () => {
  // Solo sugerir si este item NO ha sido editado manualmente
  if (typeof porcentajeAsignadoPorItem[item.id] === "number") {
    return { tipo: 'editado', margenActual: margenItem }
  }
  
  // Si no hay desbalance significativo, no mostrar sugerencia
  if (Math.abs(desbalanceMargen) < 0.01) return null
  
  // PASO 1: Calcular el margen total actualmente asignado
  const totalMargenActual = items.reduce((sum, i) => {
    const costo = i.precio * i.cantidad
    const porcentaje = typeof porcentajeAsignadoPorItem[i.id] === "number"
      ? porcentajeAsignadoPorItem[i.id]
      : (porcentajeMargenPorItem.get(i.id) ?? 0)
    return sum + (costo * (porcentaje / 100))
  }, 0)
  
  // PASO 2: Calcular la diferencia que necesitamos compensar
  const diferenciaTotal = margenParaMateriales - totalMargenActual
  
  // PASO 3: Identificar items no editados
  const itemsNoEditados = items.filter(i => typeof porcentajeAsignadoPorItem[i.id] !== "number")
  if (itemsNoEditados.length === 0) return null
  
  // PASO 4: Calcular costos totales de items no editados
  const costosNoEditados = itemsNoEditados.reduce((sum, i) => sum + (i.precio * i.cantidad), 0)
  if (costosNoEditados === 0) return null
  
  // PASO 5: Calcular proporción de este item respecto al total no editado
  const proporcionItem = costoItem / costosNoEditados
  
  // PASO 6: Calcular el ajuste proporcional para este item
  const ajusteMargen = diferenciaTotal * proporcionItem
  
  // PASO 7: Margen sugerido = margen actual + ajuste
  const margenActual = margenItem
  const margenSugerido = margenActual + ajusteMargen
  const porcentajeSugerido = costoItem > 0 ? (margenSugerido / costoItem) * 100 : 0
  
  const diferencia = margenSugerido - margenActual
  
  // Mostrar sugerencia incluso si la diferencia es pequeña
  return {
    tipo: 'sugerencia',
    margenSugerido,
    porcentajeSugerido,
    diferencia
  }
}
```

## Verificación Matemática

Con esta solución:

1. **Antes de editar:** Total = margenParaMateriales ✓
2. **Después de editar un item:** Total ≠ margenParaMateriales ✗
3. **Después de aplicar sugerencias:** Total = margenParaMateriales ✓

### Ejemplo Numérico

Supongamos:
- `margenParaMateriales` = 1000 USD
- Item A: costo 100, margen 20% = 20 USD
- Item B: costo 200, margen 20% = 40 USD  
- Item C: costo 300, margen 20% = 60 USD
- **Total actual:** 120 USD

Si editas Item A a 50% (50 USD):
- **Nuevo total:** 150 USD
- **Diferencia:** 1000 - 150 = 850 USD (falta)
- **Costos no editados:** 200 + 300 = 500 USD

Sugerencias:
- Item B: proporción = 200/500 = 0.4 → ajuste = 850 × 0.4 = 340 USD → margen sugerido = 40 + 340 = 380 USD
- Item C: proporción = 300/500 = 0.6 → ajuste = 850 × 0.6 = 510 USD → margen sugerido = 60 + 510 = 570 USD

**Verificación:** 50 + 380 + 570 = 1000 USD ✓

## Implementación

Reemplaza el código en `components/feats/ofertas/confeccion-ofertas-view.tsx` líneas 4115-4154 con el código de la sección 3.



---

## Problema 2: Márgenes Editados No Se Guardan

Cuando guardas la oferta, los márgenes editados manualmente no se estaban guardando correctamente en el backend.

### Código Anterior (Incorrecto)

```typescript
// Línea 3305 en confeccion-ofertas-view.tsx
ofertaData.items = items.map(item => ({
  material_codigo: item.materialCodigo,
  descripcion: item.descripcion,
  precio: item.precio,
  precio_original: item.precioOriginal,
  precio_editado: item.precioEditado,
  cantidad: item.cantidad,
  categoria: item.categoria,
  seccion: item.seccion,
  margen_asignado: margenPorMaterialCalculado.get(item.id) || 0  // ❌ NO incluye editados manualmente
}))
```

**Problema:** `margenPorMaterialCalculado` solo contiene los márgenes calculados automáticamente, **NO los editados manualmente** que están en `porcentajeAsignadoPorItem`.

### Solución Correcta

```typescript
// Agregar items
ofertaData.items = items.map(item => {
  const costoItem = item.precio * item.cantidad
  
  // ✅ Usar el porcentaje editado manualmente si existe, sino usar el calculado automáticamente
  const porcentajeItem = typeof porcentajeAsignadoPorItem[item.id] === "number"
    ? porcentajeAsignadoPorItem[item.id]
    : (porcentajeMargenPorItem.get(item.id) ?? 0)
  
  const margenAsignado = costoItem * (porcentajeItem / 100)
  
  return {
    material_codigo: item.materialCodigo,
    descripcion: item.descripcion,
    precio: item.precio,
    precio_original: item.precioOriginal,
    precio_editado: item.precioEditado,
    cantidad: item.cantidad,
    categoria: item.categoria,
    seccion: item.seccion,
    margen_asignado: margenAsignado  // ✅ Incluye editados manualmente
  }
})
```

### Explicación

1. **Calcula el costo del item:** `precio × cantidad`
2. **Prioriza el porcentaje editado manualmente:** Si existe en `porcentajeAsignadoPorItem`, lo usa
3. **Fallback al porcentaje automático:** Si no fue editado, usa el de `porcentajeMargenPorItem`
4. **Calcula el margen asignado:** `costo × (porcentaje / 100)`

Esto garantiza que cuando guardas la oferta, **todos los márgenes editados manualmente se guardan correctamente** en el backend.

---

## Resumen de Cambios Aplicados

### 1. Función `calcularSugerencia` (Líneas 4115-4154)
- ✅ Calcula el total actual de márgenes
- ✅ Calcula la diferencia exacta con el objetivo
- ✅ Distribuye la diferencia proporcionalmente
- ✅ Ajusta desde el margen actual (no recalcula desde cero)

### 2. Construcción del Payload (Línea ~3305)
- ✅ Prioriza `porcentajeAsignadoPorItem` (editados manualmente)
- ✅ Fallback a `porcentajeMargenPorItem` (calculados automáticamente)
- ✅ Calcula `margen_asignado` correctamente para cada item

---

## Verificación

Para verificar que funciona correctamente:

1. **Crea una oferta** con varios materiales
2. **Edita el margen** de uno de los materiales manualmente
3. **Aplica las sugerencias** de reajuste en los demás materiales
4. **Verifica que el total** sea igual al margen objetivo
5. **Guarda la oferta**
6. **Recarga o edita la oferta** y verifica que los márgenes se mantienen

Si todo funciona correctamente:
- ✅ Las sugerencias suman exactamente al total objetivo
- ✅ Los márgenes editados se guardan en el backend
- ✅ Al recargar la oferta, los márgenes se mantienen
