import { apiRequest, API_BASE_URL } from "@/lib/api-config";
import type {
  ActualizacionFelicity,
  CasoActualizacionFelicity,
  MaterialBusqueda,
  SubirActualizacionPayload,
} from "@/lib/types/feats/actualizaciones-felicity/actualizaciones-felicity-types";

// Token separado del `auth_token` de SunCar: esta página la abren ingenieros
// de Felicity sin cuenta de SunCar, con su propio usuario/contraseña.
const TOKEN_KEY = "actualizaciones_felicity_token";

export const FelicityUpdatesAuth = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
  },
};

interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
}

interface SubirResponse {
  success: boolean;
  message: string;
  data?: ActualizacionFelicity;
}

async function parseJsonSafely(response: Response): Promise<any> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text.slice(0, 500) };
  }
}

export const ActualizacionesFelicityPublicService = {
  async login(usuario: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/actualizaciones-felicity/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, password }),
    });
    const data = await parseJsonSafely(response);
    if (!response.ok) {
      return { success: false, message: data.detail || data.message || "No se pudo iniciar sesión" };
    }
    if (data.token) FelicityUpdatesAuth.setToken(data.token);
    return data as LoginResponse;
  },

  async subir(payload: SubirActualizacionPayload): Promise<SubirResponse> {
    const token = FelicityUpdatesAuth.getToken();
    if (!token) {
      return { success: false, message: "Sesión expirada. Vuelve a iniciar sesión." };
    }

    const form = new FormData();
    form.append("material_codigo", payload.material_codigo);
    form.append("material_descripcion", payload.material_descripcion);
    if (payload.material_categoria) form.append("material_categoria", payload.material_categoria);
    if (payload.material_marca) form.append("material_marca", payload.material_marca);
    if (payload.material_potencia_kw !== undefined && payload.material_potencia_kw !== null) {
      form.append("material_potencia_kw", String(payload.material_potencia_kw));
    }
    form.append("cantidad", String(payload.cantidad));
    form.append("configuracion", payload.configuracion);
    if (payload.version) form.append("version", payload.version);
    if (payload.notas) form.append("notas", payload.notas);
    if (payload.subido_por) form.append("subido_por", payload.subido_por);
    form.append("archivo", payload.archivo);

    const response = await fetch(`${API_BASE_URL}/actualizaciones-felicity/subir`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await parseJsonSafely(response);
    if (response.status === 401) {
      FelicityUpdatesAuth.clearToken();
    }
    if (!response.ok) {
      return { success: false, message: data.detail || data.message || "No se pudo subir la actualización" };
    }
    return data as SubirResponse;
  },
};

export const MaterialBusquedaService = {
  async buscar(q: string, categoria?: string, limit = 15): Promise<MaterialBusqueda[]> {
    const termino = q.trim();
    if (!termino) return [];
    const params = new URLSearchParams({ q: termino, limit: String(limit) });
    if (categoria) params.set("categoria", categoria);
    const response = await apiRequest<{ success: boolean; data: MaterialBusqueda[] }>(
      `/productos/materiales?${params.toString()}`,
    );
    return response?.data || [];
  },
};

export const ActualizacionesFelicityService = {
  async listarCasos(filtros?: {
    material_codigo?: string;
    categoria?: string;
    q?: string;
  }): Promise<CasoActualizacionFelicity[]> {
    const params = new URLSearchParams();
    if (filtros?.material_codigo) params.set("material_codigo", filtros.material_codigo);
    if (filtros?.categoria) params.set("categoria", filtros.categoria);
    if (filtros?.q) params.set("q", filtros.q);
    const qs = params.toString();
    const response = await apiRequest<{ success: boolean; data: CasoActualizacionFelicity[] }>(
      `/actualizaciones-felicity/casos${qs ? `?${qs}` : ""}`,
    );
    return response?.data || [];
  },

  async listarHistorial(
    materialCodigo: string,
    cantidad: number,
    configuracion: string,
  ): Promise<ActualizacionFelicity[]> {
    const params = new URLSearchParams({
      material_codigo: materialCodigo,
      cantidad: String(cantidad),
      configuracion,
    });
    const response = await apiRequest<{ success: boolean; data: ActualizacionFelicity[] }>(
      `/actualizaciones-felicity/casos/historial?${params.toString()}`,
    );
    return response?.data || [];
  },
};
