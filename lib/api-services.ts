import { API_BASE_URL, API_HEADERS } from './api-config'
import { BackendCatalogoProductos, BackendCategoria, transformBackendToFrontend, transformCategories } from './api-types'
import type { Material } from './material-types'
import type { Trabajador as ApiTrabajador, Brigada as ApiBrigada, MensajeCliente, RespuestaMensaje } from './api-types'
import { apiRequest } from './api-config'

// Servicio para materiales
export class MaterialService {
  // Obtener todos los materiales (todas las categorías con sus materiales)
  static async getAllMaterials(): Promise<Material[]> {
    const response = await fetch(`${API_BASE_URL}/productos/`, {
      headers: API_HEADERS,
    });
    if (!response.ok) throw new Error(`Error al obtener materiales: ${response.status}`);
    const result = await response.json();
    // result.data es un array de categorías con materiales
    // Debes aplanar todos los materiales de todas las categorías si quieres un solo array de Material
    return result.data.flatMap((cat: any) => (cat.materiales || []).map((m: any) => ({
      ...m,
      categoria: cat.categoria,
      producto_id: cat.id
    })));
  }

  // Obtener categorías (devuelve array de objetos {id, categoria})
  static async getCategories(): Promise<{ id: string, categoria: string }[]> {
    const response = await fetch(`${API_BASE_URL}/productos/categorias`, {
      headers: API_HEADERS,
    });
    if (!response.ok) throw new Error(`Error al obtener categorías: ${response.status}`);
    const result = await response.json();
    return result.data;
  }

  // Obtener materiales por categoría
  static async getMaterialsByCategory(categoria: string): Promise<Material[]> {
    const response = await fetch(`${API_BASE_URL}/productos/categorias/${encodeURIComponent(categoria)}/materiales`, {
      headers: API_HEADERS,
    });
    if (!response.ok) throw new Error(`Error al obtener materiales por categoría: ${response.status}`);
    const result = await response.json();
    // result.data es un array de materiales
    return result.data;
  }

  // Crear nueva categoría (solo nombre, sin materiales)
  static async createCategory(categoria: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/productos/categorias`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ categoria }),
    });
    if (!response.ok) throw new Error('Error al crear categoría');
    const result = await response.json();
    return result.producto_id || result.id || result.data?.id || 'success';
  }

  // Crear nuevo producto (categoría con materiales)
  static async createProduct(categoria: string, materiales: any[] = []): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/productos/`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ categoria, materiales }),
    });
    if (!response.ok) throw new Error('Error al crear producto');
    const result = await response.json();
    return result.producto_id || result.id || result.data?.id || 'success';
  }

  // Agregar material a producto existente
  static async addMaterialToProduct(productoId: string, material: { codigo: string, descripcion: string, um: string }): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/productos/${productoId}/materiales`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ material }),
    });
    if (!response.ok) throw new Error('Error al agregar material');
    const result = await response.json();
    return result.success === true;
  }

  // Eliminar un material de un producto
  static async deleteMaterialByCodigo(materialCodigo: string): Promise<boolean> {
    console.log('[MaterialService] Intentando eliminar material por código:', { materialCodigo });
    const response = await fetch(`${API_BASE_URL}/productos/materiales/${materialCodigo}`, {
      method: 'DELETE',
      headers: API_HEADERS,
    });
    let result = null;
    try {
      result = await response.clone().json();
    } catch (e) {
      console.error('[MaterialService] Error parseando JSON de respuesta:', e);
    }
    if (!response.ok) {
      console.error('[MaterialService] Respuesta no OK al eliminar material:', { status: response.status, result });
      throw new Error((result && (result.message || result.detail)) || 'Error al eliminar material');
    }
    console.log('[MaterialService] Respuesta al eliminar material:', result);
    if (!result || result.success !== true) {
      throw new Error((result && (result.message || result.detail)) || 'El backend no confirmó la eliminación del material');
    }
    return true;
  }

  // Editar un material de un producto
  static async editMaterialInProduct(productoId: string, materialCodigo: string, data: { codigo: string | number, descripcion: string, um: string }): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/productos/${productoId}/materiales/${materialCodigo}`, {
      method: 'PUT',
      headers: API_HEADERS,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || errorBody.detail || 'Error al editar material');
    }
    const result = await response.json();
    return result.success === true;
  }

  // Obtener todos los catálogos/productos completos
  static async getAllCatalogs(): Promise<BackendCatalogoProductos[]> {
    const response = await fetch(`${API_BASE_URL}/productos/`, {
      headers: API_HEADERS,
    });
    if (!response.ok) throw new Error('Error al obtener catálogos');
    const result = await response.json();
    return result.data;
  }
}

export class BrigadaService {
  static async getAllBrigadas(): Promise<ApiBrigada[]> {
    console.log('Calling getAllBrigadas endpoint:', `${API_BASE_URL}/brigadas`);
    const res = await fetch(`${API_BASE_URL}/brigadas`, { headers: API_HEADERS });
    if (!res.ok) throw new Error('Error al obtener brigadas');
    const response = await res.json();
    console.log('BrigadaService.getAllBrigadas response:', response);
    console.log('Type of response:', typeof response, 'Is array:', Array.isArray(response));
    // Extraer el campo 'data' de la respuesta del backend
    const data = response.data || [];
    console.log('Extracted data:', data);
    return data;
  }

  // Crear una nueva brigada
  static async createBrigada(brigadaData: any): Promise<string> {
    console.log('Calling createBrigada with:', brigadaData);
    const res = await fetch(`${API_BASE_URL}/brigadas`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify(brigadaData),
    });
    if (!res.ok) {
      let errorMsg = 'Error al crear brigada';
      try {
        const errorBody = await res.json();
        errorMsg = errorBody.detail || errorBody.message || JSON.stringify(errorBody);
        console.error('Backend error body:', errorBody);
      } catch (e) {
        // Si no es JSON, ignora
      }
      throw new Error(errorMsg);
    }
    const response = await res.json();
    console.log('createBrigada response:', response);
    return response.brigada_id || response.id || 'success';
  }
  static async buscarBrigadas(nombre: string): Promise<ApiBrigada[]> {
    const res = await fetch(`${API_BASE_URL}/brigadas/buscar?nombre=${encodeURIComponent(nombre)}`, { headers: API_HEADERS });
    if (!res.ok) throw new Error('Error al buscar brigadas');
    return await res.json();
  }

  // Eliminar brigada
  static async eliminarBrigada(brigadaId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/brigadas/${brigadaId}`, {
      method: 'DELETE',
      headers: API_HEADERS,
    });
    if (!res.ok) {
      const errorBody = await res.json();
      throw new Error(errorBody.message || 'Error al eliminar brigada');
    }
    const response = await res.json();
    return response.success === true;
  }

  // Eliminar trabajador de brigada (endpoint alternativo)
  static async eliminarTrabajadorDeBrigada(brigadaId: string, trabajadorCi: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/brigadas/${brigadaId}/trabajadores/${trabajadorCi}`, {
      method: 'DELETE',
      headers: API_HEADERS,
    });
    if (!res.ok) {
      const errorBody = await res.json();
      throw new Error(errorBody.message || 'Error al eliminar trabajador de brigada');
    }
    const response = await res.json();
    return response.success === true;
  }
}

export class TrabajadorService {
  static async getAllTrabajadores(): Promise<ApiTrabajador[]> {
    console.log('Calling getAllTrabajadores endpoint:', `${API_BASE_URL}/trabajadores`);
    const res = await fetch(`${API_BASE_URL}/trabajadores`, { headers: API_HEADERS });
    if (!res.ok) throw new Error('Error al obtener trabajadores');
    const response = await res.json();
    console.log('TrabajadorService.getAllTrabajadores response:', response);
    console.log('Type of response:', typeof response, 'Is array:', Array.isArray(response));
    // Extraer el campo 'data' de la respuesta del backend
    const data = response.data || [];
    console.log('Extracted data:', data);
    return data;
  }
  static async buscarTrabajadores(nombre: string): Promise<ApiTrabajador[]> {
    const res = await fetch(`${API_BASE_URL}/trabajadores/buscar?nombre=${encodeURIComponent(nombre)}`, { headers: API_HEADERS });
    if (!res.ok) throw new Error('Error al buscar trabajadores');
    return await res.json();
  }
  static async crearTrabajador(ci: string, nombre: string, contrasena?: string): Promise<string> {
    console.log('Calling crearTrabajador with:', { ci, nombre, contrasena });
    const res = await fetch(`${API_BASE_URL}/trabajadores`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ ci, nombre, contrasena }),
    });
    if (!res.ok) {
      let errorMsg = 'Error al crear trabajador';
      try {
        const errorBody = await res.json();
        errorMsg = errorBody.detail || errorBody.message || JSON.stringify(errorBody);
        console.error('Backend error body:', errorBody);
      } catch (e) {
        // Si no es JSON, ignora
      }
      throw new Error(errorMsg);
    }
    const response = await res.json();
    console.log('crearTrabajador response:', response);
    return response.trabajador_id || response.brigada_id || 'success';
  }
  static async crearJefeBrigada(ci: string, nombre: string, contrasena: string, integrantes: { CI: string, nombre?: string }[]): Promise<string> {
    console.log('Calling crearJefeBrigada with:', { ci, nombre, contrasena, integrantes });
    // Buscar nombres si no están presentes
    let integrantesFinal = integrantes;
    if (integrantes.length > 0 && !integrantes[0].nombre) {
      const trabajadores = await this.getAllTrabajadores();
      integrantesFinal = integrantes.map(i => {
        const t = trabajadores.find(t => t.CI === i.CI);
        return { CI: i.CI, nombre: t ? t.nombre : '' };
      });
    }
    const res = await fetch(`${API_BASE_URL}/trabajadores/jefes_brigada`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ ci, nombre, contrasena, integrantes: integrantesFinal }),
    });
    console.log('Response status:', res.status);
    console.log('Response headers:', Object.fromEntries(res.headers.entries()));
    if (!res.ok) {
      let errorMsg = 'Error al crear jefe de brigada';
      try {
        const errorBody = await res.json();
        errorMsg = errorBody.detail || errorBody.message || JSON.stringify(errorBody);
        console.error('Backend error body:', errorBody);
      } catch (e) {
        console.error('Error parsing error response:', e);
        errorMsg = `Error HTTP ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMsg);
    }
    try {
      const response = await res.json();
      console.log('crearJefeBrigada response:', response);
      return response.trabajador_id || response.brigada_id || 'success';
    } catch (e) {
      console.error('Error parsing success response:', e);
      return 'success';
    }
  }
  static async convertirTrabajadorAJefe(ci: string, contrasena: string, integrantes: { CI: string, nombre?: string }[]): Promise<boolean> {
    console.log('Calling convertirTrabajadorAJefe with:', { ci, contrasena, integrantes });
    try {
      // Buscar nombres si no están presentes
      let integrantesFinal = integrantes;
      if (integrantes.length > 0 && !integrantes[0].nombre) {
        const trabajadores = await this.getAllTrabajadores();
        integrantesFinal = integrantes.map(i => {
          const t = trabajadores.find(t => t.CI === i.CI);
          return { CI: i.CI, nombre: t ? t.nombre : '' };
        });
      }
      const res = await fetch(`${API_BASE_URL}/trabajadores/${ci}/convertir_jefe`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ contrasena, integrantes: integrantesFinal }),
      });
      console.log('Response status:', res.status);
      if (!res.ok) {
        let errorMsg = 'Error al convertir trabajador a jefe';
        try {
          const errorBody = await res.json();
          errorMsg = errorBody.detail || errorBody.message || JSON.stringify(errorBody);
          console.error('Backend error body:', errorBody);
        } catch (e) {
          console.error('Error parsing error response:', e);
          errorMsg = `Error HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMsg);
      }
      const response = await res.json();
      console.log('convertirTrabajadorAJefe response:', response);
      return response.success === true;
    } catch (error) {
      console.error('Error in convertirTrabajadorAJefe:', error);
      throw error;
    }
  }
  static async crearTrabajadorYAsignarBrigada(ci: string, nombre: string, contrasena: string, brigada_id: string): Promise<boolean> {
    console.log('Calling crearTrabajadorYAsignarBrigada with:', { ci, nombre, contrasena, brigada_id });
    const res = await fetch(`${API_BASE_URL}/trabajadores/asignar_brigada`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ ci, nombre, contrasena, brigada_id }),
    });
    if (!res.ok) {
      let errorMsg = 'Error al crear trabajador y asignar a brigada';
      try {
        const errorBody = await res.json();
        errorMsg = errorBody.detail || errorBody.message || JSON.stringify(errorBody);
        console.error('Backend error body:', errorBody);
      } catch (e) {
        // Si no es JSON, ignora
      }
      throw new Error(errorMsg);
    }
    const response = await res.json();
    console.log('crearTrabajadorYAsignarBrigada response:', response);
    return response.success === true;
  }
  static async asignarTrabajadorABrigada(brigadaId: string, ci: string, nombre: string): Promise<boolean> {
    console.log('Calling asignarTrabajadorABrigada with:', { brigadaId, ci, nombre });
    const res = await fetch(`${API_BASE_URL}/brigadas/${brigadaId}/trabajadores`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ CI: ci, nombre }),
    });
    if (!res.ok) {
      let errorMsg = 'Error al asignar trabajador a brigada';
      try {
        const errorBody = await res.json();
        errorMsg = errorBody.detail || errorBody.message || JSON.stringify(errorBody);
        console.error('Backend error body:', errorBody);
      } catch (e) {
        // Si no es JSON, ignora
      }
      throw new Error(errorMsg);
    }
    const response = await res.json();
    console.log('asignarTrabajadorABrigada response:', response);
    return response.success === true;
  }

  // Eliminar trabajador
  static async eliminarTrabajador(ci: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/trabajadores/${ci}`, {
      method: 'DELETE',
      headers: API_HEADERS,
    });
    if (!res.ok) {
      const errorBody = await res.json();
      throw new Error(errorBody.detail || 'Error al eliminar trabajador');
    }
    const response = await res.json();
    return response.success === true;
  }

  // Actualizar datos del trabajador
  static async actualizarTrabajador(ci: string, nombre: string, nuevoCi?: string): Promise<boolean> {
    const body: any = { nombre };
    if (nuevoCi) {
      body.nuevo_ci = nuevoCi;
    }
    
    const res = await fetch(`${API_BASE_URL}/trabajadores/${ci}`, {
      method: 'PUT',
      headers: API_HEADERS,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorBody = await res.json();
      throw new Error(errorBody.detail || 'Error al actualizar trabajador');
    }
    const response = await res.json();
    return response.success === true;
  }

  // Eliminar trabajador de brigada
  static async eliminarTrabajadorDeBrigada(ci: string, brigadaId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/trabajadores/${ci}/brigada/${brigadaId}`, {
      method: 'DELETE',
      headers: API_HEADERS,
    });
    if (!res.ok) {
      const errorBody = await res.json();
      throw new Error(errorBody.detail || 'Error al eliminar trabajador de brigada');
    }
    const response = await res.json();
    return response.success === true;
  }

  static async getHorasTrabajadas(ci: string, fecha_inicio: string, fecha_fin: string) {
    const url = `${API_BASE_URL}/trabajadores/horas-trabajadas/${ci}?fecha_inicio=${fecha_inicio}&fecha_fin=${fecha_fin}`;
    const res = await fetch(url, { headers: API_HEADERS });
    if (!res.ok) throw new Error('Error al obtener horas trabajadas del trabajador');
    const response = await res.json();
    return response.data;
  }

  static async getHorasTrabajadasTodos(fecha_inicio: string, fecha_fin: string) {
    const url = `${API_BASE_URL}/trabajadores/horas-trabajadas-todos?fecha_inicio=${fecha_inicio}&fecha_fin=${fecha_fin}`;
    const res = await fetch(url, { headers: API_HEADERS });
    if (!res.ok) throw new Error('Error al obtener horas trabajadas de todos los trabajadores');
    const response = await res.json();
    return response.data;
  }

  static async eliminarContrasenaTrabajador(ci: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/trabajadores/${ci}/contrasena`, {
      method: 'DELETE',
      headers: API_HEADERS,
    });
    if (!res.ok) {
      let errorMsg = 'Error al eliminar la contraseña del trabajador';
      try {
        const errorBody = await res.json();
        errorMsg = errorBody.detail || errorBody.message || JSON.stringify(errorBody);
      } catch (e) {
        // Si no es JSON, ignora
      }
      throw new Error(errorMsg);
    }
    const response = await res.json();
    return response.success === true;
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

// Servicio para atención al cliente
export class AtencionClienteService {
  // Obtener todos los mensajes con filtros opcionales
  static async getMensajes(params: {
    estado?: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado'
    tipo?: 'queja' | 'consulta' | 'sugerencia' | 'reclamo'
    prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
    cliente_numero?: string
    fecha_inicio?: string
    fecha_fin?: string
  } = {}): Promise<MensajeCliente[]> {
    const search = new URLSearchParams()
    if (params.estado) search.append('estado', params.estado)
    if (params.tipo) search.append('tipo', params.tipo)
    if (params.prioridad) search.append('prioridad', params.prioridad)
    if (params.cliente_numero) search.append('cliente_numero', params.cliente_numero)
    if (params.fecha_inicio) search.append('fecha_inicio', params.fecha_inicio)
    if (params.fecha_fin) search.append('fecha_fin', params.fecha_fin)
    const endpoint = `/atencion-cliente/mensajes${search.toString() ? `?${search.toString()}` : ''}`
    return apiRequest(endpoint)
  }

  // Obtener un mensaje específico con sus respuestas
  static async getMensaje(mensajeId: string): Promise<MensajeCliente> {
    const endpoint = `/atencion-cliente/mensajes/${mensajeId}`
    return apiRequest(endpoint)
  }

  // Actualizar el estado de un mensaje
  static async actualizarEstadoMensaje(mensajeId: string, estado: 'nuevo' | 'en_proceso' | 'respondido' | 'cerrado'): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/atencion-cliente/mensajes/${mensajeId}/estado`, {
      method: 'PUT',
      headers: API_HEADERS,
      body: JSON.stringify({ estado }),
    })
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}))
      throw new Error(errorBody.message || errorBody.detail || 'Error al actualizar estado del mensaje')
    }
    const response = await res.json()
    return response.success === true
  }

  // Crear una respuesta a un mensaje
  static async crearRespuesta(mensajeId: string, contenido: string, autorCi: string, autorNombre: string, esPublica: boolean = true): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/atencion-cliente/mensajes/${mensajeId}/respuestas`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({
        contenido,
        autor: autorCi,
        autor_nombre: autorNombre,
        es_publica: esPublica
      }),
    })
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}))
      throw new Error(errorBody.message || errorBody.detail || 'Error al crear respuesta')
    }
    const response = await res.json()
    return response.respuesta_id || response.id || 'success'
  }

  // Obtener estadísticas de mensajes
  static async getEstadisticas(): Promise<{
    total: number
    nuevos: number
    en_proceso: number
    respondidos: number
    cerrados: number
    por_tipo: Record<string, number>
    por_prioridad: Record<string, number>
  }> {
    const endpoint = `/atencion-cliente/estadisticas`
    return apiRequest(endpoint)
  }

  // Marcar mensaje como prioridad
  static async actualizarPrioridad(mensajeId: string, prioridad: 'baja' | 'media' | 'alta' | 'urgente'): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/atencion-cliente/mensajes/${mensajeId}/prioridad`, {
      method: 'PUT',
      headers: API_HEADERS,
      body: JSON.stringify({ prioridad }),
    })
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}))
      throw new Error(errorBody.message || errorBody.detail || 'Error al actualizar prioridad del mensaje')
    }
    const response = await res.json()
    return response.success === true
  }
} 