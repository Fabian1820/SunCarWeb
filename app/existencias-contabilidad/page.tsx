"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { PackageSearch, ClipboardList, Plus, Search, SlidersHorizontal } from "lucide-react"
import { ContabilidadTable } from "@/components/feats/contabilidad/contabilidad-table"
import { EntradaManualDialog } from "@/components/feats/contabilidad/entrada-manual-dialog"
import { CrearTicketDialog } from "@/components/feats/contabilidad/crear-ticket-dialog"
import { AjustarCantidadDialog } from "@/components/feats/contabilidad/ajustar-cantidad-dialog"
import {
  MaterialContabilidadDialog,
  type DatosMaterialContabilidad,
} from "@/components/feats/contabilidad/material-contabilidad-dialog"
import { useContabilidad } from "@/hooks/use-contabilidad"
import { ModuleHeader } from "@/components/shared/organism/module-header"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RouteGuard } from "@/components/auth/route-guard"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import type { ExportColumn } from "@/lib/export-service"
import type { Material } from "@/lib/api-types"
import type { MaterialContabilidad } from "@/lib/types/feats/contabilidad/contabilidad-types"
import type { CrearTicketSalidaData } from "@/components/feats/contabilidad/crear-ticket-dialog"
import { ReciboService } from "@/lib/services/feats/caja/recibo-service"
import { normalizeSearchText } from '@/lib/utils/string-utils'

export default function ExistenciasContabilidadPage() {
  return (
    <RouteGuard requiredModule="existencias-contabilidad">
      <ExistenciasContabilidadPageContent />
    </RouteGuard>
  )
}

function ExistenciasContabilidadPageContent() {
  const { materiales, allMateriales, loading, error, registrarEntrada, crearTicket, crearMaterial, editarMaterial, ajustarCantidad, eliminarMaterial, loadAllMateriales, clearError } =
    useContabilidad()
  const { toast } = useToast()

  const [entradaDialogOpen, setEntradaDialogOpen] = useState(false)
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false)
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [ajusteDialogOpen, setAjusteDialogOpen] = useState(false)
  const [materialParaAjustar, setMaterialParaAjustar] = useState<MaterialContabilidad | null>(null)
  const [materialEnEdicion, setMaterialEnEdicion] = useState<MaterialContabilidad | null>(null)
  const [searchCodigoContabilidad, setSearchCodigoContabilidad] = useState("")

  // Cargar todos los materiales al montar el componente
  useEffect(() => {
    loadAllMateriales()
  }, [loadAllMateriales])

  const handleEntrada = async (materialId: string, cantidad: number) => {
    try {
      const success = await registrarEntrada(materialId, cantidad)
      if (success) {
        toast({
          title: "Entrada registrada",
          description: `Se agregaron ${cantidad.toFixed(2)} unidades al stock`,
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo registrar la entrada",
        variant: "destructive",
      })
    }
  }

  const handleCrearTicket = async (data: CrearTicketSalidaData) => {
    try {
      const success = await crearTicket(data.materiales)
      if (success) {
        const total = data.items.reduce((acc, item) => acc + item.subtotal, 0)
        ReciboService.descargarReciboSalidaContabilidad({
          nombreAlmacen: "Almacén Chull",
          fecha: new Date(),
          items: data.items,
          total,
        })

        toast({
          title: "Ticket creado",
          description: "El ticket de salida se creó y el PDF se descargó automáticamente",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudo crear el ticket",
        variant: "destructive",
      })
    }
  }

  const abrirAlta = () => {
    setMaterialEnEdicion(null)
    setMaterialDialogOpen(true)
  }

  const abrirEdicion = (material: MaterialContabilidad) => {
    setMaterialEnEdicion(material)
    setMaterialDialogOpen(true)
  }

  const abrirAjuste = (material: MaterialContabilidad) => {
    setMaterialParaAjustar(material)
    setAjusteDialogOpen(true)
  }

  const handleEliminar = async (material: MaterialContabilidad) => {
    const confirmado = window.confirm(
      `¿Dar de baja "${material.nombre || material.descripcion}" de Existencias Contabilidad?\n\n` +
        `El material sigue en el catálogo del sistema, y los tickets y facturas que lo ` +
        `referencian conservan su propio detalle.`,
    )
    if (!confirmado) return

    if (await eliminarMaterial(material.id)) {
      toast({
        title: "Material dado de baja",
        description: `${material.nombre || material.descripcion} ya no está en Existencias Contabilidad.`,
      })
    } else {
      toast({
        title: "No se pudo dar de baja",
        description: error || "Intente de nuevo.",
        variant: "destructive",
      })
    }
  }

  const handleAjustar = async (materialId: string, cantidadNueva: number, motivo: string) => {
    const material = materiales.find((m) => m.id === materialId)
    const ok = await ajustarCantidad(materialId, cantidadNueva, motivo)
    if (ok) {
      toast({
        title: "Cantidad ajustada",
        description: `${material?.nombre || "El material"} queda en ${cantidadNueva}. El ajuste quedó registrado con su motivo.`,
      })
      setAjusteDialogOpen(false)
      setMaterialParaAjustar(null)
    } else {
      toast({
        title: "No se pudo ajustar",
        description: error || "Revise la cantidad: este ajuste es solo a la baja.",
        variant: "destructive",
      })
    }
  }

  const handleGuardarMaterial = async (datos: DatosMaterialContabilidad) => {
    const esEdicion = materialEnEdicion !== null
    // Al editar no se manda la cantidad: la existencia solo se mueve por entrada,
    // ajuste o ticket, que dejan constancia del movimiento.
    const { cantidad, ...sinCantidad } = datos
    const ok = esEdicion
      ? await editarMaterial(materialEnEdicion.id, sinCantidad)
      : await crearMaterial(datos)

    if (ok) {
      toast({
        title: esEdicion ? "Material actualizado" : "Material agregado",
        description: esEdicion
          ? "Los datos del material se guardaron correctamente"
          : `${datos.nombre} ya está en Existencias Contabilidad`,
      })
      setMaterialDialogOpen(false)
      setMaterialEnEdicion(null)
    } else {
      toast({
        title: "No se pudo guardar",
        description: error || "Revise el código de contabilidad: no puede repetirse.",
        variant: "destructive",
      })
    }
  }

  // Configuración de exportación
  const exportColumns: ExportColumn[] = [
    { header: "Código", key: "codigoContabilidad", width: 20 },
    { header: "Descripción", key: "descripcion", width: 50 },
    { header: "U/M", key: "um", width: 10 },
    { header: "Cantidad", key: "cantidadContabilidad", width: 15 },
    { header: "Precio", key: "precioContabilidad", width: 15 },
  ]

  const materialesFiltrados = useMemo(() => {
    const term = normalizeSearchText(searchCodigoContabilidad.trim())
    const base = !term
      ? materiales
      : materiales.filter((material) =>
          String(material.codigoContabilidad || "")
            .toLowerCase()
            .includes(term),
        )

    return [...base].sort((a, b) =>
      String(a.codigoContabilidad || "").localeCompare(
        String(b.codigoContabilidad || ""),
        "es",
        { numeric: true, sensitivity: "base" },
      ),
    )
  }, [materiales, searchCodigoContabilidad])

  if (loading && materiales.length === 0) {
    return <PageLoader moduleName="Existencias Contabilidad" text="Cargando..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Existencias Contabilidad"
        subtitle="Gestión de inventario contable y tickets de salida"
        badge={{ text: "Economía", className: "bg-amber-100 text-amber-800" }}
      />

      {/* Main Content */}
      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Error Banner */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-red-800">{error}</p>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Card className="mb-6 border-l-4 border-l-blue-600">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Acciones Rápidas</CardTitle>
              <div className="flex gap-2">
                <ExportButtons
                  exportOptions={{
                    title: "Existencias en almacén",
                    subtitle: "Inventario Contable",
                    columns: exportColumns,
                    data: materialesFiltrados,
                  }}
                  baseFilename="existencias-contabilidad"
                  variant="compact"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button onClick={() => setEntradaDialogOpen(true)} variant="default">
                <PackageSearch className="h-4 w-4 mr-2" />
                Dar Entrada Manual
              </Button>
              <Button onClick={() => setTicketDialogOpen(true)} variant="outline">
                <ClipboardList className="h-4 w-4 mr-2" />
                Crear Ticket de Salida
              </Button>
              <Button onClick={() => setAjusteDialogOpen(true)} variant="outline">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Ajustar Cantidad
              </Button>
              <Button
                onClick={abrirAlta}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Material
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Existencias */}
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle>Inventario Contable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 max-w-md">
              <Label htmlFor="search-codigo-contabilidad">Buscar por código contabilidad</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search-codigo-contabilidad"
                  placeholder="Ej: 2301-INV-001"
                  value={searchCodigoContabilidad}
                  onChange={(e) => setSearchCodigoContabilidad(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <ContabilidadTable
              materiales={materialesFiltrados}
              loading={loading}
              onEditar={abrirEdicion}
              onAjustar={abrirAjuste}
              onEliminar={handleEliminar}
            />
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <EntradaManualDialog
        open={entradaDialogOpen}
        onOpenChange={setEntradaDialogOpen}
        materiales={materiales}
        onSubmit={handleEntrada}
        loading={loading}
      />

      <CrearTicketDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        materiales={materiales}
        onSubmit={handleCrearTicket}
        loading={loading}
      />

      <AjustarCantidadDialog
        open={ajusteDialogOpen}
        onOpenChange={(abierto) => {
          setAjusteDialogOpen(abierto)
          if (!abierto) setMaterialParaAjustar(null)
        }}
        materiales={materiales}
        materialPreseleccionado={materialParaAjustar}
        onSubmit={handleAjustar}
        loading={loading}
      />

      <MaterialContabilidadDialog
        open={materialDialogOpen}
        onOpenChange={(abierto) => {
          setMaterialDialogOpen(abierto)
          if (!abierto) setMaterialEnEdicion(null)
        }}
        material={materialEnEdicion}
        materialesCatalogo={allMateriales}
        onSubmit={handleGuardarMaterial}
        loading={loading}
      />

      <Toaster />
    </div>
  )
}
