import { useCallback, useEffect, useState } from 'react'
import { InventarioService, MaterialService } from '@/lib/api-services'
import type {
  Almacen,
  Tienda,
  StockItem,
  MovimientoInventario,
  MovimientoCreateData,
  AlmacenCreateData,
  AlmacenUpdateData,
  TiendaCreateData,
  TiendaUpdateData,
} from '@/lib/inventario-types'
import type { Material } from '@/lib/material-types'

interface UseInventarioReturn {
  almacenes: Almacen[]
  tiendas: Tienda[]
  stock: StockItem[]
  movimientos: MovimientoInventario[]
  materiales: Material[]
  loading: boolean
  loadingStock: boolean
  loadingMovimientos: boolean
  error: string | null
  refetchAll: () => Promise<void>
  refetchStock: (almacenId?: string) => Promise<void>
  refetchMovimientos: (params?: { tipo?: string; almacen_id?: string; tienda_id?: string }) => Promise<void>
  createAlmacen: (data: AlmacenCreateData) => Promise<void>
  updateAlmacen: (id: string, data: AlmacenUpdateData) => Promise<void>
  deleteAlmacen: (id: string) => Promise<void>
  createTienda: (data: TiendaCreateData) => Promise<void>
  updateTienda: (id: string, data: TiendaUpdateData) => Promise<void>
  deleteTienda: (id: string) => Promise<void>
  createMovimiento: (data: MovimientoCreateData) => Promise<void>
}

export function useInventario(): UseInventarioReturn {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [tiendas, setTiendas] = useState<Tienda[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStock, setLoadingStock] = useState(false)
  const [loadingMovimientos, setLoadingMovimientos] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetchStock = useCallback(async (almacenId?: string) => {
    setLoadingStock(true)
    setError(null)
    try {
      const data = await InventarioService.getStock({ almacen_id: almacenId })
      setStock(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching stock:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar el stock')
      setStock([])
    } finally {
      setLoadingStock(false)
    }
  }, [])

  const refetchMovimientos = useCallback(async (params?: { tipo?: string; almacen_id?: string; tienda_id?: string }) => {
    setLoadingMovimientos(true)
    setError(null)
    try {
      const data = await InventarioService.getMovimientos(params)
      setMovimientos(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching movimientos:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar movimientos')
      setMovimientos([])
    } finally {
      setLoadingMovimientos(false)
    }
  }, [])

  const refetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [almacenesData, tiendasData, materialesData] = await Promise.all([
        InventarioService.getAlmacenes(),
        InventarioService.getTiendas(),
        MaterialService.getAllMaterials(),
      ])
      setAlmacenes(Array.isArray(almacenesData) ? almacenesData : [])
      setTiendas(Array.isArray(tiendasData) ? tiendasData : [])
      setMateriales(Array.isArray(materialesData) ? materialesData : [])
      await Promise.all([refetchStock(), refetchMovimientos()])
    } catch (err) {
      console.error('Error fetching inventario:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar inventario')
    } finally {
      setLoading(false)
    }
  }, [refetchMovimientos, refetchStock])

  useEffect(() => {
    refetchAll()
  }, [refetchAll])

  const createAlmacen = async (data: AlmacenCreateData) => {
    await InventarioService.createAlmacen(data)
    const refreshed = await InventarioService.getAlmacenes()
    setAlmacenes(Array.isArray(refreshed) ? refreshed : [])
  }

  const updateAlmacen = async (id: string, data: AlmacenUpdateData) => {
    await InventarioService.updateAlmacen(id, data)
    const refreshed = await InventarioService.getAlmacenes()
    setAlmacenes(Array.isArray(refreshed) ? refreshed : [])
  }

  const deleteAlmacen = async (id: string) => {
    await InventarioService.deleteAlmacen(id)
    setAlmacenes(prev => prev.filter(a => a.id !== id))
  }

  const createTienda = async (data: TiendaCreateData) => {
    await InventarioService.createTienda(data)
    const refreshed = await InventarioService.getTiendas()
    setTiendas(Array.isArray(refreshed) ? refreshed : [])
  }

  const updateTienda = async (id: string, data: TiendaUpdateData) => {
    await InventarioService.updateTienda(id, data)
    const refreshed = await InventarioService.getTiendas()
    setTiendas(Array.isArray(refreshed) ? refreshed : [])
  }

  const deleteTienda = async (id: string) => {
    await InventarioService.deleteTienda(id)
    setTiendas(prev => prev.filter(t => t.id !== id))
  }

  const createMovimiento = async (data: MovimientoCreateData) => {
    await InventarioService.createMovimiento(data)
    await Promise.all([refetchMovimientos(), refetchStock()])
  }

  return {
    almacenes,
    tiendas,
    stock,
    movimientos,
    materiales,
    loading,
    loadingStock,
    loadingMovimientos,
    error,
    refetchAll,
    refetchStock,
    refetchMovimientos,
    createAlmacen,
    updateAlmacen,
    deleteAlmacen,
    createTienda,
    updateTienda,
    deleteTienda,
    createMovimiento,
  }
}
