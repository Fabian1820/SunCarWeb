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
  CheckCircle2,
  CreditCard,
  FileText,
} from "lucide-react";
import type {
  OfertaVentaConComercial,
  EstadisticaVendedor,
  EstadoOfertaVenta,
} from "@/lib/types/feats/reportes-ventas/reportes-ventas-types";
import { useAuth } from "@/contexts/auth-context";

interface ResultadosVentasTableProps {
  resultados: OfertaVentaConComercial[];
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

const ESTADO_BADGE: Record<EstadoOfertaVenta, { label: string; className: string }> = {
  enviada: { label: "Enviada", className: "bg-blue-100 text-blue-700 border-blue-200" },
  confirmada: { label: "Confirmada", className: "bg-amber-100 text-amber-800 border-amber-200" },
  pagada: { label: "Pagada", className: "bg-green-100 text-green-800 border-green-200" },
  cancelada: { label: "Cancelada", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function ResultadosVentasTable({
  resultados,
  loading,
  onRefresh,
}: ResultadosVentasTableProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [comercialFilter, setComercialFilter] = useState<string>("todos");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [mesFilter, setMesFilter] = useState<string>("todos");
  const [anioFilter, setAnioFilter] = useState<string>("todos");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  const isRestrictedUser = RESTRICTED_USERS.includes(user?.nombre || "");

  const canViewAmount = (comercial: string) => {
    if (!isRestrictedUser) return true;
    return user?.nombre === comercial;
  };

  const fechaReferencia = (r: OfertaVentaConComercial): string | null => {
    return r.fecha_confirmada || r.fecha_creacion || null;
  };

  const comerciales = useMemo(() => {
    const unique = new Set(
      resultados
        .map((r) => r.cliente.comercial)
        .filter((c): c is string => !!c),
    );
    return Array.from(unique).sort();
  }, [resultados]);

  const anios = useMemo(() => {
    const unique = new Set(
      resultados
        .map((r) => fechaReferencia(r))
        .filter((f): f is string => !!f)
        .map((f) => new Date(f).getFullYear().toString()),
    );
    return Array.from(unique).sort().reverse();
  }, [resultados]);

  const filteredResultados = useMemo(() => {
    return resultados.filter((r) => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const comercial = r.cliente.comercial || "";
        const matches =
          (r.codigo || "").toLowerCase().includes(s) ||
          (r.cliente.nombre || "").toLowerCase().includes(s) ||
          comercial.toLowerCase().includes(s);
        if (!matches) return false;
      }

      if (comercialFilter !== "todos" && r.cliente.comercial !== comercialFilter) {
        return false;
      }

      if (estadoFilter !== "todos" && r.estado !== estadoFilter) {
        return false;
      }

      const ref = fechaReferencia(r);
      if (ref) {
        const f = new Date(ref);
        if (fechaDesde) {
          const d = new Date(fechaDesde);
          d.setHours(0, 0, 0, 0);
          if (f < d) return false;
        }
        if (fechaHasta) {
          const d = new Date(fechaHasta);
          d.setHours(23, 59, 59, 999);
          if (f > d) return false;
        }
        if (!fechaDesde && !fechaHasta && mesFilter !== "todos") {
          if ((f.getMonth() + 1).toString() !== mesFilter) return false;
        }
        if (!fechaDesde && !fechaHasta && anioFilter !== "todos") {
          if (f.getFullYear().toString() !== anioFilter) return false;
        }
      }

      return true;
    });
  }, [resultados, searchTerm, comercialFilter, estadoFilter, mesFilter, anioFilter, fechaDesde, fechaHasta]);

  const estadisticas = useMemo(() => {
    const stats = new Map<string, EstadisticaVendedor>();

    filteredResultados.forEach((r) => {
      const comercial = r.cliente.comercial || "Sin asignar";

      if (!stats.has(comercial)) {
        stats.set(comercial, {
          comercial,
          total_ofertas: 0,
          ofertas_confirmadas: 0,
          ofertas_pagadas: 0,
          total_vendido: 0,
          total_cobrado: 0,
        });
      }

      const stat = stats.get(comercial)!;
      stat.total_ofertas += 1;

      if (r.estado === "confirmada" || r.estado === "pagada") {
        stat.ofertas_confirmadas += 1;
        stat.total_vendido += r.precio_total || 0;
      }
      if (r.estado === "pagada") {
        stat.ofertas_pagadas += 1;
      }
      stat.total_cobrado += r.total_pagado || 0;
    });

    return Array.from(stats.values()).sort((a, b) => b.total_vendido - a.total_vendido);
  }, [filteredResultados]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value || 0);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("es-ES", {
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
    return filteredResultados.reduce(
      (acc, r) => {
        acc.precio += r.precio_total || 0;
        acc.pagado += r.total_pagado || 0;
        if (r.estado === "confirmada" || r.estado === "pagada") {
          acc.vendido += r.precio_total || 0;
        }
        return acc;
      },
      { precio: 0, pagado: 0, vendido: 0 },
    );
  }, [filteredResultados]);

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
                    <FileText className="h-3 w-3" /> Total ofertas
                  </span>
                  <Badge variant="secondary" className="font-semibold">
                    {stat.total_ofertas}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-amber-600" /> Confirmadas
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    {stat.ofertas_confirmadas}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <CreditCard className="h-3 w-3 text-green-600" /> Pagadas
                  </span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {stat.ofertas_pagadas}
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <CardTitle>Ofertas por Comercial</CardTitle>
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
                  placeholder="Buscar por código, cliente o comercial..."
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

              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="pagada">Pagada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
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
                  <TableHead>Oferta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Precio Total</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Cargando resultados...
                    </TableCell>
                  </TableRow>
                ) : filteredResultados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No se encontraron resultados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResultados.map((r) => {
                    const comercial = r.cliente.comercial || "Sin asignar";
                    const estadoCfg = ESTADO_BADGE[r.estado] || ESTADO_BADGE.enviada;
                    const showAmount = canViewAmount(comercial);

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{comercial}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{r.codigo || r.id.slice(-6)}</div>
                          {r.observaciones && (
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {r.observaciones}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{r.cliente.nombre}</div>
                            {r.cliente.numero && (
                              <Badge variant="outline" className="text-xs">
                                #{r.cliente.numero}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${estadoCfg.className} border`}>
                            {estadoCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{r.materiales_count}</TableCell>
                        <TableCell className="text-right font-medium">
                          {showAmount ? formatCurrency(r.precio_total) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          {showAmount ? formatCurrency(r.total_pagado) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {showAmount ? (
                            <Badge
                              variant={r.monto_pendiente > 0 ? "destructive" : "secondary"}
                              className="font-medium"
                            >
                              {formatCurrency(r.monto_pendiente)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(r.fecha_confirmada || r.fecha_creacion)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && filteredResultados.length > 0 && (
            <div className="mt-4 space-y-2">
              {(fechaDesde || fechaHasta) && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                  <TrendingUp className="h-4 w-4" />
                  <span>
                    Filtrado por fecha:
                    {fechaDesde && ` desde ${new Date(fechaDesde).toLocaleDateString("es-ES")}`}
                    {fechaHasta && ` hasta ${new Date(fechaHasta).toLocaleDateString("es-ES")}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>
                  Mostrando {filteredResultados.length} de {resultados.length} ofertas
                </span>
                {!isRestrictedUser && (
                  <div className="flex gap-6">
                    <span className="font-medium">
                      Total vendido (confirmada+pagada): {formatCurrency(totals.vendido)}
                    </span>
                    <span className="font-medium">Total cobrado: {formatCurrency(totals.pagado)}</span>
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
