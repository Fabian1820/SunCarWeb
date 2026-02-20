# Cómo Debuggear el Campo Diferencia - Guía Rápida

## Paso 1: Abre la Consola del Navegador

1. Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux) o `Cmd+Option+I` (Mac)
2. Ve a la pestaña **Console**

## Paso 2: Intenta Crear un Pago con Excedente

1. Abre el diálogo de registrar pago
2. Selecciona una oferta con monto pendiente (ej: $2000)
3. Ingresa un monto mayor (ej: $2500)
4. Verás aparecer el campo de justificación automáticamente
5. Ingresa una justificación (ej: "Cliente pagó de más como propina")
6. Click en "Registrar Pago"

## Paso 3: Lee los Logs en la Consola

Busca estos logs en orden:

### ✅ Log 1: Validación
```
🔍 Validación diferencia:
  - Monto en USD: 2500
  - Monto pendiente: 2000
  - Excede pendiente: true
  - Justificación: "Cliente pagó de más como propina"
```

**¿Qué verificar?**
- ¿El monto en USD es correcto?
- ¿Excede pendiente es `true`?
- ¿La justificación tiene texto?

### ✅ Log 2: Campo Agregado
```
✅ Campo diferencia agregado: { justificacion: "Cliente pagó de más como propina" }
```

**¿Qué verificar?**
- ¿Aparece este log?
- ¿La justificación está completa?

### ✅ Log 3: Payload Completo
```
📤 Payload completo a enviar al backend:
{
  "oferta_id": "OF-20240215-001",
  "monto": 2500,
  "moneda": "USD",
  "tipo_pago": "pendiente",
  "metodo_pago": "efectivo",
  "diferencia": {
    "justificacion": "Cliente pagó de más como propina"
  }
}
```

**¿Qué verificar?**
- ¿Existe el campo `diferencia`?
- ¿Tiene solo `justificacion` (NO `monto`)?
- ¿La justificación no está vacía?

### ✅ Log 4: Servicio
```
🚀 [PagoService.crearPago] Iniciando creación de pago
📦 Datos recibidos: { ... }
🔍 Campo diferencia detectado: { justificacion: "..." }
✅ diferencia.justificacion válido: "Cliente pagó de más como propina"
```

**¿Qué verificar?**
- ¿Se detectó el campo diferencia?
- ¿La justificación es válida?

### ✅ Log 5: Respuesta (si es exitoso)
```
✅ [PagoService.crearPago] Respuesta exitosa: { ... }
```

### ❌ Log 5: Error (si falla)
```
❌ [PagoService.crearPago] Error al crear pago:
📋 Detalles del error:
  - message: "..."
  - response: { ... }
  - status: 400
```

## Paso 4: Si Hay Error 400

### Opción A: Revisa el Network Tab

1. En DevTools, ve a la pestaña **Network** (Red)
2. Busca la petición a `/api/pagos/`
3. Click en ella
4. Ve a la pestaña **Payload** o **Request**
5. Copia el JSON completo

### Opción B: Revisa el mensaje del backend

En los logs, busca:
```
📋 Detalles del error:
  - message: "El monto del pago en USD (2500.00) excede..."
```

Este mensaje te dirá exactamente qué falta.

## Errores Comunes y Soluciones

### Error: "Debe proporcionar el campo 'diferencia'"

**Causa:** El campo `diferencia` no se envió al backend.

**Verifica:**
1. ¿Aparece el log "✅ Campo diferencia agregado"?
2. ¿El payload tiene el campo `diferencia`?

**Solución:** Si no aparece, el problema está en la validación del frontend.

### Error: "diferencia.justificacion está vacío"

**Causa:** La justificación está vacía o es null.

**Verifica:**
1. ¿Ingresaste texto en el campo de justificación?
2. ¿El log muestra `Justificación: ""`?

**Solución:** Asegúrate de ingresar al menos 10 caracteres.

### Error: "Estructura incorrecta"

**Causa:** El campo `diferencia` tiene estructura incorrecta.

**Verifica el payload:**
```json
// ❌ INCORRECTO
{
  "diferencia": {
    "monto": 500,
    "justificacion": "..."
  }
}

// ✅ CORRECTO
{
  "diferencia": {
    "justificacion": "..."
  }
}
```

**Solución:** No envíes `diferencia.monto`, solo `diferencia.justificacion`.

## Ejemplo Completo de Logs Exitosos

```
🔍 Validación diferencia:
  - Monto en USD: 2500
  - Monto pendiente: 2000
  - Excede pendiente: true
  - Justificación: "Cliente pagó de más para cubrir servicios adicionales"

✅ Campo diferencia agregado: { justificacion: "Cliente pagó de más para cubrir servicios adicionales" }

📤 Payload completo a enviar al backend:
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

🚀 [PagoService.crearPago] Iniciando creación de pago
📦 Datos recibidos: { ... }
🔍 Campo diferencia detectado: { justificacion: "Cliente pagó de más para cubrir servicios adicionales" }
✅ diferencia.justificacion válido: Cliente pagó de más para cubrir servicios adicionales
✅ [PagoService.crearPago] Respuesta exitosa: { success: true, pago_id: "PAG-..." }
```

## Qué Compartir si Necesitas Ayuda

Si después de revisar los logs sigues teniendo problemas, comparte:

1. **Todos los logs de la consola** (desde 🔍 hasta ✅ o ❌)
2. **El payload del Network Tab** (JSON completo)
3. **La respuesta del backend** (status y mensaje)
4. **Valores específicos:**
   - Monto ingresado: _____
   - Moneda: _____
   - Monto pendiente de la oferta: _____
   - Justificación ingresada: _____

## Documentos Relacionados

- `docs/DEBUG_CAMPO_DIFERENCIA.md` - Guía detallada de debugging
- `docs/FRONTEND_CAMPO_DIFERENCIA_PAGOS.md` - Documentación técnica completa
- `docs/API_PAGOS_CAMPO_DIFERENCIA_FRONTEND.md` - Especificación del backend
