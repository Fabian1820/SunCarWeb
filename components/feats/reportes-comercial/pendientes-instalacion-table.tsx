"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card"
import { Input } from "@/components/shared/molecule/input"
import { Label } from "@/components/shared/atom/label"
import { Badge } from "@/components/shared/atom/badge"
import { Search, Phone, MapPin, Package, User, FileText, Download } from "lucide-react"
import { Button } from "@/components/shared/atom/button"
import type { InstalacionPendiente } from "@/lib/types/feats/reportes-comercial/reportes-comercial-types"
import type ExcelJSImportType from "exceljs"

interface PendientesInstalacionTableProps {
  instalaciones: InstalacionPendiente[]
  loading: boolean
  onFiltersChange: (filters: any) => void
  onRefresh: () => void
}

export function PendientesInstalacionTable({
  instalaciones,
  loading,
  onFiltersChange,
  onRefresh,
}: PendientesInstalacionTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFilter, setTipoFilter] = useState<"todos" | "leads" | "clientes">("todos")
  const [provinciaFilter, setProvinciaFilter] = useState("todas")
  const [estadoFilter, setEstadoFilter] = useState<"todos" | "en-proceso" | "pendientes">("todos")

  // Filtrar instalaciones
  const instalacionesFiltradas = useMemo(() => {
    return instalaciones.filter(instalacion => {
      // Filtro de búsqueda
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch = 
          instalacion.nombre.toLowerCase().includes(search) ||
          instalacion.telefono.toLowerCase().includes(search) ||
          instalacion.direccion.toLowerCase().includes(search) ||
          instalacion.comentario.toLowerCase().includes(search) ||
          instalacion.fuente.toLowerCase().includes(search)
        
        if (!matchesSearch) return false
      }

      // Filtro de tipo
      if (tipoFilter !== "todos" && instalacion.tipo !== tipoFilter.slice(0, -1)) {
        return false
      }

      // Filtro de provincia
      if (provinciaFilter !== "todas" && instalacion.provincia !== provinciaFilter) {
        return false
      }

      // Filtro de estado
      if (estadoFilter === "en-proceso" && instalacion.estado !== "Instalación en Proceso") {
        return false
      }
      if (estadoFilter === "pendientes" && instalacion.estado !== "Pendiente de Instalación") {
        return false
      }

      return true
    })
  }, [instalaciones, searchTerm, tipoFilter, provinciaFilter, estadoFilter])

  // Separar en proceso y pendientes (considerar todas las variantes de estados)
  const enProceso = instalacionesFiltradas.filter(i => i.estado.toLowerCase().includes('proceso'))
  const pendientes = instalacionesFiltradas.filter(i => !i.estado.toLowerCase().includes('proceso'))

  // Obtener lista de provincias únicas
  const provincias = useMemo(() => {
    const uniqueProvincias = new Set(instalaciones.map(i => i.provincia))
    return Array.from(uniqueProvincias).sort((a, b) => {
      // La Habana primero
      if (a.toLowerCase().includes('habana')) return -1
      if (b.toLowerCase().includes('habana')) return 1
      return a.localeCompare(b)
    })
  }, [instalaciones])

  // Contar por tipo
  const countLeads = instalacionesFiltradas.filter(i => i.tipo === 'lead').length
  const countClientes = instalacionesFiltradas.filter(i => i.tipo === 'cliente').length

  // Exportar a Excel
  const handleExportExcel = async () => {
    // Ordenar datos para exportación
    const datosOrdenados = [...instalacionesFiltradas].sort((a, b) => {
      // 1. Primero por estado (En Proceso primero - considerar todas las variantes)
      const aEsProceso = a.estado.toLowerCase().includes('proceso')
      const bEsProceso = b.estado.toLowerCase().includes('proceso')
      
      if (aEsProceso && !bEsProceso) return -1
      if (!aEsProceso && bEsProceso) return 1
      
      // 2. Luego por provincia (La Habana primero)
      const aEsHabana = a.provincia.toLowerCase().includes('habana')
      const bEsHabana = b.provincia.toLowerCase().includes('habana')
      if (aEsHabana && !bEsHabana) return -1
      if (!aEsHabana && bEsHabana) return 1
      if (a.provincia !== b.provincia) return a.provincia.localeCompare(b.provincia)
      
      // 3. Finalmente por tipo (Clientes primero, luego Leads)
      if (a.tipo === 'cliente' && b.tipo === 'lead') return -1
      if (a.tipo === 'lead' && b.tipo === 'cliente') return 1
      
      return 0
    })

    // Separar en proceso y pendientes (considerar todas las variantes)
    const enProceso = datosOrdenados.filter(i => i.estado.toLowerCase().includes('proceso'))
    const pendientes = datosOrdenados.filter(i => !i.estado.toLowerCase().includes('proceso'))

    console.log('📊 Exportando:', {
      enProceso: enProceso.length,
      pendientes: pendientes.length,
      total: datosOrdenados.length
    })

    // Funci??n para formatear ofertas con saltos de l??nea
    const formatOfertaParaExcel = (oferta: string) => {
      if (!oferta) return ""
      if (oferta.toLowerCase().includes("sin oferta")) return ""

      const cleaned = oferta.replace(/\u00e2\u20ac\u00a2|\u2022/g, "|")
      const partes = cleaned
        .split("|")
        .map(parte => parte.trim())
        .filter(Boolean)

      if (partes.length === 0) return ""
      return partes.map(parte => `- ${parte}`).join("\n")
    }

    // Preparar datos para Excel
    const dataToExport: any[] = []

    // Agregar instalaciones en proceso
    if (enProceso.length > 0) {
      // Fila de encabezado de sección
      dataToExport.push({
        'Tipo': 'INSTALACIONES EN PROCESO',
        'Nombre': '',
        'Teléfono': '',
        'Dirección': '',
        'Provincia': '',
        'Estado': '',
        'Oferta': '',
        'Qué Falta': '',
        'Comentario': '',
        'Fuente': '',
        'Número': ''
      })

      // Datos de instalaciones en proceso
      enProceso.forEach(i => {
        dataToExport.push({
          'Tipo': i.tipo === 'lead' ? 'Lead' : 'Cliente',
          'Nombre': i.nombre,
          'Teléfono': i.telefono,
          'Dirección': i.direccion,
          'Provincia': i.provincia,
          'Estado': i.estado,
          'Oferta': formatOfertaParaExcel(i.oferta),
          'Qué Falta': i.falta || 'N/A',
          'Comentario': i.comentario || 'N/A',
          'Fuente': i.fuente || 'N/A',
          'Número': i.numero || 'N/A'
        })
      })
    }

    // Agregar instalaciones pendientes completas
    if (pendientes.length > 0) {
      // Fila de encabezado de sección
      dataToExport.push({
        'Tipo': 'INSTALACIONES PENDIENTES COMPLETAS',
        'Nombre': '',
        'Teléfono': '',
        'Dirección': '',
        'Provincia': '',
        'Estado': '',
        'Oferta': '',
        'Qué Falta': '',
        'Comentario': '',
        'Fuente': '',
        'Número': ''
      })

      // Datos de instalaciones pendientes
      pendientes.forEach(i => {
        dataToExport.push({
          'Tipo': i.tipo === 'lead' ? 'Lead' : 'Cliente',
          'Nombre': i.nombre,
          'Teléfono': i.telefono,
          'Dirección': i.direccion,
          'Provincia': i.provincia,
          'Estado': i.estado,
          'Oferta': formatOfertaParaExcel(i.oferta),
          'Qué Falta': 'N/A',
          'Comentario': i.comentario || 'N/A',
          'Fuente': i.fuente || 'N/A',
          'Número': i.numero || 'N/A'
        })
      })
    }
    const excelJSImport = await import("exceljs")
    const ExcelJS = (excelJSImport.default ?? excelJSImport) as typeof ExcelJSImportType

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Pendientes Instalación")

    const columns = [
      "Tipo",
      "Nombre",
      "Teléfono",
      "Dirección",
      "Provincia",
      "Oferta",
      "Qué Falta",
      "Comentario",
      "Fuente",
    ]

    const headerRow = worksheet.addRow(columns)
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1F4E78" } }
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 }
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      cell.border = {
        top: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
      }
    })

    let isEnProceso = false
    let isPendientes = false

    const fixedWidths = [7.14, 22, 16.29, 26, 9.86, 24, 24, 24, 15.86]

    dataToExport.forEach((rowData) => {
      const rowValues = columns.map((col) => rowData[col] ?? "")
      const row = worksheet.addRow(rowValues)
      const tipoValue = rowData["Tipo"]
      const isSectionRow =
        tipoValue === "INSTALACIONES EN PROCESO" ||
        tipoValue === "INSTALACIONES PENDIENTES COMPLETAS"

      if (tipoValue === "INSTALACIONES EN PROCESO") {
        isEnProceso = true
        isPendientes = false

        worksheet.mergeCells(row.number, 1, row.number, columns.length)
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F4B183" } }
          cell.font = { bold: true, color: { argb: "000000" }, size: 12 }
          cell.alignment = { horizontal: "center", vertical: "middle" }
          cell.border = {
            top: { style: "medium", color: { argb: "000000" } },
            bottom: { style: "medium", color: { argb: "000000" } },
            left: { style: "medium", color: { argb: "000000" } },
            right: { style: "medium", color: { argb: "000000" } },
          }
        })
      } else if (tipoValue === "INSTALACIONES PENDIENTES COMPLETAS") {
        isEnProceso = false
        isPendientes = true

        worksheet.mergeCells(row.number, 1, row.number, columns.length)
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F4B183" } }
          cell.font = { bold: true, color: { argb: "000000" }, size: 12 }
          cell.alignment = { horizontal: "center", vertical: "middle" }
          cell.border = {
            top: { style: "medium", color: { argb: "000000" } },
            bottom: { style: "medium", color: { argb: "000000" } },
            left: { style: "medium", color: { argb: "000000" } },
            right: { style: "medium", color: { argb: "000000" } },
          }
        })
      } else {
        const bgColor = isEnProceso ? "DEEBF7" : isPendientes ? "E2EFDA" : "FFFFFF"
        row.eachCell((cell, colNumber) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } }
          cell.alignment = {
            horizontal: colNumber === 1 ? "center" : "left",
            vertical: "top",
            wrapText: true,
          }
          cell.border = {
            top: { style: "thin", color: { argb: "D0D0D0" } },
            bottom: { style: "thin", color: { argb: "D0D0D0" } },
            left: { style: "thin", color: { argb: "D0D0D0" } },
            right: { style: "thin", color: { argb: "D0D0D0" } },
          }

          if (colNumber === 1 && (tipoValue === "Lead" || tipoValue === "Cliente")) {
            cell.font = {
              bold: true,
              color: { argb: tipoValue === "Lead" ? "0563C1" : "548235" },
            }
          }
        })
      }

      if (!isSectionRow) {
        const maxLines = rowValues.reduce((max, value, idx) => {
          const width = fixedWidths[idx] ?? 10
          const lines = String(value ?? "").split("\n")
          const lineCount = lines.reduce((lineMax, line) => {
            const estimated = Math.max(1, Math.ceil(line.length / Math.max(width, 1)))
            return Math.max(lineMax, estimated)
          }, 1)
          return Math.max(max, lineCount)
        }, 1)
        const baseHeight = 15 + (maxLines - 1) * 15
        const hasOferta = Boolean(String(rowData["Oferta"] ?? "").trim())
        const hasComentario = Boolean(String(rowData["Comentario"] ?? "").trim())
        const minHeight = hasOferta || hasComentario ? 88.5 : 15
        row.height = Math.max(baseHeight, minHeight)
      }
    })

    fixedWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `pendientes_instalacion_${new Date().toISOString().split('T')[0]}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Filtros */}
      <Card className="mb-6 border-l-4 border-l-purple-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filtros de Búsqueda</span>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nombre, teléfono, dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                className="w-full border rounded px-3 py-2"
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value as any)}
              >
                <option value="todos">Todos</option>
                <option value="leads">Leads</option>
                <option value="clientes">Clientes</option>
              </select>
            </div>
            <div>
              <Label htmlFor="provincia">Provincia</Label>
              <select
                id="provincia"
                className="w-full border rounded px-3 py-2"
                value={provinciaFilter}
                onChange={(e) => setProvinciaFilter(e.target.value)}
              >
                <option value="todas">Todas</option>
                {provincias.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                className="w-full border rounded px-3 py-2"
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value as any)}
              >
                <option value="todos">Todos</option>
                <option value="en-proceso">En Proceso</option>
                <option value="pendientes">Pendientes</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-l-4 border-l-purple-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pendientes de Instalación ({instalacionesFiltradas.length})</span>
            <div className="flex gap-2 text-sm font-normal">
              <Badge variant="outline" className="bg-blue-50">
                <User className="h-3 w-3 mr-1" />
                {countLeads} Leads
              </Badge>
              <Badge variant="outline" className="bg-green-50">
                <FileText className="h-3 w-3 mr-1" />
                {countClientes} Clientes
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {instalacionesFiltradas.length === 0 && !loading ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay instalaciones pendientes
              </h3>
              <p className="text-gray-600">
                No se encontraron instalaciones con los filtros aplicados
              </p>
            </div>
          ) : (
            <>
              {/* Vista móvil */}
              <div className="md:hidden space-y-3">
                {/* Instalaciones en proceso */}
                {enProceso.length > 0 && (
                  <>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-3">
                      <h3 className="font-semibold text-blue-900">
                        Instalaciones en Proceso ({enProceso.length})
                      </h3>
                    </div>
                    {enProceso.map((instalacion) => (
                      <Card key={instalacion.id} className="border-gray-200">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{instalacion.nombre}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                <Phone className="h-3 w-3" />
                                <span>{instalacion.telefono}</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                                <MapPin className="h-3 w-3 mt-0.5" />
                                <span>{instalacion.direccion}</span>
                              </div>
                            </div>
                            <Badge 
                              variant={instalacion.tipo === 'lead' ? 'default' : 'secondary'}
                              className={instalacion.tipo === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                            >
                              {instalacion.tipo === 'lead' ? 'Lead' : 'Cliente'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Provincia:</p>
                              <p className="text-gray-700">{instalacion.provincia}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Fuente:</p>
                              <p className="text-gray-700">{instalacion.fuente || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Oferta:</p>
                            <p className="text-sm text-gray-700">{instalacion.oferta}</p>
                          </div>
                          
                          {instalacion.falta && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Qué falta:</p>
                              <p className="text-sm text-orange-700 font-medium">{instalacion.falta}</p>
                            </div>
                          )}
                          
                          {instalacion.comentario && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Comentario:</p>
                              <p className="text-sm text-gray-700">{instalacion.comentario}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}

                {/* Separador */}
                {enProceso.length > 0 && pendientes.length > 0 && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 my-4">
                    <h3 className="font-semibold text-green-900">
                      Instalaciones Pendientes Completas ({pendientes.length})
                    </h3>
                  </div>
                )}

                {/* Instalaciones pendientes */}
                {pendientes.length > 0 && enProceso.length === 0 && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-3">
                    <h3 className="font-semibold text-green-900">
                      Instalaciones Pendientes Completas ({pendientes.length})
                    </h3>
                  </div>
                )}
                {pendientes.map((instalacion) => (
                  <Card key={instalacion.id} className="border-gray-200">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{instalacion.nombre}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Phone className="h-3 w-3" />
                            <span>{instalacion.telefono}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-gray-600 mt-1">
                            <MapPin className="h-3 w-3 mt-0.5" />
                            <span>{instalacion.direccion}</span>
                          </div>
                        </div>
                        <Badge 
                          variant={instalacion.tipo === 'lead' ? 'default' : 'secondary'}
                          className={instalacion.tipo === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                        >
                          {instalacion.tipo === 'lead' ? 'Lead' : 'Cliente'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Provincia:</p>
                          <p className="text-gray-700">{instalacion.provincia}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Fuente:</p>
                          <p className="text-gray-700">{instalacion.fuente || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Oferta:</p>
                        <p className="text-sm text-gray-700">{instalacion.oferta}</p>
                      </div>
                      
                      {instalacion.comentario && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Comentario:</p>
                          <p className="text-sm text-gray-700">{instalacion.comentario}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Vista escritorio */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Tipo</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Nombre</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Teléfono</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Dirección</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Provincia</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Oferta</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Qué Falta</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Comentario</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Instalaciones en proceso */}
                    {enProceso.length > 0 && enProceso.map((instalacion, index) => (
                      <tr key={instalacion.id} className="border-b border-gray-100 hover:bg-blue-50">
                        <td className="py-4 px-4">
                          <Badge 
                            variant={instalacion.tipo === 'lead' ? 'default' : 'secondary'}
                            className={instalacion.tipo === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                          >
                            {instalacion.tipo === 'lead' ? 'Lead' : 'Cliente'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-gray-900">{instalacion.nombre}</p>
                          {instalacion.numero && (
                            <p className="text-xs text-gray-500">#{instalacion.numero}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.telefono}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.direccion}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.provincia}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.oferta}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-orange-700 font-medium">{instalacion.falta || 'N/A'}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.comentario || 'N/A'}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.fuente || 'N/A'}</p>
                        </td>
                      </tr>
                    ))}

                    {/* Separador */}
                    {enProceso.length > 0 && pendientes.length > 0 && (
                      <tr>
                        <td colSpan={9} className="py-3 px-4 bg-green-50 border-y-2 border-green-500">
                          <p className="font-semibold text-green-900 text-center">
                            Instalaciones Pendientes Completas
                          </p>
                        </td>
                      </tr>
                    )}

                    {/* Instalaciones pendientes */}
                    {pendientes.map((instalacion) => (
                      <tr key={instalacion.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <Badge 
                            variant={instalacion.tipo === 'lead' ? 'default' : 'secondary'}
                            className={instalacion.tipo === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                          >
                            {instalacion.tipo === 'lead' ? 'Lead' : 'Cliente'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-gray-900">{instalacion.nombre}</p>
                          {instalacion.numero && (
                            <p className="text-xs text-gray-500">#{instalacion.numero}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.telefono}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.direccion}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.provincia}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.oferta}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">N/A</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.comentario || 'N/A'}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-700">{instalacion.fuente || 'N/A'}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
