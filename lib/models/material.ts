export interface MaterialDocument {
  _id?: string
  name: string
  type: string
  brand: string
  createdAt?: Date
  updatedAt?: Date
}

export interface MaterialTypeDocument {
  _id?: string
  name: string
  createdAt?: Date
}

export interface MaterialBrandDocument {
  _id?: string
  name: string
  createdAt?: Date
}
