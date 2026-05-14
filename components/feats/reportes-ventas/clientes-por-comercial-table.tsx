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
  Users,
  UserCheck,
  UserX,
  FileText,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import type {
  ClienteVentaConResumen,
  EstadisticaClientesVendedor,
} from "@/lib/types/feats/reportes-ventas/reportes-ventas-types";

interface ClientesPorComercialTableProps {
  clientes: ClienteVentaConResumen[];
  loading: boolean;
  onRefresh: () => void;
}

export function ClientesPorComercialTable({
  clientes,
  loading,
  onRefresh,
}: ClientesPorComercialTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [comercialFilter, setComercialFilter] = useState<string>("todos");
  const [tieneOfertasFilter, setTieneOfertasFilter] = useState<string>("todos");

  const comerciales = useMemo(() => {
    const unique = new Set(
      clientes.map((c) => c.comercial || "Sin asignar"),
    );
    return Array.from(unique).sort();
  }, [clientes]);

  const filtered = useMemo(() => {
    return clientes.filter((c) => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches =
          c.nombre.toLowerCase().includes(s) ||
          (c.numero || "").toLowerCase().includes(s) ||
          (c.telefono || "").toLowerCase().includes(s) ||
          (c.comercial || "").toLowerCase().includes(s);
        if (!matches) return false;
      }
      const comercial = c.comercial || "Sin asignar";
      if (comercialFilter !== "todos" && comercial !== comercialFilter) return false;
      if (tieneOfertasFilter === "con-ofertas" && c.ofertas_count === 0) return false;
      if (tieneOfertasFilter === "sin-ofertas" && c.ofertas_count > 0) return false;
      return true;
    });
  }, [clientes, searchTerm, comercialFilter, tieneOfertasFilter]);

  const estadisticas = useMemo(() => {
    const stats = new Map<string, EstadisticaClientesVendedor>();

    filtered.forEach((c) => {
      const comercial = c.comercial || "Sin asignar";
      if (!stats.has(comercial)) {
        stats.set(comercial, {
          comercial,
          total_clientes: 0,
          clientes_con_ofertas: 0,
          clientes_sin_ofertas: 0,
          total_ofertas: 0,
          total_confirmadas: 0,
          total_pagadas: 0,
        });
      }
      const s = stats.get(comercial)!;
      s.total_clientes += 1;
      if (c.ofertas_count > 0) s.clientes_con_ofertas += 1;
      else s.clientes_sin_ofertas += 1;
      s.total_ofertas += c.ofertas_count || 0;
      s.total_confirmadas += c.ofertas_confirmadas_count || 0;
      s.total_pagadas += c.ofertas_pagadas_count || 0;
    });

    return Array.from(stats.values()).sort(
      (a, b) => b.total_clientes - a.total_clientes,
    );
  }, [filtered]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {estadisticas.map((stat) => {
          const tasa =
            stat.total_clientes > 0
              ? Math.round((stat.clientes_con_ofertas / stat.total_clientes) * 100)
              : 0;

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
                    <Users className="h-3 w-3" /> Total clientes
                  </span>
                  <Badge variant="secondary" className="font-semibold">
                    {stat.total_clientes}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-green-600" /> Con ofertas
                  </span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {stat.clientes_con_ofertas}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <UserX className="h-3 w-3 text-gray-500" /> Sin ofertas
                  </span>
                  <Badge variant="outline">{stat.clientes_sin_ofertas}</Badge>
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-xs text-gray-500">Tasa de conversión</span>
                  <span className="text-sm font-bold text-indigo-600">{tasa}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Ofertas totales
                  </span>
                  <span className="text-xs font-medium">{stat.total_ofertas}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-amber-600" /> Confirmadas
                  </span>
                  <span className="text-xs font-medium text-amber-700">
                    {stat.total_confirmadas}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <CreditCard className="h-3 w-3 text-green-600" /> Pagadas
                  </span>
                  <span className="text-xs font-medium text-green-700">
                    {stat.total_pagadas}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Clientes por Comercial</CardTitle>
            <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, número, teléfono..."
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

            <Select value={tieneOfertasFilter} onValueChange={setTieneOfertasFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="con-ofertas">Con ofertas</SelectItem>
                <SelectItem value="sin-ofertas">Sin ofertas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comercial</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Provincia / Municipio</TableHead>
                  <TableHead className="text-right">Ofertas</TableHead>
                  <TableHead className="text-right">Confirmadas</TableHead>
                  <TableHead className="text-right">Pagadas</TableHead>
                  <TableHead>Última oferta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Cargando clientes...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => {
                    const comercial = c.comercial || "Sin asignar";
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{comercial}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{c.nombre}</div>
                            {c.numero && (
                              <Badge variant="outline" className="text-xs">
                                #{c.numero}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{c.telefono || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {[c.provincia, c.municipio].filter(Boolean).join(" / ") || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{c.ofertas_count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {c.ofertas_confirmadas_count > 0 ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                              {c.ofertas_confirmadas_count}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.ofertas_pagadas_count > 0 ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              {c.ofertas_pagadas_count}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(c.ultima_oferta_fecha)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && filtered.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Mostrando {filtered.length} de {clientes.length} clientes
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
