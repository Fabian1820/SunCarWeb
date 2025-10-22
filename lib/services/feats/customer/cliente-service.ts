import { apiRequest } from '../../../api-config'
import type {
  Cliente,
  ClienteResponse,
  ClienteCreateData,
  ClienteSimpleCreateData,
  ClienteUpdateData,
} from '../../../api-types'

type ClienteListParams = {
  numero?: string
  nombre?: string
  direccion?: string
}

const cleanPayload = <T extends Record<string, unknown>>(payload: T): Partial<T> => {
  const cleaned: Record<string, unknown> = {}
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed === '') return
      cleaned[key] = trimmed
      return
    }

    if (Array.isArray(value) && value.length === 0) return

    cleaned[key] = value
  })

  return cleaned as Partial<T>
}

export class ClienteService {
  static async getClientes(params: ClienteListParams = {}): Promise<Cliente[]> {
    const search = new URLSearchParams()
    if (params.numero) search.append('numero', params.numero)
    if (params.nombre) search.append('nombre', params.nombre)
    if (params.direccion) search.append('direccion', params.direccion)

    const endpoint = `/clientes/${search.toString() ? `?${search.toString()}` : ''}`
    const response = await apiRequest<ClienteResponse>(endpoint)
    return Array.isArray(response.data) ? response.data : []
  }

  static async crearCliente(data: ClienteCreateData): Promise<ClienteResponse> {
    const payload = cleanPayload(data)
    return apiRequest<ClienteResponse>(`/clientes/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  static async crearClienteSimple(data: ClienteSimpleCreateData): Promise<ClienteResponse> {
    const payload = cleanPayload(data)
    return apiRequest<ClienteResponse>(`/clientes/simple`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  static async verificarCliente(numero: string): Promise<ClienteResponse> {
    const endpoint = `/clientes/${encodeURIComponent(numero)}/verificar`
    return apiRequest<ClienteResponse>(endpoint)
  }

  static async verificarClientePorIdentificador(
    identifier: string
  ): Promise<ClienteResponse> {
    return apiRequest<ClienteResponse>(`/clientes/verificar`, {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    })
  }

  static async actualizarCliente(numero: string, data: ClienteUpdateData): Promise<ClienteResponse> {
    const payload = cleanPayload(data)
    return apiRequest<ClienteResponse>(`/clientes/${encodeURIComponent(numero)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  static async uploadComprobante(
    numero: string,
    {
      file,
      metodo_pago,
      moneda,
    }: { file: File; metodo_pago?: string; moneda?: string }
  ): Promise<{
    comprobante_pago_url: string
    metodo_pago?: string
    moneda?: string
  }> {
    const formData = new FormData()
    formData.append('comprobante', file)
    if (metodo_pago) formData.append('metodo_pago', metodo_pago)
    if (moneda) formData.append('moneda', moneda)

    const response = await apiRequest<{
      success: boolean
      message: string
      data?: {
        comprobante_url?: string
        comprobante_pago_url?: string
        metodo_pago?: string
        moneda?: string
      }
    }>(`/clientes/${encodeURIComponent(numero)}/comprobante`, {
      method: 'POST',
      body: formData,
    })

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Error al subir el comprobante del cliente')
    }

    const { comprobante_url, comprobante_pago_url, metodo_pago: metodo, moneda: currency } = response.data
    const url = comprobante_pago_url || comprobante_url
    if (!url) {
      throw new Error('El backend no retornó la URL del comprobante')
    }

    return {
      comprobante_pago_url: url,
      metodo_pago: metodo,
      moneda: currency,
    }
  }

  static async eliminarCliente(numero: string): Promise<ClienteResponse> {
    return apiRequest<ClienteResponse>(`/clientes/${encodeURIComponent(numero)}`, {
      method: 'DELETE',
    })
  }
}
