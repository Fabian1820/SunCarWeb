"use client"

import { useState } from "react"
import { Button } from "@/components/shared/atom/button"
import { FileSpreadsheet, FileText, Download } from "lucide-react"
import { exportToExcel, exportToPDF, generateFilename, type ExportOptions } from "@/lib/export-service"
import { useToast } from "@/hooks/use-toast"

interface ExportButtonsProps {
  exportOptions: Omit<ExportOptions, 'filename'>
  baseFilename: string
  variant?: 'default' | 'compact'
}

/**
 * Componente reutilizable para botones de exportación
 * Proporciona botones para exportar a Excel y PDF
 */
export function ExportButtons({ exportOptions, baseFilename, variant = 'default' }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null)
  const { toast } = useToast()

  const handleExportExcel = async () => {
    try {
      setExporting('excel')
      const filename = generateFilename(baseFilename)
      
      await exportToExcel({
        ...exportOptions,
        filename
      })

      toast({
        title: "Exportación exitosa",
        description: `Archivo Excel generado: ${filename}.xlsx`,
      })
    } catch (error) {
      console.error('Error exportando a Excel:', error)
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo Excel",
        variant: "destructive"
      })
    } finally {
      setExporting(null)
    }
  }

  const handleExportPDF = async () => {
    try {
      setExporting('pdf')
      const filename = generateFilename(baseFilename)
      
      await exportToPDF({
        ...exportOptions,
        filename,
        logoUrl: '/logo.png'
      })

      toast({
        title: "Exportación exitosa",
        description: `Archivo PDF generado: ${filename}.pdf`,
      })
    } catch (error) {
      console.error('Error exportando a PDF:', error)
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el archivo PDF",
        variant: "destructive"
      })
    } finally {
      setExporting(null)
    }
  }

  if (variant === 'compact') {
    return (
      <div className="flex gap-2">
        <Button
          onClick={handleExportExcel}
          disabled={exporting !== null}
          variant="outline"
          size="sm"
          className="border-green-300 text-green-700 hover:bg-green-50 min-w-[90px]"
        >
          {exporting === 'excel' ? (
            <>
              <Download className="mr-2 h-4 w-4 animate-bounce" />
              <span className="text-xs">...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </>
          )}
        </Button>
        <Button
          onClick={handleExportPDF}
          disabled={exporting !== null}
          variant="outline"
          size="sm"
          className="border-red-300 text-red-700 hover:bg-red-50 min-w-[90px]"
        >
          {exporting === 'pdf' ? (
            <>
              <Download className="mr-2 h-4 w-4 animate-bounce" />
              <span className="text-xs">...</span>
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleExportExcel}
        disabled={exporting !== null}
        variant="outline"
        className="border-green-300 text-green-700 hover:bg-green-50"
      >
        {exporting === 'excel' ? (
          <>
            <Download className="mr-2 h-4 w-4 animate-bounce" />
            Exportando a Excel...
          </>
        ) : (
          <>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar a Excel
          </>
        )}
      </Button>
      <Button
        onClick={handleExportPDF}
        disabled={exporting !== null}
        variant="outline"
        className="border-red-300 text-red-700 hover:bg-red-50"
      >
        {exporting === 'pdf' ? (
          <>
            <Download className="mr-2 h-4 w-4 animate-bounce" />
            Exportando a PDF...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            Exportar a PDF
          </>
        )}
      </Button>
    </div>
  )
}
