export interface Brigade {
  leader: string
  members: string[]
}

export interface Material {
  id: string
  name: string
  type: string
  brand: string
}

export interface MaterialType {
  id: string
  name: string
}

export interface MaterialBrand {
  id: string
  name: string
}

export interface Location {
  address: string
  coordinates: {
    lat: number
    lng: number
  } | null
  distanceFromHQ: number | null
}

export interface Photo {
  id: string
  file: File
  preview: string
  description: string
}

export interface DateTime {
  date: string
  time: string
}

export interface FormData {
  formId: string
  brigade: Brigade
  materials: Material[]
  location: Location
  photos: Photo[]
  dateTime: DateTime
}

// Tipos iniciales predefinidos
export const INITIAL_MATERIAL_TYPES = [
  "Panel Solar",
  "Inversor",
  "Batería",
  "Cable DC",
  "Cable AC",
  "Estructura de Montaje",
  "Tornillería",
  "Regulador de Carga",
  "Medidor Bidireccional",
  "Protecciones Eléctricas",
]

// Marcas iniciales predefinidas
export const INITIAL_MATERIAL_BRANDS = [
  "Canadian Solar",
  "Jinko Solar",
  "Trina Solar",
  "SMA",
  "Fronius",
  "Huawei",
  "Tesla",
  "LG Chem",
  "Victron Energy",
  "Schneider Electric",
]
