# Sistema de Caja Registradora - Hooks y Ejemplos

## Hook Personalizado

### Archivo: `hooks/use-caja.ts`

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

  const cerrarCaja = async (data: SesionCloseData): Promise<SesionCaja> {
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
      const data = await CajaService.getOrdenes({ sesion_caja_id: sesionId })
      setOrdenes(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error cargando órdenes:', err)
      setOrdenes([])
    }
  }

  const crearOrden = async (data: OrdenCreateData): Promise<OrdenCompra> {
    try {
      const orden = await CajaService.crearOrden(data)
      setOrdenes(prev => [...prev, orden])
      return orden
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear orden'
      setError(message)
      throw err
    }
  }

  const actualizarOrden = async (id: string, data: Partial<OrdenCreateData>): Promise<OrdenCompra> {
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

  const pagarOrden = async (id: string, data: PagoData) => {
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
      setError(message)
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
    if (!sesionActual) throw new Error('No hay sesión activa')
    
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
    abrirCaja,
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

## Ejemplo de Flujo Completo

```typescript
// 1. Abrir caja
const sesion = await abrirCaja({
  tienda_id: "uuid",
  efectivo_apertura: 100.00,
  nota_apertura: "Desglose de billetes..."
})

// 2. Crear orden
const orden = await crearOrden({
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

console.log(`Cambio: ${resultado.cambio}`) // 37.00

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

## Validaciones y Reglas de Negocio

### Backend

1. **Apertura de Caja**
   - Solo puede haber una sesión abierta por tienda
   - Efectivo de apertura debe ser >= 0
   - Generar número de sesión único: `YYYYMMDD-XXX`

2. **Creación de Orden**
   - Debe existir una sesión abierta
   - Items no pueden estar vacíos
   - Cantidades deben ser > 0
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

5. **Cierre de Caja**
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
   - Mostrar toast con mensaje claro
   - No permitir acciones si hay error de red
   - Reintentar automáticamente en caso de timeout

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

### Fase 3: Funcionalidad Completa
1. Implementar modal de pago
2. Integrar con backend
3. Agregar validaciones
4. Implementar cierre de caja

### Fase 4: Mejoras
1. Agregar selección de cliente
2. Implementar impresión de tickets
3. Agregar reportes
4. Optimizar rendimiento
