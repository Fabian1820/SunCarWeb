"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/shared/atom/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Label } from "@/components/shared/atom/label"
import { Input } from "@/components/shared/molecule/input"
import { ArrowLeft, PackageSearch, ClipboardList, Edit, Search } from "lucide-react"
import { ContabilidadTable } from "@/components/feats/contabilidad/contabilidad-table"
import { EntradaManualDialog } from "@/components/feats/contabilidad/entrada-manual-dialog"
import { CrearTicketDialog } from "@/components/feats/contabilidad/crear-ticket-dialog"
import { SeleccionarMaterialDialog } from "@/components/feats/contabilidad/seleccionar-material-dialog"
import { EditarDatosContabilidadDialog } from "@/components/feats/contabilidad/editar-datos-contabilidad-dialog"
import { useContabilidad } from "@/hooks/use-contabilidad"
import { PageLoader } from "@/components/shared/atom/page-loader"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/shared/molecule/toaster"
import { RouteGuard } from "@/components/auth/route-guard"
import { ExportButtons } from "@/components/shared/molecule/export-buttons"
import type { ExportColumn } from "@/lib/export-service"
import type { Material } from "@/lib/api-types"
import type { CrearTicketSalidaData } from "@/components/feats/contabilidad/crear-ticket-dialog"
import { ReciboService } from "@/lib/services/feats/caja/recibo-service"

export default function ExistenciasContabilidadPage() {
  return (
    <RouteGuard requiredModule="existencias-contabilidad">
      <ExistenciasContabilidadPageContent />
    </RouteGuard>
  )
}

function ExistenciasContabilidadPageContent() {
  const { materiales, allMateriales, loading, error, registrarEntrada, crearTicket, editarDatosContabilidad, loadAllMateriales, clearError } =
    useContabilidad()
  const { toast } = useToast()

  const [entradaDialogOpen, setEntradaDialogOpen] = useState(false)
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false)
  const [seleccionarMaterialDialogOpen, setSeleccionarMaterialDialogOpen] = useState(false)
  const [editarContabilidadDialogOpen, setEditarContabilidadDialogOpen] = useState(false)
  const [materialSeleccionado, setMaterialSeleccionado] = useState<Material | null>(null)
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

  const handleSelectMaterial = (material: Material) => {
    setMaterialSeleccionado(material)
    setEditarContabilidadDialogOpen(true)
  }

  const handleEditarDatosContabilidad = async (
    materialCodigo: string,
    productoId: string,
    data: {
      codigo_contabilidad: string
      cantidad_contabilidad: number
      precio_contabilidad: number
    }
  ) => {
    try {
      const success = await editarDatosContabilidad(materialCodigo, productoId, data)
      if (success) {
        toast({
          title: "Datos actualizados",
          description: "Los datos de contabilidad se actualizaron correctamente",
        })
        setMaterialSeleccionado(null)
      }
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos de contabilidad",
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
    const term = searchCodigoContabilidad.trim().toLowerCase()
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Header */}
      <header className="fixed-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al Dashboard
                </Button>
              </Link>
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 h-12 w-12">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-10 w-10 object-contain rounded-full"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Existencias Contabilidad</h1>
                <p className="text-sm text-gray-600">
                  Gestión de inventario contable y tickets de salida
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <Button 
                onClick={() => setSeleccionarMaterialDialogOpen(true)} 
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Datos Contabilidad
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
            <ContabilidadTable materiales={materialesFiltrados} loading={loading} />
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

      <SeleccionarMaterialDialog
        open={seleccionarMaterialDialogOpen}
        onOpenChange={setSeleccionarMaterialDialogOpen}
        materiales={allMateriales}
        loading={loading}
        onSelectMaterial={handleSelectMaterial}
      />

      <EditarDatosContabilidadDialog
        open={editarContabilidadDialogOpen}
        onOpenChange={setEditarContabilidadDialogOpen}
        material={materialSeleccionado}
        onSubmit={handleEditarDatosContabilidad}
        loading={loading}
      />

      <Toaster />
    </div>
  )
}
