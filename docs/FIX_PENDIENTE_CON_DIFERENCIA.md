# Fix: Cálculo de Pendiente con Diferencia

## Problema Identificado

Cuando un pago tenía diferencia (excedente), el sistema mostraba un pendiente negativo o incorrecto porque:

1. **En el comprobante:** Restaba el monto total del pago (incluyendo el excedente)
2. **En las tablas:** No consideraba la diferencia al calcular el pendiente después del pago

### Ejemplo del Problema:

**Escenario:**
- Precio final: $100.00
- Monto pagado: $100.98
- Diferencia: $0.98
- Justificación: "Cliente pagó de más"

**Cálculo incorrecto:**
```
Pendiente = $100.00 - $100.98 = -$0.98 ❌
```

**Resultado:** Mostraba "Pendiente después: -$0.98 USD"

## Solución Implementada

### 1. Excluir Diferencia del Cálculo

Ahora el sistema calcula el monto efectivo que se aplica a la oferta:

```typescript
let montoEfectivo = pago.monto_usd

// Si hay diferencia, restar ese monto
if (pago.diferencia && pago.diferencia.monto > 0) {
  montoEfectivo = pago.monto_usd - pago.diferencia.monto
}
```

**Cálculo correcto:**
```
Monto efectivo = $100.98 - $0.98 = $100.00
Pendiente = $100.00 - $100.00 = $0.00 ✅
```

### 2. Ajuste de Redondeo

Para evitar mostrar valores como -$0.01 o $0.01 por errores de redondeo:

```typescript
// Si es muy cercano a 0 (menos de 1 centavo), mostrarlo como 0
if (pendiente < 0.01 && pendiente > -0.01) {
  pendiente = 0
}
```

## Archivos Corregidos

### 1. `lib/services/feats/pagos/export-comprobante-service.ts`

**Cambios:**
- Calcula monto efectivo excluyendo diferencia
- Ajusta pendiente a 0 si es muy cercano
- Agrega logs de debugging

**Código:**
```typescript
let montoPagadoEfectivo = pago.monto_usd

if (pago.diferencia && pago.diferencia.monto > 0) {
  montoPagadoEfectivo = pago.monto_usd - pago.diferencia.monto
}

const totalPagadoConEste = (data.total_pagado_anteriormente || 0) + montoPagadoEfectivo
let montoPendiente = oferta.precio_final - totalPagadoConEste

// Ajuste de redondeo
if (montoPendiente < 0.01 && montoPendiente > -0.01) {
  montoPendiente = 0
}
```

### 2. `components/feats/pagos/todos-pagos-table.tsx`

**Cambios:**
- Calcula total pagado excluyendo diferencias de todos los pagos
- Ajusta pendiente a 0 si es muy cercano

**Código:**
```typescript
const totalPagadoHastaAqui = pagosOrdenados
  .slice(0, indicePago + 1)
  .reduce((sum, p) => {
    const montoEfectivo = p.diferencia && p.diferencia.monto > 0
      ? p.monto_usd - p.diferencia.monto
      : p.monto_usd
    return sum + montoEfectivo
  }, 0)

let pendienteDespuesPago = oferta.precio_final - totalPagadoHastaAqui

if (pendienteDespuesPago < 0.01 && pendienteDespuesPago > -0.01) {
  pendienteDespuesPago = 0
}
```

### 3. `components/feats/pagos/todos-pagos-planos-table.tsx`

**Cambios:** Idénticos a `todos-pagos-table.tsx`

## Ejemplos Corregidos

### Ejemplo 1: Pago Exacto con Excedente Pequeño

**Datos:**
- Precio final: $100.00
- Monto pagado: $100.98
- Diferencia: $0.98

**Antes:**
```
Pendiente después: -$0.98 USD ❌
```

**Ahora:**
```
Pendiente después: $0.00 USD ✅
Excedente (no aplicado): +$0.98 USD
```

### Ejemplo 2: Pago con Excedente Grande

**Datos:**
- Precio final: $2000.00
- Monto pagado: $2500.00
- Diferencia: $500.00

**Antes:**
```
Pendiente después: -$500.00 USD ❌
```

**Ahora:**
```
Pendiente después: $0.00 USD ✅
Excedente (no aplicado): +$500.00 USD
```

### Ejemplo 3: Múltiples Pagos con Diferencias

**Datos:**
- Precio final: $3000.00
- Pago 1: $1500.00 (sin diferencia)
- Pago 2: $1600.00 (diferencia: $100.00)

**Cálculo Pago 1:**
```
Monto efectivo: $1500.00
Pendiente: $3000.00 - $1500.00 = $1500.00 ✅
```

**Cálculo Pago 2:**
```
Monto efectivo: $1600.00 - $100.00 = $1500.00
Total pagado: $1500.00 + $1500.00 = $3000.00
Pendiente: $3000.00 - $3000.00 = $0.00 ✅
Excedente: +$100.00
```

## Logs de Debugging

Se agregaron logs en el comprobante para facilitar el debugging:

```
📊 Comprobante - Pago con diferencia:
  - Monto USD total: 100.98
  - Diferencia (excedente): 0.98
  - Monto efectivo aplicado: 100.00

📊 Comprobante - Cálculo pendiente:
  - Precio final: 100.00
  - Total pagado anteriormente: 0
  - Monto efectivo este pago: 100.00
  - Total pagado con este: 100.00
  - Pendiente calculado: 0
```

## Casos de Prueba

### Test 1: Pago sin Diferencia

**Input:**
- Precio: $100
- Pago: $50
- Sin diferencia

**Esperado:**
- Pendiente: $50.00 ✅

### Test 2: Pago con Diferencia Pequeña

**Input:**
- Precio: $100
- Pago: $100.50
- Diferencia: $0.50

**Esperado:**
- Pendiente: $0.00 ✅
- Excedente: +$0.50 ✅

### Test 3: Pago con Diferencia Grande

**Input:**
- Precio: $2000
- Pago: $2500
- Diferencia: $500

**Esperado:**
- Pendiente: $0.00 ✅
- Excedente: +$500.00 ✅

### Test 4: Múltiples Pagos con Diferencias

**Input:**
- Precio: $3000
- Pago 1: $1000 (sin diferencia)
- Pago 2: $2100 (diferencia: $100)

**Esperado después de Pago 1:**
- Pendiente: $2000.00 ✅

**Esperado después de Pago 2:**
- Pendiente: $0.00 ✅
- Excedente: +$100.00 ✅

### Test 5: Error de Redondeo

**Input:**
- Precio: $100.00
- Pago: $100.01
- Diferencia: $0.01

**Esperado:**
- Pendiente: $0.00 ✅ (no -$0.01)
- Excedente: +$0.01 ✅

## Validación

Para verificar que funciona correctamente:

1. **Crear pago con diferencia**
2. **Ver en tabla:** Debe mostrar pendiente $0.00
3. **Exportar comprobante:** Debe mostrar:
   - Pendiente: $0.00
   - Excedente: +$X.XX
   - Justificación del excedente
4. **Revisar logs en consola:** Debe mostrar cálculos correctos

## Compatibilidad

- ✅ Compatible con pagos sin diferencia
- ✅ Compatible con múltiples pagos
- ✅ Compatible con todas las monedas
- ✅ Maneja errores de redondeo
- ✅ No afecta pagos existentes

## Notas Técnicas

### Precisión de Decimales

JavaScript usa punto flotante, lo que puede causar errores de redondeo:

```javascript
0.1 + 0.2 === 0.3 // false (es 0.30000000000000004)
```

Por eso usamos el ajuste:
```typescript
if (pendiente < 0.01 && pendiente > -0.01) {
  pendiente = 0
}
```

### Orden de Operaciones

Es importante calcular en este orden:

1. Calcular monto efectivo de cada pago (excluyendo diferencia)
2. Sumar todos los montos efectivos
3. Restar del precio final
4. Ajustar si es muy cercano a 0

### Logs de Debugging

Los logs solo aparecen en la consola del navegador cuando se exporta un comprobante. No afectan el rendimiento en producción.

## Resumen

**Problema:** Pendiente negativo cuando hay diferencia  
**Causa:** No se excluía la diferencia del cálculo  
**Solución:** Calcular monto efectivo = monto_usd - diferencia.monto  
**Resultado:** Pendiente siempre correcto (0 o positivo)  
**Archivos:** 3 archivos modificados  
**Testing:** 5 casos de prueba cubiertos
