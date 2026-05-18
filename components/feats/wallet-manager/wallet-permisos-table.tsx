"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/shared/molecule/input"
import { Button } from "@/components/shared/atom/button"
import { Switch } from "@/components/shared/molecule/switch"
import { TrabajadorService } from "@/lib/api-services"
import { Trabajador } from "@/lib/api-types"
import { Search, Loader2, Wallet, Shield, Eye, Landmark } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useWalletPermisos } from "@/hooks/use-wallet-permisos"

export function WalletPermisosTable() {
  const { toast } = useToast()
  const { permisos, loading: loadingPermisos, update } = useWalletPermisos()

  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [loadingTrabajadores, setLoadingTrabajadores] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [savingCi, setSavingCi] = useState<string | null>(null)

  useEffect(() => {
    void loadTrabajadores()
  }, [])

  const loadTrabajadores = async () => {
    setLoadingTrabajadores(true)
    try {
      const data = await TrabajadorService.getAllTrabajadores()
      setTrabajadores(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los trabajadores",
        variant: "destructive",
      })
    } finally {
      setLoadingTrabajadores(false)
    }
  }

  const permisosByCi = useMemo(() => {
    const map = new Map<string, { verTodos: boolean; esAdmin: boolean; gestionarBancoGlobal: boolean }>()
    for (const p of permisos) {
      map.set(p.usuarioCi, { verTodos: p.verTodos, esAdmin: p.esAdmin, gestionarBancoGlobal: p.gestionarBancoGlobal })
    }
    return map
  }, [permisos])

  const trabajadoresFiltrados = useMemo(() => {
    const search = searchTerm.toLowerCase().trim()
    let filtered = trabajadores.filter(
      (t) =>
        t.nombre.toLowerCase().includes(search) || t.CI.includes(search)
    )

    filtered.sort((a, b) => {
      const aP = permisosByCi.get(a.CI)
      const bP = permisosByCi.get(b.CI)
      const aHas = !!(aP && (aP.verTodos || aP.esAdmin || aP.gestionarBancoGlobal))
      const bHas = !!(bP && (bP.verTodos || bP.esAdmin || bP.gestionarBancoGlobal))
      if (aHas && !bHas) return -1
      if (!aHas && bHas) return 1
      return a.nombre.localeCompare(b.nombre)
    })
    return filtered
  }, [trabajadores, permisosByCi, searchTerm])

  const togglePermiso = async (
    ci: string,
    field: "verTodos" | "esAdmin" | "gestionarBancoGlobal",
    value: boolean
  ) => {
    const current = permisosByCi.get(ci) || { verTodos: false, esAdmin: false, gestionarBancoGlobal: false }
    const next = { ...current, [field]: value }
    setSavingCi(ci)
    try {
      const ok = await update(ci, {
        ver_todos: next.verTodos,
        es_admin: next.esAdmin,
        gestionar_banco_global: next.gestionarBancoGlobal,
      })
      if (ok) {
        toast({
          title: "Permisos actualizados",
          description: `Se guardaron los permisos de wallet.`,
        })
      } else {
        toast({
          title: "Error",
          description: "No se pudo actualizar el permiso",
          variant: "destructive",
        })
      }
    } finally {
      setSavingCi(null)
    }
  }

  const isLoading = loadingTrabajadores || loadingPermisos
  const conPermisosCount = trabajadores.filter((t) => {
    const p = permisosByCi.get(t.CI)
    return p && (p.verTodos || p.esAdmin || p.gestionarBancoGlobal)
  }).length

  return (
    <div className="space-y-4">
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

      <div className="text-sm text-gray-600">
        Mostrando {trabajadoresFiltrados.length} de {trabajadores.length}{" "}
        trabajadores
        {conPermisosCount > 0 && (
          <span className="ml-2 text-blue-700 font-medium">
            ({conPermisosCount} con permisos)
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm text-gray-500 mt-2">Cargando...</p>
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
        <div className="border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">
                  CI
                </th>
                <th className="text-left px-4 py-3 font-semibold text-sm text-gray-700">
                  Nombre
                </th>
                <th className="text-center px-4 py-3 font-semibold text-sm text-gray-700">
                  <div className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    Ver todos
                  </div>
                </th>
                <th className="text-center px-4 py-3 font-semibold text-sm text-gray-700">
                  <div className="inline-flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </div>
                </th>
                <th className="text-center px-4 py-3 font-semibold text-sm text-gray-700">
                  <div className="inline-flex items-center gap-1">
                    <Landmark className="h-3.5 w-3.5" />
                    Banco Global
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {trabajadoresFiltrados.map((t) => {
                const p = permisosByCi.get(t.CI) || {
                  verTodos: false,
                  esAdmin: false,
                  gestionarBancoGlobal: false,
                }
                const tieneAlguno = p.verTodos || p.esAdmin || p.gestionarBancoGlobal
                const isSaving = savingCi === t.CI
                return (
                  <tr
                    key={t.CI}
                    className={`hover:bg-gray-50 transition-colors ${
                      tieneAlguno ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-sm">{t.CI}</td>
                    <td className="px-4 py-3 font-medium">{t.nombre}</td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={p.verTodos}
                        disabled={isSaving}
                        onCheckedChange={(v) =>
                          void togglePermiso(t.CI, "verTodos", v)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={p.esAdmin}
                        disabled={isSaving}
                        onCheckedChange={(v) =>
                          void togglePermiso(t.CI, "esAdmin", v)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={p.gestionarBancoGlobal}
                        disabled={isSaving}
                        onCheckedChange={(v) =>
                          void togglePermiso(t.CI, "gestionarBancoGlobal", v)
                        }
                      />
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
