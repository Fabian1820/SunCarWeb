# Guía de Debugging - Campo Diferencia en Pagos

## Logs Implementados

Se agregaron logs detallados en todo el flujo para facilitar el debugging del campo `diferencia`.

## Dónde Ver los Logs

### 1. Consola del Navegador (Chrome DevTools)

Abre la consola del navegador (F12 → Console) y verás logs con estos emojis:

- 🔍 = Validación de diferencia
- 📤 = Payload que se envía
- 🚀 = Inicio de operación
- ✅ = Operación exitosa
- ❌ = Error
- ⚠️ = Advertencia

### 2. Network Tab (Pestaña Red)

1. Abre DevTools (F12)
2. Ve a la pestaña "Network" (Red)
3. Filtra por "Fetch/XHR"
4. Busca la petición a `/api/pagos/` o `/api/pagos/{id}`
5. Click en la petición
6. Ve a la pestaña "Payload" o "Request"
7. Verás el JSON exacto enviado

## Flujo de Logs - Crear Pago

### En `registrar-pago-dialog.tsx`

```
🔍 Validación diferencia:
  - Monto en USD: 2500
  - Monto pendiente: 2000
  - Excede pendiente: true
  - Justificación: "Cliente pagó de más para cubrir servicios adicionales"

✅ Campo diferencia agregado: { justificacion: "Cliente pagó de más..." }

📤 Payload completo a enviar al backend:
{
  "oferta_id": "OF-20240215-001",
  "monto": 2500,
  "moneda": "USD",
  "tipo_pago": "pendiente",
  "metodo_pago": "efectivo",
  "diferencia": {
    "justificacion": "Cliente pagó de más para cubrir servicios adicionales"
  }
}
```

### En `pago-service.ts`

```
🚀 [PagoService.crearPago] Iniciando creación de pago
📦 Datos recibidos: { ... }
🔍 Campo diferencia detectado: { justificacion: "..." }
✅ diferencia.justificacion válido: "Cliente pagó de más..."
✅ [PagoService.crearPago] Respuesta exitosa: { ... }
```

## Flujo de Logs - Editar Pago

### En `editar-pago-dialog.tsx`

```
🔍 Validación diferencia (edición):
  - Monto en USD: 2200
  - Monto disponible: 2100
  - Excede disponible: true
  - Justificación: "Corrección de monto, incluye propina"

✅ Campo diferencia agregado: { justificacion: "Corrección de monto..." }

📤 Payload completo a enviar al backend:
{
  "monto": 2200,
  "diferencia": {
    "justificacion": "Corrección de monto, incluye propina"
  }
}
```

### En `pago-service.ts`

```
🚀 [PagoService.actualizarPago] Iniciando actualización de pago
🆔 Pago ID: PAG-20240215-001
📦 Datos recibidos: { ... }
🔍 Campo diferencia detectado: { justificacion: "..." }
✅ diferencia.justificacion válido: "Corrección de monto..."
✅ [PagoService.actualizarPago] Respuesta exitosa: { ... }
```

## Casos de Error Comunes

### Error 1: Diferencia sin justificación

**Logs esperados:**
```
🔍 Validación diferencia:
  - Monto en USD: 2500
  - Monto pendiente: 2000
  - Excede pendiente: true
  - Justificación: ""

⚠️ Monto excede pendiente pero NO hay justificación
```

**Solución:** El frontend debe mostrar error antes de enviar. Si llega al backend, el backend rechazará con 400.

### Error 2: Justificación vacía en el objeto

**Logs esperados:**
```
🔍 Campo diferencia detectado: { justificacion: "" }
❌ ERROR: diferencia.justificacion está vacío
```

**Solución:** Verificar que el trim() funcione correctamente y que no se envíe si está vacío.

### Error 3: Estructura incorrecta

**Payload incorrecto:**
```json
{
  "diferencia": {
    "monto": 500,  // ❌ NO enviar esto
    "justificacion": "..."
  }
}
```

**Payload correcto:**
```json
{
  "diferencia": {
    "justificacion": "..."  // ✅ Solo esto
  }
}
```

## Checklist de Debugging

Cuando tengas un error 400, verifica en este orden:

### 1. ¿El monto realmente excede el pendiente?

Busca en los logs:
```
🔍 Validación diferencia:
  - Monto en USD: X
  - Monto pendiente: Y
  - Excede pendiente: true/false
```

Si es `false`, no debería enviar diferencia.

### 2. ¿Hay justificación?

Busca en los logs:
```
  - Justificación: "texto aquí"
```

Si está vacío o es `""`, el frontend debe mostrar error.

### 3. ¿Se agregó el campo diferencia?

Busca en los logs:
```
✅ Campo diferencia agregado: { justificacion: "..." }
```

Si no ves este log, el campo no se agregó al payload.

### 4. ¿El payload es correcto?

Busca en los logs:
```
📤 Payload completo a enviar al backend:
```

Verifica que:
- Existe el campo `diferencia`
- Tiene la estructura `{ justificacion: "..." }`
- NO tiene el campo `monto`
- La justificación no está vacía

### 5. ¿Qué dice el backend?

Busca en los logs:
```
❌ [PagoService.crearPago] Error al crear pago:
📋 Detalles del error:
  - message: "..."
  - response: { ... }
  - status: 400
```

El mensaje del backend te dirá exactamente qué falta.

## Ejemplos de Payloads Correctos

### Crear Pago Normal (sin diferencia)

```json
{
  "oferta_id": "OF-20240215-001",
  "monto": 1500,
  "fecha": "2024-02-15",
  "tipo_pago": "anticipo",
  "metodo_pago": "efectivo",
  "moneda": "USD",
  "tasa_cambio": 1.0,
  "pago_cliente": true,
  "recibido_por": "Juan Pérez"
}
```

### Crear Pago con Diferencia

```json
{
  "oferta_id": "OF-20240215-001",
  "monto": 2500,
  "fecha": "2024-02-15",
  "tipo_pago": "pendiente",
  "metodo_pago": "efectivo",
  "moneda": "USD",
  "tasa_cambio": 1.0,
  "pago_cliente": true,
  "recibido_por": "Juan Pérez",
  "diferencia": {
    "justificacion": "Cliente pagó de más para cubrir servicios adicionales"
  }
}
```

### Actualizar Pago con Diferencia

```json
{
  "monto": 2200,
  "fecha": "2024-02-15",
  "tipo_pago": "pendiente",
  "metodo_pago": "efectivo",
  "moneda": "USD",
  "tasa_cambio": 1.0,
  "diferencia": {
    "justificacion": "Corrección de monto, incluye propina"
  }
}
```

## Cómo Probar

### Test 1: Pago Normal (sin exceder)

1. Abre el diálogo de registrar pago
2. Ingresa un monto menor al pendiente
3. Completa el formulario
4. Envía
5. **Esperado:** No debe aparecer campo de justificación, no debe enviar diferencia

### Test 2: Pago con Excedente (con justificación)

1. Abre el diálogo de registrar pago
2. Ingresa un monto mayor al pendiente
3. **Esperado:** Aparece campo de justificación automáticamente
4. Ingresa justificación (mínimo 10 caracteres)
5. Envía
6. **Esperado:** Debe enviar diferencia con justificación

### Test 3: Pago con Excedente (sin justificación)

1. Abre el diálogo de registrar pago
2. Ingresa un monto mayor al pendiente
3. **Esperado:** Aparece campo de justificación
4. NO ingreses justificación (déjalo vacío)
5. Intenta enviar
6. **Esperado:** Debe mostrar error antes de enviar

### Test 4: Editar Pago (aumentar monto)

1. Abre el diálogo de editar pago
2. Aumenta el monto para que exceda el disponible
3. **Esperado:** Aparece campo de justificación
4. Ingresa justificación
5. Envía
6. **Esperado:** Debe enviar diferencia con justificación

## Network Tab - Qué Buscar

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Payload (Body)
```json
{
  "oferta_id": "...",
  "monto": 2500,
  "diferencia": {
    "justificacion": "..."
  }
}
```

### Response (si es exitoso)
```json
{
  "success": true,
  "message": "Pago creado exitosamente",
  "pago_id": "PAG-...",
  "pago": {
    "id": "PAG-...",
    "monto": 2500,
    "diferencia": {
      "monto": 500,
      "justificacion": "..."
    }
  }
}
```

### Response (si hay error)
```json
{
  "success": false,
  "message": "El monto del pago en USD (2500.00) excede el monto pendiente (2000.00). Debe proporcionar el campo 'diferencia' con 'monto' y 'justificacion'."
}
```

## Contacto con Backend

Si después de verificar todos los logs el payload parece correcto pero sigue dando error 400, comparte:

1. Los logs completos de la consola (desde 🔍 hasta ❌)
2. El payload exacto del Network Tab
3. La respuesta del backend (status y body)
4. Los valores de:
   - Monto ingresado
   - Moneda
   - Tasa de cambio
   - Monto pendiente de la oferta
   - Justificación ingresada

Esto ayudará a identificar si el problema está en el frontend o en el backend.
