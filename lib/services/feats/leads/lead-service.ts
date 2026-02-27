import { apiRequest } from "../../../api-config";
import type {
  Lead,
  LeadFoto,
  LeadResponse,
  LeadCreateData,
  LeadUpdateData,
  LeadConversionRequest,
  Cliente,
} from "../../../api-types";

export type LeadFotoUploadPayload = {
  file: File;
  tipo: LeadFoto["tipo"];
};

type LeadFotosResponse = {
  success?: boolean;
  message?: string;
  data?: LeadFoto[] | { fotos?: LeadFoto[] };
  fotos?: LeadFoto[];
};

export class LeadService {
  static async getLeads(
    params: {
      q?: string;
      nombre?: string;
      telefono?: string;
      direccion?: string;
      comercial?: string;
      estado?: string;
      fuente?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      skip?: number;
      limit?: number;
    } = {},
  ): Promise<{ leads: Lead[]; total: number; skip: number; limit: number }> {
    console.log("Calling getLeads endpoint with params:", params);
    const search = new URLSearchParams();
    if (params.q) search.append("q", params.q);
    if (params.nombre) search.append("nombre", params.nombre);
    if (params.telefono) search.append("telefono", params.telefono);
    if (params.direccion) search.append("direccion", params.direccion);
    if (params.comercial) search.append("comercial", params.comercial);
    if (params.estado) search.append("estado", params.estado);
    if (params.fuente) search.append("fuente", params.fuente);
    if (params.fechaDesde) {
      search.append("fechaDesde", params.fechaDesde);
      search.append("fecha_desde", params.fechaDesde);
    }
    if (params.fechaHasta) {
      search.append("fechaHasta", params.fechaHasta);
      search.append("fecha_hasta", params.fechaHasta);
    }
    if (params.skip !== undefined)
      search.append("skip", params.skip.toString());
    if (params.limit !== undefined)
      search.append("limit", params.limit.toString());
    const endpoint = `/leads/${search.toString() ? `?${search.toString()}` : ""}`;
    const response = await apiRequest<LeadResponse>(endpoint);
    console.log("LeadService.getLeads response:", response);
    const leads = Array.isArray(response.data) ? response.data : [];
    const total = response.total ?? leads.length;
    const skip = response.skip ?? params.skip ?? 0;
    const limit =
      response.limit ??
      params.limit ??
      (params.skip !== undefined || params.limit !== undefined ? 50 : 0);
    return { leads, total, skip, limit };
  }

  static async getLeadById(leadId: string): Promise<Lead> {
    console.log("Calling getLeadById with ID:", leadId);
    const response = await apiRequest<LeadResponse>(`/leads/${leadId}`);
    console.log("LeadService.getLeadById response:", response);
    if (!response.data || Array.isArray(response.data)) {
      throw new Error("Lead no encontrado");
    }
    return response.data;
  }

  static async createLead(leadData: LeadCreateData): Promise<string> {
    console.log("Calling createLead with:", leadData);
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: { id: string };
    }>("/leads/", {
      method: "POST",
      body: JSON.stringify(leadData),
    });
    console.log("LeadService.createLead response:", response);
    return response.data?.id || "success";
  }

  static async updateLead(
    leadId: string,
    leadData: LeadUpdateData,
  ): Promise<Lead> {
    console.log("Calling updateLead with ID:", leadId, "data:", leadData);
    const response = await apiRequest<LeadResponse>(`/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify(leadData),
    });
    console.log("LeadService.updateLead response:", response);
    if (!response.data || Array.isArray(response.data)) {
      throw new Error("Error al actualizar lead");
    }
    return response.data;
  }

  static async deleteLead(leadId: string): Promise<boolean> {
    console.log("Calling deleteLead with ID:", leadId);
    const response = await apiRequest<{ success: boolean; message: string }>(
      `/leads/${leadId}`,
      {
        method: "DELETE",
      },
    );
    console.log("LeadService.deleteLead response:", response);
    return response.success === true;
  }

  static async getLeadsByTelefono(telefono: string): Promise<Lead[]> {
    console.log("Calling getLeadsByTelefono with telefono:", telefono);
    const response = await apiRequest<LeadResponse>(
      `/leads/telefono/${encodeURIComponent(telefono)}`,
    );
    console.log("LeadService.getLeadsByTelefono response:", response);
    return Array.isArray(response.data) ? response.data : [];
  }

  static async checkLeadExists(leadId: string): Promise<boolean> {
    console.log("Calling checkLeadExists with ID:", leadId);
    const response = await apiRequest<{
      success: boolean;
      message: string;
      exists: boolean;
    }>(`/leads/${leadId}/existe`);
    console.log("LeadService.checkLeadExists response:", response);
    return response.exists === true;
  }

  static async uploadComprobante(
    leadId: string,
    {
      file,
      metodo_pago,
      moneda,
    }: { file: File; metodo_pago?: string; moneda?: string },
  ): Promise<{
    comprobante_pago_url: string;
    metodo_pago?: string;
    moneda?: string;
  }> {
    console.log("Calling uploadComprobante for lead:", leadId, "metadata:", {
      metodo_pago,
      moneda,
    });
    const formData = new FormData();
    formData.append("comprobante", file);
    if (metodo_pago) formData.append("metodo_pago", metodo_pago);
    if (moneda) formData.append("moneda", moneda);

    const response = await apiRequest<{
      success: boolean;
      message: string;
      data?: {
        comprobante_url?: string;
        comprobante_pago_url?: string;
        metodo_pago?: string;
        moneda?: string;
      };
    }>(`/leads/${encodeURIComponent(leadId)}/comprobante`, {
      method: "POST",
      body: formData,
    });
    console.log("LeadService.uploadComprobante response:", response);
    if (!response.success || !response.data) {
      throw new Error(
        response.message || "Error al subir el comprobante del lead",
      );
    }

    const {
      comprobante_url,
      comprobante_pago_url,
      metodo_pago: metodo,
      moneda: currency,
    } = response.data;
    const url = comprobante_pago_url || comprobante_url;
    if (!url) {
      throw new Error("El backend no retornó la URL del comprobante");
    }

    return {
      comprobante_pago_url: url,
      metodo_pago: metodo,
      moneda: currency,
    };
  }

  static async uploadFotoLead(
    leadId: string,
    { file, tipo }: LeadFotoUploadPayload,
  ): Promise<void> {
    const formData = new FormData();
    formData.append("archivo", file);
    formData.append("tipo", tipo);

    const response = await apiRequest<{
      success?: boolean;
      message?: string;
    }>(`/leads/${encodeURIComponent(leadId)}/fotos`, {
      method: "POST",
      body: formData,
    });

    if (response?.success === false) {
      throw new Error(response.message || "Error al subir foto/video del lead");
    }
  }

  static async getFotosLead(leadId: string): Promise<LeadFoto[]> {
    const response = await apiRequest<LeadFotosResponse | LeadFoto[]>(
      `/leads/${encodeURIComponent(leadId)}/fotos`,
    );

    if (Array.isArray(response)) {
      return response;
    }

    if (response?.success === false) {
      throw new Error(
        response.message || "Error al obtener fotos/videos del lead",
      );
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.fotos)) {
      return response.fotos;
    }

    if (
      response?.data &&
      !Array.isArray(response.data) &&
      Array.isArray(response.data.fotos)
    ) {
      return response.data.fotos;
    }

    return [];
  }

  static async generarCodigoCliente(
    leadId: string,
    equipoPropio?: boolean,
  ): Promise<string> {
    console.log(
      "Calling generarCodigoCliente with ID:",
      leadId,
      "equipoPropio:",
      equipoPropio,
    );
    const url = equipoPropio
      ? `/leads/${leadId}/generar-codigo-cliente?equipo_propio=true`
      : `/leads/${leadId}/generar-codigo-cliente`;

    const response = await apiRequest<{
      success: boolean;
      message?: string;
      codigo_generado?: string;
      error?: {
        code: string;
        title: string;
        message: string;
        field?: string;
      };
      detail?: string; // Formato antiguo por compatibilidad
    }>(url);

    console.log("LeadService.generarCodigoCliente response:", response);

    // Verificar si la respuesta indica un error (formato nuevo)
    if (response.success === false) {
      if (response.error) {
        // Error estructurado del backend (formato nuevo)
        throw new Error(
          response.error.message ||
            response.error.title ||
            "Error al generar el código de cliente",
        );
      }
      // Error sin estructura (formato nuevo sin error object)
      throw new Error(
        response.message || "Error al generar el código de cliente",
      );
    }

    // Verificar formato antiguo (detail)
    if (response.detail) {
      throw new Error(response.detail);
    }

    if (!response.codigo_generado) {
      throw new Error("El servidor no devolvió un código de cliente");
    }

    return response.codigo_generado;
  }

  static async convertLeadToCliente(
    leadId: string,
    payload: LeadConversionRequest,
  ): Promise<Cliente> {
    console.log(
      "Calling convertLeadToCliente with ID:",
      leadId,
      "payload:",
      payload,
    );

    const response = await apiRequest<{
      success: boolean;
      message?: string;
      data?: Cliente;
      error?: {
        code: string;
        title: string;
        message: string;
        field?: string;
      };
      detail?: string; // Formato antiguo por compatibilidad
    }>(`/leads/${leadId}/convertir`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    console.log("LeadService.convertLeadToCliente response:", response);

    // Verificar si la respuesta indica un error (formato nuevo)
    if (response.success === false) {
      if (response.error) {
        // Error estructurado del backend (formato nuevo)
        throw new Error(
          response.error.message ||
            response.error.title ||
            "Error al convertir el lead en cliente",
        );
      }
      // Error sin estructura (formato nuevo sin error object)
      throw new Error(
        response.message || "Error al convertir el lead en cliente",
      );
    }

    // Verificar formato antiguo (detail)
    if (response.detail) {
      throw new Error(response.detail);
    }

    if (!response.data) {
      throw new Error("El servidor no devolvió los datos del cliente");
    }

    return response.data;
  }
}
