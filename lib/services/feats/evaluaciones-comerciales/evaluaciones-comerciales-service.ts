import { apiRequest } from "@/lib/api-config";
import type {
  AlcanceEvaluaciones,
  CriteriosActitud,
  CriteriosDocumentacion,
  EvaluacionComercial,
  ListaEvaluaciones,
  OfertasDatos,
  WhatsappDatos,
} from "@/lib/types/feats/evaluaciones-comerciales/evaluaciones-comerciales-types";

const BASE = "/evaluaciones-comerciales";

export const EvaluacionesComercialesService = {
  async alcance(): Promise<AlcanceEvaluaciones> {
    return apiRequest<AlcanceEvaluaciones>(`${BASE}/alcance`);
  },

  async listar(params?: {
    comercialCi?: string;
    firmada?: boolean;
  }): Promise<ListaEvaluaciones> {
    const q = new URLSearchParams();
    if (params?.comercialCi) q.set("comercial_ci", params.comercialCi);
    if (params?.firmada !== undefined) q.set("firmada", String(params.firmada));
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return apiRequest<ListaEvaluaciones>(`${BASE}/${suffix}`);
  },

  async obtener(id: string): Promise<EvaluacionComercial> {
    return apiRequest<EvaluacionComercial>(`${BASE}/${id}`);
  },

  async crear(body: {
    comercial_ci: string;
    periodo_inicio: string;
    periodo_fin: string;
    actitud?: CriteriosActitud;
    documentacion?: CriteriosDocumentacion;
  }): Promise<{ success: boolean; evaluacion: EvaluacionComercial }> {
    return apiRequest(`${BASE}/`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async actualizar(
    id: string,
    body: {
      actitud?: CriteriosActitud;
      documentacion?: CriteriosDocumentacion;
    },
  ): Promise<{ success: boolean; evaluacion: EvaluacionComercial }> {
    return apiRequest(`${BASE}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async firmar(
    id: string,
  ): Promise<{ success: boolean; evaluacion: EvaluacionComercial }> {
    return apiRequest(`${BASE}/${id}/firmar`, { method: "POST" });
  },

  async eliminar(id: string): Promise<{ success: boolean }> {
    return apiRequest(`${BASE}/${id}`, { method: "DELETE" });
  },

  async whatsapp(
    comercialCi: string,
    desde: string,
    hasta: string,
  ): Promise<WhatsappDatos> {
    const q = new URLSearchParams({ desde, hasta });
    return apiRequest<WhatsappDatos>(
      `${BASE}/comercial/${comercialCi}/whatsapp?${q.toString()}`,
    );
  },

  async ofertas(
    comercialCi: string,
    desde: string,
    hasta: string,
  ): Promise<OfertasDatos> {
    const q = new URLSearchParams({ desde, hasta });
    return apiRequest<OfertasDatos>(
      `${BASE}/comercial/${comercialCi}/ofertas?${q.toString()}`,
    );
  },
};
