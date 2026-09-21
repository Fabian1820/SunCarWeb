"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Label } from "@/components/shared/atom/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/shared/atom/select"
import { Checkbox } from "@/components/shared/molecule/checkbox"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/shared/molecule/dialog"
import { useToast } from "@/hooks/use-toast"
import { exportToExcel, generateFilename, type ExportOptions } from "@/lib/export-service"
import { exportListToPDF } from "@/lib/export-list-pdf"
import type { TrabajadorRRHH } from "@/lib/recursos-humanos-types"

type Formato = "excel" | "pdf"
type Valor = string | number

interface Campo {
  key: string
  header: string
  width: number
  grupo: string
  porDefecto: boolean
  valor: (t: TrabajadorRRHH) => Valor
}

const CAMPOS: Campo[] = [
  { key: "nombre", header: "Nombre", width: 28, grupo: "Datos personales", porDefecto: true, valor: t => t.nombre },
  { key: "ci", header: "CI", width: 14, grupo: "Datos personales", porDefecto: true, valor: t => t.CI },
  { key: "telefono", header: "Teléfono", width: 14, grupo: "Datos personales", porDefecto: true, valor: t => t.telefono || "" },
  { key: "cargo", header: "Cargo", width: 24, grupo: "Puesto", porDefecto: true, valor: t => t.cargo || "" },
  { key: "departamento", header: "Departamento", width: 20, grupo: "Puesto", porDefecto: true, valor: t => t.departamento_nombre || "" },
  { key: "sede", header: "Sede", width: 16, grupo: "Puesto", porDefecto: true, valor: t => t.sede_nombre || "" },
  { key: "estado", header: "Estado", width: 10, grupo: "Puesto", porDefecto: true, valor: t => (t.activo !== false ? "Activo" : "Inactivo") },
  { key: "tipo", header: "Tipo", width: 12, grupo: "Puesto", porDefecto: false, valor: t => (t.is_brigadista ? "Brigadista" : "Oficina") },
  { key: "acceso", header: "Acceso al sistema", width: 12, grupo: "Puesto", porDefecto: false, valor: t => (t.tiene_contraseña ? "Sí" : "No") },
  { key: "mipyme", header: "MIPYME", width: 10, grupo: "Puesto", porDefecto: false, valor: t => (t.pertenece_mipyme ? "Sí" : "No") },
  { key: "tcp", header: "TCP", width: 10, grupo: "Puesto", porDefecto: false, valor: t => (t.pertenece_tcp ? "Sí" : "No") },
  { key: "salario_fijo", header: "Salario fijo", width: 14, grupo: "Salario", porDefecto: false, valor: t => t.salario_fijo ?? 0 },
  { key: "estimulo_fijo", header: "% estímulo fijo", width: 14, grupo: "Salario", porDefecto: false, valor: t => t.porcentaje_fijo_estimulo ?? 0 },
  { key: "estimulo_variable", header: "% estímulo variable", width: 16, grupo: "Salario", porDefecto: false, valor: t => t.porcentaje_variable_estimulo ?? 0 },
  { key: "alimentacion", header: "Alimentación", width: 14, grupo: "Salario", porDefecto: false, valor: t => t.alimentacion ?? 0 },
  { key: "dias_trabajables", header: "Días trabajables", width: 12, grupo: "Salario", porDefecto: false, valor: t => t.dias_trabajables ?? 0 },
]

const GRUPOS = ["Datos personales", "Puesto", "Salario"]

export interface FiltrosExportacion {
  estado: string
  tipo: string
  departamento: string
  sede: string
}

function FiltroSelect({ label, value, onChange, todos, opciones }: {
  label: string; value: string; onChange: (v: string) => void; todos: string; opciones: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">{todos}</SelectItem>
          {opciones.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

export function ExportarEmpleadosDialog({ open, onOpenChange, trabajadores, filtrosIniciales }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trabajadores: TrabajadorRRHH[]
  filtrosIniciales: FiltrosExportacion
}) {
  const { toast } = useToast()
  const [formato, setFormato] = useState<Formato>("excel")
  const [filtros, setFiltros] = useState<FiltrosExportacion & { cargo: string }>({ ...filtrosIniciales, cargo: "todos" })
  const [campos, setCampos] = useState<Set<string>>(() => new Set(CAMPOS.filter(c => c.porDefecto).map(c => c.key)))
  const [exportando, setExportando] = useState(false)

  // Al abrir, parte de lo que se está viendo en la lista.
  useEffect(() => {
    if (open) setFiltros({ ...filtrosIniciales, cargo: "todos" })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const distintos = (fn: (t: TrabajadorRRHH) => string | null | undefined) =>
    [...new Set(trabajadores.map(fn).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)).map(v => ({ value: v, label: v }))
  const dptos = useMemo(() => distintos(t => t.departamento_nombre), [trabajadores])
  const sedes = useMemo(() => distintos(t => t.sede_nombre), [trabajadores])
  const cargos = useMemo(() => distintos(t => t.cargo), [trabajadores])

  const seleccion = useMemo(() =>
    trabajadores
      .filter(t => {
        const activo = t.activo !== false
        if (filtros.estado === "activos" && !activo) return false
        if (filtros.estado === "inactivos" && activo) return false
        if (filtros.tipo === "brigadistas" && !t.is_brigadista) return false
        if (filtros.tipo === "oficina" && t.is_brigadista) return false
        if (filtros.departamento !== "todos" && t.departamento_nombre !== filtros.departamento) return false
        if (filtros.sede !== "todos" && t.sede_nombre !== filtros.sede) return false
        if (filtros.cargo !== "todos" && t.cargo !== filtros.cargo) return false
        return true
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [trabajadores, filtros])

  const set = (k: keyof typeof filtros) => (v: string) => setFiltros(f => ({ ...f, [k]: v }))
  const alternar = (key: string) =>
    setCampos(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const alternarGrupo = (grupo: string) => {
    const del = CAMPOS.filter(c => c.grupo === grupo).map(c => c.key)
    const todos = del.every(k => campos.has(k))
    setCampos(prev => { const n = new Set(prev); del.forEach(k => (todos ? n.delete(k) : n.add(k))); return n })
  }

  const exportar = async () => {
    const elegidos = CAMPOS.filter(c => campos.has(c.key))
    setExportando(true)
    try {
      const partes = [`Fecha: ${new Date().toLocaleDateString("es-ES")}`, `Empleados: ${seleccion.length}`]
      if (filtros.sede !== "todos") partes.push(`Sede: ${filtros.sede}`)
      if (filtros.departamento !== "todos") partes.push(`Departamento: ${filtros.departamento}`)
      if (filtros.cargo !== "todos") partes.push(`Cargo: ${filtros.cargo}`)
      if (filtros.estado !== "todos") partes.push(`Estado: ${filtros.estado}`)
      if (filtros.tipo !== "todos") partes.push(`Tipo: ${filtros.tipo}`)
      const opciones: ExportOptions = {
        title: "Suncar SRL - Empleados",
        subtitle: partes.join(" · "),
        filename: generateFilename("empleados"),
        logoUrl: "/logo.png",
        columns: elegidos.map(c => ({ header: c.header, key: c.key, width: c.width })),
        data: seleccion.map(t => Object.fromEntries(elegidos.map(c => [c.key, c.valor(t)]))),
      }
      if (formato === "excel") await exportToExcel(opciones)
      else await exportListToPDF(opciones)
      onOpenChange(false)
    } catch (e) {
      toast({ title: "No se pudo exportar", description: e instanceof Error ? e.message : undefined, variant: "destructive" })
    } finally {
      setExportando(false)
    }
  }

  const puede = seleccion.length > 0 && campos.size > 0 && !exportando

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar empleados</DialogTitle>
          <DialogDescription>Elige el formato, a quiénes exportar y qué datos incluir.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">1. Formato</p>
            <div className="grid grid-cols-2 gap-3">
              {([["excel", "Excel", FileSpreadsheet], ["pdf", "PDF", FileText]] as const).map(([id, label, Icono]) => (
                <button key={id} type="button" onClick={() => setFormato(id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors ${
                    formato === id ? "border-[#012928] bg-[#E6F4EF] text-[#012928]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <Icono className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">2. A quiénes</p>
            <div className="grid grid-cols-2 gap-3">
              <FiltroSelect label="Sede" value={filtros.sede} onChange={set("sede")} todos="Todas las sedes" opciones={sedes} />
              <FiltroSelect label="Departamento" value={filtros.departamento} onChange={set("departamento")} todos="Todos los departamentos" opciones={dptos} />
              <FiltroSelect label="Cargo" value={filtros.cargo} onChange={set("cargo")} todos="Todos los cargos" opciones={cargos} />
              <FiltroSelect label="Estado" value={filtros.estado} onChange={set("estado")} todos="Activos e inactivos"
                opciones={[{ value: "activos", label: "Solo activos" }, { value: "inactivos", label: "Solo inactivos" }]} />
              <FiltroSelect label="Tipo de trabajo" value={filtros.tipo} onChange={set("tipo")} todos="Brigadistas y oficina"
                opciones={[{ value: "brigadistas", label: "Solo brigadistas" }, { value: "oficina", label: "Solo oficina" }]} />
            </div>
            <p className="text-xs text-gray-500">
              <strong className="text-gray-800">{seleccion.length}</strong> empleado{seleccion.length !== 1 ? "s" : ""} se exportarán.
            </p>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">3. Qué datos</p>
            {GRUPOS.map(grupo => {
              const delGrupo = CAMPOS.filter(c => c.grupo === grupo)
              const todos = delGrupo.every(c => campos.has(c.key))
              return (
                <div key={grupo} className="rounded-xl border border-gray-100 p-3">
                  <button type="button" onClick={() => alternarGrupo(grupo)}
                    className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-[#012928]">
                    {grupo} · {todos ? "quitar todos" : "marcar todos"}
                  </button>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {delGrupo.map(c => (
                      <label key={c.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <Checkbox checked={campos.has(c.key)} onCheckedChange={() => alternar(c.key)} />
                        {c.header}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
            {formato === "pdf" && campos.size > 8 && (
              <p className="text-xs text-amber-600">Con tantas columnas el PDF queda apretado; para muchos datos conviene Excel.</p>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exportando}>Cancelar</Button>
          <Button onClick={exportar} disabled={!puede} className="bg-suncar-primary hover:bg-suncar-primary/90 text-white gap-2">
            {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar {formato === "excel" ? "Excel" : "PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
