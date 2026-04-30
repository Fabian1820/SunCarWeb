"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Edit, Package, DollarSign, FileText, Upload, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import type { Material } from "@/lib/material-types";
import { MaterialService } from "@/lib/api-services";
import { useToast } from "@/hooks/use-toast";
import { LazyImage } from "@/components/shared/atom/lazy-image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shared/molecule/tooltip";

export interface TablePaginationInfo {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

interface MaterialsTableProps {
  materials: Material[];
  onEdit: (material: Material) => void;
  onFichaTecnicaUploaded?: (materialCodigo: string, url: string) => void;
  marcas?: any[];
  pagination?: TablePaginationInfo;
  loading?: boolean;
}

export function MaterialsTable({
  materials,
  onEdit,
  onFichaTecnicaUploaded,
  marcas = [],
  pagination,
  loading = false,
}: MaterialsTableProps) {
  const { toast } = useToast();
  const [uploadingFicha, setUploadingFicha] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const getMarcaNombre = (marcaId: string | undefined): string | null => {
    if (!marcaId || marcas.length === 0) return null;
    const marca = marcas.find((m) => m.id === marcaId);
    return marca?.nombre || null;
  };

  const getMarcaColor = (marcaId: string): { bg: string; text: string; border: string } => {
    const colors = [
      { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
      { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
      { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
      { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
      { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
      { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
      { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
      { bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200" },
      { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
      { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
      { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
      { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
      { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200" },
      { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
      { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
    ];
    let hash = 0;
    for (let i = 0; i < marcaId.length; i++) {
      hash = marcaId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleQuickUploadFicha = async (material: Material, file: File) => {
    const materialKey = `${material.codigo}_${material.categoria}`;
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Error", description: "El archivo debe ser PDF, Word o Excel", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Error", description: "La ficha técnica no debe superar 10MB", variant: "destructive" });
      return;
    }

    setUploadingFicha(materialKey);
    try {
      const fichaTecnicaUrl = await MaterialService.uploadFichaTecnica(file);
      if (material.producto_id) {
        await MaterialService.editMaterialInProduct(material.producto_id, material.codigo, {
          codigo: material.codigo,
          descripcion: material.descripcion,
          um: material.um,
          precio: material.precio,
          nombre: material.nombre,
          foto: material.foto,
          marca_id: material.marca_id,
          potenciaKW: material.potenciaKW,
          comentario: material.comentario,
          habilitar_venta_web: material.habilitar_venta_web,
          precio_por_cantidad: material.precio_por_cantidad,
          especificaciones: material.especificaciones,
          ficha_tecnica_url: fichaTecnicaUrl,
        });
        if (onFichaTecnicaUploaded) onFichaTecnicaUploaded(material.codigo, fichaTecnicaUrl);
        toast({ title: "Éxito", description: "Ficha técnica adjuntada correctamente" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error al subir la ficha técnica", variant: "destructive" });
    } finally {
      setUploadingFicha(null);
      if (fileInputRefs.current[materialKey]) {
        fileInputRefs.current[materialKey]!.value = "";
      }
    }
  };

  if (!loading && materials.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron materiales</h3>
        <p className="text-gray-600">No hay materiales que coincidan con los filtros aplicados.</p>
      </div>
    );
  }

  const from = pagination ? (pagination.page - 1) * pagination.limit + 1 : 1;
  const to = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : materials.length;

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        {/* Skeleton rows mientras carga */}
        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[180px]">Código</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[130px]">Categoría</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-900">Nombre</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[60px]">UM</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[100px]">Marca</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[90px]">Potencia</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[90px]">Precio</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[80px]">Ficha</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-900 w-[120px]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material, index) => {
                const materialKey = `${material.codigo}_${material.categoria}`;
                return (
                  <tr
                    key={`${material.codigo}-${material.categoria}-${index}`}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    {/* Código + foto lazy */}
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-2">
                        {material.foto ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-200">
                            <LazyImage
                              src={material.foto}
                              alt={material.nombre || material.descripcion}
                              className="relative w-full h-full"
                              imgClassName="w-full h-full object-contain p-1"
                              fallback={
                                <div className="absolute inset-0 bg-amber-100 flex items-center justify-center">
                                  <Package className="h-5 w-5 text-amber-700" />
                                </div>
                              }
                            />
                          </div>
                        ) : (
                          <div className="bg-amber-100 p-1.5 rounded-lg flex-shrink-0">
                            <Package className="h-3.5 w-3.5 text-amber-700" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm whitespace-nowrap">
                            {material.codigo}
                          </p>
                          {material.numero_serie && (
                            <p className="text-xs text-gray-500 mt-0.5">N/S: {material.numero_serie}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="py-3 px-2">
                      <div className="max-w-[130px]">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs inline-block max-w-full truncate">
                          {material.categoria}
                        </Badge>
                      </div>
                    </td>

                    {/* Nombre */}
                    <td className="py-3 px-2">
                      {material.nombre ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-medium text-gray-900 truncate block cursor-help">
                              {material.nombre}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{material.nombre}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>

                    {/* UM */}
                    <td className="py-3 px-2">
                      <span className="text-xs text-gray-600 font-medium">{material.um || "-"}</span>
                    </td>

                    {/* Marca */}
                    <td className="py-3 px-2">
                      {material.marca_id ? (
                        (() => {
                          const marcaNombre = getMarcaNombre(material.marca_id);
                          const colorClasses = getMarcaColor(material.marca_id);
                          return marcaNombre ? (
                            <div className="max-w-[100px]">
                              <Badge variant="outline" className={`${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} text-xs inline-block max-w-full truncate`}>
                                {marcaNombre}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="outline" className={`${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} text-xs`}>
                              ID: {material.marca_id.slice(0, 6)}
                            </Badge>
                          );
                        })()
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>

                    {/* Potencia */}
                    <td className="py-3 px-2">
                      {material.potenciaKW ? (
                        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{material.potenciaKW} KW</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>

                    {/* Precio */}
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {material.precio != null ? material.precio.toFixed(2) : "N/A"}
                        </span>
                      </div>
                    </td>

                    {/* Ficha técnica */}
                    <td className="py-3 px-2">
                      {material.ficha_tecnica_url ? (
                        <a
                          href={material.ficha_tecnica_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md border-2 border-green-400 bg-green-50 text-green-700 hover:bg-green-100 transition-colors shadow-sm"
                          title="Descargar ficha técnica"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      ) : uploadingFicha === materialKey ? (
                        <div className="inline-flex items-center justify-center h-8 w-8 rounded-md border-2 border-blue-300 bg-blue-50">
                          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <input
                            ref={(el) => { fileInputRefs.current[materialKey] = el; }}
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleQuickUploadFicha(material, file);
                            }}
                            className="hidden"
                            id={`ficha-input-${material.codigo}-${index}`}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`ficha-input-${material.codigo}-${index}`)?.click()}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md border-2 border-gray-300 bg-gray-50 text-gray-400 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                            title="Adjuntar ficha técnica"
                          >
                            <Upload className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(material)}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                        title="Editar material"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-2">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-medium">{from}–{to}</span> de{" "}
              <span className="font-medium">{pagination.total}</span> materiales
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="h-8 w-8 p-0"
                title="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="h-8 w-8 p-0"
                title="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
