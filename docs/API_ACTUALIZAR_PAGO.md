# API - Actualizar Pago

## Descripción

Endpoint para actualizar un pago existente. Se pueden modificar todos los campos excepto `oferta_id`.

El sistema ajusta automáticamente el `monto_pendiente` de la oferta cuando se modifica el monto, moneda o tasa de cambio del pago.

## Endpoint

```
PUT /api/pagos/{pago_id}
```

## Autenticación

Requiere token Bearer en el header `Authorization`.

## Parámetros de Ruta

- **pago_id** (requerido): ID del pago a actualizar

## Body de la Petición

Todos los campos son opcionales. Solo se actualizan los campos enviados.

```json
{
  "monto": 3000.00,
  "fecha": "2024-02-16T14:30:00Z",
  "tipo_pago": "anticipo",
  "metodo_pago": "transferencia_bancaria",
  "moneda": "EUR",
  "tasa_cambio": 1.08,
  "pago_cliente": true,
  "nombre_pagador": "Juan Pérez García",
  "carnet_pagador": "12345678901",
  "comprobante_transferencia": "https://minio.example.com/comprobante.jpg",
  "recibido_por": "María López",
  "desglose_billetes": {
    "100": 5,
    "50": 10
  },
  "notas": "Pago actualizado por corrección",
  "creado_por": "admin@suncar.com"
}
```

## Campos Actualizables

### Campos Principales
- **monto**: Monto del pago (debe ser mayor a 0)
- **fecha**: Fecha y hora del pago
- **tipo_pago**: Tipo de pago (`anticipo` o `pendiente`)
- **metodo_pago**: Método de pago (`efectivo`, `transferencia_bancaria`, `stripe`)

### Campos de Moneda
- **moneda**: Moneda del pago (`USD`, `EUR`, `CUP`, `MLC`)
- **tasa_cambio**: Tasa de cambio con respecto al USD (debe ser mayor a 0)

### Campos de Pagador
- **pago_cliente**: Booleano que indica si paga el cliente (true) o tercero (false)
- **nombre_pagador**: Nombre de quien realiza el pago
- **carnet_pagador**: Carnet de quien realiza el pago

### Campos de Comprobante
- **comprobante_transferencia**: URL del comprobante (para transferencias/Stripe)
- **recibido_por**: Nombre de quien recibió el pago (para efectivo)
- **desglose_billetes**: Objeto con el desglose de billetes (para efectivo)

### Campos Adicionales
- **notas**: Notas adicionales sobre el pago
- **creado_por**: Usuario que crea/modifica el pago

## Campo NO Actualizable

- **oferta_id**: No se puede cambiar la oferta asociada al pago

## Respuesta Exitosa

```json
{
  "success": true,
  "message": "Pago actualizado exitosamente",
  "pago_id": "20240215-001"
}
```

## Comportamiento Automático

### 1. Recálculo de monto_usd

Cuando se actualiza `monto`, `moneda` o `tasa_cambio`, el sistema:
- Recalcula automáticamente el `monto_usd`
- Fórmula: Si moneda es USD → monto_usd = monto
- Fórmula: Si moneda no es USD → monto_usd = monto × tasa_cambio

### 2. Ajuste de monto_pendiente

El sistema ajusta el `monto_pendiente` de la oferta:
- Calcula la diferencia entre el monto_usd anterior y el nuevo
- Resta la diferencia del monto_pendiente actual
- Valida que el monto_pendiente no sea negativo

Ejemplo:
```
Monto anterior: 2000 USD
Monto nuevo: 2500 USD
Diferencia: +500 USD
Monto pendiente: 3000 - 500 = 2500 USD
```

### 3. Actualización de datos del pagador

Si se cambia `pago_cliente` a `true`:
- El sistema obtiene automáticamente `nombre_pagador` y `carnet_pagador` del cliente/lead de la oferta
- Si no se encuentra el contacto, estos campos se establecen en `null`

Si se cambia `pago_cliente` a `false`:
- Se requiere proporcionar `nombre_pagador` manualmente

## Ejemplos de Uso

### Actualizar solo el monto

```bash
curl -X PUT "http://localhost:8000/api/pagos/20240215-001" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monto": 2800.00
  }'
```

### Cambiar moneda y tasa de cambio

```bash
curl -X PUT "http://localhost:8000/api/pagos/20240215-001" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moneda": "EUR",
    "tasa_cambio": 1.10
  }'
```

### Actualizar método de pago y comprobante

```bash
curl -X PUT "http://localhost:8000/api/pagos/20240215-001" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "metodo_pago": "transferencia_bancaria",
    "comprobante_transferencia": "https://minio.example.com/nuevo-comprobante.jpg"
  }'
```

### Cambiar de pago de cliente a pago de tercero

```bash
curl -X PUT "http://localhost:8000/api/pagos/20240215-001" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pago_cliente": false,
    "nombre_pagador": "Pedro Martínez",
    "carnet_pagador": "98765432109"
  }'
```

### Actualizar múltiples campos

```bash
curl -X PUT "http://localhost:8000/api/pagos/20240215-001" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monto": 3000.00,
    "moneda": "EUR",
    "tasa_cambio": 1.08,
    "notas": "Monto corregido según factura actualizada",
    "fecha": "2024-02-16T10:00:00Z"
  }'
```

## Respuestas de Error

### Pago no encontrado (404)
```json
{
  "detail": "Pago no encontrado o sin cambios"
}
```

### Validación fallida (400)
```json
{
  "detail": "El nuevo monto del pago (5000.00 USD) excede el monto pendiente disponible"
}
```

```json
{
  "detail": "nombre_pagador es requerido cuando pago_cliente es False"
}
```

```json
{
  "detail": "No hay campos válidos para actualizar"
}
```

### Error del servidor (500)
```json
{
  "detail": "Error actualizando pago: [mensaje de error]"
}
```

## Validaciones

1. **Monto positivo**: El monto debe ser mayor a 0
2. **Tasa de cambio positiva**: La tasa de cambio debe ser mayor a 0
3. **Monto pendiente no negativo**: El nuevo monto no puede exceder el monto pendiente disponible
4. **Pagador requerido**: Si `pago_cliente` es false, se requiere `nombre_pagador`
5. **Oferta inmutable**: No se puede cambiar el `oferta_id`

## Casos de Uso

1. **Corrección de errores**: Corregir montos o fechas ingresadas incorrectamente
2. **Actualización de tasa de cambio**: Ajustar la tasa cuando hay cambios en el tipo de cambio
3. **Cambio de método de pago**: Modificar el método si el cliente cambia de opinión
4. **Agregar comprobantes**: Añadir comprobantes de transferencia después de crear el pago
5. **Actualizar información del pagador**: Corregir o completar datos del pagador
6. **Añadir notas**: Agregar información adicional sobre el pago

## Notas Técnicas

- Solo se actualizan los campos enviados en el request (campos opcionales)
- El campo `oferta_id` está protegido y no se puede modificar
- Los cambios en monto/moneda/tasa afectan automáticamente el monto_pendiente de la oferta
- El sistema registra logs detallados de los cambios realizados
- La fecha de actualización se actualiza automáticamente

## Diferencia con Otros Endpoints

- **POST /api/pagos**: Crea un nuevo pago
- **PUT /api/pagos/{pago_id}**: Actualiza un pago existente (este endpoint)
- **DELETE /api/pagos/{pago_id}**: Elimina un pago y devuelve el monto a la oferta
- **GET /api/pagos/{pago_id}**: Obtiene los detalles de un pago

## Ventajas

1. **Flexibilidad total**: Se pueden actualizar todos los campos excepto oferta_id
2. **Actualización parcial**: Solo envía los campos que necesitas cambiar
3. **Cálculos automáticos**: El sistema maneja monto_usd y monto_pendiente
4. **Validaciones robustas**: Previene inconsistencias en los datos
5. **Trazabilidad**: Logs detallados de todos los cambios
