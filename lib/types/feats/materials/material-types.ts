// Material feature types shared across backend responses and frontend usage.

export interface BackendMaterial {
  codigo: string
  descripcion: string
  um: string
  precio?: number
}

export interface BackendCatalogoProductos {
  id: string
  categoria: string
  foto?: string
  esVendible?: boolean
  materiales: BackendMaterial[]
}

export interface BackendCategoria {
  id: string
  categoria: string
}

export interface MaterialItem {
  codigo: number
  descripcion: string
  um: string
  precio?: number
}

export interface MaterialCategory {
  _id: string
  categoria: string
  foto?: string
  esVendible?: boolean
  materiales: MaterialItem[]
}

export interface Material {
  id: string
  codigo: number
  categoria: string
  descripcion: string
  um: string
  precio?: number
  foto?: string
}

export interface MaterialFormData {
  codigo: string
  categoria: string
  descripcion: string
  um: string
  precio?: number
}

export interface MaterialFilters {
  searchTerm: string
  selectedCategory: string
}

// New interfaces for category management with photos
export interface CreateCategoryRequest {
  categoria: string
  foto?: File | null
  esVendible?: boolean
  materiales?: CreateMaterialRequest[]
}

export interface CreateMaterialRequest {
  codigo: string
  descripcion: string
  um: string
  precio?: number
}

export interface UpdateCategoryRequest {
  categoria?: string
  foto?: File | null
  esVendible?: boolean
}

export interface AddMaterialToCategoryRequest {
  material: CreateMaterialRequest
}

export function transformBackendToFrontend(catalogos: BackendCatalogoProductos[]): Material[] {
  const materials: Material[] = []

  catalogos.forEach((catalogo) => {
    catalogo.materiales.forEach((material) => {
      materials.push({
        id: `${catalogo.id}_${material.codigo}`,
        codigo: Number(material.codigo),
        categoria: catalogo.categoria,
        descripcion: material.descripcion,
        um: material.um,
        precio: material.precio,
        foto: catalogo.foto,
      })
    })
  })

  return materials
}

export function transformCategories(categorias: BackendCategoria[]): string[] {
  return categorias.map((cat) => cat.categoria).sort()
}

export function flattenMaterials(categories: MaterialCategory[]): Material[] {
  const materials: Material[] = []

  categories.forEach((category) => {
    category.materiales.forEach((material) => {
      materials.push({
        id: `${category._id}_${material.codigo}`,
        codigo: material.codigo,
        categoria: category.categoria,
        descripcion: material.descripcion,
        um: material.um,
        precio: material.precio,
        foto: category.foto,
      })
    })
  })

  return materials
}

export const mockMaterialCategories: MaterialCategory[] = [
  {
    _id: '68533cc00eb2af9902428611',
    categoria: 'ESTRUCTURAS',
    materiales: [
      {
        codigo: 5401090096,
        descripcion:
          'Estructura para montaje de módulo fotovoltáico Sunfer Fototermia 09V6 cubierta plana 6 módulos 72 células 30º 33-50mm ',
        um: 'u',
      },
      {
        codigo: 5401090095,
        descripcion:
          'Estructura para montaje de módulo fotovoltáico Sunfer Fototermia 09V5 cubierta plana 5 módulos 72 células 30º 33-50mm',
        um: 'u',
      },
      {
        codigo: 5401090094,
        descripcion:
          'Estructura para montaje de módulo fotovoltáico Sunfer Fototermia 09V4 cubierta plana 4 módulos 72 células 30º 33-50mm ',
        um: 'u',
      },
      {
        codigo: 6424000233,
        descripcion:
          'Estructura para montaje de módulo fotovoltáico Bultmeier coplanar 4 módulos 60/72 células 40mm perfil P26',
        um: 'u',
      },
    ],
  },
  {
    _id: '68533cc00eb2af9902428616',
    categoria: 'PVC',
    materiales: [
      {
        codigo: 6621025300,
        descripcion: 'FAM CAJA ESTANCA CIEGA 100X100 LH IP-55 SIN CONOS',
        um: 'u',
      },
      {
        codigo: 6621025100,
        descripcion: 'FAM CAJA ESTANCA 100X100 LH IP-55 7 CONOS TAPA TORNILLOS',
        um: 'u',
      },
      {
        codigo: 6201000016,
        descripcion: 'ML TUBO PVC M-16 GRIS ENCHUFABLE RIGIDO',
        um: 'm',
      },
      {
        codigo: 6201000020,
        descripcion: 'ML TUBO PVC M-20 GRIS ENCHUFABLE RIGIDO',
        um: 'm',
      },
    ],
  },
  {
    _id: '68533cc00eb2af990242860d',
    categoria: 'BATERÍAS',
    materiales: [
      {
        codigo: 6423585002,
        descripcion: 'PYLONTECH BATERIA MODULAR US5000',
        um: 'u',
      },
      {
        codigo: 6423585003,
        descripcion: 'PYLONTECH KIT CABLES US5000 CO',
        um: 'u',
      },
      {
        codigo: 6423520902,
        descripcion: 'GH KIT MONTAJE PARA BATERIA LI 2,4KWH IRON',
        um: 'u',
      },
      {
        codigo: 6423520001,
        descripcion: 'Batería de litio para instalación solar fotovoltaica Greenheiss Solar 2,4kWh Iron',
        um: 'u',
      },
    ],
  },
  {
    _id: '68533cc00eb2af9902428612',
    categoria: 'INVERSORES',
    materiales: [
      {
        codigo: 6421000122,
        descripcion:
          'Inversor de conexión a red monofásico Greenheiss Solar GH-IH Style 12,5A 5000W 2MPPT 230V modelo híbrido',
        um: 'u',
      },
      {
        codigo: 6421000123,
        descripcion:
          'Inversor de conexión a red monofásico Greenheiss Solar GH-IH Style 12,5A 3000W 2MPPT 230V modelo híbrido',
        um: 'u',
      },
    ],
  },
  {
    _id: '68533cc00eb2af9902428614',
    categoria: 'PANELES',
    materiales: [
      {
        codigo: 6420015022,
        descripcion:
          'JA Solar módulo fotovoltaico MBB/HC/BS JAM66S30-505 MR 505Wp monocristalino 132 celulas 1500V',
        um: 'u',
      },
    ],
  },
  {
    _id: '68533cc00eb2af990242860e',
    categoria: 'CABLE SOLAR',
    materiales: [
      {
        codigo: 6080660104,
        descripcion: 'ML CABLE SOLAR H1Z2Z2-K 1X4MM NEGRO (B.CORTE)',
        um: 'm',
      },
      {
        codigo: 6080660105,
        descripcion: 'ML CABLE SOLAR H1Z2Z2-K 1X4MM ROJO (B.CORTE)',
        um: 'm',
      },
    ],
  },
  {
    _id: '68533cc00eb2af9902428610',
    categoria: 'CINTA AISLANTE',
    materiales: [
      {
        codigo: 6601000008,
        descripcion: 'PRY CINTA AISLANTE 20M X 19MM X 0,13MM VERDE/AMARILLO P1000',
        um: 'u',
      },
      {
        codigo: 6601000003,
        descripcion: 'PRY CINTA AISLANTE 20M X 19MM X 0,13MM AZUL P1000',
        um: 'u',
      },
      {
        codigo: 6601000002,
        descripcion: '3M CINTA AISLANTE 20M X 19MM NEGRA',
        um: 'u',
      },
    ],
  },
]
