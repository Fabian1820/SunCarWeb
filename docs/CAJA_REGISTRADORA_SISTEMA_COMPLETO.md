# Sistema de Caja Registradora - Documentación Completa

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [Flujo de Operación](#flujo-de-operación)
4. [API Endpoints](#api-endpoints)
5. [Frontend - Componentes](#frontend-componentes)
6. [Integración con Inventario](#integración-con-inventario)

---

## Arquitectura General

### Estructura de Entidades

```
Tienda
  ├── Almacén (1 o más)
  │   └── Stock de Materiales
  └── Caja Registradora
      ├── Sesión de Caja
      └── Órdenes de Compra
          ├── Cliente
          ├── Items (Productos)
          ├── Impuestos
          ├── Descuentos
          └── Pago
```

### Relaciones Clave

- **Tienda → Almacenes**: Una tienda puede tener uno o más almacenes asociados
- **Tienda → Caja**: Cada tienda tiene una caja registradora
- **Caja → Sesiones**: La caja tiene sesiones de apertura/cierre
- **Sesión → Órdenes**: Cada sesión contiene múltiples órdenes de compra
- **Orden → Items**: Cada orden tiene productos del inventario
- **Orden → Pago**: Al pagar, se descuenta stock del almacén

---

## Modelo de Datos

### 1. Tienda
```json
{
  "id": "string (UUID)",
  "nombre": "string",
  "codigo": "string",
  "direccion": "string",
  "telefono": "string",
  "almacen_id": "string (UUID principal)",
  "almacenes_ids": ["string (UUID)"], // Múltiples almacenes
  "activo": true
}
```

### 2. Sesión de Caja
```json
{
  "id": "string (UUID)",
  "tienda_id": "string (UUID)",
  "numero_sesion": "string (YYYYMMDD-001)",
  "fecha_apertura": "2024-01-20T08:00:00Z",
  "fecha_cierre": "2024-01-20T20:00:00Z",
  "efectivo_apertura": 100.00,
  "efectivo_cierre": 1500.00,
  "nota_apertura": "string",
  "nota_cierre": "string",
  "usuario_apertura": "string",
  "usuario_cierre": "string",
  "estado": "abierta|cerrada",
  "total_ventas": 1400.00,
  "total_efectivo": 800.00,
  "total_tarjeta": 600.00,
  "total_transferencia": 0.00,
  "movimientos_efectivo": [
    {
      "tipo": "entrada|salida",
      "monto": 50.00,
      "motivo": "string",
      "fecha": "2024-01-20T10:30:00Z"
    }
  ]
}
```

### 3. Orden de Compra
```json
{
  "id": "string (UUID)",
  "numero_orden": "string (YYYYMMDD-001)",
  "sesion_caja_id": "string (UUID)",
  "tienda_id": "string (UUID)",
  "cliente_id": "string (UUID, opcional)",
  "cliente_nombre": "string (opcional)",
  "cliente_telefono": "string (opcional)",
  "fecha_creacion": "2024-01-20T10:30:00Z",
  "fecha_pago": "2024-01-20T10:35:00Z",
  "items": [
    {
      "material_codigo": "string",
      "descripcion": "string",
      "cantidad": 2,
      "precio_unitario": 50.00,
      "subtotal": 100.00,
      "categoria": "string"
    }
  ],
  "subtotal": 100.00,
  "impuesto_porcentaje": 13.00,
  "impuesto_monto": 13.00,
  "descuento_porcentaje": 5.00,
  "descuento_monto": 5.00,
  "total": 108.00,
  "estado": "pendiente|pagada|cancelada",
  "metodo_pago": "efectivo|tarjeta|transferencia|mixto",
  "pagos": [
    {
      "metodo": "efectivo",
      "monto": 108.00,
      "monto_recibido": 150.00,
      "cambio": 42.00
    }
  ],
  "almacen_id": "string (UUID del almacén que surtió)",
  "notas": "string"
}
```

### 4. Movimiento de Efectivo
```json
{
  "id": "string (UUID)",
  "sesion_caja_id": "string (UUID)",
  "tipo": "entrada|salida",
  "monto": 50.00,
  "motivo": "Gastos operativos",
  "fecha": "2024-01-20T12:00:00Z",
  "usuario": "string"
}
```

---

## Flujo de Operación

### 1. Apertura de Caja

**Paso 1**: Usuario abre la página de caja
- URL: `/tiendas/{tiendaId}/caja`
- Se muestra modal de apertura

**Paso 2**: Ingreso de efectivo inicial
- Usuario puede usar calculadora de denominaciones
- Se genera desglose automático
- Se registra nota de apertura

**Paso 3**: Confirmación
- POST `/api/caja/sesiones`
- Se crea sesión con estado "abierta"
- Se habilita interfaz POS

### 2. Creación de Orden

**Paso 1**: Usuario crea nueva orden
- Click en "Nueva orden"
- Se genera número automático: `YYYYMMDD-XXX`
- Orden queda en estado "pendiente"

**Paso 2**: Agregar productos
- Búsqueda por código o descripción
- Filtro por categoría
- Click en producto lo agrega a la orden
- Se actualiza cantidad si ya existe

**Paso 3**: Ajustes
- Modificar cantidades con teclado numérico
- Aplicar impuestos (%)
- Aplicar descuentos (%)
- Cálculo automático de totales

### 3. Proceso de Pago

**Paso 1**: Usuario presiona "Pago"
- Se muestra modal de pago
- Opciones: Efectivo, Tarjeta, Transferencia, Mixto

**Paso 2**: Registro de pago
- Si es efectivo: ingresar monto recibido
- Calcular cambio automáticamente
- Confirmar método de pago

**Paso 3**: Finalización
- POST `/api/caja/ordenes/{id}/pagar`
- Backend descuenta stock del almacén
- Orden cambia a estado "pagada"
- Se genera comprobante (opcional)

### 4. Movimientos de Efectivo

**Durante la sesión**:
- Entrada: Agregar efectivo a caja
- Salida: Retirar efectivo (gastos, depósitos)
- POST `/api/caja/sesiones/{id}/movimientos`

### 5. Cierre de Caja

**Paso 1**: Usuario cierra caja
- Click en "Cerrar caja"
- Se muestra resumen de sesión

**Paso 2**: Conteo final
- Ingresar efectivo real en caja
- Comparar con efectivo esperado
- Registrar diferencias

**Paso 3**: Confirmación
- PUT `/api/caja/sesiones/{id}/cerrar`
- Sesión cambia a estado "cerrada"
- Se genera reporte de cierre

---

## API Endpoints

### Sesiones de Caja

#### POST /api/caja/sesiones
Abre una nueva sesión de caja.

**Request Body**:
```json
{
  "tienda_id": "uuid",
  "efectivo_apertura": 100.00,
  "nota_apertura": "Desglose de billetes..."
}
```

**Response**:
```json
{
  "id": "uuid",
  "numero_sesion": "20240120-001",
  "fecha_apertura": "2024-01-20T08:00:00Z",
  "estado": "abierta",
  ...
}
```

#### GET /api/caja/sesiones/{id}
Obtiene detalles de una sesión.

#### GET /api/caja/sesiones/activa
Obtiene la sesión activa de una tienda.

**Query Params**:
- `tienda_id`: UUID de la tienda

#### PUT /api/caja/sesiones/{id}/cerrar
Cierra una sesión de caja.

**Request Body**:
```json
{
  "efectivo_cierre": 1500.00,
  "nota_cierre": "Conteo final..."
}
```

### Órdenes de Compra

#### POST /api/caja/ordenes
Crea una nueva orden.

**Request Body**:
```json
{
  "sesion_caja_id": "uuid",
  "tienda_id": "uuid",
  "cliente_id": "uuid (opcional)",
  "items": [
    {
      "material_codigo": "MAT001",
      "cantidad": 2,
      "precio_unitario": 50.00
    }
  ],
  "impuesto_porcentaje": 13.00,
  "descuento_porcentaje": 0.00
}
```

**Response**:
```json
{
  "id": "uuid",
  "numero_orden": "20240120-001",
  "total": 113.00,
  "estado": "pendiente",
  ...
}
```

#### GET /api/caja/ordenes
Lista órdenes de una sesión.

**Query Params**:
- `sesion_caja_id`: UUID de la sesión
- `estado`: pendiente|pagada|cancelada
- `fecha_desde`: ISO date
- `fecha_hasta`: ISO date

#### GET /api/caja/ordenes/{id}
Obtiene detalles de una orden.

#### PUT /api/caja/ordenes/{id}
Actualiza una orden (solo si está pendiente).

#### POST /api/caja/ordenes/{id}/pagar
Procesa el pago de una orden.

**Request Body**:
```json
{
  "metodo_pago": "efectivo",
  "pagos": [
    {
      "metodo": "efectivo",
      "monto": 113.00,
      "monto_recibido": 150.00
    }
  ],
  "almacen_id": "uuid"
}
```

**Lógica del Backend**:
1. Validar que la orden esté en estado "pendiente"
2. Validar stock disponible en el almacén
3. Crear movimientos de inventario (tipo: "venta")
4. Descontar stock del almacén
5. Actualizar orden a estado "pagada"
6. Registrar fecha de pago
7. Actualizar totales de la sesión

**Response**:
```json
{
  "success": true,
  "orden": { ... },
  "cambio": 37.00,
  "movimientos_inventario": [ ... ]
}
```

#### DELETE /api/caja/ordenes/{id}
Cancela una orden (solo si está pendiente).

### Movimientos de Efectivo

#### POST /api/caja/sesiones/{id}/movimientos
Registra entrada o salida de efectivo.

**Request Body**:
```json
{
  "tipo": "salida",
  "monto": 50.00,
  "motivo": "Gastos operativos"
}
```

#### GET /api/caja/sesiones/{id}/movimientos
Lista movimientos de efectivo de una sesión.

---

## Frontend - Componentes

### Estructura de Archivos

```
app/tiendas/[tiendaId]/
  ├── page.tsx                    # Página principal de tienda
  └── caja/
      └── page.tsx                # Página de caja registradora

components/feats/inventario/
  ├── pos-view.tsx                # Vista principal del POS
  ├── entrada-salida-efectivo-dialog.tsx
  └── pago-dialog.tsx             # (Por crear)
```

### Componentes Principales

#### 1. CajaPage (`app/tiendas/[tiendaId]/caja/page.tsx`)

**Responsabilidades**:
- Controlar apertura/cierre de caja
- Modal de apertura con calculadora de denominaciones
- Renderizar PosView cuando la caja está abierta

**Estado**:
```typescript
const [cajaAbierta, setCajaAbierta] = useState(false)
const [sesionActual, setSesionActual] = useState<SesionCaja | null>(null)
const [efectivoApertura, setEfectivoApertura] = useState("")
const [denominaciones, setDenominaciones] = useState<Denominacion[]>([...])
```

**Funciones clave**:
- `handleAbrirCaja()`: Llama a POST `/api/caja/sesiones`
- `handleCerrarCaja()`: Llama a PUT `/api/caja/sesiones/{id}/cerrar`
- `calcularTotal()`: Suma denominaciones

#### 2. PosView (`components/feats/inventario/pos-view.tsx`)

**Responsabilidades**:
- Gestionar órdenes de compra
- Agregar/quitar productos
- Calcular totales con impuestos y descuentos
- Procesar pagos

**Estado**:
```typescript
const [ordenes, setOrdenes] = useState<Orden[]>([])
const [ordenActiva, setOrdenActiva] = useState<string | null>(null)
const [itemSeleccionado, setItemSeleccionado] = useState<string | null>(null)
const [tecladoModo, setTecladoModo] = useState<"cantidad" | "impuesto" | "descuento">()
const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(0)
const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0)
```

**Funciones clave**:
- `crearNuevaOrden()`: Genera número y crea orden local
- `agregarProductoAOrden(material)`: Agrega item a orden activa
- `cambiarCantidadItem()`: Modifica cantidad con teclado
- `handlePago()`: Abre modal de pago
- `procesarPago()`: Llama a POST `/api/caja/ordenes/{id}/pagar`

#### 3. PagoDialog (Por crear)

**Props**:
```typescript
interface PagoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orden: Orden
  almacenes: Almacen[]
  onConfirm: (data: PagoData) => Promise<void>
}
```

**Funcionalidad**:
- Seleccionar método de pago
- Seleccionar almacén de origen
- Ingresar monto recibido (efectivo)
- Calcular cambio
- Validar stock antes de confirmar

---

## Integración con Inventario

### Flujo de Descuento de Stock

**Cuando se paga una orden**:

1. **Frontend** envía:
```json
POST /api/caja/ordenes/{id}/pagar
{
  "metodo_pago": "efectivo",
  "pagos": [...],
  "almacen_id": "uuid"
}
```

2. **Backend** procesa:

```python
# Pseudocódigo del backend
def pagar_orden(orden_id, data):
    orden = get_orden(orden_id)
    
    # Validar estado
    if orden.estado != "pendiente":
        raise Error("Orden ya procesada")
    
    # Validar stock
    for item in orden.items:
        stock = get_stock(data.almacen_id, item.material_codigo)
        if stock.cantidad < item.cantidad:
            raise Error(f"Stock insuficiente: {item.descripcion}")
    
    # Crear movimientos de inventario
    movimientos = []
    for item in orden.items:
        movimiento = crear_movimiento({
            "tipo": "venta",
            "material_codigo": item.material_codigo,
            "cantidad": item.cantidad,
            "almacen_origen_id": data.almacen_id,
            "tienda_id": orden.tienda_id,
            "referencia": orden.numero_orden,
            "motivo": f"Venta - Orden {orden.numero_orden}"
        })
        movimientos.append(movimiento)
    
    # Descontar stock
    for item in orden.items:
        descontar_stock(
            almacen_id=data.almacen_id,
            material_codigo=item.material_codigo,
            cantidad=item.cantidad
        )
    
    # Actualizar orden
    orden.estado = "pagada"
    orden.fecha_pago = now()
    orden.metodo_pago = data.metodo_pago
    orden.pagos = data.pagos
    orden.almacen_id = data.almacen_id
    
    # Calcular cambio si es efectivo
    if data.metodo_pago == "efectivo":
        total_recibido = sum(p.monto_recibido for p in data.pagos)
        cambio = total_recibido - orden.total
    
    # Actualizar totales de sesión
    actualizar_totales_sesion(orden.sesion_caja_id)
    
    return {
        "success": True,
        "orden": orden,
        "cambio": cambio,
        "movimientos_inventario": movimientos
    }
```

### Endpoints de Inventario Utilizados

**Ya existentes**:
- `GET /api/inventario/stock?almacen_id={id}` - Consultar stock
- `POST /api/inventario/movimientos` - Crear movimiento

**Integración**:
- El endpoint de pago debe usar estos servicios internamente
- No es necesario que el frontend llame directamente a inventario
- El backend maneja la transacción completa

---

## Tipos TypeScript

### Crear archivo: `lib/types/feats/caja/caja-types.ts`

```typescript
export interface SesionCaja {
  id: string
  tienda_id: string
  numero_sesion: string
  fecha_apertura: string
  fecha_cierre?: string
  efectivo_apertura: number
  efectivo_cierre?: number
  nota_apertura?: string
  nota_cierre?: string
  usuario_apertura: string
  usuario_cierre?: string
  estado: "abierta" | "cerrada"
  total_ventas: number
  total_efectivo: number
  total_tarjeta: number
  total_transferencia: number
  movimientos_efectivo: MovimientoEfectivo[]
}

export interface MovimientoEfectivo {
  id?: string
  tipo: "entrada" | "salida"
  monto: number
  motivo: string
  fecha: string
  usuario?: string
}

export interface OrdenCompra {
  id: string
  numero_orden: string
  sesion_caja_id: string
  tienda_id: string
  cliente_id?: string
  cliente_nombre?: string
  cliente_telefono?: string
  fecha_creacion: string
  fecha_pago?: string
  items: ItemOrden[]
  subtotal: number
  impuesto_porcentaje: number
  impuesto_monto: number
  descuento_porcentaje: number
  descuento_monto: number
  total: number
  estado: "pendiente" | "pagada" | "cancelada"
  metodo_pago?: MetodoPago
  pagos: Pago[]
  almacen_id?: string
  notas?: string
}

export interface ItemOrden {
  material_codigo: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  categoria?: string
}

export type MetodoPago = "efectivo" | "tarjeta" | "transferencia" | "mixto"

export interface Pago {
  metodo: MetodoPago
  monto: number
  monto_recibido?: number
  cambio?: number
  referencia?: string
}

export interface SesionCreateData {
  tienda_id: string
  efectivo_apertura: number
  nota_apertura?: string
}

export interface SesionCloseData {
  efectivo_cierre: number
  nota_cierre?: string
}

export interface OrdenCreateData {
  sesion_caja_id: string
  tienda_id: string
  cliente_id?: string
  items: ItemOrden[]
  impuesto_porcentaje: number
  descuento_porcentaje: number
}

export interface PagoData {
  metodo_pago: MetodoPago
  pagos: Pago[]
  almacen_id: string
}

export interface Denominacion {
  valor: number
  cantidad: number
}
```

---

## Servicio de Caja

### Crear archivo: `lib/services/feats/caja/caja-service.ts`

```typescript
import { apiRequest } from '../../../api-config'
import type {
  SesionCaja,
  SesionCreateData,
  SesionCloseData,
  OrdenCompra,
  OrdenCreateData,
  PagoData,
  MovimientoEfectivo,
} from '../../../types/feats/caja/caja-types'

export class CajaService {
  // Sesiones
  static async crearSesion(data: SesionCreateData): Promise<SesionCaja> {
    return apiRequest<SesionCaja>('/caja/sesiones', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async getSesion(id: string): Promise<SesionCaja> {
    return apiRequest<SesionCaja>(`/caja/sesiones/${id}`)
  }

  static async getSesionActiva(tiendaId: string): Promise<SesionCaja | null> {
    return apiRequest<SesionCaja>(`/caja/sesiones/activa?tienda_id=${tiendaId}`)
  }

  static async cerrarSesion(id: string, data: SesionCloseData): Promise<SesionCaja> {
    return apiRequest<SesionCaja>(`/caja/sesiones/${id}/cerrar`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Órdenes
  static async crearOrden(data: OrdenCreateData): Promise<OrdenCompra> {
    return apiRequest<OrdenCompra>('/caja/ordenes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async getOrdenes(params: {
    sesion_caja_id?: string
    estado?: string
    fecha_desde?: string
    fecha_hasta?: string
  }): Promise<OrdenCompra[]> {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) search.set(key, value)
    })
    const suffix = search.toString() ? `?${search.toString()}` : ''
    return apiRequest<OrdenCompra[]>(`/caja/ordenes${suffix}`)
  }

  static async getOrden(id: string): Promise<OrdenCompra> {
    return apiRequest<OrdenCompra>(`/caja/ordenes/${id}`)
  }

  static async actualizarOrden(id: string, data: Partial<OrdenCreateData>): Promise<OrdenCompra> {
    return apiRequest<OrdenCompra>(`/caja/ordenes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  static async pagarOrden(id: string, data: PagoData): Promise<{
    success: boolean
    orden: OrdenCompra
    cambio?: number
    movimientos_inventario: any[]
  }> {
    return apiRequest(`/caja/ordenes/${id}/pagar`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async cancelarOrden(id: string): Promise<void> {
    return apiRequest(`/caja/ordenes/${id}`, {
      method: 'DELETE',
    })
  }

  // Movimientos de efectivo
  static async crearMovimientoEfectivo(
    sesionId: string,
    data: Omit<MovimientoEfectivo, 'id' | 'fecha' | 'usuario'>
  ): Promise<MovimientoEfectivo> {
    return apiRequest<MovimientoEfectivo>(`/caja/sesiones/${sesionId}/movimientos`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async getMovimientosEfectivo(sesionId: string): Promise<MovimientoEfectivo[]> {
    return apiRequest<MovimientoEfectivo[]>(`/caja/sesiones/${sesionId}/movimientos`)
  }
}
```

---

## Hook Personalizado

### Crear archivo: `hooks/use-caja.ts`

```typescript
import { useCallback, useEffect, useState } from 'react'
import { CajaService } from '@/lib/api-services'
import type {
  SesionCaja,
  OrdenCompra,
  SesionCreateData,
  SesionCloseData,
  OrdenCreateData,
  PagoData,
  MovimientoEfectivo,
} from '@/lib/types/feats/caja/caja-types'

interface UseCajaReturn {
  sesionActual: SesionCaja | null
  ordenes: OrdenCompra[]
  loading: boolean
  error: string | null
  
  // Sesiones
  abrirCaja: (data: SesionCreateData) => Promise<SesionCaja>
  cerrarCaja: (data: SesionCloseData) => Promise<SesionCaja>
  cargarSesionActiva: (tiendaId: string) => Promise<void>
  
  // Órdenes
  crearOrden: (data: OrdenCreateData) => Promise<OrdenCompra>
  actualizarOrden: (id: string, data: Partial<OrdenCreateData>) => Promise<OrdenCompra>
  pagarOrden: (id: string, data: PagoData) => Promise<any>
  cancelarOrden: (id: string) => Promise<void>
  cargarOrdenes: (sesionId: string) => Promise<void>
  
  // Movimientos
  registrarMovimientoEfectivo: (data: Omit<MovimientoEfectivo, 'id' | 'fecha' | 'usuario'>) => Promise<void>
}

export function useCaja(tiendaId?: string): UseCajaReturn {
  const [sesionActual, setSesionActual] = useState<SesionCaja | null>(null)
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarSesionActiva = useCallback(async (tid: string) => {
    setLoading(true)
    setError(null)
    try {
      const sesion = await CajaService.getSesionActiva(tid)
      setSesionActual(sesion)
      if (sesion) {
        await cargarOrdenes(sesion.id)
      }
    } catch (err) {
      console.error('Error cargando sesión:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar sesión')
      setSesionActual(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tiendaId) {
      cargarSesionActiva(tiendaId)
    }
  }, [tiendaId, cargarSesionActiva])

  const abrirCaja = async (data: SesionCreateData): Promise<SesionCaja> => {
    setLoading(true)
    setError(null)
    try {
      const sesion = await CajaService.crearSesion(data)
      setSesionActual(sesion)
      setOrdenes([])
      return sesion
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al abrir caja'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const cerrarCaja = async (data: SesionCloseData): Promise<SesionCaja> => {
    if (!sesionActual) throw new Error('No hay sesión activa')
    
    setLoading(true)
    setError(null)
    try {
      const sesion = await CajaService.cerrarSesion(sesionActual.id, data)
      setSesionActual(sesion)
      return sesion
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cerrar caja'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const cargarOrdenes = async (sesionId: string) => {
    try {
      const data = await  compra
- Descontar automáticamente del inventario al pagar
- Registrar movimientos de efectivo
- Generar reportes de ventas

La implementación está diseñada para ser escalable, segura y fácil de mantener, siguiendo las mejores prácticas de desarrollo.
ambio: ${resultado.cambio}`) // 37.00

// 4. Registrar movimiento de efectivo
await registrarMovimientoEfectivo({
  tipo: "salida",
  monto: 50.00,
  motivo: "Gastos operativos"
})

// 5. Cerrar caja
await cerrarCaja({
  efectivo_cierre: 1595.00,
  nota_cierre: "Conteo final..."
})
```

---

## Conclusión

Este documento describe la arquitectura completa del sistema de caja registradora integrado con el inventario. El sistema permite:

- Gestionar sesiones de caja con apertura/cierre
- Crear y procesar órdenes deden = await crearOrden({
  sesion_caja_id: sesion.id,
  tienda_id: "uuid",
  items: [
    {
      material_codigo: "MAT001",
      descripcion: "Producto A",
      cantidad: 2,
      precio_unitario: 50.00,
      subtotal: 100.00
    }
  ],
  impuesto_porcentaje: 13.00,
  descuento_porcentaje: 0.00
})

// 3. Pagar orden
const resultado = await pagarOrden(orden.id, {
  metodo_pago: "efectivo",
  pagos: [{
    metodo: "efectivo",
    monto: 113.00,
    monto_recibido: 150.00
  }],
  almacen_id: "uuid"
})

console.log(`Calidar stock al momento del pago, no al agregar

### Performance
- Cachear lista de materiales en frontend
- Paginar órdenes si hay muchas
- Índices en base de datos para consultas frecuentes

### Seguridad
- Validar permisos por tienda
- Auditar todas las operaciones
- Encriptar datos sensibles de pagos

---

## Ejemplo de Flujo Completo

```typescript
// 1. Abrir caja
const sesion = await abrirCaja({
  tienda_id: "uuid",
  efectivo_apertura: 100.00,
  nota_apertura: "Desglose..."
})

// 2. Crear orden
const orta
1. Implementar modal de pago
2. Integrar con backend
3. Agregar validaciones
4. Implementar cierre de caja

### Fase 4: Mejoras
1. Agregar selección de cliente
2. Implementar impresión de tickets
3. Agregar reportes
4. Optimizar rendimiento

---

## Notas Técnicas

### Transacciones
- El pago de orden debe ser una transacción atómica
- Si falla el descuento de stock, revertir todo
- Usar transacciones de base de datos

### Concurrencia
- Manejar múltiples usuarios en la misma tienda
- Lock optimista en stock
- Vmite=10`

3. **Historial de sesiones**
   - `GET /api/caja/sesiones?tienda_id=...&fecha_desde=...&fecha_hasta=...`

---

## Próximos Pasos de Implementación

### Fase 1: Backend Base
1. Crear modelos de base de datos
2. Implementar endpoints de sesiones
3. Implementar endpoints de órdenes
4. Integrar con sistema de inventario

### Fase 2: Frontend Base
1. Crear tipos TypeScript
2. Implementar servicio de caja
3. Crear hook `useCaja`
4. Actualizar componente de apertura de caja

### Fase 3: Funcionalidad Complerado": 1600.00,
    "efectivo_real": 1595.00,
    "diferencia": -5.00
  },
  "movimientos_efectivo": [ ... ],
  "ordenes": [ ... ],
  "productos_vendidos": [
    {
      "material_codigo": "MAT001",
      "descripcion": "Producto A",
      "cantidad_total": 15,
      "total_ventas": 750.00
    }
  ]
}
```

### Consultas Útiles

1. **Ventas por período**
   - `GET /api/caja/reportes/ventas?fecha_desde=...&fecha_hasta=...`

2. **Productos más vendidos**
   - `GET /api/caja/reportes/productos-top?tienda_id=...&list con mensaje claro
   - No permitir acciones si hay error de red
   - Reintentar automáticamente en caso de timeout

---

## Reportes y Consultas

### Reporte de Cierre de Caja

**Endpoint**: `GET /api/caja/sesiones/{id}/reporte`

**Contenido**:
```json
{
  "sesion": { ... },
  "resumen": {
    "total_ordenes": 25,
    "ordenes_pagadas": 23,
    "ordenes_canceladas": 2,
    "total_ventas": 2500.00,
    "total_efectivo": 1500.00,
    "total_tarjeta": 800.00,
    "total_transferencia": 200.00,
    "efectivo_espee Caja**
   - Solo se puede cerrar si está abierta
   - Calcular totales automáticamente
   - Registrar diferencias de efectivo
   - No se pueden modificar órdenes después del cierre

### Frontend

1. **Validación de Formularios**
   - Efectivo de apertura: número >= 0
   - Cantidades: enteros > 0
   - Impuestos/descuentos: 0-100%

2. **Confirmaciones**
   - Confirmar antes de cancelar orden
   - Confirmar antes de cerrar caja
   - Alertar si hay diferencias de efectivo

3. **Manejo de Errores**
   - Mostrar toaades deben ser > 0
   - Precios deben ser >= 0

3. **Pago de Orden**
   - Orden debe estar en estado "pendiente"
   - Validar stock disponible en almacén
   - Monto total de pagos debe coincidir con total de orden
   - Si es efectivo, monto_recibido >= total
   - Almacén debe pertenecer a la tienda

4. **Descuento de Stock**
   - Crear movimiento de inventario tipo "venta"
   - Descontar cantidad del stock del almacén
   - Si stock insuficiente, rechazar pago
   - Registrar referencia a número de orden

5. **Cierre dabrirCaja,
    cerrarCaja,
    cargarSesionActiva,
    crearOrden,
    actualizarOrden,
    pagarOrden,
    cancelarOrden,
    cargarOrdenes,
    registrarMovimientoEfectivo,
  }
}
```

---

## Validaciones y Reglas de Negocio

### Backend

1. **Apertura de Caja**
   - Solo puede haber una sesión abierta por tienda
   - Efectivo de apertura debe ser >= 0
   - Generar número de sesión único: `YYYYMMDD-XXX`

2. **Creación de Orden**
   - Debe existir una sesión abierta
   - Items no pueden estar vacíos
   - Cantid sesión activa')
    
    try {
      await CajaService.crearMovimientoEfectivo(sesionActual.id, data)
      
      // Recargar sesión para actualizar movimientos
      const sesionActualizada = await CajaService.getSesion(sesionActual.id)
      setSesionActual(sesionActualizada)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar movimiento'
      setError(message)
      throw err
    }
  }

  return {
    sesionActual,
    ordenes,
    loading,
    error,
    message)
      throw err
    }
  }

  const cancelarOrden = async (id: string) => {
    try {
      await CajaService.cancelarOrden(id)
      setOrdenes(prev => prev.filter(o => o.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cancelar orden'
      setError(message)
      throw err
    }
  }

  const registrarMovimientoEfectivo = async (
    data: Omit<MovimientoEfectivo, 'id' | 'fecha' | 'usuario'>
  ) => {
    if (!sesionActual) throw new Error('No hay: PagoData) => {
    try {
      const result = await CajaService.pagarOrden(id, data)
      setOrdenes(prev => prev.map(o => o.id === id ? result.orden : o))
      
      // Recargar sesión para actualizar totales
      if (sesionActual) {
        const sesionActualizada = await CajaService.getSesion(sesionActual.id)
        setSesionActual(sesionActualizada)
      }
      
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar pago'
      setError(      setError(message)
      throw err
    }
  }

  const actualizarOrden = async (id: string, data: Partial<OrdenCreateData>): Promise<OrdenCompra> => {
    try {
      const orden = await CajaService.actualizarOrden(id, data)
      setOrdenes(prev => prev.map(o => o.id === id ? orden : o))
      return orden
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar orden'
      setError(message)
      throw err
    }
  }

  const pagarOrden = async (id: string, dataCajaService.getOrdenes({ sesion_caja_id: sesionId })
      setOrdenes(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error cargando órdenes:', err)
      setOrdenes([])
    }
  }

  const crearOrden = async (data: OrdenCreateData): Promise<OrdenCompra> => {
    try {
      const orden = await CajaService.crearOrden(data)
      setOrdenes(prev => [...prev, orden])
      return orden
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear orden'
