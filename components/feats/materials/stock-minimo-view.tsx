"use client";

import { useState, useEffect } from "react";
import { Package, ChevronDown, ChevronUp, AlertTriangle, Loader2, MapPin } from "lucide-react";
import { Badge } from "@/components/shared/atom/badge";
import { Button } from "@/components/shared/atom/button";
import { InventarioService } from "@/lib/api-services";
import type { AlmacenConMaterialesBajos, MaterialBajoMinimo } from "@/lib/types/feats/inventario/stock-minimo-types";

export function StockMinimoView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [almacenes, setAlmacenes] = useState<AlmacenConMaterialesBajos[]>([]);
  const [expandedAlmacenes, setExpandedAlmacenes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMaterialesBajoMinimo();
  }, []);

  const loadMaterialesBajoMinimo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await InventarioService.getMaterialesBajoMinimo();
      setAlmacenes(response.data || []);
    } catch (err: any) {
      setError(err.message || "Error al cargar materiales bajo stock mínimo");
    } finally {
      setLoading(false);
    }
  };

  const toggleAlmacen = (almacenId: string) => {
    setExpandedAlmacenes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(almacenId)) {
        newSet.delete(almacenId);
      } else {
        newSet.add(almacenId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        <span className="ml-3 text-gray-600">Cargando información de stock...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadMaterialesBajoMinimo}
          className="mt-4"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (almacenes.length === 0) {
    return (
      <div className="text-center py-12 bg-green-50 border border-green-200 rounded-lg">
        <Package className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          ¡Todo en orden!
        </h3>
        <p className="text-green-700">
          No hay materiales con stock por debajo del mínimo requerido.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <p className="text-sm font-medium text-amber-900">
            {almacenes.length} {almacenes.length === 1 ? "almacén tiene" : "almacenes tienen"}{" "}
            materiales con stock bajo el mínimo requerido
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {almacenes.map((almacenData) => {
          const isExpanded = expandedAlmacenes.has(almacenData.almacen_id);

          return (
            <div
              key={almacenData.almacen_id}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Tarjeta del Almacén */}
              <button
                onClick={() => toggleAlmacen(almacenData.almacen_id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <Package className="h-6 w-6 text-red-600" />
                  </div>

                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {almacenData.almacen.nombre}
                      </h3>
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                        {almacenData.almacen.codigo}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{almacenData.almacen.direccion}</span>
                      </div>
                      <span>•</span>
                      <span>Responsable: {almacenData.almacen.responsable}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge className="bg-red-100 text-red-700 border-red-300 px-3 py-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                      {almacenData.total_materiales_bajo_minimo}{" "}
                      {almacenData.total_materiales_bajo_minimo === 1 ? "material" : "materiales"}
                    </Badge>

                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Lista de Materiales (expandible) */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Materiales con stock bajo mínimo
                    </h4>

                    <div className="space-y-2">
                      {almacenData.materiales.map((material: MaterialBajoMinimo) => (
                        <div
                          key={material.material_id}
                          className="bg-white border border-gray-200 rounded-lg p-3 hover:border-red-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              {material.foto ? (
                                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-200">
                                  <img
                                    src={material.foto}
                                    alt={material.nombre}
                                    className="w-full h-full object-contain p-1"
                                  />
                                </div>
                              ) : (
                                <div className="bg-amber-100 p-2 rounded-lg flex-shrink-0">
                                  <Package className="h-4 w-4 text-amber-700" />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between mb-1">
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">
                                      {material.nombre || material.descripcion}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className="text-xs font-semibold text-gray-700">
                                        {material.codigo}
                                      </span>
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                        {material.categoria}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>

                                {material.descripcion && material.nombre !== material.descripcion && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {material.descripcion}
                                  </p>
                                )}

                                {material.ubicacion_en_almacen && (
                                  <div className="flex items-center space-x-1 text-xs text-gray-600 mt-2">
                                    <MapPin className="h-3 w-3" />
                                    <span>{material.ubicacion_en_almacen}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-right ml-4">
                              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                <div className="text-xs text-red-600 font-medium mb-1">
                                  Stock Actual
                                </div>
                                <div className="text-lg font-bold text-red-700">
                                  {material.cantidad_actual} {material.um}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Mínimo: {material.stockaje_minimo} {material.um}
                                </div>
                                <div className="text-xs font-semibold text-red-600 mt-1">
                                  Faltan: {material.diferencia} {material.um}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
