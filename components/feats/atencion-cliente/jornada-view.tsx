"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { Badge } from "@/components/shared/atom/badge";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { Clock, Loader2, Plus, Send, Users } from "lucide-react";
import { CreateLeadDialog } from "@/components/feats/leads/create-lead-dialog";
import { AtencionClienteService } from "@/lib/services/feats/atencion-cliente/atencion-cliente-service";
import { FuenteService, LeadService } from "@/lib/api-services";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import type {
  EstadoDia,
  LeadDelDia,
} from "@/lib/types/feats/atencion-cliente/atencion-cliente-types";
import type { LeadCreateData } from "@/lib/types/feats/leads/lead-types";

/** Hoy en la zona del navegador, que es la de Cuba para quien usa esto. */
function hoyISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function JornadaView() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [fecha, setFecha] = useState(hoyISO());
  const [estado, setEstado] = useState<EstadoDia | null>(null);
  const [leads, setLeads] = useState<LeadDelDia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fuentes, setFuentes] = useState<string[]>([]);

  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [destino, setDestino] = useState("");
  const [repartiendo, setRepartiendo] = useState(false);
  const [creando, setCreando] = useState(false);
  const [dialogoLead, setDialogoLead] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [estadoDia, delDia] = await Promise.all([
        AtencionClienteService.getEstadoDia(fecha),
        AtencionClienteService.getLeadsDelDia(fecha),
      ]);
      setEstado(estadoDia);
      setLeads(delDia.leads);
      setSeleccion([]);
    } catch (error) {
      toast({
        title: "No se pudo cargar la jornada",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setCargando(false);
    }
  }, [fecha, toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    FuenteService.getFuentes(true)
      .then((lista) => setFuentes(lista.map((f: any) => f.nombre).filter(Boolean)))
      .catch(() => setFuentes([]));
  }, []);

  const estoyDeGuardia = useMemo(
    () => !!user && (estado?.de_guardia || []).some((c) => c.CI === user.ci),
    [estado, user],
  );

  const sinRepartir = useMemo(
    () => leads.filter((l) => !l.comercial && !l.comercial_ci),
    [leads],
  );

  /** Cuántos leads del día lleva cada comercial. Es el "cuántos le asigné a
   *  cada uno" del cierre de jornada, y sale de los propios leads: no hay un
   *  contador aparte que se pueda desincronizar. */
  const repartoDelDia = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const lead of leads) {
      const nombre = lead.comercial || lead.comercial_ci;
      if (!nombre) continue;
      cuenta.set(nombre, (cuenta.get(nombre) || 0) + 1);
    }
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
  }, [leads]);

  const alternar = (id: string) => {
    setSeleccion((previa) =>
      previa.includes(id) ? previa.filter((x) => x !== id) : [...previa, id],
    );
  };

  const alternarTodos = () => {
    setSeleccion((previa) =>
      previa.length === sinRepartir.length ? [] : sinRepartir.map((l) => l.id),
    );
  };

  const repartir = async () => {
    if (!destino || seleccion.length === 0) return;
    setRepartiendo(true);
    try {
      const resultado = await AtencionClienteService.repartir(fecha, [
        { comercial_ci: destino, lead_ids: seleccion },
      ]);
      toast({
        title: "Leads repartidos",
        description: `${resultado.total} lead(s) para ${
          resultado.asignaciones[0]?.nombre ?? "el comercial"
        }.`,
      });
      setDestino("");
      await cargar();
    } catch (error) {
      toast({
        title: "No se pudo repartir",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setRepartiendo(false);
    }
  };

  const crearLead = async (data: LeadCreateData) => {
    setCreando(true);
    try {
      await LeadService.createLead(data);
      toast({ title: "Lead registrado" });
      setDialogoLead(false);
      await cargar();
    } catch (error) {
      toast({
        title: "No se pudo registrar el lead",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setCreando(false);
    }
  };

  if (cargando && !estado) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando la jornada…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              Guardia del día
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="fecha-jornada" className="text-xs text-gray-500">
                Día
              </Label>
              <Input
                id="fecha-jornada"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value || hoyISO())}
                className="h-9 w-[10.5rem]"
              />
              <Button onClick={() => setDialogoLead(true)} className="h-9">
                <Plus className="h-4 w-4 mr-2" />
                Registrar lead
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!estado?.planificado ? (
            <p className="text-sm text-gray-500">
              Este día no tiene guardia planificada. Se puede registrar y repartir
              igual; queda marcado como trabajo fuera de turno.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {estado.turnos.map((turno) => {
                const vigente = turno.clave === estado.turno_vigente;
                return (
                  <div
                    key={turno.clave}
                    className={`rounded-lg border px-3 py-2 ${
                      vigente
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {turno.nombre}
                      </span>
                      <span className="text-xs text-gray-500">
                        {turno.inicio}–{turno.fin}
                      </span>
                      {vigente && (
                        <Badge className="bg-emerald-600 text-white">Ahora</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {turno.comerciales.length === 0
                        ? "Sin nadie asignado"
                        : turno.comerciales.map((c) => c.nombre).join(", ")}
                    </div>
                    {turno.suplencias.length > 0 && (
                      <div className="mt-1 text-xs text-amber-700">
                        {turno.suplencias.length} suplencia(s) registrada(s)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {estoyDeGuardia && (
              <Badge className="bg-emerald-600 text-white">Estás de guardia</Badge>
            )}
            <span className="text-gray-500">
              Hora local {estado?.hora_local ?? "—"}
            </span>
            {estado?.autoasignacion_habilitada && (
              <span className="text-amber-700">
                Todos los comerciales están de guardia hoy: se permite repartirse
                leads a uno mismo.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">
              Leads registrados el {fecha}
              <span className="ml-2 text-sm font-normal text-gray-500">
                {leads.length} en total · {sinRepartir.length} sin repartir
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={destino} onValueChange={setDestino}>
                <SelectTrigger className="h-9 w-[15rem]">
                  <SelectValue placeholder="Repartir a…" />
                </SelectTrigger>
                <SelectContent>
                  {(estado?.destinatarios_reparto || []).map((c) => (
                    <SelectItem key={c.CI} value={c.CI}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={repartir}
                disabled={!destino || seleccion.length === 0 || repartiendo}
                className="h-9"
              >
                {repartiendo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Asignar {seleccion.length > 0 ? `(${seleccion.length})` : ""}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Los comerciales de guardia hoy no aparecen en la lista: durante su
            guardia atienden WhatsApp y no reciben leads del reparto.
          </p>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Todavía no hay leads registrados este día.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          sinRepartir.length > 0 &&
                          seleccion.length === sinRepartir.length
                        }
                        onCheckedChange={alternarTodos}
                        aria-label="Seleccionar todos los pendientes"
                      />
                    </TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Comercial</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const repartido = !!(lead.comercial || lead.comercial_ci);
                    return (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <Checkbox
                            checked={seleccion.includes(lead.id)}
                            onCheckedChange={() => alternar(lead.id)}
                            aria-label={`Seleccionar ${lead.nombre ?? "lead"}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {lead.nombre || "—"}
                        </TableCell>
                        <TableCell>{lead.telefono || "—"}</TableCell>
                        <TableCell>{lead.estado || "—"}</TableCell>
                        <TableCell>
                          {repartido ? (
                            <span className="text-gray-900">{lead.comercial}</span>
                          ) : (
                            <span className="text-amber-700">Sin repartir</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {repartoDelDia.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Reparto del día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {repartoDelDia.map(([nombre, cantidad]) => (
                <Badge key={nombre} variant="outline" className="text-sm">
                  {nombre}: {cantidad}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogoLead} onOpenChange={setDialogoLead}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden p-0 gap-0 flex flex-col">
          <DialogHeader className="shrink-0 border-b border-gray-100 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-gray-900">
              Registrar lead
            </DialogTitle>
          </DialogHeader>
          <CreateLeadDialog
            onSubmit={crearLead}
            onCancel={() => setDialogoLead(false)}
            availableSources={fuentes}
            isLoading={creando}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
