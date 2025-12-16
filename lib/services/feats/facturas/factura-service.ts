import { API_BASE_URL } from '@/lib/api-config';
import type {
    Factura,
    FacturaFilters,
    FacturaStats,
    NumeroFacturaSugerido,
    Vale
} from '@/lib/types/feats/facturas/factura-types';

/**
 * Servicio para interactuar con la API de Facturas
 */
export class FacturaService {
    private baseUrl: string;
    private token: string | null;

    constructor() {
        this.baseUrl = `${API_BASE_URL}/facturas`;
        this.token = null;
    }

    /**
     * Establece el token de autenticación
     */
    setToken(token: string | null) {
        this.token = token;
    }

    /**
     * Obtiene los headers para las peticiones
     */
    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * Obtiene un número de factura sugerido
     */
    async obtenerNumeroSugerido(): Promise<NumeroFacturaSugerido> {
        const response = await fetch(`${this.baseUrl}/numero-sugerido`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Error obteniendo número sugerido');
        }

        return response.json();
    }

    /**
     * Crea una nueva factura
     */
    async crearFactura(factura: Omit<Factura, 'id' | 'fecha_creacion' | 'total'>): Promise<{ message: string; id: string; numero_factura: string }> {
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(factura),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error creando factura');
        }

        return response.json();
    }

    /**
     * Lista facturas con filtros opcionales
     */
    async listarFacturas(filters?: FacturaFilters, skip: number = 0, limit: number = 100): Promise<Factura[]> {
        const params = new URLSearchParams();

        if (filters?.mes) params.append('mes', filters.mes.toString());
        if (filters?.anio) params.append('anio', filters.anio.toString());
        if (filters?.fecha_especifica) params.append('fecha_especifica', filters.fecha_especifica);
        if (filters?.nombre_cliente) params.append('nombre_cliente', filters.nombre_cliente);
        if (filters?.estado) params.append('estado', filters.estado);
        params.append('skip', skip.toString());
        params.append('limit', limit.toString());

        const response = await fetch(`${this.baseUrl}?${params}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Error listando facturas');
        }

        return response.json();
    }

    /**
     * Obtiene una factura por su ID
     */
    async obtenerFactura(id: string): Promise<Factura> {
        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Error obteniendo factura');
        }

        return response.json();
    }

    /**
     * Actualiza una factura existente
     */
    async actualizarFactura(id: string, factura: Omit<Factura, 'id' | 'fecha_creacion' | 'total'>): Promise<{ message: string }> {
        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(factura),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error actualizando factura');
        }

        return response.json();
    }

    /**
     * Elimina una factura
     */
    async eliminarFactura(id: string): Promise<{ message: string }> {
        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Error eliminando factura');
        }

        return response.json();
    }

    /**
     * Agrega un vale a una factura
     */
    async agregarVale(facturaId: string, vale: Omit<Vale, 'id' | 'total'>): Promise<{ message: string }> {
        const response = await fetch(`${this.baseUrl}/${facturaId}/vales`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(vale),
        });

        if (!response.ok) {
            throw new Error('Error agregando vale');
        }

        return response.json();
    }

    /**
     * Actualiza un vale existente
     */
    async actualizarVale(facturaId: string, valeId: string, vale: Omit<Vale, 'total'>): Promise<{ message: string }> {
        const response = await fetch(`${this.baseUrl}/${facturaId}/vales/${valeId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(vale),
        });

        if (!response.ok) {
            throw new Error('Error actualizando vale');
        }

        return response.json();
    }

    /**
     * Elimina un vale de una factura
     */
    async eliminarVale(facturaId: string, valeId: string): Promise<{ message: string }> {
        const response = await fetch(`${this.baseUrl}/${facturaId}/vales/${valeId}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Error eliminando vale');
        }

        return response.json();
    }

    /**
     * Obtiene estadísticas de facturas
     */
    async obtenerStats(filters?: FacturaFilters): Promise<FacturaStats> {
        const params = new URLSearchParams();

        if (filters?.mes) params.append('mes', filters.mes.toString());
        if (filters?.anio) params.append('anio', filters.anio.toString());
        if (filters?.fecha_especifica) params.append('fecha_especifica', filters.fecha_especifica);
        if (filters?.nombre_cliente) params.append('nombre_cliente', filters.nombre_cliente);
        if (filters?.estado) params.append('estado', filters.estado);

        const response = await fetch(`${this.baseUrl}/stats?${params}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        if (!response.ok) {
            throw new Error('Error obteniendo estadísticas');
        }

        return response.json();
    }
}

// Exportar instancia singleton
export const facturaService = new FacturaService();
