"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Button } from "@/components/shared/atom/button";
import {
  Cpu,
  Battery,
  SunMedium,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
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
    estado.includes("instalacion terminada") ||
    estado.includes("instalada") ||
    estado.includes("instalado") ||
    estado.includes("finalizada") ||
    estado.includes("finalizado") ||
    estado.includes("operativo") ||
    estado.includes("funcionando") ||
    estado.includes("servicio") ||
    estado.includes("completada")
  );
};

const isClienteEntregado = (cliente: ClienteConEquipo) => {
  const estado = getEstadoNormalizado(cliente);
  return (
    isClienteEnServicio(cliente) ||
    estado.includes("instalacion en proceso") ||
    estado.includes("en instalacion") ||
    estado.includes("en proceso") ||
    estado.includes("proceso") ||
    estado.includes("entregado")
  );
};

const isClientePendiente = (cliente: ClienteConEquipo) => {
  const estado = getEstadoNormalizado(cliente);
  // Pendiente = cualquier cliente que aún NO está en servicio
  if (!isClienteEnServicio(cliente)) return true;

  return (
    estado.includes("pendiente") ||
    estado.includes("sin entregar") ||
    estado.includes("por entregar") ||
    estado.includes("por instalar") ||
    estado.includes("no iniciado")
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

  if (cantidadBase > 0) return cantidadBase;

  if (estado === "entregados" && isClienteEntregado(cliente)) {
    return cliente.cantidad_equipos;
  }
  if (estado === "servicio" && isClienteEnServicio(cliente)) {
    return cliente.cantidad_equipos;
  }
  if (estado === "pendientes" && isClientePendiente(cliente)) {
    return cliente.cantidad_equipos;
  }

  return 0;
};

const getClientesPorEstado = (equipo: EquipoDetalle) => ({
  entregados: (equipo.clientes || []).filter(
    (cliente) => cliente.unidades_entregadas > 0 || isClienteEntregado(cliente),
  ),
  servicio: (equipo.clientes || []).filter(
    (cliente) =>
      cliente.unidades_en_servicio > 0 || isClienteEnServicio(cliente),
  ),
  pendientes: (equipo.clientes || []).filter(
    (cliente) => cliente.unidades_pendientes > 0 || isClientePendiente(cliente),
  ),
});

function EstadoClientesList({
  title,
  estado,
  clientes,
  totalEquipos,
  isOpen,
  onToggle,
  className,
}: {
  title: string;
  estado: EstadoCliente;
  clientes: ClienteConEquipo[];
  totalEquipos: number;
  isOpen: boolean;
  onToggle: () => void;
  className: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-600" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-600" />
          )}
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${className}`}
          >
            {title}
          </span>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {totalEquipos} eq.
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 px-3 pb-3 pt-2">
          {clientes.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-400">
              Sin clientes
            </div>
          ) : (
            <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1">
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
      )}
    </div>
  );
}

export function EstadoEquiposStats({
  data,
  loading,
  onRefresh,
}: EstadoEquiposStatsProps) {
  const [expandedEquipos, setExpandedEquipos] = useState<Set<string>>(
    new Set(),
  );

  const equipos = useMemo(() => {
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
    [equipos],
  );

  const equiposOtros = useMemo(
    () =>
      equipos.filter((equipo) => {
        const inversor =
          isInversor(equipo.categoria) ||
          isInversor(equipo.tipo) ||
          isInversor(equipo.nombre);
        const bateria =
          isBateria(equipo.categoria) ||
          isBateria(equipo.tipo) ||
          isBateria(equipo.nombre);
        return !inversor && !bateria;
      }),
    [equipos],
  );

  const equiposPaneles = useMemo(
    () =>
      equipos
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
  const selectedEquipoKey = selectedByVista[vistaActiva];
  const equipoSeleccionado =
    itemsVista.find((item) => item.key === selectedEquipoKey)?.equipo || null;

  useEffect(() => {
    setExpandedCategorias({
      entregados: true,
      servicio: false,
      pendientes: false,
    });
  }, [vistaActiva, selectedEquipoKey]);

  const clientesEntregados = equipoSeleccionado
    ? getClientesEstado(equipoSeleccionado, "entregados")
    : [];
  const clientesServicio = equipoSeleccionado
    ? getClientesEstado(equipoSeleccionado, "servicio")
    : [];
  const clientesPendientes = equipoSeleccionado
    ? getClientesEstado(equipoSeleccionado, "pendientes")
    : [];

  const equiposEntregadosSinServicio = equipoSeleccionado
    ? Math.max(
        equipoSeleccionado.unidades_entregadas -
          equipoSeleccionado.unidades_en_servicio,
        0,
      )
    : 0;
  const equiposServicio = equipoSeleccionado?.unidades_en_servicio || 0;
  const equiposPendientes = equipoSeleccionado?.unidades_sin_entregar || 0;

  const metricasVista = useMemo(() => {
    const items = itemsVista.map((item) => item.equipo);
    return {
      equipos: items.length,
      vendidos: items.reduce((acc, it) => acc + it.unidades_vendidas, 0),
      entregados: items.reduce(
        (acc, it) =>
          acc + Math.max(it.unidades_entregadas - it.unidades_en_servicio, 0),
        0,
      ),
      servicio: items.reduce((acc, it) => acc + it.unidades_en_servicio, 0),
      pendientes: items.reduce((acc, it) => acc + it.unidades_sin_entregar, 0),
    };
  }, [itemsVista]);

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
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
            <div className="mr-2 h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
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

  const toggleCategoria = (estado: EstadoCliente) => {
    setExpandedCategorias((prev) => ({ ...prev, [estado]: !prev[estado] }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-2">
        <div className="flex gap-2 overflow-x-auto">
          {vistas.map((vista) => {
            const Icon = vista.icon;
            const active = vistaActiva === vista.key;
            return (
              <button
                key={vista.key}
                type="button"
                onClick={() => setVistaActiva(vista.key)}
                className={`flex min-w-[180px] items-center justify-between rounded-md border px-3 py-2 transition ${
                  active
                    ? vista.activeClass
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-semibold uppercase tracking-wide">
                    {vista.label}
                  </span>
                </span>
                <span className="text-sm font-bold">
                  {equiposPorVista[vista.key].length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-center">
          <p className="text-xs uppercase text-slate-500">Equipos</p>
          <p className="text-base font-semibold text-slate-800">
            {metricasVista.equipos}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-blue-50 px-3 py-2 text-center">
          <p className="text-xs uppercase text-blue-700">Vendidos</p>
          <p className="text-base font-semibold text-blue-900">
            {metricasVista.vendidos}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-xs uppercase text-emerald-700">Entregados</p>
          <p className="text-base font-semibold text-emerald-900">
            {metricasVista.entregados}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-violet-50 px-3 py-2 text-center">
          <p className="text-xs uppercase text-violet-700">Servicio</p>
          <p className="text-base font-semibold text-violet-900">
            {metricasVista.servicio}
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-amber-50 px-3 py-2 text-center">
          <p className="text-xs uppercase text-amber-700">Pendientes</p>
          <p className="text-base font-semibold text-amber-900">
            {metricasVista.pendientes}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_1.4fr]">
        <Card className="overflow-hidden border border-slate-200 shadow-sm">
          <CardHeader
            className={`border-b border-slate-100 bg-gradient-to-r ${vistaConfig.headerClass} py-3`}
          >
            <CardTitle className="text-base font-semibold text-slate-900">
              Catálogo de {vistaConfig.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
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
                      className={`w-full rounded-md border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">
                          {equipo.nombre}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {equipo.unidades_vendidas} Vendidos
                        </span>
                      </div>
                      <div
                        className={`mt-1.5 grid grid-cols-4 gap-1 text-xs ${active ? "text-white/80" : "text-slate-600"}`}
                      >
                        <span>Vendidos: {equipo.unidades_vendidas}</span>
                        <span>
                          Entregados:{" "}
                          {Math.max(
                            equipo.unidades_entregadas -
                              equipo.unidades_en_servicio,
                            0,
                          )}
                        </span>
                        <span>En servicio: {equipo.unidades_en_servicio}</span>
                        <span>Pendientes: {equipo.unidades_sin_entregar}</span>
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
            className={`border-b border-slate-100 bg-gradient-to-r ${vistaConfig.headerClass} py-3`}
          >
            <CardTitle className="text-base font-semibold text-slate-900">
              Desglose por categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {!equipoSeleccionado ? (
              <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Selecciona un equipo para ver su detalle.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {equipoSeleccionado.nombre}
                      </p>
                      <p className="text-sm text-slate-500">
                        {equipoSeleccionado.tipo} •{" "}
                        {equipoSeleccionado.categoria} •{" "}
                        {equipoSeleccionado.codigo}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      {equipoSeleccionado.unidades_vendidas} vendidos
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <CategoriaAccordion
                    title="Entregados (sin servicio)"
                    estado="entregados"
                    clientes={clientesEntregados}
                    totalEquipos={equiposEntregadosSinServicio}
                    isOpen={expandedCategorias.entregados}
                    onToggle={() => toggleCategoria("entregados")}
                    className="bg-emerald-50 text-emerald-700"
                  />
                  <CategoriaAccordion
                    title="En servicio"
                    estado="servicio"
                    clientes={clientesServicio}
                    totalEquipos={equiposServicio}
                    isOpen={expandedCategorias.servicio}
                    onToggle={() => toggleCategoria("servicio")}
                    className="bg-violet-50 text-violet-700"
                  />
                  <CategoriaAccordion
                    title="Pendientes"
                    estado="pendientes"
                    clientes={clientesPendientes}
                    totalEquipos={equiposPendientes}
                    isOpen={expandedCategorias.pendientes}
                    onToggle={() => toggleCategoria("pendientes")}
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
