# API de Caja Registradora

## Descripción General

Sistema completo de punto de venta (POS) con gestión de sesiones de caja, órdenes de compra, pagos y control de inventario integrado.

## Características

- ✅ Apertura y cierre de sesiones de caja
- ✅ Registro de movimientos de efectivo (entradas/salidas)
- ✅ Creación y gestión de órdenes de compra
- ✅ Procesamiento de pagos (efectivo, tarjeta, transferencia, mixto)
- ✅ Descuento automático de inventario al pagar
- ✅ Cálculo de impuestos y descuentos
- ✅ Historial completo de transacciones
- ✅ Reportes por sesión y tienda

---

## Endpoints

### Base URL
```
/api/caja
```

---

## 1. SESIONES DE CAJA

### 1.1 Abrir Sesión

**POST** `/sesiones`

Abre una nueva sesión de caja para una tienda.

**Request Body:**
```json
{
  "tienda_id": "507f1f77bcf86cd799439011",
  "efectivo_apertura": 500.00,
  "nota_apertura": "Billetes: 5x100, 10x50"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sesión abierta exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "tienda_id": "507f1f77bcf86cd799439011",
    "numero_sesion": "20260120-001",
    "fecha_apertura": "2026-01-20T10:00:00Z",
    "fecha_cierre": null,
    "efectivo_apertura": 500.00,
    "efectivo_cierre": null,
    "nota_apertura": "Billetes: 5x100, 10x50",
    "nota_cierre": null,
    "usuario_apertura": "Juan Pérez",
    "usuario_cierre": null,
    "estado": "abierta",
    "total_ventas": 0.0,
    "total_efectivo": 0.0,
    "total_tarjeta": 0.0,
    "total_transferencia": 0.0,
    "movimientos_efectivo": []
  }
}
```

**Validaciones:**
- Solo puede haber una sesión abierta por tienda
- El efectivo de apertura debe ser >= 0

---

### 1.2 Obtener Sesión por ID

**GET** `/sesiones/{sesion_id}`

**Response:**
```json
{
  "success": true,
  "message": "Sesión obtenida exitosamente",
  "data": { /* SesionCaja */ }
}
```

---

### 1.3 Listar Sesiones

**GET** `/sesiones`

**Query Parameters:**
- `tienda_id` (opcional): Filtrar por tienda
- `estado` (opcional): `abierta` | `cerrada`
- `fecha_desde` (opcional): ISO 8601 datetime
- `fecha_hasta` (opcional): ISO 8601 datetime

**Response:**
```json
{
  "success": true,
  "message": "Sesiones obtenidas exitosamente",
  "data": [
    { /* SesionCaja */ }
  ]
}
```

---

### 1.4 Obtener Sesión Activa de Tienda

**GET** `/tiendas/{tienda_id}/sesion-activa`

Obtiene la sesión actualmente abierta de una tienda.

**Response:**
```json
{
  "success": true,
  "message": "Sesión activa obtenida",
  "data": { /* SesionCaja */ }
}
```

Si no hay sesión activa:
```json
{
  "success": false,
  "message": "No hay sesión activa",
  "data": null
}
```

---

### 1.5 Cerrar Sesión

**POST** `/sesiones/{sesion_id}/cerrar`

Cierra una sesión de caja.

**Request Body:**
```json
{
  "efectivo_cierre": 2350.00,
  "nota_cierre": "Billetes: 10x200, 15x50, 20x25"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "estado": "cerrada",
    "fecha_cierre": "2026-01-20T18:00:00Z",
    "efectivo_cierre": 2350.00,
    "usuario_cierre": "Juan Pérez",
    "total_ventas": 1850.00,
    "total_efectivo": 1500.00,
    "total_tarjeta": 350.00
  }
}
```

**Validaciones:**
- La sesión debe estar abierta
- Solo se puede cerrar una vez

---

## 2. MOVIMIENTOS DE EFECTIVO

### 2.1 Registrar Movimiento

**POST** `/sesiones/{sesion_id}/movimientos-efectivo`

Registra entrada o salida de efectivo (no relacionada con ventas).

**Request Body:**
```json
{
  "tipo": "entrada",
  "monto": 100.00,
  "motivo": "Cambio de billetes grandes"
}
```

**Tipos válidos:**
- `entrada`: Ingreso de efectivo
- `salida`: Retiro de efectivo

**Response:**
```json
{
  "success": true,
  "message": "Movimiento registrado exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "sesion_caja_id": "507f1f77bcf86cd799439012",
    "tipo": "entrada",
    "monto": 100.00,
    "motivo": "Cambio de billetes grandes",
    "fecha": "2026-01-20T12:30:00Z",
    "usuario": "Juan Pérez"
  }
}
```

**Validaciones:**
- La sesión debe estar abierta
- El monto debe ser > 0

---

### 2.2 Listar Movimientos de Efectivo

**GET** `/sesiones/{sesion_id}/movimientos-efectivo`

**Response:**
```json
{
  "success": true,
  "message": "Movimientos obtenidos exitosamente",
  "data": [
    { /* MovimientoEfectivo */ }
  ]
}
```

---

## 3. ÓRDENES DE COMPRA

### 3.1 Crear Orden

**POST** `/ordenes`

Crea una nueva orden de compra (sin pagar aún).

**Request Body:**
```json
{
  "sesion_caja_id": "507f1f77bcf86cd799439012",
  "tienda_id": "507f1f77bcf86cd799439011",
  "cliente_id": "507f1f77bcf86cd799439014",
  "cliente_nombre": "María González",
  "cliente_telefono": "+1234567890",
  "items": [
    {
      "material_codigo": "INV-001",
      "descripcion": "Inversor Huawei 5kW",
      "cantidad": 2,
      "precio_unitario": 1500.00,
      "categoria": "Inversores"
    },
    {
      "material_codigo": "PAN-001",
      "descripcion": "Panel Solar 450W",
      "cantidad": 10,
      "precio_unitario": 250.00,
      "categoria": "Paneles"
    }
  ],
  "impuesto_porcentaje": 16.0,
  "descuento_porcentaje": 5.0,
  "notas": "Cliente solicita instalación"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orden creada exitosamente",
  "data": {
    "id": "507f1f77bcf86cd799439015",
    "numero_orden": "20260120-001",
    "sesion_caja_id": "507f1f77bcf86cd799439012",
    "tienda_id": "507f1f77bcf86cd799439011",
    "cliente_id": "507f1f77bcf86cd799439014",
    "cliente_nombre": "María González",
    "cliente_telefono": "+1234567890",
    "fecha_creacion": "2026-01-20T14:00:00Z",
    "fecha_pago": null,
    "items": [
      {
        "material_codigo": "INV-001",
        "descripcion": "Inversor Huawei 5kW",
        "cantidad": 2,
        "precio_unitario": 1500.00,
        "subtotal": 3000.00,
        "categoria": "Inversores"
      },
      {
        "material_codigo": "PAN-001",
        "descripcion": "Panel Solar 450W",
        "cantidad": 10,
        "precio_unitario": 250.00,
        "subtotal": 2500.00,
        "categoria": "Paneles"
      }
    ],
    "subtotal": 5500.00,
    "impuesto_porcentaje": 16.0,
    "impuesto_monto": 836.00,
    "descuento_porcentaje": 5.0,
    "descuento_monto": 275.00,
    "total": 6061.00,
    "estado": "pendiente",
    "metodo_pago": null,
    "pagos": [],
    "notas": "Cliente solicita instalación"
  }
}
```

**Cálculo de Totales:**
```
Subtotal = Suma de (cantidad × precio_unitario)
Descuento = Subtotal × (descuento_porcentaje / 100)
Base Imponible = Subtotal - Descuento
Impuesto = Base Imponible × (impuesto_porcentaje / 100)
Total = Base Imponible + Impuesto
```

**Validaciones:**
- La sesión debe estar abierta
- Debe tener al menos un item
- Los items deben tener cantidad > 0 y precio > 0

---

### 3.2 Obtener Orden por ID

**GET** `/ordenes/{orden_id}`

**Response:**
```json
{
  "success": true,
  "message": "Orden obtenida exitosamente",
  "data": { /* OrdenCompra */ }
}
```

---

### 3.3 Listar Órdenes

**GET** `/ordenes`

**Query Parameters:**
- `sesion_caja_id` (opcional): Filtrar por sesión
- `estado` (opcional): `pendiente` | `pagada` | `cancelada`
- `tienda_id` (opcional): Filtrar por tienda
- `fecha_desde` (opcional): ISO 8601 datetime
- `fecha_hasta` (opcional): ISO 8601 datetime

**Response:**
```json
{
  "success": true,
  "message": "Órdenes obtenidas exitosamente",
  "data": [
    { /* OrdenCompra */ }
  ]
}
```

---

### 3.4 Actualizar Orden

**PUT** `/ordenes/{orden_id}`

Actualiza una orden (solo si está pendiente).

**Request Body:**
```json
{
  "items": [
    {
      "material_codigo": "INV-001",
      "descripcion": "Inversor Huawei 5kW",
      "cantidad": 3,
      "precio_unitario": 1500.00,
      "categoria": "Inversores"
    }
  ],
  "impuesto_porcentaje": 16.0,
  "descuento_porcentaje": 10.0,
  "notas": "Cliente aumentó cantidad"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orden actualizada exitosamente",
  "data": { /* OrdenCompra actualizada */ }
}
```

**Validaciones:**
- Solo se pueden modificar órdenes pendientes
- Los totales se recalculan automáticamente

---

### 3.5 Cancelar Orden

**DELETE** `/ordenes/{orden_id}`

Cancela una orden (solo si está pendiente).

**Response:**
```json
{
  "success": true,
  "message": "Orden cancelada exitosamente",
  "data": null
}
```

**Validaciones:**
- Solo se pueden cancelar órdenes pendientes
- La orden se marca como cancelada (no se elimina)

---

## 4. PAGO DE ÓRDENES

### 4.1 Pagar Orden

**POST** `/ordenes/{orden_id}/pagar`

Procesa el pago de una orden y descuenta el inventario automáticamente.

**Request Body - Pago Simple (Efectivo):**
```json
{
  "metodo_pago": "efectivo",
  "almacen_id": "507f1f77bcf86cd799439016",
  "pagos": [
    {
      "metodo": "efectivo",
      "monto": 6061.00,
      "monto_recibido": 7000.00
    }
  ]
}
```

**Request Body - Pago con Tarjeta:**
```json
{
  "metodo_pago": "tarjeta",
  "almacen_id": "507f1f77bcf86cd799439016",
  "pagos": [
    {
      "metodo": "tarjeta",
      "monto": 6061.00,
      "referencia": "AUTH-123456"
    }
  ]
}
```

**Request Body - Pago Mixto:**
```json
{
  "metodo_pago": "mixto",
  "almacen_id": "507f1f77bcf86cd799439016",
  "pagos": [
    {
      "metodo": "efectivo",
      "monto": 3000.00,
      "monto_recibido": 3000.00
    },
    {
      "metodo": "tarjeta",
      "monto": 3061.00,
      "referencia": "AUTH-789012"
    }
  ]
}
```

**Métodos de Pago:**
- `efectivo`: Pago en efectivo
- `tarjeta`: Pago con tarjeta de crédito/débito
- `transferencia`: Transferencia bancaria
- `mixto`: Combinación de métodos

**Response:**
```json
{
  "success": true,
  "message": "Orden pagada exitosamente",
  "data": {
    "success": true,
    "orden": {
      "id": "507f1f77bcf86cd799439015",
      "numero_orden": "20260120-001",
      "estado": "pagada",
      "fecha_pago": "2026-01-20T14:30:00Z",
      "metodo_pago": "efectivo",
      "total": 6061.00,
      "pagos": [
        {
          "id": "507f1f77bcf86cd799439017",
          "orden_id": "507f1f77bcf86cd799439015",
          "metodo": "efectivo",
          "monto": 6061.00,
          "monto_recibido": 7000.00,
          "cambio": 939.00,
          "created_at": "2026-01-20T14:30:00Z"
        }
      ]
    },
    "cambio": 939.00,
    "movimientos_inventario": [
      "507f1f77bcf86cd799439018",
      "507f1f77bcf86cd799439019"
    ]
  },
  "cambio": 939.00
}
```

**Proceso Automático:**
1. ✅ Valida que la orden esté pendiente
2. ✅ Valida que el almacén pertenezca a la tienda
3. ✅ Verifica stock disponible para todos los items
4. ✅ Valida que el monto de pagos coincida con el total
5. ✅ Crea movimientos de inventario (tipo: venta)
6. ✅ Descuenta stock del almacén
7. ✅ Registra los pagos
8. ✅ Marca la orden como pagada
9. ✅ Actualiza totales de la sesión

**Validaciones:**
- La orden debe estar pendiente
- El almacén debe pertenecer a la tienda
- Debe haber stock suficiente para todos los items
- La suma de pagos debe coincidir con el total de la orden
- Para pago mixto, la suma de todos los pagos debe ser exacta

**Errores Comunes:**
```json
{
  "detail": "Stock insuficiente para Inversor Huawei 5kW. Disponible: 1, Requerido: 2"
}
```

```json
{
  "detail": "El monto de pagos (5000.00) no coincide con el total (6061.00)"
}
```

---

## Modelos de Datos

### SesionCaja
```typescript
{
  id: string;
  tienda_id: string;
  numero_sesion: string;              // Formato: YYYYMMDD-XXX
  fecha_apertura: datetime;
  fecha_cierre: datetime | null;
  efectivo_apertura: number;
  efectivo_cierre: number | null;
  nota_apertura: string | null;
  nota_cierre: string | null;
  usuario_apertura: string;
  usuario_cierre: string | null;
  estado: "abierta" | "cerrada";
  total_ventas: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  movimientos_efectivo: MovimientoEfectivo[];
  created_at: datetime;
  updated_at: datetime;
}
```

### MovimientoEfectivo
```typescript
{
  id: string;
  sesion_caja_id: string;
  tipo: "entrada" | "salida";
  monto: number;
  motivo: string;
  fecha: datetime;
  usuario: string | null;
}
```

### OrdenCompra
```typescript
{
  id: string;
  numero_orden: string;               // Formato: YYYYMMDD-XXX
  sesion_caja_id: string;
  tienda_id: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  fecha_creacion: datetime;
  fecha_pago: datetime | null;
  items: ItemOrden[];
  subtotal: number;
  impuesto_porcentaje: number;
  impuesto_monto: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  total: number;
  estado: "pendiente" | "pagada" | "cancelada";
  metodo_pago: MetodoPago | null;
  pagos: Pago[];
  almacen_id: string | null;
  notas: string | null;
  created_at: datetime;
  updated_at: datetime;
}
```

### ItemOrden
```typescript
{
  material_codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  categoria: string | null;
}
```

### Pago
```typescript
{
  id: string;
  orden_id: string;
  metodo: "efectivo" | "tarjeta" | "transferencia" | "mixto";
  monto: number;
  monto_recibido: number | null;      // Solo para efectivo
  cambio: number | null;              // Solo para efectivo
  referencia: string | null;          // Para tarjeta/transferencia
  created_at: datetime;
}
```

---

## Flujo de Trabajo Típico

### 1. Inicio del Día
```
1. Abrir sesión de caja
   POST /api/caja/sesiones
   
2. Registrar efectivo inicial
   (incluido en apertura)
```

### 2. Durante el Día
```
1. Crear orden
   POST /api/caja/ordenes
   
2. (Opcional) Modificar orden
   PUT /api/caja/ordenes/{id}
   
3. Pagar orden
   POST /api/caja/ordenes/{id}/pagar
   
4. (Opcional) Registrar movimientos de efectivo
   POST /api/caja/sesiones/{id}/movimientos-efectivo
```

### 3. Fin del Día
```
1. Revisar totales de sesión
   GET /api/caja/sesiones/{id}
   
2. Cerrar sesión
   POST /api/caja/sesiones/{id}/cerrar
```

---

## Ejemplos de Uso

### Ejemplo 1: Venta Simple en Efectivo

```javascript
// 1. Verificar sesión activa
const sesionRes = await fetch('/api/caja/tiendas/TIENDA_ID/sesion-activa');
const { data: sesion } = await sesionRes.json();

if (!sesion) {
  // Abrir sesión
  await fetch('/api/caja/sesiones', {
    method: 'POST',
    body: JSON.stringify({
      tienda_id: 'TIENDA_ID',
      efectivo_apertura: 500.00,
      nota_apertura: 'Apertura normal'
    })
  });
}

// 2. Crear orden
const ordenRes = await fetch('/api/caja/ordenes', {
  method: 'POST',
  body: JSON.stringify({
    sesion_caja_id: sesion.id,
    tienda_id: 'TIENDA_ID',
    items: [
      {
        material_codigo: 'INV-001',
        descripcion: 'Inversor 5kW',
        cantidad: 1,
        precio_unitario: 1500.00
      }
    ],
    impuesto_porcentaje: 16.0,
    descuento_porcentaje: 0.0
  })
});

const { data: orden } = await ordenRes.json();

// 3. Pagar orden
const pagoRes = await fetch(`/api/caja/ordenes/${orden.id}/pagar`, {
  method: 'POST',
  body: JSON.stringify({
    metodo_pago: 'efectivo',
    almacen_id: 'ALMACEN_ID',
    pagos: [
      {
        metodo: 'efectivo',
        monto: orden.total,
        monto_recibido: 2000.00
      }
    ]
  })
});

const { data: resultado, cambio } = await pagoRes.json();
console.log(`Cambio: $${cambio}`);
```

### Ejemplo 2: Venta con Pago Mixto

```javascript
// Orden total: $6061.00
// Cliente paga: $3000 efectivo + $3061 tarjeta

await fetch(`/api/caja/ordenes/${orden.id}/pagar`, {
  method: 'POST',
  body: JSON.stringify({
    metodo_pago: 'mixto',
    almacen_id: 'ALMACEN_ID',
    pagos: [
      {
        metodo: 'efectivo',
        monto: 3000.00,
        monto_recibido: 3000.00
      },
      {
        metodo: 'tarjeta',
        monto: 3061.00,
        referencia: 'AUTH-123456'
      }
    ]
  })
});
```

---

## Reportes y Consultas

### Ventas del Día
```javascript
const hoy = new Date().toISOString().split('T')[0];
const res = await fetch(
  `/api/caja/ordenes?tienda_id=TIENDA_ID&estado=pagada&fecha_desde=${hoy}T00:00:00Z&fecha_hasta=${hoy}T23:59:59Z`
);
```

### Sesiones del Mes
```javascript
const primerDia = '2026-01-01T00:00:00Z';
const ultimoDia = '2026-01-31T23:59:59Z';
const res = await fetch(
  `/api/caja/sesiones?tienda_id=TIENDA_ID&fecha_desde=${primerDia}&fecha_hasta=${ultimoDia}`
);
```

### Órdenes Pendientes
```javascript
const res = await fetch(
  `/api/caja/ordenes?sesion_caja_id=SESION_ID&estado=pendiente`
);
```

---

## Notas Importantes

1. **Sesiones**: Solo puede haber una sesión abierta por tienda
2. **Stock**: El stock se descuenta automáticamente al pagar
3. **Números**: Los números de sesión y orden se generan automáticamente
4. **Cambio**: Solo se calcula para pagos en efectivo
5. **Cancelación**: Las órdenes canceladas no se eliminan, solo cambian de estado
6. **Validación**: Siempre se valida stock antes de procesar el pago
7. **Totales**: Los totales de sesión se actualizan automáticamente con cada pago
8. **Usuario**: El usuario se obtiene del token JWT automáticamente

---

## Códigos de Error

- `400`: Validación fallida (sesión cerrada, stock insuficiente, etc.)
- `404`: Recurso no encontrado
- `500`: Error del servidor
