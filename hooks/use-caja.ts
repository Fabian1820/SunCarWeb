import { useState, useEffect, useCallback } from 'react';
import { cajaService } from '@/lib/services/feats/caja/caja-service';
import type {
  SesionCaja,
  OrdenCompra,
  ItemOrden,
  MetodoPago,
  PagoDetalle,
  TotalesOrden,
} from '@/lib/types/feats/caja-types';
import { toast } from '@/hooks/use-toast';

export function useCaja(tiendaId: string) {
  const [sesionActiva, setSesionActiva] = useState<SesionCaja | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar sesión activa al montar
  useEffect(() => {
    if (tiendaId) {
      verificarSesion();
    }
  }, [tiendaId]);

  const verificarSesion = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sesion = await cajaService.obtenerSesionActiva(tiendaId);
      setSesionActiva(sesion);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Error al verificar sesión';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [tiendaId]);

  const abrirSesion = useCallback(async (efectivoApertura: number, notas = '') => {
    try {
      setLoading(true);
      setError(null);
      const sesion = await cajaService.abrirSesion({
        tienda_id: tiendaId,
        efectivo_apertura: efectivoApertura,
        nota_apertura: notas,
      });
      setSesionActiva(sesion);
      toast({
        title: 'Sesión abierta',
        description: `Sesión ${sesion.numero_sesion} abierta exitosamente`,
      });
      return sesion;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Error al abrir sesión';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [tiendaId]);

  const cerrarSesion = useCallback(async (efectivoCierre: number, notas = '') => {
    if (!sesionActiva) {
      throw new Error('No hay sesión activa');
    }

    try {
      setLoading(true);
      setError(null);
      const sesion = await cajaService.cerrarSesion(sesionActiva.id, {
        efectivo_cierre: efectivoCierre,
        nota_cierre: notas,
      });
      setSesionActiva(null);
      toast({
        title: 'Sesión cerrada',
        description: `Sesión ${sesion.numero_sesion} cerrada exitosamente`,
      });
      return sesion;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Error al cerrar sesión';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sesionActiva]);

  const registrarMovimiento = useCallback(async (
    tipo: 'entrada' | 'salida',
    monto: number,
    motivo: string
  ) => {
    if (!sesionActiva) {
      throw new Error('No hay sesión activa');
    }

    try {
      const movimiento = await cajaService.registrarMovimiento(sesionActiva.id, {
        tipo,
        monto,
        motivo,
      });
      // Actualizar sesión para reflejar el movimiento
      await verificarSesion();
      toast({
        title: 'Movimiento registrado',
        description: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} de $${monto.toFixed(2)}`,
      });
      return movimiento;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Error al registrar movimiento';
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    }
  }, [sesionActiva, verificarSesion]);

  const crearOrden = useCallback(async (
    items: Omit<ItemOrden, 'subtotal'>[],
    impuesto = 16,
    descuento = 0,
    clienteData?: {
      cliente_id?: string;
      cliente_nombre?: string;
      cliente_ci?: string;
      cliente_telefono?: string;
    },
    notas?: string
  ) => {
    if (!sesionActiva) {
      throw new Error('No hay sesión activa');
    }

    if (items.length === 0) {
      throw new Error('Debe agregar al menos un item');
    }

    try {
      const orden = await cajaService.crearOrden({
        sesion_caja_id: sesionActiva.id,
        tienda_id: tiendaId,
        items,
        impuesto_porcentaje: impuesto,
        descuento_porcentaje: descuento,
        ...clienteData,
        notas,
      });
      toast({
        title: 'Orden creada',
        description: `Orden ${orden.numero_orden} creada exitosamente`,
      });
      return orden;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Error al crear orden';
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    }
  }, [sesionActiva, tiendaId]);

  const procesarPago = useCallback(async (
    ordenId: string,
    metodoPago: MetodoPago,
    pagos: PagoDetalle[],
    almacenId: string
  ) => {
    try {
      const resultado = await cajaService.pagarOrden(ordenId, {
        metodo_pago: metodoPago,
        almacen_id: almacenId,
        pagos,
      });
      
      // Actualizar sesión para reflejar nuevos totales
      await verificarSesion();
      
      toast({
        title: 'Pago procesado',
        description: `Orden ${resultado.orden.numero_orden} pagada exitosamente`,
      });
      
      return resultado;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Error al procesar pago';
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      throw err;
    }
  }, [verificarSesion]);

  return {
    sesionActiva,
    loading,
    error,
    abrirSesion,
    cerrarSesion,
    registrarMovimiento,
    crearOrden,
    procesarPago,
    verificarSesion,
  };
}

// Hook auxiliar para calcular totales de una orden
export function useCalcularTotales(
  items: Omit<ItemOrden, 'subtotal'>[],
  impuestoPorcentaje: number,
  descuentoPorcentaje: number
): TotalesOrden {
  const subtotal = items.reduce(
    (sum, item) => sum + item.cantidad * item.precio_unitario,
    0
  );

  const descuento_monto = subtotal * (descuentoPorcentaje / 100);
  const base_imponible = subtotal - descuento_monto;
  const impuesto_monto = base_imponible * (impuestoPorcentaje / 100);
  const total = base_imponible + impuesto_monto;

  return {
    subtotal,
    descuento_monto,
    base_imponible,
    impuesto_monto,
    total,
  };
}
