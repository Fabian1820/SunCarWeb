import { apiRequest } from '../../../api-config'
import type {
  Oferta,
  OfertaSimplificada,
  CreateOfertaRequest,
  UpdateOfertaRequest,
  CreateElementoRequest,
  UpdateElementoRequest,
} from '../../../api-types'

export class OfertaService {
  static async getOfertasSimplificadas(): Promise<OfertaSimplificada[]> {
    const response = await apiRequest<{ success: boolean; message: string; data: OfertaSimplificada[] }>(
      '/ofertas/simplified'
    )
    return response.data || []
  }

  static async getOfertas(): Promise<Oferta[]> {
    const response = await apiRequest<{ success: boolean; message: string; data: Oferta[] }>('/ofertas/')
    return response.data || []
  }

  static async getOfertaById(ofertaId: string): Promise<Oferta | null> {
    const response = await apiRequest<{ success: boolean; message: string; data: Oferta | null }>(
      `/ofertas/${ofertaId}`
    )
    return response.success ? response.data : null
  }

  static async createOferta(ofertaData: CreateOfertaRequest): Promise<string> {
    const formData = new FormData()
    formData.append('descripcion', ofertaData.descripcion)
    formData.append('precio', ofertaData.precio.toString())

    if (ofertaData.descripcion_detallada !== undefined && ofertaData.descripcion_detallada !== null) {
      formData.append('descripcion_detallada', ofertaData.descripcion_detallada)
    }

    if (ofertaData.precio_cliente !== undefined && ofertaData.precio_cliente !== null) {
      formData.append('precio_cliente', ofertaData.precio_cliente.toString())
    }

    if (ofertaData.moneda !== undefined && ofertaData.moneda !== null) {
      formData.append('moneda', ofertaData.moneda)
    }

    if (ofertaData.financiamiento !== undefined) {
      formData.append('financiamiento', ofertaData.financiamiento.toString())
    }

    if (ofertaData.descuentos !== undefined && ofertaData.descuentos !== null) {
      formData.append('descuentos', ofertaData.descuentos)
    }

    if (ofertaData.imagen) {
      formData.append('imagen', ofertaData.imagen)
    }

    formData.append('garantias', JSON.stringify(ofertaData.garantias || []))

    const response = await apiRequest<{ success: boolean; message: string; oferta_id: string }>('/ofertas/', {
      method: 'POST',
      body: formData,
    })
    return response.oferta_id || 'success'
  }

  static async updateOferta(ofertaId: string, ofertaData: UpdateOfertaRequest): Promise<boolean> {
    const formData = new FormData()

    if (ofertaData.descripcion !== undefined) {
      formData.append('descripcion', ofertaData.descripcion)
    }

    if (ofertaData.descripcion_detallada !== undefined && ofertaData.descripcion_detallada !== null) {
      formData.append('descripcion_detallada', ofertaData.descripcion_detallada)
    }

    if (ofertaData.precio !== undefined) {
      formData.append('precio', ofertaData.precio.toString())
    }

    if (ofertaData.precio_cliente !== undefined && ofertaData.precio_cliente !== null) {
      formData.append('precio_cliente', ofertaData.precio_cliente.toString())
    }

    if (ofertaData.moneda !== undefined && ofertaData.moneda !== null) {
      formData.append('moneda', ofertaData.moneda)
    }

    if (ofertaData.financiamiento !== undefined) {
      formData.append('financiamiento', ofertaData.financiamiento.toString())
    }

    if (ofertaData.descuentos !== undefined && ofertaData.descuentos !== null) {
      formData.append('descuentos', ofertaData.descuentos)
    }

    if (ofertaData.imagen) {
      formData.append('imagen', ofertaData.imagen)
    }

    if (ofertaData.garantias !== undefined) {
      formData.append('garantias', JSON.stringify(ofertaData.garantias))
    }

    const response = await apiRequest<{ success: boolean; message: string }>(`/ofertas/${ofertaId}`, {
      method: 'PUT',
      body: formData,
    })
    return response.success === true
  }

  static async deleteOferta(ofertaId: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean; message: string }>(`/ofertas/${ofertaId}`, {
      method: 'DELETE',
    })
    return response.success === true
  }

  static async addElemento(ofertaId: string, elementoData: CreateElementoRequest): Promise<boolean> {
    const formData = new FormData()
    formData.append('categoria', elementoData.categoria)
    formData.append('cantidad', elementoData.cantidad.toString())

    if (elementoData.descripcion) {
      formData.append('descripcion', elementoData.descripcion)
    }

    if (elementoData.foto) {
      formData.append('foto', elementoData.foto)
    }

    const response = await apiRequest<{ success: boolean; message: string }>(`/ofertas/${ofertaId}/elementos`, {
      method: 'POST',
      body: formData,
    })

    return response.success === true
  }

  static async deleteElemento(ofertaId: string, elementoIndex: number): Promise<boolean> {
    const response = await apiRequest<{ success: boolean; message: string }>(
      `/ofertas/${ofertaId}/elementos/${elementoIndex}`,
      {
        method: 'DELETE',
      }
    )

    return response.success === true
  }

  static async updateElemento(
    ofertaId: string,
    elementoIndex: number,
    elementoData: UpdateElementoRequest
  ): Promise<boolean> {
    const formData = new FormData()

    if (elementoData.categoria !== undefined) {
      formData.append('categoria', elementoData.categoria)
    }

    if (elementoData.descripcion !== undefined) {
      formData.append('descripcion', elementoData.descripcion)
    }

    if (elementoData.cantidad !== undefined) {
      formData.append('cantidad', elementoData.cantidad.toString())
    }

    if (elementoData.foto) {
      formData.append('foto', elementoData.foto)
    }

    const response = await apiRequest<{ success: boolean; message: string }>(
      `/ofertas/${ofertaId}/elementos/${elementoIndex}`,
      {
        method: 'PUT',
        body: formData,
      }
    )

    return response.success === true
  }
}
