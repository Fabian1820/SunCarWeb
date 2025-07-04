import { useState, useEffect } from 'react'
import { MaterialService } from '@/lib/api-services'
import type { Material } from '@/lib/material-types'
import type { BackendCatalogoProductos } from '@/lib/api-types'

interface UseMaterialsReturn {
  materials: Material[]
  categories: string[]
  catalogs: BackendCatalogoProductos[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createCategory: (categoria: string) => Promise<string>
  createProduct: (categoria: string, materiales?: any[]) => Promise<string>
  addMaterialToProduct: (productoId: string, material: { codigo: string, descripcion: string, um: string }) => Promise<boolean>
}

export function useMaterials(): UseMaterialsReturn {
  const [materials, setMaterials] = useState<Material[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [catalogs, setCatalogs] = useState<BackendCatalogoProductos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [materialsData, categoriesData, catalogsData] = await Promise.all([
        MaterialService.getAllMaterials(),
        MaterialService.getCategories(),
        MaterialService.getAllCatalogs()
      ])
      setMaterials(materialsData)
      setCategories(categoriesData)
      setCatalogs(catalogsData)
    } catch (err) {
      console.error('Error fetching materials:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar los materiales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Funciones para crear/agregar
  const createCategory = async (categoria: string) => {
    const id = await MaterialService.createCategory(categoria)
    await fetchData()
    return id
  }

  const createProduct = async (categoria: string, materiales: any[] = []) => {
    const id = await MaterialService.createProduct(categoria, materiales)
    await fetchData()
    return id
  }

  const addMaterialToProduct = async (productoId: string, material: { codigo: string, descripcion: string, um: string }) => {
    const ok = await MaterialService.addMaterialToProduct(productoId, material)
    await fetchData()
    return ok
  }

  return {
    materials,
    categories,
    catalogs,
    loading,
    error,
    refetch: fetchData,
    createCategory,
    createProduct,
    addMaterialToProduct
  }
} 