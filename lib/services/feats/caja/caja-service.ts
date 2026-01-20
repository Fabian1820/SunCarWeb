import { apiRequest } from '@/lib/api-config';
import type {
  SesionCaja,
  OrdenCompra,
  MovimientoEfectivo,
  AbrirSesionRequest,
  CerrarSesionRequest,
  MovimientoEfectivoRequest,
  CrearOrdenRequest,
  PagarOrdenRequest,
  PagarOrdenResponse,
} from '@/lib/types/feats/caja-types';

const BASE_URL = '/caja';

export const cajaService = {
  // ========== SESIONES ==========
  
  async abrirSesion(data: AbrirSesionRequest): Promise<SesionCaja> {
    const response = await apiRequest<{ data: SesionCaja }>(
      `${BASE_URL}/sesiones`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async obtenerSesion(sesionId: string): Promise<SesionCaja> {
    const response = await apiRequest<{ data: SesionCaja }>(
      `${BASE_URL}/sesiones/${sesionId}`
    );
    return response.data;
  },

  async listarSesiones(params?: {
    tienda_id?: string;
    estado?: 'abierta' | 'cerrada';
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Promise<SesionCaja[]> {
    const queryParams = new URLSearchParams();
    if (params?.tienda_id) queryParams.append('tienda_id', params.tienda_id);
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
    if (params?.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);
    
    const queryString = queryParams.toString();
    const url = queryString ? `${BASE_URL}/sesiones?${queryString}` : `${BASE_URL}/sesiones`;
    
    const response = await apiRequest<{ data: SesionCaja[] }>(url);
    return response.data;
  },

  async obtenerSesionActiva(tiendaId: string): Promise<SesionCaja | null> {
    try {
      const response = await apiRequest<{ data: SesionCaja | null }>(
        `${BASE_URL}/tiendas/${tiendaId}/sesion-activa`
      );
      return response.data;
    } catch (error: any) {
      if (error.message?.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async cerrarSesion(sesionId: string, data: CerrarSesionRequest): Promise<SesionCaja> {
    const response = await apiRequest<{ data: SesionCaja }>(
      `${BASE_URL}/sesiones/${sesionId}/cerrar`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  // ========== MOVIMIENTOS DE EFECTIVO ==========

  async registrarMovimiento(
    sesionId: string,
    data: MovimientoEfectivoRequest
  ): Promise<MovimientoEfectivo> {
    const response = await apiRequest<{ data: MovimientoEfectivo }>(
      `${BASE_URL}/sesiones/${sesionId}/movimientos-efectivo`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async listarMovimientos(sesionId: string): Promise<MovimientoEfectivo[]> {
    const response = await apiRequest<{ data: MovimientoEfectivo[] }>(
      `${BASE_URL}/sesiones/${sesionId}/movimientos-efectivo`
    );
    return response.data;
  },

  // ========== ÓRDENES ==========

  async crearOrden(data: CrearOrdenRequest): Promise<OrdenCompra> {
    const response = await apiRequest<{ data: OrdenCompra }>(
      `${BASE_URL}/ordenes`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async obtenerOrden(ordenId: string): Promise<OrdenCompra> {
    const response = await apiRequest<{ data: OrdenCompra }>(
      `${BASE_URL}/ordenes/${ordenId}`
    );
    return response.data;
  },

  async listarOrdenes(params?: {
    sesion_caja_id?: string;
    estado?: 'pendiente' | 'pagada' | 'cancelada';
    tienda_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Promise<OrdenCompra[]> {
    const queryParams = new URLSearchParams();
    if (params?.sesion_caja_id) queryParams.append('sesion_caja_id', params.sesion_caja_id);
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.tienda_id) queryParams.append('tienda_id', params.tienda_id);
    if (params?.fecha_desde) queryParams.append('fecha_desde', params.fecha_desde);
    if (params?.fecha_hasta) queryParams.append('fecha_hasta', params.fecha_hasta);
    
    const queryString = queryParams.toString();
    const url = queryString ? `${BASE_URL}/ordenes?${queryString}` : `${BASE_URL}/ordenes`;
    
    const response = await apiRequest<{ data: OrdenCompra[] }>(url);
    return response.data;
  },

  async actualizarOrden(
    ordenId: string,
    data: Partial<CrearOrdenRequest>
  ): Promise<OrdenCompra> {
    const response = await apiRequest<{ data: OrdenCompra }>(
      `${BASE_URL}/ordenes/${ordenId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async cancelarOrden(ordenId: string): Promise<void> {
    await apiRequest<void>(`${BASE_URL}/ordenes/${ordenId}`, {
      method: 'DELETE',
    });
  },

  // ========== PAGOS ==========

  async pagarOrden(
    ordenId: string,
    data: PagarOrdenRequest
  ): Promise<PagarOrdenResponse> {
    const response = await apiRequest<{ data: PagarOrdenResponse }>(
      `${BASE_URL}/ordenes/${ordenId}/pagar`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },
};
