"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Users, HardHat, Plus, Search,
  Building2, Building, Briefcase,
  Phone, X, ChevronDown, ChevronRight,
} from "lucide-react"
import { Button }    from "@/components/shared/atom/button"
import { Input }     from "@/components/shared/atom/input"
import { Badge }     from "@/components/shared/atom/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/shared/atom/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { ModuleHeader }      from "@/components/shared/organism/module-header"
import { Toaster }           from "@/components/shared/molecule/toaster"
import { useRecursosHumanos } from "@/hooks/use-recursos-humanos"
import { CrearTrabajadorForm } from "@/components/feats/recursos-humanos/crear-trabajador-form"
import type { TrabajadorRRHH } from "@/lib/recursos-humanos-types"

// ─── tipos ────────────────────────────────────────────────────────────────────

type Agrupacion = "empleados" | "cargos" | "departamentos" | "sedes"

// ─── helpers ──────────────────────────────────────────────────────────────────
function colorAvatar(_ci: string) {
  return "bg-[#F2C300]"
}
function iniciales(n: string) {
  return n.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase()
}
function pluralEmpleado(n: number) {
  return `${n} empleado${n !== 1 ? "s" : ""}`
}

// ─── select de filtro con indicador de activo ────────────────────────────────
function FiltroSelect({
  label, value, onValueChange, options,
}: {
  label: string
  value: string
  onValueChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const activo = value !== "todos"
  return (
    <div className="relative">
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={`h-11 pl-4 pr-10 text-sm rounded-xl border transition-all min-w-[180px] ${
            activo
              ? "border-[#012928] bg-[#E6F4EF] text-[#012928] font-medium"
              : "border-gray-200 bg-white text-gray-700"
          }`}
        >
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">{label}</SelectItem>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {activo && (
        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#AFEB17] border-2 border-white" />
      )}
    </div>
  )
}

// ─── avatar (foto o iniciales) ───────────────────────────────────────────────
function Avatar({ emp, size = "md" }: { emp: TrabajadorRRHH; size?: "sm" | "md" | "lg" }) {
  const cls = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-11 w-11 text-sm"
  if (emp.foto_perfil) {
    return (
      <img
        src={emp.foto_perfil}
        alt={emp.nombre}
        className={`${cls} rounded-xl object-cover shrink-0 border border-gray-200`}
      />
    )
  }
  return (
    <div className={`${cls} rounded-xl flex items-center justify-center text-[#012928] font-bold select-none shrink-0 ${colorAvatar(emp.CI)}`}>
      {iniciales(emp.nombre)}
    </div>
  )
}

// ─── fila tabla ───────────────────────────────────────────────────────────────
function EmpleadoRow({ emp }: { emp:TrabajadorRRHH }) {
  const router = useRouter()
  const activo = emp.activo !== false
  return (
    <tr onClick={() => router.push(`/recursos-humanos/${emp.CI}`)}
      className="hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors"
    >
      <td className="py-3.5 px-5">
        <div className="flex items-center gap-3">
          <Avatar emp={emp} size="sm" />
          <div>
            <p className="font-medium text-gray-900 text-sm">{emp.nombre}</p>
            <p className="text-xs text-gray-400">CI: {emp.CI}</p>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-5 text-sm text-gray-700">{emp.cargo || "—"}</td>
      <td className="py-3.5 px-5 text-sm text-gray-600">{emp.departamento_nombre || "—"}</td>
      <td className="py-3.5 px-5 text-sm text-gray-600">{emp.sede_nombre || "—"}</td>
      <td className="py-3.5 px-5 text-sm text-gray-600">{emp.telefono || "—"}</td>
      <td className="py-3.5 px-5">
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className={`text-xs ${activo ? "bg-[#E6F4EF] text-[#012928] border-[#012928]/20" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {activo ? "Activo" : "Inactivo"}
          </Badge>
          {emp.is_brigadista  && <Badge variant="outline" className="text-xs bg-[#F2C300]/20 text-[#7a5f00] border-[#F2C300]/60">Brigadista</Badge>}
          {emp.tiene_contraseña && <Badge variant="outline" className="text-xs bg-[#0A052D]/10 text-[#0A052D] border-[#0A052D]/20">Acceso</Badge>}
        </div>
      </td>
    </tr>
  )
}

// ─── tabla de empleados (sin encabezados, para usar dentro de grupos) ─────────
const COL_HEADERS = ["Empleado","Cargo","Departamento","Sede","Teléfono","Estado"]

function HojaEmpleados({ empleados, showHeaders = false }: { empleados:TrabajadorRRHH[]; showHeaders?:boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        {showHeaders && (
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {COL_HEADERS.map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>{empleados.map(e => <EmpleadoRow key={e.CI} emp={e} />)}</tbody>
      </table>
    </div>
  )
}

// ─── encabezado de columnas global (se usa UNA vez sobre los grupos) ──────────
function EncabezadoColumnas() {
  return (
    <div className="overflow-x-auto bg-gray-50 border border-gray-200 rounded-lg mb-1">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {COL_HEADERS.map(h => (
              <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
      </table>
    </div>
  )
}

// ─── sección plegable — jerarquía visual clara ────────────────────────────────
function Seccion({
  titulo, count, nivel, children,
}: {
  titulo:string; count:number; nivel:1|2|3; children:React.ReactNode
}) {
  const [open, setOpen] = useState(false)   // cerrado por defecto

  // ── Nivel 1: grupo principal — gris neutro, borde izquierdo Emerald
  if (nivel === 1) {
    return (
      <div className="rounded-lg overflow-hidden border border-gray-200 border-l-4 border-l-[#F2C300]">
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-3 px-5 py-3 bg-gray-100 hover:bg-gray-150 transition-colors text-left"
        >
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <span className="font-semibold text-sm text-gray-800 truncate">{titulo}</span>
            <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded px-2 py-0.5 shrink-0">
              {count} empleado{count !== 1 ? "s" : ""}
            </span>
          </div>
          {open
            ? <ChevronDown  className="h-4 w-4 text-gray-400 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
        </button>
        {open && <div className="bg-white divide-y divide-gray-50">{children}</div>}
      </div>
    )
  }

  // ── Nivel 2: departamento — más claro, indentado
  if (nivel === 2) {
    return (
      <div className="border-b border-gray-100 last:border-b-0">
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-3 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <Building className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm text-gray-600 truncate">{titulo}</span>
            <span className="text-xs text-gray-400 shrink-0">{count}</span>
          </div>
          {open
            ? <ChevronDown  className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
        </button>
        {open && <div className="bg-white pl-4 border-t border-gray-100 divide-y divide-gray-50">{children}</div>}
      </div>
    )
  }

  // ── Nivel 3: cargo — mínimo, solo texto
  return (
    <div className="border-b border-gray-50 last:border-b-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-5 py-2 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex-1 truncate">{titulo}</span>
        <span className="text-xs text-gray-400 shrink-0 mr-1">{count}</span>
        {open
          ? <ChevronDown  className="h-3 w-3 text-gray-300 shrink-0" />
          : <ChevronRight className="h-3 w-3 text-gray-300 shrink-0" />}
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

// ─── vista agrupada ───────────────────────────────────────────────────────────
function VistaAgrupada({
  empleados, agrupacion,
}: {
  empleados: TrabajadorRRHH[]
  agrupacion: Agrupacion

}) {
  const SINASIGNAR_CARGO  = "Sin cargo definido"
  const SINASIGNAR_DPTO   = "Sin departamento"
  const SINASIGNAR_SEDE   = "Sin sede asignada"

  // ── Por cargos ────────────────────────────────────────────────────────────
  if (agrupacion === "cargos") {
    const mapa = new Map<string, TrabajadorRRHH[]>()
    for (const e of empleados) {
      const k = e.cargo || SINASIGNAR_CARGO
      if (!mapa.has(k)) mapa.set(k, [])
      mapa.get(k)!.push(e)
    }
    const grupos = [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b))
    if (!grupos.length) return <Vacio />
    return (
      <div className="space-y-2">
        <EncabezadoColumnas />
        {grupos.map(([cargo, emps]) => (
          <Seccion key={cargo} titulo={cargo} count={emps.length} nivel={1}>
            <HojaEmpleados empleados={emps} />
          </Seccion>
        ))}
      </div>
    )
  }

  // ── Por departamentos ─────────────────────────────────────────────────────
  if (agrupacion === "departamentos") {
    const mapa = new Map<string, Map<string, TrabajadorRRHH[]>>()
    for (const e of empleados) {
      const d = e.departamento_nombre || SINASIGNAR_DPTO
      const c = e.cargo               || SINASIGNAR_CARGO
      if (!mapa.has(d))         mapa.set(d, new Map())
      if (!mapa.get(d)!.has(c)) mapa.get(d)!.set(c, [])
      mapa.get(d)!.get(c)!.push(e)
    }
    const dptos = [...mapa.entries()].sort(([a],[b]) => a.localeCompare(b))
    if (!dptos.length) return <Vacio />
    return (
      <div className="space-y-2">
        <EncabezadoColumnas />
        {dptos.map(([dpto, cargosMap]) => {
          const totalDpto = [...cargosMap.values()].reduce((s, a) => s + a.length, 0)
          const cargos = [...cargosMap.entries()].sort(([a],[b]) => a.localeCompare(b))
          return (
            <Seccion key={dpto} titulo={dpto} count={totalDpto} nivel={1}>
              {cargos.map(([cargo, emps]) => (
                <Seccion key={cargo} titulo={cargo} count={emps.length} nivel={3}>
                  <HojaEmpleados empleados={emps} />
                </Seccion>
              ))}
            </Seccion>
          )
        })}
      </div>
    )
  }

  // ── Por sedes ─────────────────────────────────────────────────────────────
  if (agrupacion === "sedes") {
    type C3 = Map<string, Map<string, Map<string, TrabajadorRRHH[]>>>
    const mapa: C3 = new Map()
    for (const e of empleados) {
      const s = e.sede_nombre         || SINASIGNAR_SEDE
      const d = e.departamento_nombre || SINASIGNAR_DPTO
      const c = e.cargo               || SINASIGNAR_CARGO
      if (!mapa.has(s))                  mapa.set(s, new Map())
      if (!mapa.get(s)!.has(d))          mapa.get(s)!.set(d, new Map())
      if (!mapa.get(s)!.get(d)!.has(c)) mapa.get(s)!.get(d)!.set(c, [])
      mapa.get(s)!.get(d)!.get(c)!.push(e)
    }
    const sedes = [...mapa.entries()].sort(([a],[b]) => a.localeCompare(b))
    if (!sedes.length) return <Vacio />
    return (
      <div className="space-y-2">
        <EncabezadoColumnas />
        {sedes.map(([sede, dptosMap]) => {
          const totalSede = [...dptosMap.values()].reduce((s, cm) => s + [...cm.values()].reduce((s2, a) => s2 + a.length, 0), 0)
          const dptos = [...dptosMap.entries()].sort(([a],[b]) => a.localeCompare(b))
          return (
            <Seccion key={sede} titulo={sede} count={totalSede} nivel={1}>
              {dptos.map(([dpto, cargosMap]) => {
                const totalDpto = [...cargosMap.values()].reduce((s, a) => s + a.length, 0)
                const cargos = [...cargosMap.entries()].sort(([a],[b]) => a.localeCompare(b))
                return (
                  <Seccion key={dpto} titulo={dpto} count={totalDpto} nivel={2}>
                    {cargos.map(([cargo, emps]) => (
                      <Seccion key={cargo} titulo={cargo} count={emps.length} nivel={3}>
                        <HojaEmpleados empleados={emps} />
                      </Seccion>
                    ))}
                  </Seccion>
                )
              })}
            </Seccion>
          )
        })}
      </div>
    )
  }

  return null
}

function Vacio() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
      <Users className="h-14 w-14 text-gray-200 mx-auto mb-3" />
      <p className="text-gray-500">No hay empleados para mostrar.</p>
    </div>
  )
}

// ─── página principal ─────────────────────────────────────────────────────────
export default function EmpleadosPage() {
  const { trabajadores, loading, error, crearTrabajador, refresh } = useRecursosHumanos()

  const [agrupacion,   setAgrupacion]   = useState<Agrupacion>("empleados")
  const [search,       setSearch]       = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroTipo,   setFiltroTipo]   = useState("todos")
  const [filtroDpto,   setFiltroDpto]   = useState("todos")
  const [filtroSede,   setFiltroSede]   = useState("todos")
  const [showCrear,    setShowCrear]    = useState(false)

  const dptos = useMemo(() =>
    [...new Set(trabajadores.map(t => t.departamento_nombre).filter(Boolean))].sort() as string[], [trabajadores])
  const sedes = useMemo(() =>
    [...new Set(trabajadores.map(t => t.sede_nombre).filter(Boolean))].sort() as string[], [trabajadores])

  const empleadosFiltrados = useMemo(() =>
    trabajadores.filter(t => {
      const activo = t.activo !== false
      if (filtroEstado === "activos"    && !activo)        return false
      if (filtroEstado === "inactivos"  &&  activo)        return false
      if (filtroTipo   === "brigadistas" && !t.is_brigadista) return false
      if (filtroTipo   === "oficina"     &&  t.is_brigadista) return false
      if (filtroDpto !== "todos" && t.departamento_nombre !== filtroDpto) return false
      if (filtroSede !== "todos" && t.sede_nombre          !== filtroSede) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          t.nombre.toLowerCase().includes(q) ||
          t.CI.toLowerCase().includes(q) ||
          (t.cargo || "").toLowerCase().includes(q) ||
          (t.departamento_nombre || "").toLowerCase().includes(q) ||
          (t.sede_nombre || "").toLowerCase().includes(q)
        )
      }
      return true
    }).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [trabajadores, search, filtroEstado, filtroTipo, filtroDpto, filtroSede])

  const hayFiltros = !!(search || filtroEstado !== "todos" || filtroTipo !== "todos" || filtroDpto !== "todos" || filtroSede !== "todos")
  const limpiar = () => { setSearch(""); setFiltroEstado("todos"); setFiltroTipo("todos"); setFiltroDpto("todos"); setFiltroSede("todos") }

  const total = trabajadores.length

  // Cuando el usuario cambia agrupación: si cambia a algo distinto de "empleados",
  const handleAgrupacion = (a: Agrupacion) => {
    setAgrupacion(a)
  }

  const opcionesAgrupacion: { id: Agrupacion; label: string; desc: string }[] = [
    { id: "empleados",    label: "Por empleados",    desc: "Todos los empleados en una sola lista"                   },
    { id: "cargos",       label: "Por cargos",        desc: "Agrupados según el puesto que ocupan"                    },
    { id: "departamentos",label: "Por departamentos", desc: "Agrupados por departamento y luego por cargo"            },
    { id: "sedes",        label: "Por sedes",         desc: "Sede → Departamento → Cargo → Empleados"                },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#E6F4EF]/30 to-white">
      <ModuleHeader
        title="Empleados"
        subtitle="Gestión del personal de Suncar"
        backHref="/"
        backLabel="Volver al Dashboard"
        actions={
          <Button onClick={() => setShowCrear(true)} className="bg-suncar-primary hover:bg-suncar-primary/90 text-white gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Agregar Empleado</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        }
      />

      <main className="content-with-fixed-header w-full px-4 sm:px-6 lg:px-10 py-6 space-y-4">

        {/* Panel de filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">

          {/* Búsqueda + Filtros — todo en una sola fila */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Buscador */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, CI, cargo, departamento o sede…"
                className="pl-10 h-11 text-sm rounded-xl border-gray-200"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Selects de filtro */}
            <FiltroSelect
              label="Estado del empleado"
              value={filtroEstado}
              onValueChange={setFiltroEstado}
              options={[
                { value: "activos",   label: "✅ Solo activos"   },
                { value: "inactivos", label: "⛔ Solo inactivos" },
              ]}
            />
            <FiltroSelect
              label="Tipo de trabajo"
              value={filtroTipo}
              onValueChange={setFiltroTipo}
              options={[
                { value: "brigadistas", label: "🪖 Brigadistas" },
                { value: "oficina",     label: "🏢 Oficina"     },
              ]}
            />
            {dptos.length > 0 && (
              <FiltroSelect
                label="Departamento"
                value={filtroDpto}
                onValueChange={setFiltroDpto}
                options={dptos.map(d => ({ value: d, label: d }))}
              />
            )}
            {sedes.length > 0 && (
              <FiltroSelect
                label="Sede"
                value={filtroSede}
                onValueChange={setFiltroSede}
                options={sedes.map(s => ({ value: s, label: s }))}
              />
            )}
          </div>

          <div className="h-px bg-gray-100" />

          {/* Agrupación */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">📂 Cómo organizar la lista</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {opcionesAgrupacion.map(op => (
                <button key={op.id} onClick={() => handleAgrupacion(op.id)}
                  className={`flex flex-col gap-1 px-4 py-3 rounded-xl border text-left transition-all ${
                    agrupacion === op.id
                      ? "bg-[#012928] border-[#012928] text-white"
                      : "bg-white border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  <span className={`text-sm font-semibold ${agrupacion === op.id ? "text-white" : "text-gray-800"}`}>{op.label}</span>
                  <span className="text-xs text-gray-400 leading-snug">{op.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fila resultado + limpiar */}
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">
              Mostrando <span className="font-semibold text-gray-800">{empleadosFiltrados.length}</span> de <span className="font-semibold text-gray-800">{total}</span> empleados
            </p>
            {hayFiltros && (
              <button onClick={limpiar}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Quitar filtros
              </button>
            )}
          </div>
        </div>

        {/* Contenido principal */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 rounded-full border-[3px] border-[#AFEB17] border-t-transparent animate-spin" />
              <p className="text-base text-gray-500">Cargando empleados…</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-3">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" onClick={refresh}>Volver a intentar</Button>
          </div>
        ) : empleadosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center space-y-3">
            <Users className="h-14 w-14 text-gray-200 mx-auto" />
            <p className="text-gray-500 text-base">No se encontraron empleados con esos filtros.</p>
            {hayFiltros && <Button variant="outline" onClick={limpiar}>Quitar todos los filtros</Button>}
          </div>
        ) : agrupacion === "empleados" ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Empleado","Cargo","Departamento","Sede","Teléfono","Estado"].map(h => (
                    <th key={h} className="text-left py-4 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{empleadosFiltrados.map(e => <EmpleadoRow key={e.CI} emp={e} />)}</tbody>
            </table>
          </div>
        ) : (
          <VistaAgrupada empleados={empleadosFiltrados} agrupacion={agrupacion} />
        )}
      </main>

      {/* Dialog nuevo empleado */}
      <Dialog open={showCrear} onOpenChange={setShowCrear}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Agregar Nuevo Empleado</DialogTitle></DialogHeader>
          <CrearTrabajadorForm
            onSubmit={async data => { await crearTrabajador(data); setShowCrear(false); refresh() }}
            onCancel={() => setShowCrear(false)}
          />
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}
