"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/shared/molecule/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shared/molecule/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/shared/molecule/command";
import { Loader2, History, Search, Download, PackageSearch, ChevronsUpDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { InventarioService } from "@/lib/services/feats/inventario/inventario-service";
import type { StockHistoricoItem } from "@/lib/services/feats/inventario/inventario-service";
import * as XLSX from "xlsx";

interface StockHistoricoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  almacenId: string;
  almacenNombre?: string;
}

interface MaterialOption {
  id: string;
  codigo: string;
  nombre: string;
  categoria?: string | null;
}

const svc = new InventarioService();

const fmtNum = (n: number) =>
  Number.isFinite(n)
    ? n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 4 })
    : "0";

export function StockHistoricoModal({
  open,
  onOpenChange,
  almacenId,
  almacenNombre,
}: StockHistoricoModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(today);

  // Material select (combobox)
  const [comboOpen, setComboOpen] = useState(false);
  const [materialOptions, setMaterialOptions] = useState<MaterialOption[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const loadedRef = useRef(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialOption | null>(null);

  // Results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StockHistoricoItem[] | null>(null);
  const [fechaConsultada, setFechaConsultada] = useState<string | null>(null);

  // Load material list lazily when combobox opens
  const handleComboOpenChange = useCallback(
    async (next: boolean) => {
      setComboOpen(next);
      if (next && !loadedRef.current) {
        setLoadingMaterials(true);
        try {
          const resp = await InventarioService.getMaterialesStock({
            almacen_id: almacenId,
            limit: 500,
            skip: 0,
          });
          const opts: MaterialOption[] = resp.data.map((m) => ({
            id: m.material_id,
            codigo: m.codigo ?? m.material_id,
            nombre: m.nombre ?? m.descripcion ?? m.material_id,
            categoria: m.categoria ?? null,
          }));
          setMaterialOptions(opts);
          loadedRef.current = true;
        } catch {
          // Si falla, el usuario puede seguir sin filtro de material
        } finally {
          setLoadingMaterials(false);
        }
      }
    },
    [almacenId],
  );

  const handleConsultar = useCallback(async () => {
    if (!fecha) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const resp = await svc.getStockHistorico({
        fecha,
        almacen_id: almacenId,
        material_ids: selectedMaterial ? [selectedMaterial.id] : undefined,
      });
      setData(resp.data);
      setFechaConsultada(fecha);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar el stock histórico");
    } finally {
      setLoading(false);
    }
  }, [fecha, almacenId, selectedMaterial]);

  const handleExportExcel = useCallback(() => {
    if (!data || !fechaConsultada) return;
    const rows = data.map((item) => ({
      Código: item.material_codigo,
      Nombre: item.material_nombre,
      Categoría: item.categoria ?? "",
      Marca: item.marca ?? "",
      Cantidad: item.cantidad,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, `Stock_${almacenNombre ?? almacenId}_${fechaConsultada}.xlsx`);
  }, [data, fechaConsultada, almacenId, almacenNombre]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-orange-600" />
            Stock histórico
            {almacenNombre && (
              <span className="text-sm font-normal text-gray-500">— {almacenNombre}</span>
            )}
          </DialogTitle>
          <DialogDescription>
            Consulta la cantidad estimada de materiales en este almacén en una fecha pasada.
            El algoritmo reconstruye el stock revirtiendo los movimientos posteriores a la fecha solicitada.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {/* Fecha */}
          <div className="sm:w-40 shrink-0">
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Fecha</Label>
            <Input
              type="date"
              value={fecha}
              max={today}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Material combobox */}
          <div className="flex-1">
            <Label className="text-sm font-medium text-gray-700 mb-1 block">
              Material <span className="text-gray-400 font-normal">(opcional — todos si no se selecciona)</span>
            </Label>
            <Popover open={comboOpen} onOpenChange={handleComboOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate text-left">
                    {selectedMaterial
                      ? `${selectedMaterial.codigo} — ${selectedMaterial.nombre}`
                      : "Todos los materiales"}
                  </span>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {selectedMaterial && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="rounded-full hover:bg-gray-200 p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMaterial(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            setSelectedMaterial(null);
                          }
                        }}
                      >
                        <X className="h-3.5 w-3.5 text-gray-500" />
                      </span>
                    )}
                    {loadingMaterials
                      ? <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                      : <ChevronsUpDown className="h-4 w-4 opacity-50" />}
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar material..." />
                  <CommandList>
                    {loadingMaterials ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando materiales...
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No se encontraron materiales.</CommandEmpty>
                        <CommandGroup>
                          {materialOptions.map((mat) => (
                            <CommandItem
                              key={mat.id}
                              value={`${mat.codigo} ${mat.nombre} ${mat.categoria ?? ""}`}
                              onSelect={() => {
                                setSelectedMaterial(mat);
                                setComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  selectedMaterial?.id === mat.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <span className="truncate">
                                <span className="font-mono text-xs text-gray-500 mr-1">{mat.codigo}</span>
                                {mat.nombre}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Botón */}
          <div className="flex items-end">
            <Button
              onClick={() => void handleConsultar()}
              disabled={loading || !fecha}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2 whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Consultar
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Resultados */}
        {data !== null && (
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <p className="text-sm text-gray-600">
                Stock al <strong>{fechaConsultada}</strong>
                {selectedMaterial && (
                  <> · <strong>{selectedMaterial.nombre}</strong></>
                )}
                {" · "}<strong>{data.length}</strong> {data.length === 1 ? "material" : "materiales"}
              </p>
              {data.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
              )}
            </div>

            {data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <PackageSearch className="h-10 w-10 text-gray-300" />
                <p className="text-gray-500 text-sm">
                  No se encontraron materiales para los filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Código</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Nombre</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 hidden sm:table-cell">Categoría</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, idx) => (
                      <tr
                        key={`${item.almacen_id}-${item.material_id}-${idx}`}
                        className={`border-b border-gray-50 ${
                          item.cantidad === 0 ? "opacity-50" : "hover:bg-orange-50/30"
                        }`}
                      >
                        <td className="py-2 px-3 font-mono text-xs text-gray-600">{item.material_codigo}</td>
                        <td className="py-2 px-3 text-gray-900">{item.material_nombre || "—"}</td>
                        <td className="py-2 px-3 text-gray-500 hidden sm:table-cell text-xs">
                          {item.categoria || "—"}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-semibold tabular-nums ${
                            item.cantidad > 0 ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {fmtNum(item.cantidad)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Estado inicial */}
        {data === null && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3 text-gray-400">
            <History className="h-10 w-10" />
            <p className="text-sm">
              Selecciona una fecha y pulsa <strong>Consultar</strong> para ver el stock histórico.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
