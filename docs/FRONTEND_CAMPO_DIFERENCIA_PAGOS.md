# Frontend - Campo Diferencia en Pagos

## Resumen de Cambios

Se implementó el manejo del nuevo campo `diferencia` en el frontend para soportar pagos que exceden el monto pendiente de una oferta.

## Archivos Modificados

### 1. `lib/services/feats/pagos/pago-service.ts`

**Cambios en interfaces:**

```typescript
// Interface Pago - agregado campo diferencia
export interface Pago {
  // ... campos existentes
  diferencia?: {
    monto: number
    justificacion: string
  }
}

// Interface PagoCreateData - agregado campo diferencia
export interface PagoCreateData {
  // ... campos existentes
  diferencia?: {
    justificacion: string  // Solo se envía la justificación, el monto lo calcula el backend
  }
}
```

### 2. `components/feats/pagos/registrar-pago-dialog.tsx`

**Cambios implementados:**

1. **Nuevo campo en el estado del formulario:**
   - Agregado `justificacion_diferencia: ''`

2. **Validación actualizada:**
   - Removida la validación que impedía pagos mayores al pendiente
   - Agregada validación que requiere justificación cuando el monto excede el pendiente
   - Validación de mínimo 10 caracteres en la justificación

3. **UI dinámica:**
   - Campo de justificación aparece automáticamente cuando el monto excede el pendiente
   - Muestra el monto del excedente calculado
   - Diseño visual con borde naranja y icono de advertencia
   - Campo obligatorio cuando aplica

4. **Envío al backend:**
   - Se incluye `diferencia.justificacion` cuando el monto en USD excede el pendiente
   - El backend calcula automáticamente el `diferencia.monto`

**Código de validación:**
```typescript
const montoEnUSD = monto * formData.tasa_cambio
const excedePendiente = montoEnUSD > oferta.monto_pendiente

if (excedePendiente && !formData.justificacion_diferencia.trim()) {
    setError(`El monto en USD (${formatCurrency(montoEnUSD)}) excede el monto pendiente...`)
    return
}

if (excedePendiente && formData.justificacion_diferencia.trim().length < 10) {
    setError('La justificación debe tener al menos 10 caracteres')
    return
}
```

### 3. `components/feats/pagos/editar-pago-dialog.tsx`

**Cambios implementados:**

1. **Nuevo campo en el estado:**
   - Agregado `justificacion_diferencia: ''`

2. **Carga de datos existentes:**
   - Se carga `pago.diferencia?.justificacion` si existe

3. **Validación especial para edición:**
   - Calcula el monto disponible: `pendiente actual + monto original del pago`
   - Valida si el nuevo monto excede el disponible
   - Requiere justificación si excede

4. **UI mejorada:**
   - Muestra el monto disponible para edición
   - Campo de justificación dinámico cuando excede
   - Muestra la diferencia existente si el pago ya la tiene (modo informativo)

**Código de validación:**
```typescript
const montoDisponible = oferta.monto_pendiente + pago.monto_usd
const montoEnUSD = monto * formData.tasa_cambio
const excedePendiente = montoEnUSD > montoDisponible

if (excedePendiente && !formData.justificacion_diferencia.trim()) {
    setError(`El monto en USD excede el monto disponible...`)
    return
}
```

### 4. `components/feats/pagos/todos-pagos-table.tsx`

**Cambios en visualización:**

Agregado bloque visual para mostrar la diferencia en el detalle de cada pago:

```typescript
{pago.diferencia && (
    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
        <div className="flex items-center gap-1 mb-1">
            <svg className="w-3 h-3 text-orange-600">...</svg>
            <span className="text-xs font-semibold text-orange-700">
                Excedente: {formatCurrency(pago.diferencia.monto)}
            </span>
        </div>
        <p className="text-xs text-gray-700 italic">
            {pago.diferencia.justificacion}
        </p>
    </div>
)}
```

### 5. `components/feats/pagos/todos-pagos-planos-table.tsx`

**Cambios en visualización:**

1. **Badge en columna de monto:**
   - Muestra badge naranja con el monto del excedente

2. **Detalles expandibles:**
   - Justificación visible en un `<details>` expandible
   - Ubicado en la columna "Recibido"

```typescript
{pago.diferencia && (
    <div className="mt-1 text-xs">
        <Badge variant="outline" className="bg-orange-50 text-orange-700">
            +{formatCurrency(pago.diferencia.monto)}
        </Badge>
    </div>
)}

{pago.diferencia && (
    <details className="mt-1 text-xs">
        <summary className="cursor-pointer text-orange-600 hover:underline">
            Ver justificación excedente
        </summary>
        <div className="mt-1 p-2 bg-orange-50 border border-orange-200 rounded">
            <p className="text-gray-700 italic">
                {pago.diferencia.justificacion}
            </p>
        </div>
    </details>
)}
```

## Flujo de Usuario

### Registrar Nuevo Pago

1. Usuario abre el diálogo de registrar pago
2. Ingresa el monto del pago
3. Si el monto excede el pendiente:
   - Aparece automáticamente un campo de justificación (obligatorio)
   - Se muestra el monto del excedente calculado
   - Se requiere mínimo 10 caracteres
4. Usuario completa la justificación
5. Al enviar, el backend calcula y guarda el `diferencia.monto`

### Editar Pago Existente

1. Usuario abre el diálogo de editar pago
2. Si el pago tiene diferencia, se muestra en modo informativo
3. Si cambia el monto y excede el disponible:
   - Aparece el campo de justificación
   - Se calcula contra: `pendiente actual + monto original del pago`
4. Usuario completa la justificación si aplica
5. Al actualizar, el backend recalcula la diferencia

### Visualización en Tablas

**Vista Agrupada (todos-pagos-table):**
- Diferencia visible en el detalle expandido de cada pago
- Diseño destacado con fondo naranja
- Muestra monto y justificación

**Vista Plana (todos-pagos-planos-table):**
- Badge naranja en la columna de monto
- Justificación en detalles expandibles
- Compacto y eficiente

## Casos de Uso Soportados

1. **Cliente paga de más como propina**
   - Justificación: "Cliente pagó propina adicional por el servicio"

2. **Anticipo para futuros servicios**
   - Justificación: "Anticipo para mantenimiento futuro acordado verbalmente"

3. **Servicios adicionales**
   - Justificación: "Cliente pagó de más para cubrir servicios adicionales no incluidos en la oferta"

4. **Correcciones de errores**
   - Justificación: "Corrección de error de cálculo en oferta original"

5. **Redondeos comerciales**
   - Justificación: "Redondeo comercial acordado con el cliente"

## Validaciones Implementadas

### Frontend

1. **Monto excede pendiente:**
   - Requiere campo `justificacion_diferencia`
   - Mínimo 10 caracteres
   - No puede estar vacío

2. **Cálculo correcto:**
   - Considera la tasa de cambio
   - Compara en USD
   - Muestra equivalencias

3. **Edición especial:**
   - Calcula disponible = pendiente + monto original
   - Permite ajustes sin perder flexibilidad

### Backend (según documentación)

1. Rechaza pagos que excedan sin justificación
2. Calcula automáticamente `diferencia.monto`
3. Valida que la justificación no esté vacía

## Notas Técnicas

- El campo `diferencia.monto` es calculado por el backend, nunca se envía desde el frontend
- Solo se envía `diferencia.justificacion` cuando aplica
- La validación es en tiempo real mientras el usuario escribe
- El diseño visual usa colores naranjas para indicar advertencia (no error)
- Compatible con todas las monedas (USD, EUR, CUP)
- Considera la tasa de cambio en todas las validaciones

## Testing Recomendado

1. **Crear pago normal** (monto < pendiente)
   - No debe aparecer campo de justificación
   - Debe funcionar como antes

2. **Crear pago con excedente** (monto > pendiente)
   - Debe aparecer campo de justificación
   - Debe requerir mínimo 10 caracteres
   - Debe enviar correctamente al backend

3. **Editar pago sin cambiar monto**
   - Debe mostrar diferencia existente si la hay
   - No debe requerir nueva justificación

4. **Editar pago aumentando monto**
   - Debe validar contra disponible correcto
   - Debe requerir justificación si excede

5. **Visualización en tablas**
   - Verificar que se muestra correctamente en ambas vistas
   - Verificar colores y formato

## Compatibilidad

- ✅ Compatible con pagos existentes sin diferencia
- ✅ Compatible con todas las monedas
- ✅ Compatible con todos los métodos de pago
- ✅ No rompe funcionalidad existente
- ✅ Validaciones solo cuando aplica
