// Tipos de API que coinciden con el backend FastAPI

// Tipos del backend
export interface BackendMaterial {
  codigo: string
  descripcion: string
  um: string
}

export interface BackendCatalogoProductos {
  id: string
  categoria: string
  materiales: BackendMaterial[]
}

export interface BackendCategoria {
  id: string
  categoria: string
}

// Tipos del frontend (ya definidos en material-types.ts)
export interface Material {
  id: string
  codigo: number
  categoria: string
  descripcion: string
  um: string
}

// Convertidores entre backend y frontend
export function transformBackendToFrontend(catalogos: BackendCatalogoProductos[]): Material[] {
  const materials: Material[] = []
  
  catalogos.forEach(catalogo => {
    catalogo.materiales.forEach(material => {
      materials.push({
        id: `${catalogo.id}_${material.codigo}`,
        codigo: Number(material.codigo),
        categoria: catalogo.categoria,
        descripcion: material.descripcion,
        um: material.um
      })
    })
  })
  
  return materials
}

export function transformCategories(categorias: BackendCategoria[]): string[] {
  return categorias.map(cat => cat.categoria).sort()
}

export interface Trabajador {
  id: string;
  CI: string;
  nombre: string;
  tiene_contraseña: boolean; // Nuevo campo, true = jefe
}

export interface Brigada {
  _id: string;
  lider: string; // CI del jefe
  integrantes: string[]; // CIs de los trabajadores
} 