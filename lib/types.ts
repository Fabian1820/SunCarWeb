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
  serviceType: string
  brigade: Brigade
  materials: Material[]
  location: Location
  photos: Photo[]
  dateTime: DateTime
  description?: string // Nuevo campo para mantenimiento y avería
}

export const SERVICE_TYPES = [
  { value: "inversion", label: "Inversión" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "averia", label: "Avería" },
]
