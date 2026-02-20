# Cómo Ver el Error 400 Completo

## Paso 1: Limpiar la Consola

1. Abre DevTools (F12)
2. Ve a la pestaña **Console**
3. Click en el icono de "Clear console" (🚫) o presiona `Ctrl+L`

## Paso 2: Ver Todos los Logs

1. Asegúrate de que no haya filtros activos en la consola
2. En el dropdown de niveles, asegúrate de que estén seleccionados:
   - ✅ Verbose
   - ✅ Info
   - ✅ Warnings
   - ✅ Errors

## Paso 3: Intentar Crear el Pago

1. Intenta crear el pago que te da error 400
2. En la consola deberías ver una secuencia de logs como:

```
🚀 [RegistrarPago] Iniciando validación del formulario
📋 FormData completo: { monto: "2500", ... }
📋 Oferta: { id: "...", numero: "OF-...", pendiente: 2000 }
💰 Monto parseado: 2500
✅ Todas las validaciones pasaron, construyendo pagoData...
🔍 Validación diferencia:
  - Monto en USD: 2500
  - Monto pendiente: 2000
  - Excede pendiente: true
  - Justificación: "..."
📤 Payload completo a enviar al backend: { ... }
🚀 [PagoService.crearPago] Iniciando creación de pago
❌ [PagoService.crearPago] Error al crear pago: ...
❌ [RegistrarPago] Error capturado: ...
```

## Paso 4: Ver el Payload en Network Tab

Si los logs no aparecen o quieres ver el payload exacto:

1. Ve a la pestaña **Network** en DevTools
2. Limpia las peticiones (icono 🚫)
3. Intenta crear el pago de nuevo
4. Busca la petición que falló (debería estar en rojo con status 400)
5. Click en ella
6. Ve a las siguientes pestañas:

### Pestaña Headers
Busca la sección **Request Payload** o **Request Body**. Verás algo como:

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

### Pestaña Response
Verás la respuesta del backend:

```json
{
  "success": false,
  "message": "El monto del pago en USD (2500.00) excede el monto pendiente (2000.00). Debe proporcionar el campo 'diferencia' con 'monto' y 'justificacion'."
}
```

## Paso 5: Copiar y Compartir

Copia y comparte:

1. **Todos los logs de la consola** (desde 🚀 hasta ❌)
2. **El Request Payload completo** (de Network Tab)
3. **El Response completo** (de Network Tab)
4. **Los valores que ingresaste:**
   - Monto: _____
   - Moneda: _____
   - Monto pendiente de la oferta: _____
   - ¿Ingresaste justificación?: Sí/No
   - Justificación (si la ingresaste): _____

## Ejemplo de lo que Necesito Ver

### Logs de la Consola
```
🚀 [RegistrarPago] Iniciando validación del formulario
📋 FormData completo: {
  monto: "2500",
  moneda: "USD",
  tasa_cambio: 1,
  justificacion_diferencia: "Cliente pagó de más como propina"
}
📋 Oferta: { id: "abc123", numero: "OF-001", pendiente: 2000 }
💰 Monto parseado: 2500
✅ Todas las validaciones pasaron, construyendo pagoData...
🔍 Validación diferencia:
  - Monto en USD: 2500
  - Monto pendiente: 2000
  - Excede pendiente: true
  - Justificación: "Cliente pagó de más como propina"
✅ Campo diferencia agregado: { justificacion: "Cliente pagó de más como propina" }
📤 Payload completo a enviar al backend: {
  "oferta_id": "abc123",
  "monto": 2500,
  "diferencia": {
    "justificacion": "Cliente pagó de más como propina"
  }
}
🚀 [PagoService.crearPago] Iniciando creación de pago
❌ [PagoService.crearPago] Error al crear pago: Error message here
```

### Request Payload (Network Tab)
```json
{
  "oferta_id": "abc123",
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

### Response (Network Tab)
```json
{
  "success": false,
  "message": "Error message from backend"
}
```

## Si No Ves los Logs

Si después de limpiar la consola y volver a intentar NO ves los logs con emojis (🚀, 📋, etc.), puede ser que:

1. **Hay un error de JavaScript que impide la ejecución**
   - Busca errores en rojo en la consola
   - Compártelos

2. **El código no se recompiló**
   - Guarda todos los archivos
   - Espera a que Next.js recompile (verás "✓ Compiled" en la terminal)
   - Refresca la página (Ctrl+R o Cmd+R)
   - Intenta de nuevo

3. **Caché del navegador**
   - Refresca con caché limpio: `Ctrl+Shift+R` (Windows/Linux) o `Cmd+Shift+R` (Mac)
   - O abre en modo incógnito

## Siguiente Paso

Una vez que tengas los logs y el payload, podremos identificar exactamente qué está fallando:

- ¿El campo `diferencia` se está enviando?
- ¿Tiene la estructura correcta?
- ¿La justificación está vacía?
- ¿Qué dice exactamente el backend?
