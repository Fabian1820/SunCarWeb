"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import { Input } from "@/components/shared/molecule/input"
import { ValesSalidaTable } from "@/components/feats/vales-salida/vales-salida-table"
import { ValeSalidaDetailDialog } from "@/components/feats/vales-salida/vale-salida-detail-dialog"
import { DevolucionValeDialog } from "@/components/feats/vales-salida/devolucion-vale-dialog"
import { AnularValeDialog } from "@/components/feats/vales-salida/anular-vale-dialog"
import { ValeAdjuntosDialog } from "@/components/feats/vales-salida/vale-adjuntos-dialog"
import { ValeSalidaService } from "@/lib/api-services"
import { ExportValeSalidaService } from "@/lib/services/feats/vales-salida/export-vale-salida-service"
import { useValesSalida } from "@/hooks/use-vales-salida"
import { useToast } from "@/hooks/use-toast"
import type { ValeSalida, ValeSalidaSummary } from "@/lib/api-types"

interface SalidasAveriasPanelProps {
  almacenId: string
  /** Cambia cuando se registra una salida nueva, para recargar la lista. */
  refreshKey: number
  /** Se llama al anular o devolver, para refrescar el stock. */
  onChanged: () => void
}

/**
 * Salidas del almacén Reservas Averías con la misma tabla y las mismas
 * acciones que Vales de Salida (ver, adjuntos, exportar, anular, devolución).
 * Se monta solo con el id del almacén: sin él, el hook traería los vales de
 * todos los almacenes.
 */
export function SalidasAveriasPanel({ almacenId, refreshKey, onChanged }: SalidasAveriasPanelProps) {
  const { toast } = useToast()
  const {
    vales,
    filteredVales,
    loading,
    isSearching,
    searchTerm,
    setSearchTerm,
    loadVales,
    loadMore,
    hasMore,
    anularVale,
    total,
  } = useValesSalida(almacenId)

  const [selectedVale, setSelectedVale] = useState<ValeSalida | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [devolucionOpen, setDevolucionOpen] = useState(false)
  const [valeToAnular, setValeToAnular] = useState<ValeSalida | null>(null)
  const [anularLoading, setAnularLoading] = useState(false)
  const [valeAdjuntos, setValeAdjuntos] = useState<ValeSalidaSummary | null>(null)
  const [adjuntosCount, setAdjuntosCount] = useState<Record<string, number>>({})

  useEffect(() => {
    if (refreshKey > 0) void loadVales(almacenId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const valesConAdjuntos = useMemo(
    () =>
      filteredVales.map((vale) =>
        vale.id in adjuntosCount ? { ...vale, adjuntos_count: adjuntosCount[vale.id] } : vale,
      ),
    [filteredVales, adjuntosCount],
  )

  const cargarVale = async (vale: ValeSalidaSummary): Promise<ValeSalida | null> => {
    try {
      const completo = await ValeSalidaService.getValeById(vale.id)
      if (!completo) throw new Error("No se pudo cargar el vale")
      return completo
    } catch (error) {
      toast({
        title: "No se pudo cargar el vale",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
      return null
    }
  }

  const exportar = async (vale: ValeSalidaSummary, modo: "pdf" | "excel" | "imprimir") => {
    const completo = await cargarVale(vale)
    if (!completo) return
    try {
      if (modo === "pdf") await ExportValeSalidaService.exportarPDF(completo)
      else if (modo === "excel") await ExportValeSalidaService.exportarExcel(completo)
      else await ExportValeSalidaService.imprimirPDF(completo)
    } catch {
      toast({ title: "No se pudo generar el archivo del vale", variant: "destructive" })
    }
  }

  const confirmarAnular = async (motivo: string) => {
    if (!valeToAnular) return
    setAnularLoading(true)
    try {
      const ok = await anularVale(valeToAnular.id, motivo)
      if (!ok) throw new Error("No se pudo anular el vale")
      toast({
        title: "Vale anulado",
        description: "El material volvió al almacén y se quitó del servicio de la avería.",
      })
      setValeToAnular(null)
      onChanged()
    } catch (error) {
      toast({
        title: "No se pudo anular el vale",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setAnularLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por vale, solicitud, cliente o material..."
            className="pl-9"
          />
        </div>
        {isSearching && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
        <span className="ml-auto text-sm text-gray-600">
          {total} vale{total === 1 ? "" : "s"}
        </span>
      </div>

      <ValesSalidaTable
        vales={valesConAdjuntos}
        onView={async (vale) => {
          const completo = await cargarVale(vale)
          if (completo) {
            setSelectedVale(completo)
            setDetailOpen(true)
          }
        }}
        onAnular={async (vale) => {
          const completo = await cargarVale(vale)
          if (completo) setValeToAnular(completo)
        }}
        onExportPdf={(vale) => void exportar(vale, "pdf")}
        onExportExcel={(vale) => void exportar(vale, "excel")}
        onPrintPdf={(vale) => void exportar(vale, "imprimir")}
        onAdjuntos={(vale) => setValeAdjuntos(vale)}
        loading={loading}
        isSearching={isSearching}
        searchTerm={searchTerm}
      />

      {hasMore && vales.length > 0 && (
        <div className="border-t pt-4 text-center">
          <Button
            onClick={() => void loadMore()}
            disabled={loading}
            variant="outline"
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Cargar más ({vales.length} de {total})
          </Button>
        </div>
      )}

      <ValeSalidaDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        vale={selectedVale}
        onRegistrarDevolucion={(vale) => {
          setSelectedVale(vale)
          setDetailOpen(false)
          setDevolucionOpen(true)
        }}
      />

      <DevolucionValeDialog
        open={devolucionOpen}
        onOpenChange={setDevolucionOpen}
        vale={selectedVale}
        onSuccess={() => {
          void loadVales(almacenId)
          onChanged()
        }}
      />

      <AnularValeDialog
        open={valeToAnular !== null}
        onOpenChange={(open) => {
          if (!open) setValeToAnular(null)
        }}
        vale={valeToAnular}
        onConfirm={confirmarAnular}
        isLoading={anularLoading}
      />

      <ValeAdjuntosDialog
        open={valeAdjuntos !== null}
        onOpenChange={(open) => {
          if (!open) setValeAdjuntos(null)
        }}
        valeId={valeAdjuntos?.id ?? null}
        valeCodigo={valeAdjuntos?.codigo}
        onAdjuntosChange={(valeId, n) => setAdjuntosCount((prev) => ({ ...prev, [valeId]: n }))}
      />
    </div>
  )
}
