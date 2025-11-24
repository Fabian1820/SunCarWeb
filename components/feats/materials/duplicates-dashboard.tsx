"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shared/molecule/dialog"
import { Button } from "@/components/shared/atom/button"
import { Badge } from "@/components/shared/atom/badge"
import { AlertTriangle, X, Package } from "lucide-react"
import type { Material } from "@/lib/material-types"

interface DuplicateGroup {
  codigo: string
  materiales: Material[]
}

interface DuplicatesDashboardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  duplicates: DuplicateGroup[]
}

export function DuplicatesDashboard({ open, onOpenChange, duplicates }: DuplicatesDashboardProps) {
  const totalDuplicates = duplicates.reduce((sum, dup) => sum + dup.materiales.length, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col [&>button]:top-3 [&>button]:right-3 [&>button]:bg-red-100 [&>button]:hover:bg-red-200 [&>button]:rounded-full [&>button]:p-2 [&>button]:opacity-100">
        <DialogHeader>
          <div className="flex items-center justify-between pr-10">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              Códigos Duplicados Detectados
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Summary Card */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">
                  Resumen de Duplicados
                </h3>
                <p className="text-sm text-amber-800">
                  Se encontraron <strong>{duplicates.length}</strong> código(s) con materiales duplicados,
                  afectando un total de <strong>{totalDuplicates}</strong> registros en la base de datos.
                </p>
              </div>
            </div>
          </div>

          {/* Duplicates List */}
          <div className="space-y-3">
            {duplicates.map((duplicate, idx) => (
              <div
                key={`dup-${duplicate.codigo}-${idx}`}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="bg-red-50 border-b border-red-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-red-900">
                      Código: {duplicate.codigo}
                    </h4>
                    <Badge variant="destructive" className="ml-auto">
                      {duplicate.materiales.length} duplicados
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-white">
                  <div className="space-y-3">
                    {duplicate.materiales.map((material, matIdx) => (
                      <div
                        key={`mat-${material.codigo}-${material.categoria}-${matIdx}`}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                          <Package className="h-4 w-4 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 mb-1">
                            {material.descripcion}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {material.categoria}
                            </Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {material.um}
                            </Badge>
                            {material.precio && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                ${material.precio.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
