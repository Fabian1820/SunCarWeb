import { API_BASE_URL, apiRequest } from '@/lib/api-config';
import type {
    Factura,
    FacturaConsolidada,
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
    async listarFacturas(filters?: FacturaFilters, skip: number = 0, limit: number = 500): Promise<Factura[]> {
        const params = new URLSearchParams();

        if (filters?.mes_vale) params.append('mes_vale', filters.mes_vale.toString());
        if (filters?.anio_vale) params.append('anio_vale', filters.anio_vale.toString());
        if (filters?.fecha_vale) params.append('fecha_vale', filters.fecha_vale);
        if (filters?.nombre_cliente) params.append('nombre_cliente', filters.nombre_cliente);
        if (filters?.estado) params.append('estado', filters.estado);
        params.append('skip', skip.toString());
        params.append('limit', limit.toString());

        const url = `${this.baseUrl}?${params}`;
        console.log('📡 Listando facturas:', url);
        console.log('🔐 Headers:', this.getHeaders());

        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        console.log('📨 Response status:', response.status);

        if (!response.ok) {
            let errorDetail = 'Error listando facturas';
            try {
                const errorData = await response.json();
                console.error('❌ Error data:', errorData);
                errorDetail = errorData.detail || errorData.message || errorDetail;
            } catch (e) {
                console.error('❌ No se pudo parsear el error:', e);
            }
            throw new Error(errorDetail);
        }

        const data = await response.json();
        console.log('✅ Facturas recibidas:', data?.length || 0);
        return data;
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
     * Obtiene una factura por su número de factura
     */
    async obtenerFacturaPorNumero(numeroFactura: string): Promise<Factura> {
        try {
            // Usar el endpoint de listar con filtro por nombre de cliente (que también busca por número)
            const params = new URLSearchParams();
            params.append('nombre_cliente', numeroFactura);
            params.append('skip', '0');
            params.append('limit', '1');

            const url = `${this.baseUrl}?${params}`;
            console.log('📡 Obteniendo factura por número:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Error obteniendo factura');
            }

            const facturas = await response.json();
            
            if (!facturas || facturas.length === 0) {
                throw new Error('Factura no encontrada');
            }

            // Buscar la factura exacta por número
            const factura = facturas.find((f: Factura) => f.numero_factura === numeroFactura);
            
            if (!factura) {
                throw new Error('Factura no encontrada');
            }

            console.log('✅ Factura encontrada:', factura);
            return factura;
        } catch (error) {
            console.error('❌ Error obteniendo factura por número:', error);
            throw error;
        }
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

        if (filters?.mes_vale) params.append('mes_vale', filters.mes_vale.toString());
        if (filters?.anio_vale) params.append('anio_vale', filters.anio_vale.toString());
        if (filters?.fecha_vale) params.append('fecha_vale', filters.fecha_vale);
        if (filters?.nombre_cliente) params.append('nombre_cliente', filters.nombre_cliente);
        if (filters?.estado) params.append('estado', filters.estado);

        const url = `${this.baseUrl}/stats?${params}`;
        console.log('📡 Obteniendo stats:', url);
        console.log('🔐 Headers:', this.getHeaders());

        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders(),
        });

        console.log('📨 Response status:', response.status);

        if (!response.ok) {
            let errorDetail = 'Error obteniendo estadísticas';
            try {
                const errorData = await response.json();
                console.error('❌ Error data:', errorData);
                errorDetail = errorData.detail || errorData.message || errorDetail;
            } catch (e) {
                console.error('❌ No se pudo parsear el error:', e);
            }
            throw new Error(errorDetail);
        }

        const data = await response.json();
        console.log('✅ Stats recibidas:', data);
        return data;
    }

    /**
     * Obtiene facturas consolidadas con información de ofertas y pagos
     */
    async obtenerFacturasConsolidadas(): Promise<FacturaConsolidada[]> {
        const url = `/facturas/consolidadas`;
        console.log('📡 Obteniendo facturas consolidadas:', url);

        try {
            const data = await apiRequest<FacturaConsolidada[]>(url, {
                method: 'GET',
            });
            console.log('✅ Facturas consolidadas recibidas:', data?.length || 0);
            return data;
        } catch (error) {
            console.error('❌ Error obteniendo facturas consolidadas:', error);
            throw error;
        }
    }
}

// Exportar instancia singleton
export const facturaService = new FacturaService();
