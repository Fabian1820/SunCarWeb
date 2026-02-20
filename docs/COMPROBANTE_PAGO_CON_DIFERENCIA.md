# Comprobante de Pago con Diferencia (Excedente)

## Cambios Implementados

Se actualizó el servicio de exportación de comprobantes para manejar correctamente los pagos con diferencia (excedente).

## Problema Anterior

Cuando un pago tenía diferencia (monto que excede el pendiente), el comprobante calculaba incorrectamente el monto pendiente porque restaba el monto total del pago, incluyendo el excedente.

### Ejemplo del Problema:

- Precio final de la oferta: $2000
- Monto pendiente: $2000
- Cliente paga: $2500
- Diferencia (excedente): $500
- Justificación: "Cliente pagó de más como propina"

**Cálculo incorrecto anterior:**
```
Monto pendiente = $2000 - $2500 = -$500 ❌
```

Esto mostraba un pendiente negativo, lo cual es incorrecto.

## Solución Implementada

Ahora el comprobante calcula correctamente el monto pendiente excluyendo la diferencia:

**Cálculo correcto:**
```
Monto efectivo aplicado = $2500 - $500 = $2000
Monto pendiente = $2000 - $2000 = $0 ✅
```

## Cómo Funciona

### 1. Cálculo del Monto Efectivo

```typescript
let montoPagadoEfectivo = pago.monto_usd

// Si hay diferencia, el monto efectivo es: monto_usd - diferencia.monto
if (pago.diferencia && pago.diferencia.monto > 0) {
  montoPagadoEfectivo = pago.monto_usd - pago.diferencia.monto
}
```

### 2. Cálculo del Pendiente

```typescript
const totalPagadoConEste = (data.total_pagado_anteriormente || 0) + montoPagadoEfectivo
const montoPendiente = oferta.precio_final - totalPagadoConEste
```

### 3. Visualización en el Comprobante

Si el pago tiene diferencia, se muestra:

```
Monto Pendiente:                    $0.00 USD

Excedente (no aplicado):         +$500.00 USD
Motivo: Cliente pagó de más como propina
```

## Ejemplos de Comprobantes

### Ejemplo 1: Pago Normal (sin diferencia)

**Datos:**
- Precio final: $2000
- Monto pagado: $1500
- Sin diferencia

**Comprobante muestra:**
```
Monto Total:                      $2,000.00 USD
Monto Pagado:                     $1,500.00 USD
Forma de Pago:                         Efectivo

Monto Pendiente:                    $500.00 USD
```

### Ejemplo 2: Pago con Diferencia (excedente)

**Datos:**
- Precio final: $2000
- Monto pendiente: $2000
- Monto pagado: $2500
- Diferencia: $500
- Justificación: "Cliente pagó de más como propina"

**Comprobante muestra:**
```
Monto Total:                      $2,000.00 USD
Monto Pagado:                     $2,500.00 USD
Forma de Pago:                         Efectivo

Monto Pendiente:                      $0.00 USD

Excedente (no aplicado):           +$500.00 USD
Motivo: Cliente pagó de más como propina
```

### Ejemplo 3: Pago Parcial con Diferencia

**Datos:**
- Precio final: $3000
- Monto pendiente: $1500 (ya se pagaron $1500 antes)
- Monto pagado: $1800
- Diferencia: $300
- Justificación: "Cliente pagó de más para cubrir servicios adicionales"

**Comprobante muestra:**
```
Monto Total:                      $3,000.00 USD
Monto Pagado Anteriormente:       $1,500.00 USD
Monto Pagado:                     $1,800.00 USD
Forma de Pago:                         Efectivo

Monto Pendiente:                      $0.00 USD

Excedente (no aplicado):           +$300.00 USD
Motivo: Cliente pagó de más para cubrir servicios adicionales
```

## Diseño Visual

### Sección de Excedente

- **Color:** Naranja (RGB: 255, 140, 0)
- **Formato:** 
  - Línea 1: "Excedente (no aplicado): +$XXX.XX USD" (negrita)
  - Línea 2: "Motivo: [justificación]" (cursiva, tamaño pequeño)
- **Ubicación:** Justo después del "Monto Pendiente"

### Ejemplo Visual:

```
┌─────────────────────────────────────────────┐
│ Monto Pendiente:              $0.00 USD     │ ← Negro, negrita
│                                             │
│ Excedente (no aplicado):   +$500.00 USD    │ ← Naranja, negrita
│ Motivo: Cliente pagó de más como propina   │ ← Naranja, cursiva
└─────────────────────────────────────────────┘
```

## Casos de Uso

### 1. Propina

Cliente paga de más como agradecimiento por el servicio.

**Justificación:** "Cliente pagó de más como propina"

### 2. Anticipo para Servicios Futuros

Cliente paga de más para cubrir mantenimientos futuros.

**Justificación:** "Anticipo para mantenimiento futuro acordado verbalmente"

### 3. Servicios Adicionales

Cliente paga de más para cubrir servicios no incluidos en la oferta.

**Justificación:** "Cliente pagó de más para cubrir servicios adicionales no incluidos en la oferta"

### 4. Corrección de Error

Se corrige un error de cálculo en la oferta original.

**Justificación:** "Corrección de error de cálculo en oferta original"

### 5. Redondeo Comercial

Cliente redondea el monto por conveniencia.

**Justificación:** "Redondeo comercial acordado con el cliente"

## Flujo Completo

### 1. Crear Pago con Diferencia

1. Usuario ingresa monto mayor al pendiente
2. Sistema solicita justificación
3. Usuario ingresa justificación
4. Backend calcula `diferencia.monto` automáticamente
5. Pago se guarda con diferencia

### 2. Exportar Comprobante

1. Usuario click en "Exportar Comprobante"
2. Sistema lee el pago (incluyendo `diferencia` si existe)
3. Calcula monto efectivo: `monto_usd - diferencia.monto`
4. Calcula pendiente correcto
5. Genera PDF mostrando:
   - Monto pagado total
   - Monto pendiente correcto
   - Excedente (si existe)
   - Justificación del excedente

### 3. Cliente Recibe Comprobante

Cliente ve claramente:
- Cuánto pagó en total
- Cuánto se aplicó a la oferta
- Cuánto fue excedente
- Por qué hubo excedente

## Validaciones

### En el Cálculo

1. **Verificar existencia de diferencia:**
   ```typescript
   if (pago.diferencia && pago.diferencia.monto > 0)
   ```

2. **Calcular monto efectivo:**
   ```typescript
   montoPagadoEfectivo = pago.monto_usd - pago.diferencia.monto
   ```

3. **Nunca mostrar pendiente negativo:**
   - Si hay diferencia, el pendiente será 0 o positivo
   - El excedente se muestra por separado

### En la Visualización

1. **Solo mostrar sección de excedente si existe:**
   - Verificar `pago.diferencia && pago.diferencia.monto > 0`

2. **Formato del excedente:**
   - Siempre con signo "+" para indicar que es adicional
   - Color naranja para diferenciarlo
   - Justificación en cursiva

3. **Justificación legible:**
   - Usar `splitTextToSize` para ajustar a ancho del comprobante
   - Tamaño de fuente pequeño pero legible

## Compatibilidad

- ✅ Compatible con pagos sin diferencia (funcionan como antes)
- ✅ Compatible con todas las monedas (USD, EUR, CUP)
- ✅ Compatible con todos los métodos de pago
- ✅ Compatible con desglose de billetes
- ✅ Compatible con pagos de terceros
- ✅ No afecta comprobantes existentes

## Testing

### Test 1: Pago Normal

1. Crear pago sin exceder el pendiente
2. Exportar comprobante
3. **Esperado:** No debe aparecer sección de excedente

### Test 2: Pago con Excedente

1. Crear pago que exceda el pendiente
2. Ingresar justificación
3. Exportar comprobante
4. **Esperado:** 
   - Monto pendiente correcto (0 o positivo)
   - Sección de excedente visible en naranja
   - Justificación legible

### Test 3: Múltiples Pagos con Excedente

1. Crear primer pago con excedente
2. Crear segundo pago normal
3. Exportar comprobante del segundo pago
4. **Esperado:** 
   - Total pagado anteriormente incluye solo el monto efectivo del primer pago
   - Pendiente calculado correctamente

## Notas Técnicas

- El campo `diferencia.monto` viene del backend, no se calcula en el frontend
- El cálculo del pendiente se hace en tiempo de generación del PDF
- No se modifica la base de datos, solo la visualización
- El excedente no afecta el cálculo de pagos futuros

## Archivo Modificado

- `lib/services/feats/pagos/export-comprobante-service.ts`
  - Método: `dibujarComprobante()`
  - Líneas: Cálculo de monto pendiente y visualización de excedente
