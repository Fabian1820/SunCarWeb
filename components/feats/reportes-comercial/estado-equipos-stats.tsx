"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import { RefreshCw, Cpu, Battery, SunMedium, Clock3 } from "lucide-react";
import type {
  EstadoEquiposData,
  EquipoDetalle,
  ClienteConEquipo,
} from "@/lib/types/feats/reportes-comercial/reportes-comercial-types";

interface EstadoEquiposStatsProps {
  data: EstadoEquiposData | null;
  loading: boolean;
  onRefresh: () => void;
}

type VistaKey = "inversores" | "baterias" | "paneles";
type EstadoCliente = "entregados" | "servicio" | "pendientes";

interface EquipoItem {
  key: string;
  equipo: EquipoDetalle;
}

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const isInversor = (text: string) => normalizeText(text).includes("inversor");
const isBateria = (text: string) => normalizeText(text).includes("bateria");
const isPanel = (text: string) => normalizeText(text).includes("panel");

const getEstadoNormalizado = (cliente: ClienteConEquipo) =>
  normalizeText(cliente.estado || "");

const isClienteEnServicio = (cliente: ClienteConEquipo) => {
  const estado = getEstadoNormalizado(cliente);
  return (
    estado.includes("instalacion completada") ||
    estado.includes("servicio") ||
    estado.includes("completada")
  );
};

const isClienteEntregado = (cliente: ClienteConEquipo) => {
  const estado = getEstadoNormalizado(cliente);
  return (
    isClienteEnServicio(cliente) ||
    estado.includes("instalacion en proceso") ||
    estado.includes("en proceso") ||
    estado.includes("entregado")
  );
};

const isClientePendiente = (cliente: ClienteConEquipo) => {
  const estado = getEstadoNormalizado(cliente);
  return (
    estado.includes("pendiente") ||
    estado.includes("sin entregar") ||
    estado.includes("por entregar") ||
    (!isClienteEntregado(cliente) && !isClienteEnServicio(cliente))
  );
};

const getCantidadPorEstado = (
  cliente: ClienteConEquipo,
  estado: EstadoCliente,
) => {
  const directa =
    estado === "entregados"
      ? cliente.unidades_entregadas
      : estado === "servicio"
        ? cliente.unidades_en_servicio
        : cliente.unidades_pendientes;

  if (directa > 0) return directa;
  return cliente.cantidad_equipos || 0;
};

const getClientesEstado = (equipo: EquipoDetalle, estado: EstadoCliente) => {
  const clientes = equipo.clientes || [];
  if (estado === "entregados") {
    return clientes.filter(
      (cliente) =>
        cliente.unidades_entregadas > 0 || isClienteEntregado(cliente),
    );
  }
  if (estado === "servicio") {
    return clientes.filter(
      (cliente) =>
        cliente.unidades_en_servicio > 0 || isClienteEnServicio(cliente),
    );
  }
  return clientes.filter(
    (cliente) => cliente.unidades_pendientes > 0 || isClientePendiente(cliente),
  );
};

const mapEquipos = (equipos: EquipoDetalle[], prefix: string): EquipoItem[] =>
  equipos.map((equipo, index) => ({
    key: `${prefix}-${equipo.id || equipo.codigo || index}-${normalizeText(equipo.nombre)}`,
    equipo,
  }));

function ClienteRow({
  cliente,
  estado,
}: {
  cliente: ClienteConEquipo;
  estado: EstadoCliente;
}) {
  const cantidad = getCantidadPorEstado(cliente, estado);

  return (
    <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-800">
            {cliente.nombre}
          </p>
          <p className="truncate text-[10px] text-slate-500">
            {cliente.direccion} - {cliente.provincia}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
            {cantidad} eq.
          </span>
          <span className="max-w-[130px] truncate text-[10px] text-slate-500">
            {cliente.estado}
          </span>
        </div>
      </div>
    </div>
  );
}

function EstadoPanel({
  title,
  estado,
  clientes,
  className,
}: {
  title: string;
  estado: EstadoCliente;
  clientes: ClienteConEquipo[];
  className: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
        >
          {title}
        </span>
        <span className="text-[10px] text-slate-500">{clientes.length}</span>
      </div>
      {clientes.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-white px-2 py-2 text-center text-[10px] text-slate-400">
          Sin clientes
        </div>
      ) : (
        <div className="max-h-[32vh] space-y-1 overflow-y-auto pr-1">
          {clientes.map((cliente) => (
            <ClienteRow
              key={`${estado}-${cliente.id}`}
              cliente={cliente}
              estado={estado}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function EstadoEquiposStats({
  data,
  loading,
  onRefresh,
}: EstadoEquiposStatsProps) {
  const [vistaActiva, setVistaActiva] = useState<VistaKey>("inversores");
  const [selectedByVista, setSelectedByVista] = useState<
    Record<VistaKey, string | null>
  >({
    inversores: null,
    baterias: null,
    paneles: null,
  });

  const todosLosEquipos = useMemo(() => {
    if (!data) return [];
    return data.categorias.flatMap((categoria) => categoria.equipos);
  }, [data]);

  const equiposPorVista = useMemo(() => {
    const inversores = mapEquipos(
      [...todosLosEquipos]
        .filter(
          (item) =>
            isInversor(item.categoria) ||
            isInversor(item.tipo) ||
            isInversor(item.nombre),
        )
        .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas),
      "inv",
    );

    const baterias = mapEquipos(
      [...todosLosEquipos]
        .filter(
          (item) =>
            isBateria(item.categoria) ||
            isBateria(item.tipo) ||
            isBateria(item.nombre),
        )
        .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas),
      "bat",
    );

    const paneles = mapEquipos(
      [...todosLosEquipos]
        .filter(
          (item) =>
            isPanel(item.categoria) ||
            isPanel(item.tipo) ||
            isPanel(item.nombre),
        )
        .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas),
      "pan",
    );

    return { inversores, baterias, paneles };
  }, [todosLosEquipos]);

  useEffect(() => {
    setSelectedByVista((prev) => {
      const next = { ...prev };
      let changed = false;

      (["inversores", "baterias", "paneles"] as VistaKey[]).forEach((vista) => {
        const items = equiposPorVista[vista];
        if (items.length === 0) {
          if (next[vista] !== null) {
            next[vista] = null;
            changed = true;
          }
          return;
        }

        const exists = items.some((item) => item.key === next[vista]);
        if (!exists) {
          next[vista] = items[0].key;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [equiposPorVista]);

  const itemsVista = equiposPorVista[vistaActiva];
  const equipoSeleccionado =
    itemsVista.find((item) => item.key === selectedByVista[vistaActiva])
      ?.equipo || null;

  const clientesEntregados = equipoSeleccionado
    ? getClientesEstado(equipoSeleccionado, "entregados")
    : [];
  const clientesServicio = equipoSeleccionado
    ? getClientesEstado(equipoSeleccionado, "servicio")
    : [];
  const clientesPendientes = equipoSeleccionado
    ? getClientesEstado(equipoSeleccionado, "pendientes")
    : [];

  const metricasVista = useMemo(() => {
    const items = itemsVista.map((item) => item.equipo);
    return {
      equipos: items.length,
      vendidos: items.reduce((acc, it) => acc + it.unidades_vendidas, 0),
      entregados: items.reduce((acc, it) => acc + it.unidades_entregadas, 0),
      servicio: items.reduce((acc, it) => acc + it.unidades_en_servicio, 0),
      pendientes: items.reduce((acc, it) => acc + it.unidades_sin_entregar, 0),
    };
  }, [itemsVista]);

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-700" />
          <p className="text-sm text-slate-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border border-orange-200">
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-semibold text-slate-900">
            No se pudieron cargar los datos
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Verifica conexión con el backend e intenta nuevamente.
          </p>
          <Button
            onClick={onRefresh}
            className="mt-5 bg-orange-600 hover:bg-orange-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const vistas: Array<{
    key: VistaKey;
    label: string;
    icon: typeof Cpu;
    activeClass: string;
    headerClass: string;
  }> = [
    {
      key: "inversores",
      label: "Inversores",
      icon: Cpu,
      activeClass: "border-blue-500 bg-blue-50 text-blue-900",
      headerClass: "from-slate-50 to-blue-50",
    },
    {
      key: "baterias",
      label: "Baterías",
      icon: Battery,
      activeClass: "border-emerald-500 bg-emerald-50 text-emerald-900",
      headerClass: "from-slate-50 to-emerald-50",
    },
    {
      key: "paneles",
      label: "Paneles",
      icon: SunMedium,
      activeClass: "border-amber-500 bg-amber-50 text-amber-900",
      headerClass: "from-slate-50 to-amber-50",
    },
  ];

  const vistaConfig = vistas.find((vista) => vista.key === vistaActiva)!;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Clock3 className="h-4 w-4 text-slate-500" />
          Última actualización:{" "}
          {new Date(data.fecha_actualizacion).toLocaleString("es-ES")}
        </p>
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-1.5">
        <div className="flex gap-1.5 overflow-x-auto">
          {vistas.map((vista) => {
            const Icon = vista.icon;
            const active = vistaActiva === vista.key;
            return (
              <button
                key={vista.key}
                type="button"
                onClick={() => setVistaActiva(vista.key)}
                className={`flex min-w-[160px] items-center justify-between rounded-md border px-2.5 py-1.5 transition ${
                  active
                    ? vista.activeClass
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {vista.label}
                  </span>
                </span>
                <span className="text-xs font-bold">
                  {equiposPorVista[vista.key].length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center">
          <p className="text-[10px] uppercase text-slate-500">Equipos</p>
          <p className="text-sm font-semibold text-slate-800">
            {metricasVista.equipos}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-blue-50 px-2 py-1.5 text-center">
          <p className="text-[10px] uppercase text-blue-700">Vendidos</p>
          <p className="text-sm font-semibold text-blue-900">
            {metricasVista.vendidos}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-emerald-50 px-2 py-1.5 text-center">
          <p className="text-[10px] uppercase text-emerald-700">Entregados</p>
          <p className="text-sm font-semibold text-emerald-900">
            {metricasVista.entregados}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-violet-50 px-2 py-1.5 text-center">
          <p className="text-[10px] uppercase text-violet-700">Servicio</p>
          <p className="text-sm font-semibold text-violet-900">
            {metricasVista.servicio}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-amber-50 px-2 py-1.5 text-center">
          <p className="text-[10px] uppercase text-amber-700">Pendientes</p>
          <p className="text-sm font-semibold text-amber-900">
            {metricasVista.pendientes}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_1.4fr]">
        <Card className="overflow-hidden border border-slate-200 shadow-sm">
          <CardHeader
            className={`border-b border-slate-100 bg-gradient-to-r ${vistaConfig.headerClass} py-2.5`}
          >
            <CardTitle className="text-sm font-semibold text-slate-900">
              Catálogo de {vistaConfig.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5">
            <div className="max-h-[calc(100vh-18rem)] space-y-1.5 overflow-y-auto pr-1">
              {itemsVista.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No hay equipos para esta vista.
                </div>
              ) : (
                itemsVista.map((item) => {
                  const active = selectedByVista[vistaActiva] === item.key;
                  const equipo = item.equipo;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setSelectedByVista((prev) => ({
                          ...prev,
                          [vistaActiva]: item.key,
                        }))
                      }
                      className={`w-full rounded-md border px-2.5 py-2 text-left transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold">
                          {equipo.nombre}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {equipo.unidades_vendidas} V
                        </span>
                      </div>
                      <div
                        className={`mt-1 grid grid-cols-4 gap-1 text-[10px] ${active ? "text-white/80" : "text-slate-600"}`}
                      >
                        <span>V: {equipo.unidades_vendidas}</span>
                        <span>E: {equipo.unidades_entregadas}</span>
                        <span>S: {equipo.unidades_en_servicio}</span>
                        <span>P: {equipo.unidades_sin_entregar}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-slate-200 shadow-sm">
          <CardHeader
            className={`border-b border-slate-100 bg-gradient-to-r ${vistaConfig.headerClass} py-2.5`}
          >
            <CardTitle className="text-sm font-semibold text-slate-900">
              Clientes por estado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2.5">
            {!equipoSeleccionado ? (
              <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Selecciona un equipo para ver su detalle.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {equipoSeleccionado.nombre}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {equipoSeleccionado.tipo} •{" "}
                        {equipoSeleccionado.categoria} •{" "}
                        {equipoSeleccionado.codigo}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">
                      {equipoSeleccionado.unidades_vendidas} vendidos
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 2xl:grid-cols-3">
                  <EstadoPanel
                    title="Entregados"
                    estado="entregados"
                    clientes={clientesEntregados}
                    className="bg-emerald-50 text-emerald-700"
                  />
                  <EstadoPanel
                    title="En servicio"
                    estado="servicio"
                    clientes={clientesServicio}
                    className="bg-violet-50 text-violet-700"
                  />
                  <EstadoPanel
                    title="Pendientes"
                    estado="pendientes"
                    clientes={clientesPendientes}
                    className="bg-amber-50 text-amber-700"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
