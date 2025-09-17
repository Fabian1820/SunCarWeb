import { apiRequest } from './api-config'
import { BackendCatalogoProductos, BackendCategoria, transformBackendToFrontend, transformCategories } from './api-types'
import type { Material } from './material-types'
import type { Trabajador as ApiTrabajador, Brigada as ApiBrigada, MensajeCliente, RespuestaMensaje, Lead, LeadResponse, LeadCreateData, LeadUpdateData } from './api-types'

// Servicio para materiales
export class MaterialService {
  // Obtener todos los materiales (todas las categorías con sus materiales)
  static async getAllMaterials(): Promise<Material[]> {
    const result = await apiRequest<{ data: any[] }>('/productos/');
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
    const result = await apiRequest<{ data: { id: string, categoria: string }[] }>('/productos/categorias');
    return result.data;
  }

  // Obtener materiales por categoría
  static async getMaterialsByCategory(categoria: string): Promise<Material[]> {
    const result = await apiRequest<{ data: Material[] }>(`/productos/categorias/${encodeURIComponent(categoria)}/materiales`);
    // result.data es un array de materiales
    return result.data;
  }

  // Crear nueva categoría (solo nombre, sin materiales)
  static async createCategory(categoria: string): Promise<string> {
    const result = await apiRequest<any>('/productos/categorias', {
      method: 'POST',
      body: JSON.stringify({ categoria }),
    });
    return result.producto_id || result.id || result.data?.id || 'success';
  }

  // Crear nuevo producto (categoría con materiales)
  static async createProduct(categoria: string, materiales: any[] = []): Promise<string> {
    const result = await apiRequest<any>('/productos/', {
      method: 'POST',
      body: JSON.stringify({ categoria, materiales }),
    });
    return result.producto_id || result.id || result.data?.id || 'success';
  }

  // Agregar material a producto existente
  static async addMaterialToProduct(productoId: string, material: { codigo: string, descripcion: string, um: string }): Promise<boolean> {
    console.log('[MaterialService] Agregando material a producto:', { productoId, material });
    try {
      const result = await apiRequest<{ success?: boolean; message?: string; error?: string }>(`/productos/${productoId}/materiales`, {
        method: 'POST',
        body: JSON.stringify({ material }),
      });
      console.log('[MaterialService] Respuesta al agregar material:', result);
      
      // Verificar diferentes formatos de respuesta del backend
      if (result === null || result === undefined) {
        console.log('[MaterialService] Respuesta nula, asumiendo adición exitosa');
        return true;
      }
      
      if (typeof result === 'object') {
        // Si hay un campo success y es true
        if (result.success === true) {
          return true;
        }
        // Si no hay campo success pero tampoco hay error, asumir éxito
        if (result.success === undefined && !result.error) {
          console.log('[MaterialService] Sin campo success pero sin errores, asumiendo adición exitosa');
          return true;
        }
        // Si hay un error específico
        if (result.error) {
          throw new Error(result.error);
        }
        // Si success es false pero hay mensaje
        if (result.success === false) {
          throw new Error(result.message || 'Error al agregar material');
        }
      }
      
      // Fallback: si llegamos aquí, asumir éxito
      return true;
    } catch (error: any) {
      console.error('[MaterialService] Error al agregar material:', error);
      throw error;
    }
  }

  // Eliminar un material de un producto
  static async deleteMaterialByCodigo(materialCodigo: string): Promise<boolean> {
    console.log('[MaterialService] Intentando eliminar material por código:', { materialCodigo });
    try {
      const result = await apiRequest<{ success?: boolean; message?: string; detail?: string; error?: string }>(`/productos/materiales/${materialCodigo}`, {
        method: 'DELETE',
      });
      console.log('[MaterialService] Respuesta al eliminar material:', result);

      // Validación estricta de la respuesta
      if (typeof result === 'object' && result !== null) {
        // Si hay success=true, es éxito
        if (result.success === true) {
          console.log('[MaterialService] Material eliminado exitosamente');
          return true;
        }

        // Si hay error o success=false, es un fallo
        if (result.error || result.success === false) {
          const errorMsg = result.error || result.message || 'Error al eliminar material';
          console.error('[MaterialService] Error del backend:', errorMsg);
          throw new Error(errorMsg);
        }

        // Si no hay campo success pero hay mensaje sin error, asumir éxito
        if (!result.success && !result.error && result.message) {
          console.log('[MaterialService] Respuesta ambigua, asumiendo éxito');
          return true;
        }
      }

      // Si la respuesta es nula o no es un objeto esperado, considerar éxito
      // (algunos backends pueden no devolver nada en DELETE exitoso)
      console.log('[MaterialService] Respuesta vacía, asumiendo eliminación exitosa');
      return true;
    } catch (error: any) {
      console.error('[MaterialService] Error al eliminar material:', error);
      throw error;
    }
  }

  // Editar un material de un producto
  static async editMaterialInProduct(productoId: string, materialCodigo: string, data: { codigo: string | number, descripcion: string, um: string }): Promise<boolean> {
    console.log('[MaterialService] Editando material:', { productoId, materialCodigo, data });
    try {
      const result = await apiRequest<{ success?: boolean; message?: string; error?: string }>(`/productos/${productoId}/materiales/${materialCodigo}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      console.log('[MaterialService] Respuesta al editar material:', result);
      
      // Verificar diferentes formatos de respuesta del backend
      if (result === null || result === undefined) {
        console.log('[MaterialService] Respuesta nula, asumiendo edición exitosa');
        return true;
      }
      
      if (typeof result === 'object') {
        // Si hay un campo success y es true
        if (result.success === true) {
          return true;
        }
        // Si no hay campo success pero tampoco hay error, asumir éxito
        if (result.success === undefined && !result.error) {
          console.log('[MaterialService] Sin campo success pero sin errores, asumiendo edición exitosa');
          return true;
        }
        // Si hay un error específico
        if (result.error) {
          throw new Error(result.error);
        }
        // Si success es false pero hay mensaje
        if (result.success === false) {
          throw new Error(result.message || 'Error al editar material');
        }
      }
      
      // Fallback: si llegamos aquí, asumir éxito
      return true;
    } catch (error: any) {
      console.error('[MaterialService] Error al editar material:', error);
      // Si es un error de red o de parsing, lanzar error
      throw error;
    }
  }

  // Obtener todos los catálogos/productos completos
  static async getAllCatalogs(): Promise<BackendCatalogoProductos[]> {
    const result = await apiRequest<{ data: BackendCatalogoProductos[] }>('/productos/');
    return result.data;
  }
}

export class BrigadaService {
  static async getAllBrigadas(): Promise<ApiBrigada[]> {
    console.log('Calling getAllBrigadas endpoint');
    const response = await apiRequest<{ data: ApiBrigada[] }>('/brigadas/');
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
    const response = await apiRequest<{ brigada_id?: string; id?: string }>('/brigadas/', {
      method: 'POST',
      body: JSON.stringify(brigadaData),
    });
    console.log('createBrigada response:', response);
    return response.brigada_id || response.id || 'success';
  }
  static async buscarBrigadas(nombre: string): Promise<ApiBrigada[]> {
    return await apiRequest<ApiBrigada[]>(`/brigadas/buscar?nombre=${encodeURIComponent(nombre)}`);
  }

  // Eliminar brigada
  static async eliminarBrigada(brigadaId: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/brigadas/${brigadaId}`, {
      method: 'DELETE',
    });
    return response.success === true;
  }

  // Eliminar trabajador de brigada (endpoint alternativo)
  static async eliminarTrabajadorDeBrigada(brigadaId: string, trabajadorCi: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/brigadas/${brigadaId}/trabajadores/${trabajadorCi}`, {
      method: 'DELETE',
    });
    return response.success === true;
  }
}

export class TrabajadorService {
  static async getAllTrabajadores(): Promise<ApiTrabajador[]> {
    console.log('Calling getAllTrabajadores endpoint');
    const response = await apiRequest<{ data: ApiTrabajador[] }>('/trabajadores/');
    console.log('TrabajadorService.getAllTrabajadores response:', response);
    console.log('Type of response:', typeof response, 'Is array:', Array.isArray(response));
    // Extraer el campo 'data' de la respuesta del backend
    const data = response.data || [];
    console.log('Extracted data:', data);
    return data;
  }
  static async buscarTrabajadores(nombre: string): Promise<ApiTrabajador[]> {
    return await apiRequest<ApiTrabajador[]>(`/trabajadores/buscar?nombre=${encodeURIComponent(nombre)}`);
  }
  static async crearTrabajador(ci: string, nombre: string, contrasena?: string): Promise<string> {
    console.log('Calling crearTrabajador with:', { ci, nombre, contrasena });
    const response = await apiRequest<{ trabajador_id?: string; brigada_id?: string }>('/trabajadores/', {
      method: 'POST',
      body: JSON.stringify({ ci, nombre, contrasena }),
    });
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
    try {
      const response = await apiRequest<{ trabajador_id?: string; brigada_id?: string }>('/trabajadores/jefes_brigada', {
        method: 'POST',
        body: JSON.stringify({ ci, nombre, contrasena, integrantes: integrantesFinal }),
      });
      console.log('crearJefeBrigada response:', response);
      return response.trabajador_id || response.brigada_id || 'success';
    } catch (error) {
      console.error('Backend error in crearJefeBrigada:', error);
      throw error;
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
      const response = await apiRequest<{ success: boolean }>(`/trabajadores/${ci}/convertir_jefe`, {
        method: 'POST',
        body: JSON.stringify({ contrasena, integrantes: integrantesFinal }),
      });
      console.log('convertirTrabajadorAJefe response:', response);
      return response.success === true;
    } catch (error) {
      console.error('Error in convertirTrabajadorAJefe:', error);
      throw error;
    }
  }
  static async crearTrabajadorYAsignarBrigada(ci: string, nombre: string, contrasena: string, brigada_id: string): Promise<boolean> {
    console.log('Calling crearTrabajadorYAsignarBrigada with:', { ci, nombre, contrasena, brigada_id });
    const response = await apiRequest<{ success: boolean }>('/trabajadores/asignar_brigada', {
      method: 'POST',
      body: JSON.stringify({ ci, nombre, contrasena, brigada_id }),
    });
    console.log('crearTrabajadorYAsignarBrigada response:', response);
    return response.success === true;
  }
  static async asignarTrabajadorABrigada(brigadaId: string, ci: string, nombre: string): Promise<boolean> {
    console.log('Calling asignarTrabajadorABrigada with:', { brigadaId, ci, nombre });
    const response = await apiRequest<{ success: boolean }>(`/brigadas/${brigadaId}/trabajadores`, {
      method: 'POST',
      body: JSON.stringify({ CI: ci, nombre }),
    });
    console.log('asignarTrabajadorABrigada response:', response);
    return response.success === true;
  }

  // Eliminar trabajador
  static async eliminarTrabajador(ci: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/trabajadores/${ci}`, {
      method: 'DELETE',
    });
    return response.success === true;
  }

  // Actualizar datos del trabajador
  static async actualizarTrabajador(ci: string, nombre: string, nuevoCi?: string): Promise<boolean> {
    const body: any = { nombre };
    if (nuevoCi) {
      body.nuevo_ci = nuevoCi;
    }
    
    const response = await apiRequest<{ success: boolean }>(`/trabajadores/${ci}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return response.success === true;
  }

  // Eliminar trabajador de brigada
  static async eliminarTrabajadorDeBrigada(ci: string, brigadaId: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/trabajadores/${ci}/brigada/${brigadaId}`, {
      method: 'DELETE',
    });
    return response.success === true;
  }

  static async getHorasTrabajadas(ci: string, fecha_inicio: string, fecha_fin: string) {
    const response = await apiRequest<{ data: any }>(`/trabajadores/horas-trabajadas/${ci}?fecha_inicio=${fecha_inicio}&fecha_fin=${fecha_fin}`);
    return response.data;
  }

  static async getHorasTrabajadasTodos(fecha_inicio: string, fecha_fin: string) {
    const response = await apiRequest<{ data: any }>(`/trabajadores/horas-trabajadas-todos?fecha_inicio=${fecha_inicio}&fecha_fin=${fecha_fin}`);
    return response.data;
  }

  static async eliminarContrasenaTrabajador(ci: string): Promise<boolean> {
    const response = await apiRequest<{ success: boolean }>(`/trabajadores/${ci}/contrasena`, {
      method: 'DELETE',
    });
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

  // Crear cliente completo (upsert)
  static async crearCliente(data: {
    numero: string
    nombre: string
    direccion: string
    latitud?: string
    longitud?: string
  }): Promise<{ success: boolean; message?: string; data?: any }> {
    const response = await apiRequest<{ success: boolean; message?: string; data?: any }>(`/clientes/`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response
  }

  // Crear cliente simple
  static async crearClienteSimple(data: {
    numero: string
    nombre: string
    direccion: string
    latitud?: string
    longitud?: string
  }): Promise<{ success: boolean; message?: string; data?: any }> {
    const response = await apiRequest<{ success: boolean; message?: string; data?: any }>(`/clientes/simple`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response
  }

  // Verificar existencia por numero
  static async verificarCliente(numero: string): Promise<{ success: boolean; message?: string; data?: any }> {
    const endpoint = `/clientes/${encodeURIComponent(numero)}/verificar`
    return apiRequest(endpoint)
  }

  // Actualizar (PATCH) parcialmente por numero
  static async actualizarCliente(
    numero: string,
    data: Partial<{ nombre: string; direccion: string; latitud: string; longitud: string }>
  ): Promise<{ success: boolean; message?: string }> {
    const response = await apiRequest<{ success: boolean; message?: string }>(`/clientes/${encodeURIComponent(numero)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    return response
  }

  // Eliminar por numero
  static async eliminarCliente(numero: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiRequest<{ success: boolean; message?: string }>(`/clientes/${encodeURIComponent(numero)}`, {
      method: 'DELETE',
    })
    return response
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
    const response = await apiRequest<{ success: boolean }>(`/atencion-cliente/mensajes/${mensajeId}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    })
    return response.success === true
  }

  // Crear una respuesta a un mensaje
  static async crearRespuesta(mensajeId: string, contenido: string, autorCi: string, autorNombre: string, esPublica: boolean = true): Promise<string> {
    const response = await apiRequest<{ respuesta_id?: string; id?: string }>(`/atencion-cliente/mensajes/${mensajeId}/respuestas`, {
      method: 'POST',
      body: JSON.stringify({
        contenido,
        autor: autorCi,
        autor_nombre: autorNombre,
        es_publica: esPublica
      }),
    })
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
    const response = await apiRequest<{ success: boolean }>(`/atencion-cliente/mensajes/${mensajeId}/prioridad`, {
      method: 'PUT',
      body: JSON.stringify({ prioridad }),
    })
    return response.success === true
  }
} 

import { Contacto, ContactoResponse, ContactoUpdateData } from './contacto-types';

// ContactoService
export const ContactoService = {
  async getContactos(): Promise<Contacto[]> {
    try {
      const response = await apiRequest<ContactoResponse>('/contactos/');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error al obtener contactos del backend:', error);
      throw new Error('No se pudieron cargar los datos de contacto. El endpoint /api/contactos/ no está disponible en el backend.');
    }
  },

  async getContactoById(id: string): Promise<Contacto> {
    try {
      const response = await apiRequest<ContactoResponse>(`/contactos/${id}`);
      return response.data as Contacto;
    } catch (error) {
      console.error('Error al obtener contacto por ID:', error);
      throw new Error(`No se pudo cargar el contacto con ID ${id}. El endpoint /api/contactos/${id} no está disponible en el backend.`);
    }
  },

  async updateContacto(id: string, data: ContactoUpdateData): Promise<Contacto> {
    try {
      const response = await apiRequest<ContactoResponse>(`/contactos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response.data as Contacto;
    } catch (error) {
      console.error('Error al actualizar contacto:', error);
      throw new Error(`No se pudo actualizar el contacto con ID ${id}. El endpoint PUT /api/contactos/${id} no está disponible en el backend.`);
    }
  },
};

// Servicio para Leads
export class LeadService {
  // Obtener todos los leads con filtros opcionales
  static async getLeads(params: {
    nombre?: string
    telefono?: string
    estado?: string
    fuente?: string
  } = {}): Promise<Lead[]> {
    console.log('Calling getLeads endpoint with params:', params)
    const search = new URLSearchParams()
    if (params.nombre) search.append('nombre', params.nombre)
    if (params.telefono) search.append('telefono', params.telefono)
    if (params.estado) search.append('estado', params.estado)
    if (params.fuente) search.append('fuente', params.fuente)
    const endpoint = `/leads/${search.toString() ? `?${search.toString()}` : ''}`
    const response = await apiRequest<LeadResponse>(endpoint)
    console.log('LeadService.getLeads response:', response)
    return Array.isArray(response.data) ? response.data : []
  }

  // Obtener un lead por ID
  static async getLeadById(leadId: string): Promise<Lead> {
    console.log('Calling getLeadById with ID:', leadId)
    const response = await apiRequest<LeadResponse>(`/leads/${leadId}`)
    console.log('LeadService.getLeadById response:', response)
    if (!response.data || Array.isArray(response.data)) {
      throw new Error('Lead no encontrado')
    }
    return response.data
  }

  // Crear un nuevo lead
  static async createLead(leadData: LeadCreateData): Promise<string> {
    console.log('Calling createLead with:', leadData)
    const response = await apiRequest<{ success: boolean; message: string; data: { id: string } }>('/leads/', {
      method: 'POST',
      body: JSON.stringify(leadData),
    })
    console.log('LeadService.createLead response:', response)
    return response.data?.id || 'success'
  }

  // Actualizar un lead
  static async updateLead(leadId: string, leadData: LeadUpdateData): Promise<Lead> {
    console.log('Calling updateLead with ID:', leadId, 'data:', leadData)
    const response = await apiRequest<LeadResponse>(`/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(leadData),
    })
    console.log('LeadService.updateLead response:', response)
    if (!response.data || Array.isArray(response.data)) {
      throw new Error('Error al actualizar lead')
    }
    return response.data
  }

  // Eliminar un lead
  static async deleteLead(leadId: string): Promise<boolean> {
    console.log('Calling deleteLead with ID:', leadId)
    const response = await apiRequest<{ success: boolean; message: string }>(`/leads/${leadId}`, {
      method: 'DELETE',
    })
    console.log('LeadService.deleteLead response:', response)
    return response.success === true
  }

  // Buscar leads por teléfono
  static async getLeadsByTelefono(telefono: string): Promise<Lead[]> {
    console.log('Calling getLeadsByTelefono with telefono:', telefono)
    const response = await apiRequest<LeadResponse>(`/leads/telefono/${encodeURIComponent(telefono)}`)
    console.log('LeadService.getLeadsByTelefono response:', response)
    return Array.isArray(response.data) ? response.data : []
  }

  // Verificar si existe un lead
  static async checkLeadExists(leadId: string): Promise<boolean> {
    console.log('Calling checkLeadExists with ID:', leadId)
    const response = await apiRequest<{ success: boolean; message: string; exists: boolean }>(`/leads/${leadId}/existe`)
    console.log('LeadService.checkLeadExists response:', response)
    return response.exists === true
  }
} 