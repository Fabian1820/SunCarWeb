# 🛒 Guía Frontend: Sistema de Caja Registradora

## 📋 Resumen Ejecutivo

Sistema POS completo con gestión de sesiones, órdenes, pagos e inventario integrado.

**Base URL:** `/api/caja`

---

## 🎯 Flujo Visual del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    INICIO DEL DÍA                            │
│  ┌────────────────────────────────────────────────────┐     │
│  │  1. ABRIR SESIÓN                                   │     │
│  │     POST /api/caja/sesiones                        │     │
│  │     • Efectivo inicial                             │     │
│  │     • Notas de apertura                            │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   DURANTE EL DÍA                             │
│  ┌────────────────────────────────────────────────────┐     │
│  │  2. CREAR ORDEN                                    │     │
│  │     POST /api/caja/ordenes                         │     │
│  │     • Agregar items al carrito                     │     │
│  │     • Aplicar descuentos/impuestos                 │     │
│  └────────────────────────────────────────────────────┘     │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │  3. PROCESAR PAGO                                  │     │
│  │     POST /api/caja/ordenes/{id}/pagar              │     │
│  │     • Efectivo / Tarjeta / Transferencia / Mixto   │     │
│  │     • Descuento automático de inventario           │     │
│  └────────────────────────────────────────────────────┘     │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │  4. MOVIMIENTOS (Opcional)                         │     │
│  │     POST /api/caja/sesiones/{id}/movimientos       │     │
│  │     • Entradas de efectivo                         │     │
│  │     • Salidas de efectivo                          │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    FIN DEL DÍA                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │  5. CERRAR SESIÓN                                  │     │
│  │     POST /api/caja/sesiones/{id}/cerrar            │     │
│  │     • Contar efectivo final                        │     │
│  │     • Revisar totales                              │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start: Endpoints Esenciales

### 1️⃣ Verificar Sesión Activa
```javascript
GET /api/caja/tiendas/{tienda_id}/sesion-activa

Response:
{
  "success": true,
  "data": {
    "id": "sesion_id",
    "numero_sesion": "20260120-001",
    "estado": "abierta",
    "efectivo_apertura": 500.00,
    "total_ventas": 1234.56
  }
}
```

### 2️⃣ Abrir Sesión (si no hay activa)
```javascript
POST /api/caja/sesiones
Content-Type: application/json

{
  "tienda_id": "tienda_123",
  "efectivo_apertura": 500.00,
  "nota_apertura": "Apertura normal"
}
```

### 3️⃣ Crear Orden
```javascript
POST /api/caja/ordenes

{
  "sesion_caja_id": "sesion_id",
  "tienda_id": "tienda_123",
  "items": [
    {
      "material_codigo": "INV-001",
      "descripcion": "Inversor 5kW",
      "cantidad": 1,
      "precio_unitario": 1500.00
    }
  ],
  "impuesto_porcentaje": 16.0,
  "descuento_porcentaje": 0.0
}
```

### 4️⃣ Procesar Pago
```javascript
POST /api/caja/ordenes/{orden_id}/pagar

{
  "metodo_pago": "efectivo",
  "almacen_id": "almacen_123",
  "pagos": [{
    "metodo": "efectivo",
    "monto": 1740.00,
    "monto_recibido": 2000.00
  }]
}

Response:
{
  "success": true,
  "cambio": 260.00,
  "orden_id": "orden_id"
}
```


---

## 💰 Métodos de Pago

### Efectivo
```javascript
{
  "metodo_pago": "efectivo",
  "pagos": [{
    "metodo": "efectivo",
    "monto": 1740.00,
    "monto_recibido": 2000.00  // ← Calcula cambio automáticamente
  }]
}
// Response: { "cambio": 260.00 }
```

### Tarjeta
```javascript
{
  "metodo_pago": "tarjeta",
  "pagos": [{
    "metodo": "tarjeta",
    "monto": 1740.00,
    "referencia": "AUTH-123456"  // ← Número de autorización
  }]
}
```

### Transferencia
```javascript
{
  "metodo_pago": "transferencia",
  "pagos": [{
    "metodo": "transferencia",
    "monto": 1740.00,
    "referencia": "TRANS-789012"  // ← Número de transferencia
  }]
}
```

### Pago Mixto
```javascript
{
  "metodo_pago": "mixto",
  "pagos": [
    {
      "metodo": "efectivo",
      "monto": 1000.00,
      "monto_recibido": 1000.00
    },
    {
      "metodo": "tarjeta",
      "monto": 740.00,
      "referencia": "AUTH-456"
    }
  ]
}
```

---

## 📊 Cálculo de Totales

```
┌─────────────────────────────────────────┐
│  Items:                                 │
│    2 × Inversor @ $1500 = $3000        │
│    10 × Panel @ $250 = $2500           │
│                                         │
│  Subtotal:           $5500             │
│  Descuento (5%):     -$275             │
│  Base Imponible:     $5225             │
│  Impuesto (16%):     +$836             │
│  ─────────────────────────────         │
│  TOTAL:              $6061             │
└─────────────────────────────────────────┘
```

**Fórmulas:**
```javascript
subtotal = items.reduce((sum, item) => 
  sum + (item.cantidad * item.precio_unitario), 0);

descuento = subtotal * (descuento_porcentaje / 100);
base_imponible = subtotal - descuento;
impuesto = base_imponible * (impuesto_porcentaje / 100);
total = base_imponible + impuesto;
```

---

## 🎨 Componentes React Sugeridos

### 1. Pantalla de Apertura de Caja

```jsx
import { useState } from 'react';

function AperturaCaja({ tiendaId, onSuccess }) {
  const [efectivo, setEfectivo] = useState(500);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAbrir = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/caja/sesiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tienda_id: tiendaId,
          efectivo_apertura: efectivo,
          nota_apertura: notas
        })
      });
      
      const data = await response.json();
      if (data.success) {
        onSuccess(data.data);
      }
    } catch (error) {
      alert('Error al abrir caja: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apertura-caja">
      <h2>Apertura de Caja</h2>
      
      <div className="form-group">
        <label>Efectivo Inicial</label>
        <input
          type="number"
          step="0.01"
          value={efectivo}
          onChange={(e) => setEfectivo(parseFloat(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label>Notas</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Notas de apertura..."
        />
      </div>

      <button onClick={handleAbrir} disabled={loading}>
        {loading ? 'Abriendo...' : 'Abrir Caja'}
      </button>
    </div>
  );
}
```

### 2. Carrito de Compras

```jsx
import { useState, useEffect } from 'react';

function CarritoCompras({ sesionId, tiendaId }) {
  const [items, setItems] = useState([]);
  const [descuento, setDescuento] = useState(0);
  const [impuesto, setImpuesto] = useState(16);
  const [totales, setTotales] = useState({
    subtotal: 0,
    descuento_monto: 0,
    impuesto_monto: 0,
    total: 0
  });

  // Calcular totales automáticamente
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => 
      sum + (item.cantidad * item.precio_unitario), 0);
    
    const descuento_monto = subtotal * (descuento / 100);
    const base = subtotal - descuento_monto;
    const impuesto_monto = base * (impuesto / 100);
    const total = base + impuesto_monto;

    setTotales({ subtotal, descuento_monto, impuesto_monto, total });
  }, [items, descuento, impuesto]);

  const agregarItem = (producto) => {
    setItems([...items, {
      material_codigo: producto.codigo,
      descripcion: producto.descripcion,
      cantidad: 1,
      precio_unitario: producto.precio
    }]);
  };

  const crearOrden = async () => {
    const response = await fetch('/api/caja/ordenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sesion_caja_id: sesionId,
        tienda_id: tiendaId,
        items: items,
        impuesto_porcentaje: impuesto,
        descuento_porcentaje: descuento
      })
    });

    const data = await response.json();
    return data.data; // Retorna la orden creada
  };

  return (
    <div className="carrito">
      <h2>Carrito de Compras</h2>
      
      {/* Lista de items */}
      <div className="items-list">
        {items.map((item, index) => (
          <div key={index} className="item">
            <span>{item.descripcion}</span>
            <input
              type="number"
              value={item.cantidad}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index].cantidad = parseInt(e.target.value);
                setItems(newItems);
              }}
            />
            <span>${(item.cantidad * item.precio_unitario).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="controles">
        <label>
          Descuento %:
          <input
            type="number"
            value={descuento}
            onChange={(e) => setDescuento(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Impuesto %:
          <input
            type="number"
            value={impuesto}
            onChange={(e) => setImpuesto(parseFloat(e.target.value))}
          />
        </label>
      </div>

      {/* Totales */}
      <div className="totales">
        <div>Subtotal: ${totales.subtotal.toFixed(2)}</div>
        <div>Descuento: -${totales.descuento_monto.toFixed(2)}</div>
        <div>Impuesto: +${totales.impuesto_monto.toFixed(2)}</div>
        <div className="total">TOTAL: ${totales.total.toFixed(2)}</div>
      </div>

      <button onClick={crearOrden}>Proceder al Pago</button>
    </div>
  );
}
```

### 3. Pantalla de Pago

```jsx
import { useState } from 'react';

function PantallaPago({ ordenId, total, almacenId, onSuccess }) {
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState(0);
  const [referencia, setReferencia] = useState('');
  const [cambio, setCambio] = useState(0);

  useEffect(() => {
    if (metodoPago === 'efectivo') {
      setCambio(montoRecibido - total);
    }
  }, [montoRecibido, total, metodoPago]);

  const procesarPago = async () => {
    const payload = {
      metodo_pago: metodoPago,
      almacen_id: almacenId,
      pagos: []
    };

    if (metodoPago === 'efectivo') {
      payload.pagos.push({
        metodo: 'efectivo',
        monto: total,
        monto_recibido: montoRecibido
      });
    } else if (metodoPago === 'tarjeta' || metodoPago === 'transferencia') {
      payload.pagos.push({
        metodo: metodoPago,
        monto: total,
        referencia: referencia
      });
    }

    try {
      const response = await fetch(`/api/caja/ordenes/${ordenId}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        onSuccess(data);
      }
    } catch (error) {
      alert('Error al procesar pago: ' + error.message);
    }
  };

  return (
    <div className="pantalla-pago">
      <h2>Procesar Pago</h2>
      <div className="total-pagar">
        Total a Pagar: ${total.toFixed(2)}
      </div>

      {/* Selector de método */}
      <div className="metodo-pago">
        <button onClick={() => setMetodoPago('efectivo')}>Efectivo</button>
        <button onClick={() => setMetodoPago('tarjeta')}>Tarjeta</button>
        <button onClick={() => setMetodoPago('transferencia')}>Transferencia</button>
      </div>

      {/* Campos según método */}
      {metodoPago === 'efectivo' && (
        <div>
          <label>
            Monto Recibido:
            <input
              type="number"
              step="0.01"
              value={montoRecibido}
              onChange={(e) => setMontoRecibido(parseFloat(e.target.value))}
            />
          </label>
          <div className="cambio">
            Cambio: ${cambio.toFixed(2)}
          </div>
        </div>
      )}

      {(metodoPago === 'tarjeta' || metodoPago === 'transferencia') && (
        <div>
          <label>
            Referencia:
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Número de autorización/transferencia"
            />
          </label>
        </div>
      )}

      <button onClick={procesarPago}>Confirmar Pago</button>
    </div>
  );
}
```


### 4. Cierre de Caja

```jsx
import { useState, useEffect } from 'react';

function CierreCaja({ sesionId, onSuccess }) {
  const [sesion, setSesion] = useState(null);
  const [efectivoFinal, setEfectivoFinal] = useState(0);
  const [notas, setNotas] = useState('');
  const [diferencia, setDiferencia] = useState(0);

  useEffect(() => {
    // Cargar datos de la sesión
    fetch(`/api/caja/sesiones/${sesionId}`)
      .then(r => r.json())
      .then(data => setSesion(data.data));
  }, [sesionId]);

  useEffect(() => {
    if (sesion) {
      const esperado = sesion.efectivo_apertura + sesion.total_efectivo;
      setDiferencia(efectivoFinal - esperado);
    }
  }, [efectivoFinal, sesion]);

  const cerrarSesion = async () => {
    try {
      const response = await fetch(`/api/caja/sesiones/${sesionId}/cerrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          efectivo_cierre: efectivoFinal,
          nota_cierre: notas
        })
      });

      const data = await response.json();
      if (data.success) {
        onSuccess(data.data);
      }
    } catch (error) {
      alert('Error al cerrar caja: ' + error.message);
    }
  };

  if (!sesion) return <div>Cargando...</div>;

  return (
    <div className="cierre-caja">
      <h2>Cierre de Caja</h2>

      {/* Resumen del día */}
      <div className="resumen">
        <h3>Resumen del Día</h3>
        <div>Efectivo Inicial: ${sesion.efectivo_apertura.toFixed(2)}</div>
        <div>Total Ventas: ${sesion.total_ventas.toFixed(2)}</div>
        <div>Total Efectivo: ${sesion.total_efectivo.toFixed(2)}</div>
        <div>Total Tarjeta: ${sesion.total_tarjeta.toFixed(2)}</div>
        <div>Total Transferencia: ${sesion.total_transferencia.toFixed(2)}</div>
      </div>

      {/* Conteo de efectivo */}
      <div className="conteo">
        <h3>Conteo de Efectivo</h3>
        <label>
          Efectivo Final:
          <input
            type="number"
            step="0.01"
            value={efectivoFinal}
            onChange={(e) => setEfectivoFinal(parseFloat(e.target.value))}
          />
        </label>

        <div className={`diferencia ${diferencia < 0 ? 'faltante' : 'sobrante'}`}>
          {diferencia === 0 && 'Cuadra perfecto ✓'}
          {diferencia > 0 && `Sobrante: $${diferencia.toFixed(2)}`}
          {diferencia < 0 && `Faltante: $${Math.abs(diferencia).toFixed(2)}`}
        </div>
      </div>

      {/* Notas */}
      <div className="notas">
        <label>
          Notas de Cierre:
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observaciones del cierre..."
          />
        </label>
      </div>

      <button onClick={cerrarSesion}>Cerrar Caja</button>
    </div>
  );
}
```

---

## 🔄 Hook Personalizado para Caja

```jsx
import { useState, useEffect } from 'react';

export function useCaja(tiendaId) {
  const [sesionActiva, setSesionActiva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar sesión activa al montar
  useEffect(() => {
    verificarSesion();
  }, [tiendaId]);

  const verificarSesion = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/caja/tiendas/${tiendaId}/sesion-activa`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setSesionActiva(data.data);
      } else {
        setSesionActiva(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const abrirSesion = async (efectivoApertura, notas = '') => {
    try {
      const response = await fetch('/api/caja/sesiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tienda_id: tiendaId,
          efectivo_apertura: efectivoApertura,
          nota_apertura: notas
        })
      });

      const data = await response.json();
      if (data.success) {
        setSesionActiva(data.data);
        return data.data;
      }
      throw new Error(data.message);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const cerrarSesion = async (efectivoCierre, notas = '') => {
    try {
      const response = await fetch(`/api/caja/sesiones/${sesionActiva.id}/cerrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          efectivo_cierre: efectivoCierre,
          nota_cierre: notas
        })
      });

      const data = await response.json();
      if (data.success) {
        setSesionActiva(null);
        return data.data;
      }
      throw new Error(data.message);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const crearOrden = async (items, impuesto = 16, descuento = 0) => {
    try {
      const response = await fetch('/api/caja/ordenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sesion_caja_id: sesionActiva.id,
          tienda_id: tiendaId,
          items: items,
          impuesto_porcentaje: impuesto,
          descuento_porcentaje: descuento
        })
      });

      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      throw new Error(data.message);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const procesarPago = async (ordenId, metodoPago, pagos, almacenId) => {
    try {
      const response = await fetch(`/api/caja/ordenes/${ordenId}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodo_pago: metodoPago,
          almacen_id: almacenId,
          pagos: pagos
        })
      });

      const data = await response.json();
      if (data.success) {
        // Actualizar sesión para reflejar nuevos totales
        await verificarSesion();
        return data;
      }
      throw new Error(data.message);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    sesionActiva,
    loading,
    error,
    abrirSesion,
    cerrarSesion,
    crearOrden,
    procesarPago,
    verificarSesion
  };
}
```

### Uso del Hook

```jsx
function PuntoVenta({ tiendaId, almacenId }) {
  const { 
    sesionActiva, 
    loading, 
    abrirSesion, 
    cerrarSesion,
    crearOrden,
    procesarPago 
  } = useCaja(tiendaId);

  if (loading) return <div>Cargando...</div>;

  if (!sesionActiva) {
    return <AperturaCaja onAbrir={abrirSesion} />;
  }

  return (
    <div className="punto-venta">
      <h1>Sesión: {sesionActiva.numero_sesion}</h1>
      <CarritoCompras 
        sesionId={sesionActiva.id}
        tiendaId={tiendaId}
        onCrearOrden={crearOrden}
        onProcesarPago={(ordenId, metodo, pagos) => 
          procesarPago(ordenId, metodo, pagos, almacenId)
        }
      />
      <button onClick={() => cerrarSesion(1000, 'Cierre normal')}>
        Cerrar Caja
      </button>
    </div>
  );
}
```

---

## 📱 Estados de la Aplicación

```javascript
// Estado global sugerido (Redux/Context)
const cajaState = {
  // Sesión actual
  sesion: {
    id: 'sesion_123',
    numero_sesion: '20260120-001',
    estado: 'abierta',
    efectivo_apertura: 500.00,
    total_ventas: 1234.56,
    total_efectivo: 800.00,
    total_tarjeta: 434.56,
    total_transferencia: 0.00
  },

  // Orden actual (carrito)
  ordenActual: {
    items: [
      {
        material_codigo: 'INV-001',
        descripcion: 'Inversor 5kW',
        cantidad: 1,
        precio_unitario: 1500.00
      }
    ],
    impuesto_porcentaje: 16.0,
    descuento_porcentaje: 0.0,
    totales: {
      subtotal: 1500.00,
      descuento_monto: 0.00,
      impuesto_monto: 240.00,
      total: 1740.00
    }
  },

  // UI
  pantalla: 'carrito', // 'carrito' | 'pago' | 'cierre'
  loading: false,
  error: null
};
```

---

## ⚠️ Validaciones Importantes

### Antes de Crear Orden
```javascript
// ✓ Verificar que hay sesión activa
if (!sesionActiva) {
  alert('Debe abrir una sesión primero');
  return;
}

// ✓ Verificar que hay items
if (items.length === 0) {
  alert('Debe agregar al menos un item');
  return;
}

// ✓ Verificar cantidades y precios
items.forEach(item => {
  if (item.cantidad <= 0 || item.precio_unitario <= 0) {
    alert('Cantidades y precios deben ser mayores a 0');
    return;
  }
});
```

### Antes de Procesar Pago
```javascript
// ✓ Verificar método de pago
if (!['efectivo', 'tarjeta', 'transferencia', 'mixto'].includes(metodoPago)) {
  alert('Método de pago inválido');
  return;
}

// ✓ Para efectivo: verificar monto recibido
if (metodoPago === 'efectivo' && montoRecibido < total) {
  alert('El monto recibido debe ser mayor o igual al total');
  return;
}

// ✓ Para tarjeta/transferencia: verificar referencia
if ((metodoPago === 'tarjeta' || metodoPago === 'transferencia') && !referencia) {
  alert('Debe ingresar el número de referencia');
  return;
}

// ✓ Verificar que la suma de pagos coincide con el total
const sumaPagos = pagos.reduce((sum, p) => sum + p.monto, 0);
if (Math.abs(sumaPagos - total) > 0.01) {
  alert('La suma de pagos debe coincidir con el total');
  return;
}
```

