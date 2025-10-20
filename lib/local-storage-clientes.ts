// Servicio de almacenamiento local para clientes temporales
// Para crear clientes rápidos sin depender del backend

const STORAGE_KEY = 'suncar_clientes_temporales'

export interface ClienteTemp {
  numero: string
  nombre: string
  direccion: string
  temporal: boolean // indica que es un cliente temporal creado localmente
}

export class LocalClientesService {
  // Obtener todos los clientes temporales
  static getAll(): ClienteTemp[] {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error al leer clientes temporales:', error)
      return []
    }
  }

  // Crear un cliente temporal
  static create(numero: string, nombre: string, direccion: string): ClienteTemp {
    const clientes = this.getAll()

    // Verificar si ya existe
    const existente = clientes.find(c => c.numero === numero)
    if (existente) {
      console.warn(`Cliente con número ${numero} ya existe localmente`)
      return existente
    }

    const nuevoCliente: ClienteTemp = {
      numero,
      nombre,
      direccion,
      temporal: true
    }

    clientes.push(nuevoCliente)
    this.save(clientes)

    console.log('✅ Cliente temporal creado:', nuevoCliente)
    return nuevoCliente
  }

  // Verificar si existe un cliente temporal
  static exists(numero: string): boolean {
    const clientes = this.getAll()
    return clientes.some(c => c.numero === numero)
  }

  // Obtener un cliente temporal por número
  static getByNumero(numero: string): ClienteTemp | null {
    const clientes = this.getAll()
    return clientes.find(c => c.numero === numero) || null
  }

  // Guardar en localStorage
  private static save(clientes: ClienteTemp[]): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes))
    } catch (error) {
      console.error('Error al guardar clientes temporales:', error)
    }
  }

  // Limpiar todos los clientes temporales
  static clear(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  }
}
