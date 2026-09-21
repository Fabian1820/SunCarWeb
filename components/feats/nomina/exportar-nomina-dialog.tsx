"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog"
import { useToast } from "@/hooks/use-toast"
import { exportToExcel, generateFilename, type ExportOptions } from "@/lib/export-service"
import { exportListToPDF } from "@/lib/export-list-pdf"
import type { DepartamentoNomina, HojaNomina, LineaNomina } from "@/lib/types/feats/nomina/nomina-types"
import { FILTROS_VACIOS, SIN_SEDE, contarTrabajadores, filtrarDepartamentos, type FiltrosNomina } from "./filtro"

type Formato = "excel" | "pdf"
type Contenido = "oficial" | "complementario" | "ambas"
type Alcance = "vista" | "todos"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  hoja: HojaNomina
  /** Filtros que hay puestos en pantalla. */
  filtros: FiltrosNomina
  /** Vista que se está mirando: es lo que se propone exportar. */
  vistaInicial: "oficial" | "complementario"
  mesLabel: string
}

const dos = (n: number) => Math.round(n * 100) / 100
const suma = (filas: LineaNomina[], f: (t: LineaNomina) => number) => dos(filas.reduce((s, t) => s + f(t), 0))

const OPCIONES_CONTENIDO: Array<[Contenido, string, string]> = [
  ["oficial", "Salario Oficial", "Salario básico, tarifa, horas y lo que toca cobrar"],
  ["complementario", "Salario Complementario", "% de cada uno y lo que le toca del total"],
  ["ambas", "Las dos", "Una sola tabla con lo oficial y lo complementario"],
]

/** Exporta la nómina del mes a Excel o PDF, con lo que se está viendo o con todos. */
export function ExportarNominaDialog({ open, onOpenChange, hoja, filtros, vistaInicial, mesLabel }: Props) {
  const { toast } = useToast()
  const [formato, setFormato] = useState<Formato>("excel")
  const [contenido, setContenido] = useState<Contenido>(vistaInicial)
  const [alcance, setAlcance] = useState<Alcance>("vista")
  const [soloParticipan, setSoloParticipan] = useState(true)
  const [exportando, setExportando] = useState(false)

  // Al abrir, propone la vista que se está mirando.
  useEffect(() => {
    if (open) setContenido(vistaInicial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const filtrosActivos = useMemo(
    () => ({ ...filtros, soloSeleccionados: false }),
    [filtros],
  )
  const hayFiltros = JSON.stringify(filtrosActivos) !== JSON.stringify(FILTROS_VACIOS)

  const departamentos: DepartamentoNomina[] = useMemo(
    () => (alcance === "vista" ? filtrarDepartamentos(hoja.departamentos, filtrosActivos) : hoja.departamentos),
    [alcance, hoja.departamentos, filtrosActivos],
  )

  const filas = useMemo(() => {
    const todas = departamentos.flatMap((d) => d.cargos.flatMap((c) => c.trabajadores))
    return contenido === "complementario" && soloParticipan
      ? todas.filter((t) => t.participa && t.porcentaje > 0)
      : todas
  }, [departamentos, contenido, soloParticipan])

  const exportar = async () => {
    setExportando(true)
    try {
      const base = (t: LineaNomina) => ({
        departamento: t.departamento_nombre,
        cargo: t.cargo,
        nombre: t.nombre,
        ci: t.trabajador_ci,
      })
      const columnasBase = [
        { header: "Departamento", key: "departamento", width: 24 },
        { header: "Cargo", key: "cargo", width: 26 },
        { header: "Nombre", key: "nombre", width: 28 },
        { header: "CI", key: "ci", width: 14 },
      ]
      const oficial = (t: LineaNomina) => ({
        salario_basico: t.salario_basico,
        tarifa_hora: dos(t.tarifa_hora),
        horas: t.horas,
        a_cobrar: t.a_cobrar_cup,
      })
      const compl = (t: LineaNomina) => ({
        porcentaje: t.participa ? t.porcentaje : 0,
        porcentaje_real: t.participa ? t.porcentaje_efectivo : 0,
        complementario: t.complementario_usd,
      })
      const colsOficial = [
        { header: "Salario básico CUP", key: "salario_basico", width: 18 },
        { header: "Tarifa/h CUP", key: "tarifa_hora", width: 14 },
        { header: "Horas", key: "horas", width: 10 },
        { header: "A cobrar CUP", key: "a_cobrar", width: 16 },
      ]
      const colsCompl = [
        { header: "% fijo", key: "porcentaje", width: 10 },
        { header: "% real", key: "porcentaje_real", width: 10 },
        { header: "Le toca USD", key: "complementario", width: 14 },
      ]

      const conOficial = contenido !== "complementario"
      const conCompl = contenido !== "oficial"
      const columns = [...columnasBase, ...(conOficial ? colsOficial : []), ...(conCompl ? colsCompl : [])]
      const data: ExportOptions["data"] = filas.map((t) => ({
        ...base(t),
        ...(conOficial ? oficial(t) : {}),
        ...(conCompl ? compl(t) : {}),
      }))
      data.push({
        nombre: "TOTAL",
        ...(conOficial ? { horas: suma(filas, (t) => t.horas), a_cobrar: suma(filas, (t) => t.a_cobrar_cup) } : {}),
        ...(conCompl ? { complementario: suma(filas, (t) => t.complementario_usd) } : {}),
      })

      const nombreContenido =
        contenido === "oficial" ? "Salario oficial" : contenido === "complementario" ? "Salario complementario" : "Salario oficial y complementario"
      const partes = [mesLabel, nombreContenido, `Trabajadores: ${filas.length}`]
      if (conCompl) partes.push(`Total a distribuir: USD ${hoja.totales.total_complementario_usd.toLocaleString("es", { minimumFractionDigits: 2 })}`)
      if (alcance === "vista") {
        const sede = filtros.sedeId === SIN_SEDE ? "Sin sede" : (hoja.sedes ?? []).find((s) => s.id === filtros.sedeId)?.nombre
        if (sede) partes.push(`Sede: ${sede}`)
        const dep = hoja.departamentos.find((d) => d.departamento_id === filtros.departamentoId)?.nombre
        if (dep) partes.push(`Departamento: ${dep}`)
        if (filtros.cargo) partes.push(`Cargo: ${filtros.cargo}`)
        if (filtros.texto.trim()) partes.push(`Búsqueda: ${filtros.texto.trim()}`)
      }

      const opciones: ExportOptions = {
        title: `Suncar SRL - Nómina ${mesLabel}`,
        subtitle: partes.join(" · "),
        filename: generateFilename(`nomina_${hoja.anio}_${String(hoja.mes).padStart(2, "0")}_${contenido}`),
        logoUrl: "/logo.png",
        columns,
        data,
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

  const totalTodos = contarTrabajadores(hoja.departamentos)
  const puede = filas.length > 0 && !exportando

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar nómina de {mesLabel}</DialogTitle>
          <DialogDescription>Elige el formato, qué salario y a quiénes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">1. Formato</p>
            <div className="grid grid-cols-2 gap-3">
              {([["excel", "Excel", FileSpreadsheet], ["pdf", "PDF", FileText]] as const).map(([id, label, Icono]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormato(id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors ${
                    formato === id ? "border-[#012928] bg-[#E6F4EF] text-[#012928]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icono className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">2. Qué salario</p>
            <div className="space-y-2">
              {OPCIONES_CONTENIDO.map(([id, titulo, ayuda]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setContenido(id)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-left transition-colors ${
                    contenido === id ? "border-[#012928] bg-[#E6F4EF]" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="block text-sm font-medium text-gray-900">{titulo}</span>
                  <span className="block text-xs text-gray-500">{ayuda}</span>
                </button>
              ))}
            </div>
            {contenido === "complementario" && (
              <label className="flex items-center gap-2 pt-1 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={soloParticipan}
                  onChange={(e) => setSoloParticipan(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Solo los que entran en el reparto
              </label>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">3. A quiénes</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["vista", hayFiltros ? "Lo que estoy viendo" : "Todos", hayFiltros ? "Con los filtros puestos" : "Sin filtros"],
                ["todos", "Todos los trabajadores", `${totalTodos} en el mes`],
              ] as const).map(([id, titulo, ayuda]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAlcance(id)}
                  className={`rounded-xl border px-4 py-2.5 text-left transition-colors ${
                    alcance === id ? "border-[#012928] bg-[#E6F4EF]" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="block text-sm font-medium text-gray-900">{titulo}</span>
                  <span className="block text-xs text-gray-500">{ayuda}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              <strong className="text-gray-800">{filas.length}</strong> trabajador{filas.length !== 1 ? "es" : ""} se exportarán.
            </p>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exportando}>
            Cancelar
          </Button>
          <Button onClick={exportar} disabled={!puede} className="gap-2 bg-suncar-primary text-white hover:bg-suncar-primary/90">
            {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar {formato === "excel" ? "Excel" : "PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
