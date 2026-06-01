"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/atom/input";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Search,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Lock,
  X,
  Receipt,
  Percent,
  Crown,
} from "lucide-react";
import type {
  FacturaVentaConComercial,
  EstadisticaVendedor,
} from "@/lib/types/feats/reportes-ventas/reportes-ventas-types";
import { useAuth } from "@/contexts/auth-context";

interface VentasPorComercialTableProps {
  facturas: FacturaVentaConComercial[];
  loading: boolean;
  onRefresh: () => void;
}

const RESTRICTED_USERS = [
  "Irina Cancela Nieto",
  "Yoanna Lopéz Delgado",
  "Danaisys Cabrera Santos",
  "Karina Rabeiro Crespo",
  "Maikel Jermanys Fernández Leal",
];

export function VentasPorComercialTable({
  facturas,
  loading,
  onRefresh,
}: VentasPorComercialTableProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [comercialFilter, setComercialFilter] = useState<string>("todos");
  const [descuentoFilter, setDescuentoFilter] = useState<string>("todos");
  const [mesFilter, setMesFilter] = useState<string>("todos");
  const [anioFilter, setAnioFilter] = useState<string>("todos");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  const isRestrictedUser = RESTRICTED_USERS.includes(user?.nombre || "");

  const canViewAmount = (comercial: string) => {
    if (!isRestrictedUser) return true;
    return user?.nombre === comercial;
  };

  const fechaReferencia = (f: FacturaVentaConComercial): string | null =>
    f.fecha || f.fecha_creacion || null;

  // Parsear la parte YYYY-MM-DD como fecha local. `new Date("YYYY-MM-DD")`
  // se interpreta como UTC; en Cuba (UTC-4/-5) eso muestra el día anterior y
  // hace que el filtro de mes/año caiga en el mes/año equivocado.
  const parseLocalDate = (d: string): Date | null => {
    const [y, m, day] = d.slice(0, 10).split("-").map(Number);
    if (!y || !m || !day) return null;
    return new Date(y, m - 1, day);
  };

  const comerciales = useMemo(() => {
    const unique = new Set(
      facturas.map((f) => f.cliente.comercial).filter((c): c is string => !!c),
    );
    return Array.from(unique).sort();
  }, [facturas]);

  const anios = useMemo(() => {
    const unique = new Set(
      facturas
        .map((f) => fechaReferencia(f))
        .filter((f): f is string => !!f)
        .map((f) => parseLocalDate(f)?.getFullYear().toString())
        .filter((y): y is string => !!y),
    );
    return Array.from(unique).sort().reverse();
  }, [facturas]);

  const filteredFacturas = useMemo(() => {
    return facturas.filter((f) => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const comercial = f.cliente.comercial || "";
        const matches =
          (f.numero || "").toLowerCase().includes(s) ||
          (f.cliente.nombre || "").toLowerCase().includes(s) ||
          comercial.toLowerCase().includes(s);
        if (!matches) return false;
      }

      if (comercialFilter !== "todos" && f.cliente.comercial !== comercialFilter) {
        return false;
      }

      if (descuentoFilter === "si" && !f.tiene_descuento) return false;
      if (descuentoFilter === "no" && f.tiene_descuento) return false;

      const ref = fechaReferencia(f);
      if (ref) {
        const fecha = parseLocalDate(ref);
        if (fecha) {
          if (fechaDesde) {
            const d = parseLocalDate(fechaDesde);
            if (d && fecha < d) return false;
          }
          if (fechaHasta) {
            const d = parseLocalDate(fechaHasta);
            if (d) {
              d.setHours(23, 59, 59, 999);
              if (fecha > d) return false;
            }
          }
          if (!fechaDesde && !fechaHasta && mesFilter !== "todos") {
            if ((fecha.getMonth() + 1).toString() !== mesFilter) return false;
          }
          if (!fechaDesde && !fechaHasta && anioFilter !== "todos") {
            if (fecha.getFullYear().toString() !== anioFilter) return false;
          }
        }
      }

      return true;
    });
  }, [
    facturas,
    searchTerm,
    comercialFilter,
    descuentoFilter,
    mesFilter,
    anioFilter,
    fechaDesde,
    fechaHasta,
  ]);

  const estadisticas = useMemo(() => {
    const stats = new Map<string, EstadisticaVendedor>();

    filteredFacturas.forEach((f) => {
      const comercial = f.cliente.comercial || "Sin asignar";
      if (!stats.has(comercial)) {
        stats.set(comercial, {
          comercial,
          cantidad_ventas: 0,
          ventas_con_descuento: 0,
          total_vendido: 0,
          total_cobrado: 0,
          venta_mas_alta: 0,
        });
      }
      const s = stats.get(comercial)!;
      s.cantidad_ventas += 1;
      if (f.tiene_descuento) s.ventas_con_descuento += 1;
      s.total_vendido += f.precio_total || 0;
      s.total_cobrado += f.total_pagado || 0;
      if ((f.precio_total || 0) > s.venta_mas_alta) {
        s.venta_mas_alta = f.precio_total || 0;
      }
    });

    return Array.from(stats.values()).sort((a, b) => b.total_vendido - a.total_vendido);
  }, [filteredFacturas]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value || 0);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    const d = parseLocalDate(dateString);
    if (!d) return "—";
    return d.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const meses = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];

  const totals = useMemo(() => {
    return filteredFacturas.reduce(
      (acc, f) => {
        acc.vendido += f.precio_total || 0;
        acc.cobrado += f.total_pagado || 0;
        acc.descuento += f.descuento_monto || 0;
        return acc;
      },
      { vendido: 0, cobrado: 0, descuento: 0 },
    );
  }, [filteredFacturas]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {estadisticas.map((stat) => {
          const showAmount = canViewAmount(stat.comercial);

          return (
            <Card key={stat.comercial} className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.comercial}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Receipt className="h-3 w-3" /> Cantidad ventas
                  </span>
                  <Badge variant="secondary" className="font-semibold">
                    {stat.cantidad_ventas}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Percent className="h-3 w-3 text-amber-600" /> Con descuento
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    {stat.ventas_con_descuento}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-xs text-gray-500">Total vendido</span>
                  {showAmount ? (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-green-600" />
                      <span className="text-sm font-bold text-green-600">
                        {formatCurrency(stat.total_vendido)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-400">Restringido</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total cobrado</span>
                  {showAmount ? (
                    <span className="text-sm font-semibold text-blue-600">
                      {formatCurrency(stat.total_cobrado)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Crown className="h-3 w-3 text-yellow-600" /> Venta más alta
                  </span>
                  {showAmount ? (
                    <span className="text-sm font-semibold text-yellow-700">
                      {formatCurrency(stat.venta_mas_alta)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <CardTitle>Facturas por Comercial</CardTitle>
              {(fechaDesde || fechaHasta) && (
                <Button
                  onClick={() => {
                    setFechaDesde("");
                    setFechaHasta("");
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar fechas
                </Button>
              )}
            </div>
            <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por número, cliente o comercial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={comercialFilter} onValueChange={setComercialFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por comercial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los comerciales</SelectItem>
                  {comerciales.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={descuentoFilter} onValueChange={setDescuentoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por descuento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las ventas</SelectItem>
                  <SelectItem value="si">Solo con descuento</SelectItem>
                  <SelectItem value="no">Sin descuento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 px-1">Fecha desde</label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => {
                    setFechaDesde(e.target.value);
                    if (e.target.value) {
                      setMesFilter("todos");
                      setAnioFilter("todos");
                    }
                  }}
                  className="text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 px-1">Fecha hasta</label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => {
                    setFechaHasta(e.target.value);
                    if (e.target.value) {
                      setMesFilter("todos");
                      setAnioFilter("todos");
                    }
                  }}
                  className="text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 px-1">Mes</label>
                <Select
                  value={mesFilter}
                  onValueChange={(v) => {
                    setMesFilter(v);
                    if (v !== "todos") {
                      setFechaDesde("");
                      setFechaHasta("");
                    }
                  }}
                  disabled={!!fechaDesde || !!fechaHasta}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los meses</SelectItem>
                    {meses.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 px-1">Año</label>
                <Select
                  value={anioFilter}
                  onValueChange={(v) => {
                    setAnioFilter(v);
                    if (v !== "todos") {
                      setFechaDesde("");
                      setFechaHasta("");
                    }
                  }}
                  disabled={!!fechaDesde || !!fechaHasta}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los años</SelectItem>
                    {anios.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comercial</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Descuento</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      Cargando ventas...
                    </TableCell>
                  </TableRow>
                ) : filteredFacturas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No se encontraron ventas
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFacturas.map((f) => {
                    const comercial = f.cliente.comercial || "Sin asignar";
                    const showAmount = canViewAmount(comercial);

                    return (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{comercial}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm font-mono">{f.numero}</div>
                          {f.solicitudes_count > 1 && (
                            <div className="text-xs text-gray-500">
                              {f.solicitudes_count} solicitudes
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{f.cliente.nombre}</div>
                            {f.cliente.numero && (
                              <Badge variant="outline" className="text-xs">
                                #{f.cliente.numero}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{f.materiales_count}</TableCell>
                        <TableCell className="text-right text-sm text-gray-600">
                          {showAmount ? formatCurrency(f.precio_bruto) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {f.tiene_descuento ? (
                            <span className="text-xs text-amber-700 font-medium">
                              {showAmount ? `-${formatCurrency(f.descuento_monto)}` : "—"}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {showAmount ? formatCurrency(f.precio_total) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          {showAmount ? formatCurrency(f.total_pagado) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {showAmount ? (
                            <Badge
                              variant={f.monto_pendiente > 0 ? "destructive" : "secondary"}
                              className="font-medium"
                            >
                              {formatCurrency(f.monto_pendiente)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(f.fecha)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && filteredFacturas.length > 0 && (
            <div className="mt-4 space-y-2">
              {(fechaDesde || fechaHasta) && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    Filtrado por fecha:
                    {fechaDesde && ` desde ${parseLocalDate(fechaDesde)?.toLocaleDateString("es-ES") ?? fechaDesde}`}
                    {fechaHasta && ` hasta ${parseLocalDate(fechaHasta)?.toLocaleDateString("es-ES") ?? fechaHasta}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>
                  Mostrando {filteredFacturas.length} de {facturas.length} ventas
                </span>
                {!isRestrictedUser && (
                  <div className="flex gap-6">
                    <span className="font-medium">
                      Total vendido: {formatCurrency(totals.vendido)}
                    </span>
                    <span className="font-medium text-amber-700">
                      Descuentos: {formatCurrency(totals.descuento)}
                    </span>
                    <span className="font-medium">
                      Total cobrado: {formatCurrency(totals.cobrado)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
