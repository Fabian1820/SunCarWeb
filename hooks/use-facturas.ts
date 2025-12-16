"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { facturaService } from '@/lib/services/feats/facturas/factura-service'
import { useAuth } from '@/contexts/auth-context'
import type {
    Factura,
    FacturaFilters,
    FacturaStats,
    Vale
} from '@/lib/types/feats/facturas/factura-types'

export function useFacturas() {
    const [facturas, setFacturas] = useState<Factura[]>([])
    const [stats, setStats] = useState<FacturaStats | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = useState<FacturaFilters>({})
    const { token } = useAuth()
    const lastTokenRef = useRef<string | null>(null)

    /**
     * Cargar facturas con filtros
     */
    const cargarFacturas = useCallback(async (customFilters?: FacturaFilters) => {
        setLoading(true)
        setError(null)
        try {
            const filtersToUse = customFilters || filters
            const data = await facturaService.listarFacturas(filtersToUse)
            setFacturas(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error cargando facturas')
            console.error('Error cargando facturas:', err)
        } finally {
            setLoading(false)
        }
    }, [filters])

    /**
     * Cargar estadísticas
     */
    const cargarStats = useCallback(async (customFilters?: FacturaFilters) => {
        try {
            const filtersToUse = customFilters || filters
            const data = await facturaService.obtenerStats(filtersToUse)
            setStats(data)
        } catch (err) {
            console.error('Error cargando stats:', err)
        }
    }, [filters])

    /**
     * Recargar datos (facturas y stats)
     */
    const recargar = useCallback(async () => {
        await Promise.all([cargarFacturas(), cargarStats()])
    }, [cargarFacturas, cargarStats])

    // Configurar token y cargar datos cuando esté disponible
    useEffect(() => {
        if (!token) {
            facturaService.setToken(null)
            lastTokenRef.current = null
            return
        }

        facturaService.setToken(token)

        if (lastTokenRef.current !== token) {
            lastTokenRef.current = token
            recargar()
        }
    }, [token, recargar])

    /**
     * Aplicar nuevos filtros
     */
    const aplicarFiltros = useCallback(async (newFilters: FacturaFilters) => {
        setFilters(newFilters)
        await cargarFacturas(newFilters)
        await cargarStats(newFilters)
    }, [cargarFacturas, cargarStats])

    /**
     * Limpiar filtros
     */
    const limpiarFiltros = useCallback(async () => {
        setFilters({})
        await cargarFacturas({})
        await cargarStats({})
    }, [cargarFacturas, cargarStats])

    /**
     * Obtener número sugerido
     */
    const obtenerNumeroSugerido = async () => {
        try {
            return await facturaService.obtenerNumeroSugerido()
        } catch (err) {
            throw new Error('Error obteniendo número sugerido')
        }
    }

    /**
     * Crear factura
     */
    const crearFactura = async (factura: Omit<Factura, 'id' | 'fecha_creacion' | 'total'>) => {
        try {
            const result = await facturaService.crearFactura(factura)
            await recargar()
            return result
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Error creando factura')
        }
    }

    /**
     * Actualizar factura
     */
    const actualizarFactura = async (id: string, factura: Omit<Factura, 'id' | 'fecha_creacion' | 'total'>) => {
        try {
            const result = await facturaService.actualizarFactura(id, factura)
            await recargar()
            return result
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Error actualizando factura')
        }
    }

    /**
     * Eliminar factura
     */
    const eliminarFactura = async (id: string) => {
        try {
            const result = await facturaService.eliminarFactura(id)
            await recargar()
            return result
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Error eliminando factura')
        }
    }

    /**
     * Agregar vale a factura
     */
    const agregarVale = async (facturaId: string, vale: Omit<Vale, 'id' | 'total'>) => {
        try {
            const result = await facturaService.agregarVale(facturaId, vale)
            await recargar()
            return result
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Error agregando vale')
        }
    }

    /**
     * Actualizar vale
     */
    const actualizarVale = async (facturaId: string, valeId: string, vale: Omit<Vale, 'total'>) => {
        try {
            const result = await facturaService.actualizarVale(facturaId, valeId, vale)
            await recargar()
            return result
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Error actualizando vale')
        }
    }

    /**
     * Eliminar vale
     */
    const eliminarVale = async (facturaId: string, valeId: string) => {
        try {
            const result = await facturaService.eliminarVale(facturaId, valeId)
            await recargar()
            return result
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Error eliminando vale')
        }
    }

    return {
        // Estado
        facturas,
        stats,
        loading,
        error,
        filters,

        // Acciones
        cargarFacturas,
        cargarStats,
        recargar,
        aplicarFiltros,
        limpiarFiltros,
        obtenerNumeroSugerido,
        crearFactura,
        actualizarFactura,
        eliminarFactura,
        agregarVale,
        actualizarVale,
        eliminarVale,
    }
}
