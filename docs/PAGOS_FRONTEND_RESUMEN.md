# Resumen para Frontend - Sistema de Pagos

## Nuevos Campos en Pagos

### Moneda y Conversión
- **moneda**: `"USD" | "EUR" | "CUP"` (default: `"USD"`)
- **tasa_cambio**: `number` (default: `1.0`)
- **monto_usd**: `number` (calculado automáticamente por el backend)

### Quién Paga
- **pago_cliente**: `boolean` (default: `true`)
- **nombre_pagador**: `string | null`
- **carnet_pagador**: `string | null`

## Formulario de Crear Pago

### Campos Requeridos
```typescript
{
  oferta_id: string;
  monto: number;
  fecha: string; // ISO 8601
  tipo_pago: "anticipo" | "pendiente";
  metodo_pago: "efectivo" | "transferencia_bancaria" | "stripe";
  moneda: "USD" | "EUR" | "CUP"; // default: "USD"
  tasa_cambio: number; // default: 1.0
  pago_cliente: boolean; // default: true
}
```

### Campos Opcionales
```typescript
{
  nombre_pagador?: string; // REQUERIDO si pago_cliente = false
  carnet_pagador?: string;
  desglose_billetes?: Record<string, number>; // Ej: {"100": 3, "50": 2}
  comprobante_transferencia?: string;
  recibido_por?: string;
  notas?: string;
  creado_por?: string;
}
```

## Lógica del Formulario

### 1. Campo "¿Quién paga?"

```jsx
// Checkbox o Toggle
<Checkbox 
  checked={pagoCliente}
  onChange={(e) => setPagoCliente(e.target.checked)}
>
  El cliente paga directamente
</Checkbox>

// Mostrar campos solo si NO paga el cliente
{!pagoCliente && (
  <>
    <Input 
      label="Nombre del pagador *"
      value={nombrePagador}
      onChange={(e) => setNombrePagador(e.target.value)}
      required
    />
    <Input 
      label="Carnet del pagador"
      value={carnetPagador}
      onChange={(e) => setCarnetPagador(e.target.value)}
    />
  </>
)}
```

### 2. Campo "Moneda"

```jsx
<Select 
  label="Moneda"
  value={moneda}
  onChange={(e) => setMoneda(e.target.value)}
>
  <option value="USD">USD - Dólar</option>
  <option value="EUR">EUR - Euro</option>
  <option value="CUP">CUP - Peso Cubano</option>
</Select>

<Input 
  label="Tasa de cambio (con respecto al USD)"
  type="number"
  step="0.01"
  value={tasaCambio}
  onChange={(e) => setTasaCambio(parseFloat(e.target.value))}
  disabled={moneda === "USD"} // Deshabilitar si es USD
/>
```

### 3. Cálculo Visual del Monto en USD

```jsx
// Mostrar el equivalente en USD
{moneda !== "USD" && (
  <div className="info-box">
    Equivalente en USD: ${(monto / tasaCambio).toFixed(2)}
  </div>
)}
```

## Validaciones Frontend

```typescript
const validarFormulario = () => {
  // Validar monto
  if (monto <= 0) {
    return "El monto debe ser mayor a 0";
  }
  
  // Validar tasa de cambio
  if (tasaCambio <= 0) {
    return "La tasa de cambio debe ser mayor a 0";
  }
  
  // Validar nombre pagador si no paga el cliente
  if (!pagoCliente && !nombrePagador) {
    return "Debe ingresar el nombre de quien realiza el pago";
  }
  
  return null; // Sin errores
};
```

## Ejemplo de Request

### Cliente paga en Euros
```typescript
const pagoData = {
  oferta_id: "65f1234567890abcdef12345",
  monto: 2500.00,
  moneda: "EUR",
  tasa_cambio: 1.08,
  pago_cliente: true, // El cliente paga
  // nombre_pagador y carnet_pagador se llenan automáticamente
  fecha: new Date().toISOString(),
  tipo_pago: "anticipo",
  metodo_pago: "transferencia_bancaria",
  notas: "Pago en euros"
};

const response = await fetch('/api/pagos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(pagoData)
});
```

### Tercero paga en USD
```typescript
const pagoData = {
  oferta_id: "65f1234567890abcdef12345",
  monto: 1000.00,
  moneda: "USD",
  tasa_cambio: 1.0,
  pago_cliente: false, // NO paga el cliente
  nombre_pagador: "Pedro Martínez", // REQUERIDO
  carnet_pagador: "11223344556", // Opcional
  fecha: new Date().toISOString(),
  tipo_pago: "anticipo",
  metodo_pago: "efectivo",
  recibido_por: "Juan Pérez",
  desglose_billetes: { // Opcional para efectivo
    "100": 8,  // 8 billetes de 100
    "50": 3,   // 3 billetes de 50
    "20": 5    // 5 billetes de 20
  },
  notas: "Pago realizado por familiar"
};
```

## Mostrar Pagos (GET)

### Estructura de Respuesta
```typescript
interface Pago {
  id: string;
  oferta_id: string;
  monto: number;
  moneda: "USD" | "EUR" | "CUP";
  tasa_cambio: number;
  monto_usd: number; // Calculado por el backend
  pago_cliente: boolean;
  nombre_pagador: string | null;
  carnet_pagador: string | null;
  desglose_billetes: Record<string, number> | null; // {"100": 3, "50": 2}
  fecha: string;
  tipo_pago: "anticipo" | "pendiente";
  metodo_pago: "efectivo" | "transferencia_bancaria" | "stripe";
  comprobante_transferencia?: string;
  recibido_por?: string;
  notas?: string;
  creado_por?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
}
```

### Mostrar en Tabla
```jsx
<Table>
  <thead>
    <tr>
      <th>Fecha</th>
      <th>Monto</th>
      <th>Moneda</th>
      <th>Equivalente USD</th>
      <th>Pagador</th>
      <th>Tipo</th>
      <th>Método</th>
      <th>Detalles</th>
    </tr>
  </thead>
  <tbody>
    {pagos.map(pago => (
      <tr key={pago.id}>
        <td>{formatDate(pago.fecha)}</td>
        <td>{pago.monto.toFixed(2)}</td>
        <td>{pago.moneda}</td>
        <td>${pago.monto_usd.toFixed(2)}</td>
        <td>
          {pago.nombre_pagador || "N/A"}
          {!pago.pago_cliente && " (Tercero)"}
        </td>
        <td>{pago.tipo_pago}</td>
        <td>{pago.metodo_pago}</td>
        <td>
          {pago.metodo_pago === 'efectivo' && pago.recibido_por}
          {pago.desglose_billetes && (
            <details>
              <summary>Ver desglose</summary>
              {Object.entries(pago.desglose_billetes).map(([denom, cant]) => (
                <div key={denom}>{cant}x {denom} {pago.moneda}</div>
              ))}
            </details>
          )}
        </td>
      </tr>
    ))}
  </tbody>
</Table>
```

## Editar Pago

### Campos Editables
```typescript
// Solo estos campos se pueden editar
const camposEditables = {
  notas?: string;
  comprobante_transferencia?: string;
  recibido_por?: string;
  moneda?: "USD" | "EUR" | "CUP";
  tasa_cambio?: number;
  pago_cliente?: boolean;
  nombre_pagador?: string;
  carnet_pagador?: string;
  desglose_billetes?: Record<string, number>;
};
```

### Ejemplo de Actualización
```typescript
const actualizarPago = async (pagoId: string) => {
  const updateData = {
    moneda: "EUR",
    tasa_cambio: 1.10,
    pago_cliente: false,
    nombre_pagador: "María González",
    notas: "Actualizada tasa de cambio"
  };
  
  await fetch(`/api/pagos/${pagoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
};
```

## Tips de UX

### 1. Tasa de Cambio Automática
```jsx
// Sugerir tasa de cambio según la moneda seleccionada
const tasasSugeridas = {
  USD: 1.0,
  EUR: 1.08,
  CUP: 120.0
};

useEffect(() => {
  setTasaCambio(tasasSugeridas[moneda]);
}, [moneda]);
```

### 2. Indicador Visual
```jsx
// Mostrar quién paga con un badge
{pago.pago_cliente ? (
  <Badge color="blue">Cliente</Badge>
) : (
  <Badge color="orange">Tercero</Badge>
)}
```

### 3. Tooltip Informativo
```jsx
<Tooltip content="Si el cliente paga, sus datos se obtienen automáticamente">
  <InfoIcon />
</Tooltip>
```

### 4. Resumen del Pago
```jsx
<div className="resumen-pago">
  <p>Monto: {monto} {moneda}</p>
  {moneda !== "USD" && (
    <p>Equivalente: ${(monto / tasaCambio).toFixed(2)} USD</p>
  )}
  <p>Pagador: {pagoCliente ? "Cliente" : nombrePagador}</p>
  {desgloseBilletes && Object.keys(desgloseBilletes).length > 0 && (
    <div className="desglose">
      <p>Desglose de billetes:</p>
      <ul>
        {Object.entries(desgloseBilletes).map(([denom, cant]) => (
          <li key={denom}>{cant}x {denom} {moneda}</li>
        ))}
      </ul>
    </div>
  )}
</div>
```

## Desglose de Billetes (Pagos en Efectivo)

### Componente de Desglose
```jsx
const [desgloseBilletes, setDesgloseBilletes] = useState<Record<string, number>>({})

// Denominaciones por moneda
const getDenominaciones = (moneda: string): string[] => {
  const denominaciones = {
    USD: ['100', '50', '20', '10', '5', '1'],
    EUR: ['500', '200', '100', '50', '20', '10', '5'],
    CUP: ['1000', '500', '200', '100', '50', '20', '10', '5', '1']
  }
  return denominaciones[moneda] || []
}

// Calcular total del desglose
const calcularTotalDesglose = (): number => {
  return Object.entries(desgloseBilletes).reduce((total, [denom, cant]) => {
    return total + (parseFloat(denom) * cant)
  }, 0)
}

// Actualizar denominación
const actualizarDenominacion = (denominacion: string, cantidad: string) => {
  const cantidadNum = parseInt(cantidad) || 0
  if (cantidadNum === 0) {
    const nuevoDesglose = { ...desgloseBilletes }
    delete nuevoDesglose[denominacion]
    setDesgloseBilletes(nuevoDesglose)
  } else {
    setDesgloseBilletes({ ...desgloseBilletes, [denominacion]: cantidadNum })
  }
}
```

### UI del Desglose
```jsx
{metodoPago === 'efectivo' && (
  <div className="desglose-billetes">
    <Label>Desglose de Billetes (opcional)</Label>
    
    <div className="grid grid-cols-3 gap-2">
      {getDenominaciones(moneda).map((denominacion) => (
        <div key={denominacion}>
          <Label>{denominacion} {moneda}</Label>
          <Input
            type="number"
            min="0"
            value={desgloseBilletes[denominacion] || ''}
            onChange={(e) => actualizarDenominacion(denominacion, e.target.value)}
            placeholder="0"
          />
        </div>
      ))}
    </div>

    {Object.keys(desgloseBilletes).length > 0 && (
      <div className="total-desglose">
        <p>Total del desglose: {calcularTotalDesglose().toFixed(2)} {moneda}</p>
        {Math.abs(calcularTotalDesglose() - monto) > 0.01 && (
          <p className="warning">
            ⚠️ El total del desglose no coincide con el monto del pago
          </p>
        )}
      </div>
    )}
  </div>
)}
```

### Validación del Desglose
```typescript
// Validar que el desglose coincida con el monto (opcional pero recomendado)
const validarDesglose = () => {
  if (Object.keys(desgloseBilletes).length > 0) {
    const totalDesglose = calcularTotalDesglose()
    if (Math.abs(totalDesglose - monto) > 0.01) {
      return "El total del desglose no coincide con el monto del pago"
    }
  }
  return null
}
```

### Mostrar Desglose en Tabla
```jsx
{pago.desglose_billetes && Object.keys(pago.desglose_billetes).length > 0 && (
  <details className="desglose-detalle">
    <summary>Ver desglose</summary>
    <ul>
      {Object.entries(pago.desglose_billetes)
        .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
        .map(([denominacion, cantidad]) => (
          <li key={denominacion}>
            {cantidad}x {denominacion} {pago.moneda}
          </li>
        ))}
    </ul>
  </details>
)}
```

## Errores Comunes

### Error 400: Validación
```json
{
  "detail": "nombre_pagador es requerido cuando pago_cliente es False"
}
```
**Solución**: Asegurarse de enviar `nombre_pagador` cuando `pago_cliente = false`

### Error 400: Monto excede pendiente
```json
{
  "detail": "El monto del pago en USD (2500.00) excede el monto pendiente (2000.00)"
}
```
**Solución**: Validar el monto antes de enviar, considerando la conversión a USD

## Resumen Rápido

✅ **Agregar pago**: Incluir `moneda`, `tasa_cambio`, `pago_cliente`  
✅ **Si pago_cliente = false**: Agregar `nombre_pagador` (requerido)  
✅ **Pagos en efectivo**: Opcionalmente agregar `desglose_billetes`  
✅ **Mostrar pagos**: Usar `monto_usd` para totales en USD  
✅ **Editar pago**: Permitir cambiar moneda, tasa y quién paga  
✅ **Validar**: Monto > 0, tasa > 0, nombre si no es cliente  
✅ **Desglose**: Validar que el total coincida con el monto (opcional)
