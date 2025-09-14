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
  deleteMaterialByCodigo: (materialCodigo: string) => Promise<boolean>
  editMaterialInProduct: (productoId: string, materialCodigo: string, data: { codigo: string | number, descripcion: string, um: string }) => Promise<boolean>
}

export function useMaterials(): UseMaterialsReturn {
  const [materials, setMaterials] = useState<Material[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [catalogs, setCatalogs] = useState<BackendCatalogoProductos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawCategories, setRawCategories] = useState<{ id: string, categoria: string }[]>([])

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
      setRawCategories(categoriesData)
      setCategories(categoriesData.map(c => c.categoria))
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
    console.log('[useMaterials] Adding material:', { productoId, material });

    try {
      const ok = await MaterialService.addMaterialToProduct(productoId, material)
      console.log('[useMaterials] Add result:', ok);
      if (!ok) {
        throw new Error('No se pudo agregar el material');
      }
      // No hacer fetchData aquí, será responsabilidad del componente padre
      return true;
    } catch (error) {
      console.error('[useMaterials] Error adding material:', error);
      throw error;
    }
  }

  const editMaterialInProduct = async (productoId: string, materialCodigo: string, data: { codigo: string | number, descripcion: string, um: string }) => {
    try {
      const ok = await MaterialService.editMaterialInProduct(productoId, materialCodigo, data)
      console.log('[useMaterials] Edit result:', ok);
      if (!ok) {
        throw new Error('Error al actualizar el material');
      }
      // No hacer actualización optimista, será responsabilidad del componente padre
      return true;
    } catch (error) {
      console.error('[useMaterials] Error editing material:', error);
      throw error;
    }
  }

  const deleteMaterialByCodigo = async (materialCodigo: string) => {
    try {
      const ok = await MaterialService.deleteMaterialByCodigo(materialCodigo)
      if (!ok) {
        throw new Error('Error al eliminar el material');
      }
      // No hacer actualización optimista, será responsabilidad del componente padre
      return true;
    } catch (error) {
      console.error('[useMaterials] Error deleting material:', error);
      throw error;
    }
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
    addMaterialToProduct,
    deleteMaterialByCodigo,
    editMaterialInProduct
  }
} 