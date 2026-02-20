# Test Manual - Campo Diferencia

## Cómo Probar el Campo Diferencia

### Preparación

1. Abre tu aplicación en el navegador
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **Console**
4. Navega a la página de pagos

### Test 1: Pago Normal (sin exceder)

**Objetivo:** Verificar que pagos normales siguen funcionando.

1. Click en "Registrar Pago" en una oferta
2. Ingresa un monto **menor** al pendiente (ej: si pendiente es $2000, ingresa $1500)
3. Completa el formulario
4. **Esperado:** 
   - NO debe aparecer campo de justificación
   - El pago debe crearse normalmente
   - En la consola NO verás logs de diferencia

### Test 2: Pago con Excedente (exitoso)

**Objetivo:** Verificar que el campo diferencia funciona correctamente.

1. Click en "Registrar Pago" en una oferta con pendiente de $2000
2. Ingresa un monto **mayor** al pendiente (ej: $2500)
3. **Esperado:** Debe aparecer automáticamente un campo de justificación con fondo naranja
4. Ingresa una justificación (ej: "Cliente pagó de más como propina")
5. Completa el resto del formulario
6. Click en "Registrar Pago"

**En la consola verás:**
```
🔍 Validación diferencia:
  - Monto en USD: 2500
  - Monto pendiente: 2000
  - Excede pendiente: true
  - Justificación: "Cliente pagó de más como propina"

✅ Campo diferencia agregado: { justificacion: "Cliente pagó de más como propina" }

📤 Payload completo a enviar al backend:
{
  "oferta_id": "OF-20240215-001",
  "monto": 2500,
  "moneda": "USD",
  "tipo_pago": "pendiente",
  "metodo_pago": "efectivo",
  "diferencia": {
    "justificacion": "Cliente pagó de más como propina"
  },
  ...
}

🚀 [PagoService.crearPago] Iniciando creación de pago
📦 Datos recibidos: { ... }
🔍 Campo diferencia detectado: { justificacion: "Cliente pagó de más como propina" }
✅ diferencia.justificacion válido: Cliente pagó de más como propina
```

**Si es exitoso:**
```
✅ [PagoService.crearPago] Respuesta exitosa: { success: true, ... }
```

**Si hay error:**
```
❌ [PagoService.crearPago] Error al crear pago:
📋 Detalles del error:
  - message: "..."
  - status: 400
```

### Test 3: Pago con Excedente (sin justificación)

**Objetivo:** Verificar que la validación funciona.

1. Click en "Registrar Pago"
2. Ingresa un monto mayor al pendiente (ej: $2500)
3. **Esperado:** Aparece campo de justificación
4. **NO ingreses nada** en la justificación (déjalo vacío)
5. Intenta enviar el formulario

**Esperado:**
- Debe mostrar error: "El monto en USD ($2500.00) excede el monto pendiente ($2000.00). Debe proporcionar una justificación."
- NO debe enviar al backend
- En la consola verás:
```
🔍 Validación diferencia:
  - Monto en USD: 2500
  - Monto pendiente: 2000
  - Excede pendiente: true
  - Justificación: ""

⚠️ Monto excede pendiente pero NO hay justificación
```

### Test 4: Pago con Excedente (justificación muy corta)

**Objetivo:** Verificar validación de longitud mínima.

1. Click en "Registrar Pago"
2. Ingresa un monto mayor al pendiente
3. Ingresa una justificación muy corta (ej: "propina")
4. Intenta enviar

**Esperado:**
- Debe mostrar error: "La justificación debe tener al menos 10 caracteres"
- NO debe enviar al backend

### Test 5: Editar Pago (aumentar monto)

**Objetivo:** Verificar que editar pagos funciona con diferencia.

1. En la tabla de pagos, click en el botón de editar (lápiz) de un pago existente
2. Aumenta el monto para que exceda el disponible
3. **Esperado:** Aparece campo de justificación
4. Ingresa justificación
5. Click en "Actualizar Pago"

**En la consola verás:**
```
🔍 Validación diferencia (edición):
  - Monto en USD: 2200
  - Monto disponible: 2100
  - Excede disponible: true
  - Justificación: "Corrección de monto"

✅ Campo diferencia agregado: { justificacion: "Corrección de monto" }

📤 Payload completo a enviar al backend:
{
  "monto": 2200,
  "diferencia": {
    "justificacion": "Corrección de monto"
  },
  ...
}
```

### Test 6: Visualización en Tablas

**Objetivo:** Verificar que los pagos con diferencia se muestran correctamente.

1. Después de crear un pago con diferencia exitosamente
2. Ve a la tabla de pagos
3. **Vista Agrupada:** Expande la oferta y busca el pago
4. **Esperado:** Debe mostrar un bloque naranja con:
   - "Excedente: $500.00"
   - La justificación en texto italic

5. **Vista Plana:** Cambia a vista plana
6. **Esperado:** Debe mostrar:
   - Badge naranja "+$500.00" en la columna de monto
   - Link "Ver justificación excedente" que al expandir muestra la justificación

## Verificación en Network Tab

Si quieres ver el payload exacto que se envía:

1. En DevTools, ve a la pestaña **Network** (Red)
2. Filtra por "Fetch/XHR"
3. Intenta crear un pago con diferencia
4. Busca la petición a `/api/pagos/`
5. Click en ella
6. Ve a la pestaña **Payload** o **Request**
7. Verás el JSON exacto:

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
    "justificacion": "Cliente pagó de más como propina"
  }
}
```

## Checklist de Verificación

- [ ] Test 1: Pago normal funciona sin cambios
- [ ] Test 2: Pago con excedente se crea correctamente
- [ ] Test 3: Validación de justificación vacía funciona
- [ ] Test 4: Validación de longitud mínima funciona
- [ ] Test 5: Editar pago con diferencia funciona
- [ ] Test 6: Visualización en tabla agrupada correcta
- [ ] Test 7: Visualización en tabla plana correcta
- [ ] Test 8: Logs aparecen en la consola del navegador
- [ ] Test 9: Payload en Network Tab es correcto

## Problemas Comunes

### No veo los logs en la consola

**Solución:** Asegúrate de estar viendo la consola del **navegador** (F12), no la terminal del servidor.

### El campo de justificación no aparece

**Solución:** 
1. Verifica que el monto ingresado sea mayor al pendiente
2. Si usas otra moneda, verifica que el equivalente en USD exceda el pendiente
3. Revisa la consola por errores de JavaScript

### Error 400 al enviar

**Solución:**
1. Revisa los logs en la consola
2. Verifica el payload en Network Tab
3. Compara con los ejemplos en `docs/DEBUG_CAMPO_DIFERENCIA.md`

### El pago se crea pero no veo la diferencia en la tabla

**Solución:**
1. Refresca la página
2. Verifica que el backend esté devolviendo el campo `diferencia` en la respuesta
3. Revisa la consola por errores al renderizar

## Siguiente Paso

Si todos los tests pasan, el campo diferencia está funcionando correctamente. Si algún test falla, revisa:

1. Los logs en la consola del navegador
2. El payload en Network Tab
3. La documentación en `docs/DEBUG_CAMPO_DIFERENCIA.md`
