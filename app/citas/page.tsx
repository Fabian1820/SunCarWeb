"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus, Search, Settings, UserPlus } from "lucide-react";

import { RouteGuard } from "@/components/auth/route-guard";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import { Card, CardContent } from "@/components/shared/molecule/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/molecule/tabs";
import { Toaster } from "@/components/shared/molecule/toaster";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { AgendaDia } from "@/components/feats/citas/agenda-dia";
import { CitaDetalleDialog } from "@/components/feats/citas/cita-detalle-dialog";
import { CitaFormDialog } from "@/components/feats/citas/cita-form-dialog";
import { CitasTable } from "@/components/feats/citas/citas-table";
import { ConfiguracionCitas } from "@/components/feats/citas/configuracion-citas";
import { useAuth } from "@/contexts/auth-context";
import { hoyISO, sumarDias, useAgendaDia, useCitas } from "@/hooks/use-citas";
import { CitasService } from "@/lib/services/feats/citas/citas-service";
import type { Cita } from "@/lib/types/feats/citas/citas-types";

function CitasPageContent() {
  const { hasExactPermission } = useAuth();
  const puedeAgendar = hasExactPermission("citas/agendar");
  const puedeGestionar = hasExactPermission("citas/gestionar");
  const puedeConfigurar = hasExactPermission("citas/configurar");

  const {
    fecha,
    setFecha,
    agenda,
    loading: cargandoAgenda,
    error: errorAgenda,
    recargar: recargarAgenda,
  } = useAgendaDia();

  const {
    citas,
    total,
    filtros,
    setFiltros,
    loading: cargandoCitas,
    error: errorCitas,
    recargar: recargarCitas,
    crear,
    crearEspontanea,
    cambiarEstado,
    posponer,
    reasignar,
  } = useCitas({
    fecha_desde: sumarDias(hoyISO(), -30),
    fecha_hasta: sumarDias(hoyISO(), 60),
    limit: 200,
  });

  const [formAbierto, setFormAbierto] = useState(false);
  const [modoForm, setModoForm] = useState<"agendada" | "espontanea">("agendada");
  const [slotInicial, setSlotInicial] = useState<{
    comercial_ci: string;
    hora_inicio: string;
  } | null>(null);

  const [citaAbierta, setCitaAbierta] = useState<Cita | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // La agenda y el listado leen lo mismo, así que cualquier cambio tiene que
  // refrescar ambos: si no, se cierra un diálogo y la rejilla sigue vieja.
  const refrescarTodo = async () => {
    await Promise.all([recargarAgenda(), recargarCitas()]);
  };

  const conRefresco = async (accion: () => Promise<boolean>) => {
    setProcesando(true);
    try {
      const ok = await accion();
      if (ok) await refrescarTodo();
      return ok;
    } finally {
      setProcesando(false);
    }
  };

  // Búsqueda del listado con debounce, para no pedir en cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltros((prev) => ({ ...prev, q: busqueda.trim() || undefined }));
    }, 350);
    return () => clearTimeout(timer);
  }, [busqueda, setFiltros]);

  const abrirAgendar = (comercialCi: string, horaInicio: string) => {
    setModoForm("agendada");
    setSlotInicial({ comercial_ci: comercialCi, hora_inicio: horaInicio });
    setFormAbierto(true);
  };

  const abrirNuevaCita = () => {
    setModoForm("agendada");
    setSlotInicial(null);
    setFormAbierto(true);
  };

  const abrirEspontanea = () => {
    setModoForm("espontanea");
    setSlotInicial(null);
    setFormAbierto(true);
  };

  // Al abrir una cita desde el listado puede ser de otro día que el que
  // muestra la agenda; se mueve la agenda a esa fecha para que reasignar y
  // posponer trabajen con las comerciales correctas.
  const abrirCita = (cita: Cita) => {
    if (cita.fecha !== fecha) setFecha(cita.fecha);
    setCitaAbierta(cita);
  };

  // Mientras el diálogo está abierto, se relee la cita tras cada acción para
  // que el historial y el estado que se ven sean los ya guardados.
  const refrescarCitaAbierta = async (id: string) => {
    const actualizada = await CitasService.obtener(id).catch(() => null);
    if (actualizada) setCitaAbierta(actualizada);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Citas"
        subtitle="Agenda de visitas de clientes y leads con las comerciales."
        badge={{
          text: "Comercial",
          className: "bg-emerald-100 text-emerald-800",
        }}
        actions={
          <div className="flex flex-wrap gap-2">
            {puedeAgendar && (
              <>
                <Button variant="outline" size="sm" onClick={abrirEspontanea}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Llegó sin cita
                </Button>
                <Button size="sm" onClick={abrirNuevaCita}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nueva cita
                </Button>
              </>
            )}
          </div>
        }
      />

      <main className="content-with-fixed-header mx-auto max-w-[96rem] px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
        <Tabs defaultValue="agenda" className="space-y-4">
          <TabsList>
            <TabsTrigger value="agenda">
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Agenda del día
            </TabsTrigger>
            <TabsTrigger value="listado">Listado</TabsTrigger>
            <TabsTrigger value="configuracion">
              <Settings className="mr-1.5 h-4 w-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="mt-0">
            <AgendaDia
              fecha={fecha}
              onFechaChange={setFecha}
              agenda={agenda}
              loading={cargandoAgenda}
              error={errorAgenda}
              onAgendar={abrirAgendar}
              onAbrirCita={abrirCita}
              puedeAgendar={puedeAgendar}
            />
          </TabsContent>

          <TabsContent value="listado" className="mt-0 space-y-4">
            <Card className="border-l-4 border-l-emerald-600">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="relative lg:col-span-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar por contacto, teléfono o motivo..."
                      className="pl-10"
                    />
                  </div>
                  <Input
                    type="date"
                    value={filtros.fecha_desde || ""}
                    onChange={(e) =>
                      setFiltros((p) => ({
                        ...p,
                        fecha_desde: e.target.value || undefined,
                      }))
                    }
                  />
                  <Input
                    type="date"
                    value={filtros.fecha_hasta || ""}
                    onChange={(e) =>
                      setFiltros((p) => ({
                        ...p,
                        fecha_hasta: e.target.value || undefined,
                      }))
                    }
                  />
                  <Select
                    value={filtros.estado || "todos"}
                    onValueChange={(v) =>
                      setFiltros((p) => ({
                        ...p,
                        estado: v === "todos" ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="agendada">Agendada</SelectItem>
                      <SelectItem value="confirmada">Vino</SelectItem>
                      <SelectItem value="no_vino">No vino</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Select
                    value={filtros.comercial_ci || "todas"}
                    onValueChange={(v) =>
                      setFiltros((p) => ({
                        ...p,
                        comercial_ci: v === "todas" ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger className="w-auto min-w-[200px]">
                      <SelectValue placeholder="Comercial" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas las comerciales</SelectItem>
                      {(agenda?.comerciales || []).map((c) => (
                        <SelectItem key={c.comercial_ci} value={c.comercial_ci}>
                          {c.comercial_nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filtros.tipo || "todos"}
                    onValueChange={(v) =>
                      setFiltros((p) => ({
                        ...p,
                        tipo: v === "todos" ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger className="w-auto min-w-[180px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="agendada">Con cita</SelectItem>
                      <SelectItem value="espontanea">Sin cita</SelectItem>
                    </SelectContent>
                  </Select>

                  <span className="ml-auto text-sm text-slate-600">
                    {total} {total === 1 ? "cita" : "citas"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {errorCitas && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 text-sm text-red-800">
                  {errorCitas}
                </CardContent>
              </Card>
            )}

            <CitasTable
              citas={citas}
              loading={cargandoCitas}
              onAbrirCita={abrirCita}
            />
          </TabsContent>

          <TabsContent value="configuracion" className="mt-0">
            <ConfiguracionCitas
              puedeEditar={puedeConfigurar}
              onGuardado={refrescarTodo}
            />
          </TabsContent>
        </Tabs>
      </main>

      <CitaFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        modo={modoForm}
        agenda={agenda}
        inicial={slotInicial}
        guardando={procesando}
        onCrear={(data) => conRefresco(() => crear(data))}
        onCrearEspontanea={(data) => conRefresco(() => crearEspontanea(data))}
      />

      <CitaDetalleDialog
        open={Boolean(citaAbierta)}
        onOpenChange={(abierto) => !abierto && setCitaAbierta(null)}
        cita={citaAbierta}
        agenda={agenda}
        procesando={procesando}
        puedeGestionar={puedeGestionar}
        onCambiarEstado={async (id, estado, motivo) => {
          const ok = await conRefresco(() => cambiarEstado(id, estado, motivo));
          if (ok) await refrescarCitaAbierta(id);
          return ok;
        }}
        onPosponer={async (id, f, h, motivo) => {
          const ok = await conRefresco(() => posponer(id, f, h, motivo));
          if (ok) await refrescarCitaAbierta(id);
          return ok;
        }}
        onReasignar={async (id, ci, motivo) => {
          const ok = await conRefresco(() => reasignar(id, ci, motivo));
          if (ok) await refrescarCitaAbierta(id);
          return ok;
        }}
      />

      <Toaster />
    </div>
  );
}

export default function CitasPage() {
  return (
    <RouteGuard requiredModule="citas">
      <CitasPageContent />
    </RouteGuard>
  );
}
