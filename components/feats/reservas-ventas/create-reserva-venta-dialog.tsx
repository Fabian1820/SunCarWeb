"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Badge } from "@/components/shared/atom/badge";
import {
  BookmarkCheck,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  User,
  Warehouse,
  X,
} from "lucide-react";
import {
  ClienteVentaService,
  InventarioService,
  SolicitudVentaService,
} from "@/lib/api-services";
import type {
  Almacen,
  ClienteVenta,
  MaterialVentaWeb,
  Reserva,
  ReservaCreateData,
} from "@/lib/api-types";

interface MaterialRow {
  material_id: string;
  cantidad_reservada: number;
  cantidad_consumida: number;
  codigo: string;
  nombre: string;
  um?: string;
}

interface CreateReservaVentaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ReservaCreateData) => Promise<void>;
  isLoading?: boolean;
}

const formatClienteLabel = (cliente: ClienteVenta) =>
  cliente.numero
    ? `${cliente.nombre} (${cliente.numero})`
    : `${cliente.nombre} (${cliente.id.slice(-6).toUpperCase()})`;

export function CreateReservaVentaDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CreateReservaVentaDialogProps) {
  // Almacenes
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loadingAlmacenes, setLoadingAlmacenes] = useState(false);
  const [selectedAlmacenId, setSelectedAlmacenId] = useState("");

  // Clientes ventas
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteResults, setClienteResults] = useState<ClienteVenta[]>([]);
  const [searchingClientes, setSearchingClientes] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteVenta | null>(null);

  // Materiales
  const [materialesWeb, setMaterialesWeb] = useState<MaterialVentaWeb[]>([]);
  const [loadingMateriales, setLoadingMateriales] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);

  // Fecha expiración
  const [fechaExpiracion, setFechaExpiracion] = useState("");

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load almacenes and materiales when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingAlmacenes(true);
    InventarioService.getAlmacenes()
      .then((data) => setAlmacenes(data.filter((a) => a.activo !== false)))
      .catch(() => setAlmacenes([]))
      .finally(() => setLoadingAlmacenes(false));

    setLoadingMateriales(true);
    SolicitudVentaService.getMaterialesVendiblesWeb()
      .then((data) => setMaterialesWeb(data))
      .catch(() => setMaterialesWeb([]))
      .finally(() => setLoadingMateriales(false));
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedAlmacenId("");
      setSelectedCliente(null);
      setClienteSearch("");
      setClienteResults([]);
      setMaterialRows([]);
      setMaterialSearch("");
      setFechaExpiracion("");
      setErrors({});
      setShowMaterialSearch(false);
    }
  }, [open]);

  // Search clientes with debounce
  useEffect(() => {
    if (!clienteSearch.trim()) {
      setClienteResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingClientes(true);
      try {
        const data = await ClienteVentaService.getClientes({
          nombre: clienteSearch.trim(),
          limit: 20,
        });
        setClienteResults(data);
      } catch {
        setClienteResults([]);
      } finally {
        setSearchingClientes(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  const filteredMateriales = useMemo(() => {
    if (!materialSearch.trim()) return materialesWeb.slice(0, 50);
    const term = materialSearch.toLowerCase();
    return materialesWeb
      .filter(
        (m) =>
          m.nombre.toLowerCase().includes(term) ||
          m.codigo.toLowerCase().includes(term),
      )
      .slice(0, 30);
  }, [materialesWeb, materialSearch]);

  const addMaterial = (mat: MaterialVentaWeb) => {
    const existing = materialRows.find((r) => r.material_id === mat.id);
    if (existing) return;
    setMaterialRows((prev) => [
      ...prev,
      {
        material_id: mat.id,
        cantidad_reservada: 1,
        cantidad_consumida: 0,
        codigo: mat.codigo,
        nombre: mat.nombre,
        um: mat.um,
      },
    ]);
    setShowMaterialSearch(false);
    setMaterialSearch("");
  };

  const removeMaterial = (materialId: string) => {
    setMaterialRows((prev) => prev.filter((r) => r.material_id !== materialId));
  };

  const updateCantidad = (materialId: string, value: number) => {
    setMaterialRows((prev) =>
      prev.map((r) =>
        r.material_id === materialId
          ? { ...r, cantidad_reservada: Math.max(1, value) }
          : r,
      ),
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedAlmacenId) newErrors.almacen = "Selecciona un almacén";
    if (!selectedCliente) newErrors.cliente = "Selecciona un cliente";
    if (materialRows.length === 0)
      newErrors.materiales = "Agrega al menos un material";
    if (!fechaExpiracion)
      newErrors.fechaExpiracion = "Ingresa la fecha de expiración";
    else if (new Date(fechaExpiracion) <= new Date())
      newErrors.fechaExpiracion = "La fecha de expiración debe ser futura";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const data: ReservaCreateData = {
      almacen_id: selectedAlmacenId,
      cliente_id: selectedCliente!.id,
      cliente_tipo: "cliente_venta",
      materiales: materialRows.map((r) => ({
        material_id: r.material_id,
        cantidad_reservada: r.cantidad_reservada,
        cantidad_consumida: 0,
      })),
      fecha_expiracion: new Date(fechaExpiracion).toISOString(),
    };
    await onSubmit(data);
  };

  // Min date for expiration (tomorrow)
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-indigo-600" />
            Nueva Reserva de Ventas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Almacén */}
          <div className="space-y-1.5">
            <Label>
              Almacén <span className="text-red-500">*</span>
            </Label>
            {loadingAlmacenes ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando almacenes...
              </div>
            ) : (
              <Select value={selectedAlmacenId} onValueChange={setSelectedAlmacenId}>
                <SelectTrigger className={errors.almacen ? "border-red-500" : ""}>
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Seleccionar almacén" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {almacenes.map((a) => (
                    <SelectItem key={a.id!} value={a.id!}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.almacen && (
              <p className="text-xs text-red-500">{errors.almacen}</p>
            )}
          </div>

          {/* Cliente Ventas */}
          <div className="space-y-1.5">
            <Label>
              Cliente Ventas <span className="text-red-500">*</span>
            </Label>
            {selectedCliente ? (
              <div className="flex items-center justify-between p-2 border rounded-md bg-teal-50 border-teal-200">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-teal-800">
                    {formatClienteLabel(selectedCliente)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCliente(null);
                    setClienteSearch("");
                    setClienteResults([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar cliente por nombre..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className={`pl-9 ${errors.cliente ? "border-red-500" : ""}`}
                  />
                  {searchingClientes && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
                {clienteResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {clienteResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        onClick={() => {
                          setSelectedCliente(c);
                          setClienteSearch("");
                          setClienteResults([]);
                        }}
                      >
                        {formatClienteLabel(c)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {errors.cliente && (
              <p className="text-xs text-red-500">{errors.cliente}</p>
            )}
          </div>

          {/* Fecha Expiración */}
          <div className="space-y-1.5">
            <Label>
              Fecha de Expiración <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              min={minDate}
              value={fechaExpiracion}
              onChange={(e) => setFechaExpiracion(e.target.value)}
              className={errors.fechaExpiracion ? "border-red-500" : ""}
            />
            {errors.fechaExpiracion && (
              <p className="text-xs text-red-500">{errors.fechaExpiracion}</p>
            )}
          </div>

          {/* Materiales */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Materiales <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMaterialSearch((v) => !v)}
                disabled={loadingMateriales}
              >
                {loadingMateriales ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Agregar material
              </Button>
            </div>

            {/* Material search dropdown */}
            {showMaterialSearch && (
              <div className="border rounded-md p-3 bg-gray-50 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar material..."
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    className="pl-9"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredMateriales.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No se encontraron materiales
                    </p>
                  ) : (
                    filteredMateriales.map((m) => {
                      const alreadyAdded = materialRows.some(
                        (r) => r.material_id === m.id,
                      );
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={alreadyAdded}
                          className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
                            alreadyAdded
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "hover:bg-white border hover:border-indigo-200"
                          }`}
                          onClick={() => !alreadyAdded && addMaterial(m)}
                        >
                          <span>
                            <span className="font-mono text-xs text-gray-500 mr-2">
                              {m.codigo}
                            </span>
                            {m.nombre}
                          </span>
                          {m.um && (
                            <Badge variant="outline" className="text-xs ml-2 shrink-0">
                              {m.um}
                            </Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Material rows */}
            {materialRows.length > 0 && (
              <div className="border rounded-md divide-y">
                {materialRows.map((row) => (
                  <div
                    key={row.material_id}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <Package className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{row.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {row.codigo}
                        {row.um && ` · ${row.um}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-xs text-gray-500 whitespace-nowrap">
                        Cant.
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={row.cantidad_reservada}
                        onChange={(e) =>
                          updateCantidad(
                            row.material_id,
                            parseInt(e.target.value, 10) || 1,
                          )
                        }
                        className="w-20 text-center h-8"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMaterial(row.material_id)}
                      className="text-red-500 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {errors.materiales && (
              <p className="text-xs text-red-500">{errors.materiales}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <BookmarkCheck className="h-4 w-4 mr-2" />
                  Crear Reserva
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
