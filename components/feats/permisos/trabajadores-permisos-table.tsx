"use client"

import { useState, useEffect, useMemo } from "react"
import { Input } from "@/components/shared/molecule/input"
import { Button } from "@/components/shared/atom/button"
import { TrabajadorService, PermisosService } from "@/lib/api-services"
import { Trabajador } from "@/lib/api-types"
import { Search, Shield, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TrabajadoresPermisosTableProps {
  onEditPermisos: (ci: string, nombre: string) => void
  refreshTrigger?: number
}

export function TrabajadoresPermisosTable({
  onEditPermisos,
  refreshTrigger,
}: TrabajadoresPermisosTableProps) {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [trabajadoresConPermisos, setTrabajadoresConPermisos] = useState<
    Set<string>
  >(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [refreshTrigger])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Cargar trabajadores
      const trabajadoresData = await TrabajadorService.getAllTrabajadores()
      setTrabajadores(trabajadoresData)

      // Cargar CIs de trabajadores con permisos
      try {
        const cisConPermisos = await PermisosService.getTrabajadoresConPermisos()
        setTrabajadoresConPermisos(new Set(cisConPermisos))
      } catch (error) {
        console.error("Error loading trabajadores con permisos:", error)
        setTrabajadoresConPermisos(new Set())
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los trabajadores",
        variant: "destructive",
      })
      console.error("Error loading trabajadores:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrar y ordenar trabajadores
  const trabajadoresFiltrados = useMemo(() => {
    const searchLower = searchTerm.toLowerCase().trim()

    // Filtrar por búsqueda
    let filtered = trabajadores.filter(
      (t) =>
        t.nombre.toLowerCase().includes(searchLower) ||
        t.CI.includes(searchLower)
    )

    // Ordenar: primero los que tienen permisos
    filtered.sort((a, b) => {
      const aConPermisos = trabajadoresConPermisos.has(a.CI)
      const bConPermisos = trabajadoresConPermisos.has(b.CI)

      if (aConPermisos && !bConPermisos) return -1
      if (!aConPermisos && bConPermisos) return 1

      // Si ambos tienen o no tienen permisos, ordenar alfabéticamente
      return a.nombre.localeCompare(b.nombre)
    })

    return filtered
  }, [trabajadores, trabajadoresConPermisos, searchTerm])

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o CI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchTerm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchTerm("")}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Contador */}
      <div className="text-sm text-gray-600">
        Mostrando {trabajadoresFiltrados.length} de {trabajadores.length}{" "}
        trabajadores
        {trabajadoresConPermisos.size > 0 && (
          <span className="ml-2 text-suncar-primary font-medium">
            ({trabajadoresConPermisos.size} con permisos)
          </span>
        )}
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-suncar-primary" />
          <p className="text-sm text-gray-500 mt-2">
            Cargando trabajadores...
          </p>
        </div>
      ) : trabajadoresFiltrados.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <p className="text-gray-500">
            {searchTerm
              ? "No se encontraron trabajadores con ese criterio"
              : "No hay trabajadores registrados"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">
                  CI
                </th>
                <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">
                  Nombre
                </th>
                <th className="text-center px-4 py-3 font-semibold text-sm text-gray-700">
                  Estado
                </th>
                <th className="text-right px-4 py-3 font-semibold text-sm text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {trabajadoresFiltrados.map((trabajador) => {
                const tienePermisos = trabajadoresConPermisos.has(trabajador.CI)
                return (
                  <tr
                    key={trabajador.CI}
                    className={`hover:bg-gray-50 transition-colors ${
                      tienePermisos ? "bg-green-50/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-sm">
                      {trabajador.CI}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {trabajador.nombre}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tienePermisos ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <Shield className="h-3 w-3" />
                          Con permisos
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          Sin permisos
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onEditPermisos(trabajador.CI, trabajador.nombre)
                        }
                        className="text-suncar-primary border-suncar-primary hover:bg-suncar-primary/10"
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Ver Módulos
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
