import { API_BASE_URL, API_HEADERS } from './api-config'
import { BackendCatalogoProductos, BackendCategoria, transformBackendToFrontend, transformCategories } from './api-types'
import type { Material } from './material-types'
import type { Trabajador as ApiTrabajador, Brigada as ApiBrigada } from './api-types'
import { apiRequest } from './api-config'

// Servicio para materiales
export class MaterialService {
  // Obtener todos los materiales (transformados del backend)
  static async getAllMaterials(): Promise<Material[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/productos_por_tipo_y_marca`, {
        headers: API_HEADERS,
      })

      if (!response.ok) {
        throw new Error(`Error al obtener materiales: ${response.status}`)
      }

      const catalogos: BackendCatalogoProductos[] = await response.json()
      return transformBackendToFrontend(catalogos)
    } catch (error) {
      console.error('Error en getAllMaterials:', error)
      throw error
    }
  }

  // Obtener categorías
  static async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/categorias`, {
        headers: API_HEADERS,
      })

      if (!response.ok) {
        throw new Error(`Error al obtener categorías: ${response.status}`)
      }

      const categorias: BackendCategoria[] = await response.json()
      return transformCategories(categorias)
    } catch (error) {
      console.error('Error en getCategories:', error)
      throw error
    }
  }

  // Obtener materiales por categoría
  static async getMaterialsByCategory(categoria: string): Promise<Material[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/categorias/${encodeURIComponent(categoria)}/materiales`, {
        headers: API_HEADERS,
      })

      if (!response.ok) {
        throw new Error(`Error al obtener materiales por categoría: ${response.status}`)
      }

      const materiales: BackendCatalogoProductos[] = await response.json()
      return transformBackendToFrontend(materiales)
    } catch (error) {
      console.error('Error en getMaterialsByCategory:', error)
      throw error
    }
  }

  // Crear nueva categoría (producto vacío)
  static async createCategory(categoria: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/categorias`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ categoria }),
    });
    if (!response.ok) throw new Error('Error al crear categoría');
    return await response.json();
  }

  // Crear nuevo producto (con materiales opcionales)
  static async createProduct(categoria: string, materiales: any[] = []): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/productos`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ categoria, materiales }),
    });
    if (!response.ok) throw new Error('Error al crear producto');
    return await response.json();
  }

  // Agregar material a producto existente
  static async addMaterialToProduct(productoId: string, material: { codigo: string, descripcion: string, um: string }): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/productos/${productoId}/materiales`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify(material),
    });
    if (!response.ok) throw new Error('Error al agregar material');
    return await response.json();
  }

  // Obtener todos los catálogos/productos completos
  static async getAllCatalogs(): Promise<BackendCatalogoProductos[]> {
    const response = await fetch(`${API_BASE_URL}/productos_por_tipo_y_marca`, {
      headers: API_HEADERS,
    });
    if (!response.ok) throw new Error('Error al obtener catálogos');
    return await response.json();
  }
}

export class BrigadaService {
  static async getAllBrigadas(): Promise<ApiBrigada[]> {
    const res = await fetch(`${API_BASE_URL}/brigadas`, { headers: API_HEADERS });
    if (!res.ok) throw new Error('Error al obtener brigadas');
    return await res.json();
  }
  static async buscarBrigadas(nombre: string): Promise<ApiBrigada[]> {
    const res = await fetch(`${API_BASE_URL}/brigadas/buscar?nombre=${encodeURIComponent(nombre)}`, { headers: API_HEADERS });
    if (!res.ok) throw new Error('Error al buscar brigadas');
    return await res.json();
  }
}

export class TrabajadorService {
  static async getAllTrabajadores(): Promise<ApiTrabajador[]> {
    const res = await fetch(`${API_BASE_URL}/trabajadores`, { headers: API_HEADERS });
    if (!res.ok) throw new Error('Error al obtener trabajadores');
    return await res.json();
  }
  static async buscarTrabajadores(nombre: string): Promise<ApiTrabajador[]> {
    const res = await fetch(`${API_BASE_URL}/trabajadores/buscar?nombre=${encodeURIComponent(nombre)}`, { headers: API_HEADERS });
    if (!res.ok) throw new Error('Error al buscar trabajadores');
    return await res.json();
  }
  static async crearTrabajador(ci: string, nombre: string, contrasena?: string): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/trabajadores`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ ci, nombre, contrasena }),
    });
    if (!res.ok) throw new Error('Error al crear trabajador');
    return await res.json();
  }
  static async crearJefeBrigada(ci: string, nombre: string, contrasena: string, integrantes: { CI: string }[]): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/jefes_brigada`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ ci, nombre, contrasena, integrantes }),
    });
    if (!res.ok) throw new Error('Error al crear jefe de brigada');
    return await res.json();
  }
  static async convertirTrabajadorAJefe(ci: string, contrasena: string, integrantes: { CI: string }[]): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/trabajadores/${ci}/convertir_jefe`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ contrasena, integrantes }),
    });
    if (!res.ok) throw new Error('Error al convertir trabajador a jefe');
    return await res.json();
  }
  static async crearTrabajadorYAsignarBrigada(ci: string, nombre: string, contrasena: string, brigada_id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/trabajadores/asignar_brigada`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ ci, nombre, contrasena, brigada_id }),
    });
    if (!res.ok) {
      let errorMsg = 'Error al crear trabajador y asignar a brigada';
      try {
        const errorBody = await res.json();
        errorMsg = errorBody.detail || JSON.stringify(errorBody);
        console.error('Backend error body:', errorBody);
      } catch (e) {
        // Si no es JSON, ignora
      }
      throw new Error(errorMsg);
    }
    return await res.json();
  }
  static async asignarTrabajadorABrigada(brigadaId: string, ci: string, nombre: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/brigadas/${brigadaId}/trabajadores`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ CI: ci, nombre }),
    });
    if (!res.ok) {
      let errorMsg = 'Error al asignar trabajador a brigada';
      try {
        const errorBody = await res.json();
        errorMsg = errorBody.detail || JSON.stringify(errorBody);
        console.error('Backend error body:', errorBody);
      } catch (e) {
        // Si no es JSON, ignora
      }
      throw new Error(errorMsg);
    }
    return await res.json();
  }
}

// Servicio para reportes
export class ReporteService {
  // Obtener reportes con filtros opcionales
  static async getReportes(params: {
    tipo_reporte?: string
    cliente_numero?: string
    fecha_inicio?: string
    fecha_fin?: string
    lider_ci?: string
  } = {}) {
    const search = new URLSearchParams()
    if (params.tipo_reporte) search.append('tipo_reporte', params.tipo_reporte)
    if (params.cliente_numero) search.append('cliente_numero', params.cliente_numero)
    if (params.fecha_inicio) search.append('fecha_inicio', params.fecha_inicio)
    if (params.fecha_fin) search.append('fecha_fin', params.fecha_fin)
    if (params.lider_ci) search.append('lider_ci', params.lider_ci)
    const endpoint = `/reportes/${search.toString() ? `?${search.toString()}` : ''}`
    return apiRequest(endpoint)
  }
  // Obtener reportes de un cliente
  static async getReportesPorCliente(
    numero: string,
    params: {
      tipo_reporte?: string
      fecha_inicio?: string
      fecha_fin?: string
      lider_ci?: string
    } = {}
  ) {
    const search = new URLSearchParams()
    if (params.tipo_reporte) search.append('tipo_reporte', params.tipo_reporte)
    if (params.fecha_inicio) search.append('fecha_inicio', params.fecha_inicio)
    if (params.fecha_fin) search.append('fecha_fin', params.fecha_fin)
    if (params.lider_ci) search.append('lider_ci', params.lider_ci)
    const endpoint = `/reportes/cliente/${numero}${search.toString() ? `?${search.toString()}` : ''}`
    return apiRequest(endpoint)
  }
}

// Servicio para clientes
export class ClienteService {
  // Obtener clientes con filtros opcionales
  static async getClientes(params: {
    numero?: string
    nombre?: string
    direccion?: string
  } = {}) {
    const search = new URLSearchParams()
    if (params.numero) search.append('numero', params.numero)
    if (params.nombre) search.append('nombre', params.nombre)
    if (params.direccion) search.append('direccion', params.direccion)
    const endpoint = `/clientes/${search.toString() ? `?${search.toString()}` : ''}`
    return apiRequest(endpoint)
  }
} 