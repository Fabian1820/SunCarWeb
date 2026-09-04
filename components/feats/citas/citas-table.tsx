"use client";

import { Loader2 } from "lucide-react";

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
  CLASE_ESTADO,
  ETIQUETA_ESTADO,
  type Cita,
} from "@/lib/types/feats/citas/citas-types";

interface CitasTableProps {
  citas: Cita[];
  loading: boolean;
  onAbrirCita: (cita: Cita) => void;
}

export function CitasTable({ citas, loading, onAbrirCita }: CitasTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando citas...
      </div>
    );
  }

  if (citas.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white py-16 text-center text-slate-500">
        No hay citas con esos filtros.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Hora</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Comercial</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {citas.map((cita) => (
            <TableRow
              key={cita.id}
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => onAbrirCita(cita)}
            >
              <TableCell className="whitespace-nowrap font-medium">
                {cita.fecha}
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-600">
                {cita.hora_inicio}–{cita.hora_fin}
              </TableCell>
              <TableCell>
                <div className="font-medium text-slate-900">
                  {cita.contacto_nombre}
                </div>
                {cita.contacto_telefono && (
                  <div className="text-xs text-slate-500">
                    {cita.contacto_telefono}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-slate-700">
                {cita.comercial_nombre || cita.comercial_ci}
              </TableCell>
              <TableCell className="max-w-[240px] truncate text-slate-600">
                {cita.motivo || "—"}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant="outline" className={CLASE_ESTADO[cita.estado]}>
                    {ETIQUETA_ESTADO[cita.estado]}
                  </Badge>
                  {cita.tipo === "espontanea" && (
                    <Badge
                      variant="outline"
                      className="bg-purple-100 text-purple-800"
                    >
                      Sin cita
                    </Badge>
                  )}
                  {cita.veces_pospuesta > 0 && (
                    <Badge variant="outline" className="text-amber-700">
                      {cita.veces_pospuesta}× pospuesta
                    </Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
