# API Pagos - Campo Diferencia

## Nuevo Campo en Pagos

Se agregó el campo `diferencia` para manejar pagos que exceden el monto pendiente.

### Estructura

```typescript
diferencia?: {
  monto: number;        // Calculado automáticamente por el backend
  justificacion: string; // OBLIGATORIO cuando el pago excede el pendiente
}
```

## Endpoints Afectados

### 1. POST /pagos - Crear Pago

**Cuándo incluir `diferencia`:**
- Cuando `monto_pago > monto_pendiente` de la oferta

**Request:**
```json
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

**Response exitoso:**
```json
{
  "success": true,
  "message": "Pago creado exitosamente",
  "pago_id": "PAG-20240215-001",
  "pago": {
    "id": "PAG-20240215-001",
    "monto": 2500,
    "diferencia": {
      "monto": 500,  // Calculado: 2500 - 2000
      "justificacion": "Cliente pagó de más para cubrir servicios adicionales"
    }
  },
  "monto_pendiente_actualizado": 0
}
```

**Error si falta justificación:**
```json
{
  "success": false,
  "message": "El monto del pago en USD (2500.00) excede el monto pendiente (2000.00). Debe proporcionar el campo 'diferencia' con 'monto' y 'justificacion'."
}
```

### 2. PUT /pagos/{pago_id} - Actualizar Pago

**Cuándo incluir `diferencia`:**
- Cuando el nuevo monto hace que se exceda el pendiente disponible

**Request:**
```json
{
  "monto": 2200,
  "diferencia": {
    "justificacion": "Corrección de monto, incluye propina"
  }
}
```

### 3. GET /pagos/{pago_id} - Obtener Pago

**Response:**
```json
{
  "id": "PAG-20240215-001",
  "oferta_id": "OF-20240215-001",
  "monto": 2500,
  "moneda": "USD",
  "diferencia": {
    "monto": 500,
    "justificacion": "Cliente pagó de más para cubrir servicios adicionales"
  },
  // ... otros campos
}
```

### 4. GET /pagos - Listar Pagos

Los pagos con diferencia incluirán el campo en el array de resultados.

## Validaciones Frontend

1. **Antes de enviar el pago:**
   - Calcular si `monto_pago > monto_pendiente`
   - Si es así, mostrar campo de justificación (obligatorio)

2. **Campo justificación:**
   - Mínimo 10 caracteres recomendado
   - No puede estar vacío si hay diferencia

3. **Mostrar diferencia:**
   - Si el pago tiene `diferencia`, mostrarla en la UI
   - Útil para auditoría y reportes

## Ejemplo de Validación en Frontend

```typescript
const validarPago = (monto: number, montoPendiente: number) => {
  if (monto > montoPendiente) {
    // Mostrar campo de justificación
    return {
      requiereJustificacion: true,
      diferencia: monto - montoPendiente
    };
  }
  return { requiereJustificacion: false };
};
```

## Casos de Uso

- Cliente paga de más como propina
- Anticipo para futuros servicios
- Acuerdos verbales de servicios adicionales
- Correcciones de errores de cálculo
- Redondeos comerciales

## Notas Importantes

- El campo `diferencia.monto` es calculado por el backend, no enviarlo
- Solo enviar `diferencia.justificacion` cuando aplique
- El backend rechazará pagos que excedan el pendiente sin justificación
