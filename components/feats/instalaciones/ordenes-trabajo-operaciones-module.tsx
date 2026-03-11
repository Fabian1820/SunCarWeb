"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Copy,
  FileText,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import { Textarea } from "@/components/shared/molecule/textarea";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/shared/molecule/toaster";

type MaterialRow = {
  id: string;
  nombre: string;
  unidad: string;
  entregado: string;
  gastado: string;
};

type WorkOrder = {
  id: string;
  codigo: string;
  fecha: string;
  celular: string;
  cliente: string;
  direccion: string;
  otorgadoA: string;
  aEjecutar: string;
  pgd: string;
  esquemaGeneral: string;
  comunicacion: string;
  materiales: MaterialRow[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "operaciones_ordenes_trabajo_v1";
const EMPTY_TABLE_ROWS = 10;

const nowIso = () => new Date().toISOString();

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getCodeSeed = (value: number) => String(value).padStart(2, "0");

const buildDefaultCode = () => {
  const date = new Date();
  const yy = date.getFullYear();
  const mm = getCodeSeed(date.getMonth() + 1);
  const dd = getCodeSeed(date.getDate());
  const hh = getCodeSeed(date.getHours());
  const min = getCodeSeed(date.getMinutes());
  return `OT-${yy}${mm}${dd}-${hh}${min}`;
};

const createMaterialRow = (): MaterialRow => ({
  id: createId(),
  nombre: "",
  unidad: "",
  entregado: "",
  gastado: "",
});

const normalizeMaterial = (raw: unknown): MaterialRow | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  return {
    id: String(record.id || createId()),
    nombre: String(record.nombre || ""),
    unidad: String(record.unidad || ""),
    entregado: String(record.entregado || ""),
    gastado: String(record.gastado || ""),
  };
};

const cloneOrder = (order: WorkOrder): WorkOrder => ({
  ...order,
  materiales: order.materiales.map((item) => ({ ...item })),
});

const normalizeOrder = (raw: unknown): WorkOrder | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const materialesRaw = Array.isArray(record.materiales) ? record.materiales : [];
  const materiales = materialesRaw
    .map(normalizeMaterial)
    .filter((item): item is MaterialRow => item !== null);

  return {
    id: String(record.id || createId()),
    codigo: String(record.codigo || ""),
    fecha: String(record.fecha || new Date().toISOString().slice(0, 10)),
    celular: String(record.celular || ""),
    cliente: String(record.cliente || ""),
    direccion: String(record.direccion || ""),
    otorgadoA: String(record.otorgadoA || ""),
    aEjecutar: String(record.aEjecutar || ""),
    pgd: String(record.pgd || ""),
    esquemaGeneral: String(record.esquemaGeneral || ""),
    comunicacion: String(record.comunicacion || ""),
    materiales: materiales.length > 0 ? materiales : [createMaterialRow()],
    createdAt: String(record.createdAt || nowIso()),
    updatedAt: String(record.updatedAt || nowIso()),
  };
};

const createEmptyOrder = (): WorkOrder => {
  const now = nowIso();
  return {
    id: createId(),
    codigo: buildDefaultCode(),
    fecha: new Date().toISOString().slice(0, 10),
    celular: "",
    cliente: "",
    direccion: "",
    otorgadoA: "",
    aEjecutar: "",
    pgd: "",
    esquemaGeneral: "",
    comunicacion: "",
    materiales: [createMaterialRow(), createMaterialRow(), createMaterialRow()],
    createdAt: now,
    updatedAt: now,
  };
};

const readOrdersFromStorage = (): WorkOrder[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeOrder)
      .filter((order): order is WorkOrder => order !== null);
  } catch {
    return [];
  }
};

function WorkOrderTemplate({ order }: { order: WorkOrder }) {
  const materialRows = useMemo(() => {
    if (order.materiales.length >= EMPTY_TABLE_ROWS) return order.materiales;
    const missing = EMPTY_TABLE_ROWS - order.materiales.length;
    const emptyRows = Array.from({ length: missing }, () => ({
      id: createId(),
      nombre: "",
      unidad: "",
      entregado: "",
      gastado: "",
    }));
    return [...order.materiales, ...emptyRows];
  }, [order.materiales]);

  return (
    <div className="bg-white border-2 border-black text-black w-full">
      <div className="grid grid-cols-12 border-b-2 border-black">
        <div className="col-span-2 border-r-2 border-black min-h-24" />
        <div className="col-span-7 border-r-2 border-black flex items-center justify-center px-4 py-3">
          <div className="text-center leading-tight">
            <p className="text-lg sm:text-2xl font-bold">SUNCAR INSTALADORA</p>
            <p className="text-lg sm:text-2xl font-bold">ORDEN DE TRABAJO</p>
          </div>
        </div>
        <div className="col-span-3 text-xs sm:text-sm">
          <div className="grid grid-cols-[42%_58%] border-b border-black">
            <div className="font-bold border-r border-black p-1 sm:p-2">Fecha:</div>
            <div className="p-1 sm:p-2">{order.fecha || "-"}</div>
          </div>
          <div className="grid grid-cols-[42%_58%] border-b border-black">
            <div className="font-bold border-r border-black p-1 sm:p-2">Código:</div>
            <div className="p-1 sm:p-2">{order.codigo || "-"}</div>
          </div>
          <div className="grid grid-cols-[42%_58%]">
            <div className="font-bold border-r border-black p-1 sm:p-2">Celular:</div>
            <div className="p-1 sm:p-2">{order.celular || "-"}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[150px_1fr] border-b border-black text-xs sm:text-sm">
        <div className="font-bold border-r border-black p-1 sm:p-2">Cliente:</div>
        <div className="p-1 sm:p-2">{order.cliente || "-"}</div>
      </div>
      <div className="grid grid-cols-[150px_1fr] border-b border-black text-xs sm:text-sm">
        <div className="font-bold border-r border-black p-1 sm:p-2">Dirección:</div>
        <div className="p-1 sm:p-2">{order.direccion || "-"}</div>
      </div>

      <div className="border-b border-black text-center font-bold text-sm sm:text-2xl py-1 sm:py-2">
        Trabajo
      </div>
      <div className="grid grid-cols-[150px_1fr] border-b border-black text-xs sm:text-sm">
        <div className="font-bold border-r border-black p-1 sm:p-2">Otorgado a:</div>
        <div className="p-1 sm:p-2">{order.otorgadoA || "-"}</div>
      </div>
      <div className="grid grid-cols-[150px_1fr] border-b border-black min-h-[100px] text-xs sm:text-sm">
        <div className="font-bold border-r border-black p-1 sm:p-2 flex items-center">A ejecutar:</div>
        <div className="p-1 sm:p-2 whitespace-pre-wrap">{order.aEjecutar || "-"}</div>
      </div>

      <div className="grid grid-cols-3 border-b border-black">
        <div className="border-r border-black">
          <div className="text-center font-bold border-b border-black p-1 sm:p-2 text-sm sm:text-xl">PGD</div>
          <div className="min-h-[120px] p-1 sm:p-2 whitespace-pre-wrap text-xs sm:text-sm">{order.pgd || " "}</div>
        </div>
        <div className="border-r border-black">
          <div className="text-center font-bold border-b border-black p-1 sm:p-2 text-sm sm:text-xl">
            Esquema General
          </div>
          <div className="min-h-[120px] p-1 sm:p-2 whitespace-pre-wrap text-xs sm:text-sm">
            {order.esquemaGeneral || " "}
          </div>
        </div>
        <div>
          <div className="text-center font-bold border-b border-black p-1 sm:p-2 text-sm sm:text-xl">
            Comunicación
          </div>
          <div className="min-h-[120px] p-1 sm:p-2 whitespace-pre-wrap text-xs sm:text-sm">
            {order.comunicacion || " "}
          </div>
        </div>
      </div>

      <div className="border-b border-black text-center font-bold text-sm sm:text-2xl py-1 sm:py-2">
        Equipos y Materiales
      </div>
      <table className="w-full border-collapse table-fixed text-xs sm:text-sm">
        <thead>
          <tr>
            <th className="border-r border-black border-b p-1 sm:p-2 w-[65%]">Nombre</th>
            <th className="border-r border-black border-b p-1 sm:p-2 w-[8%]">U/M</th>
            <th className="border-r border-black border-b p-1 sm:p-2 w-[13%]">Entregado</th>
            <th className="border-b border-black p-1 sm:p-2 w-[14%]">Gastado</th>
          </tr>
        </thead>
        <tbody>
          {materialRows.map((row, index) => (
            <tr key={`${row.id}-${index}`}>
              <td className="border-r border-black border-b p-1 sm:p-2 min-h-7">{row.nombre || " "}</td>
              <td className="border-r border-black border-b p-1 sm:p-2 text-center">{row.unidad || " "}</td>
              <td className="border-r border-black border-b p-1 sm:p-2 text-center">{row.entregado || " "}</td>
              <td className="border-b border-black p-1 sm:p-2 text-center">{row.gastado || " "}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrdenesTrabajoOperacionesModule() {
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [draft, setDraft] = useState<WorkOrder>(createEmptyOrder);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const storedOrders = readOrdersFromStorage();
    setOrders(storedOrders);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders, ready]);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const searchable = [order.codigo, order.cliente, order.direccion, order.otorgadoA, order.celular]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }, [orders, searchTerm]);

  const isEditing = useMemo(() => {
    return orders.some((order) => order.id === draft.id);
  }, [orders, draft.id]);

  const updateDraft = <K extends keyof WorkOrder>(field: K, value: WorkOrder[K]) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: nowIso(),
    }));
  };

  const updateMaterial = (materialId: string, field: keyof Omit<MaterialRow, "id">, value: string) => {
    setDraft((prev) => ({
      ...prev,
      updatedAt: nowIso(),
      materiales: prev.materiales.map((item) =>
        item.id === materialId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }));
  };

  const startNewOrder = () => {
    setDraft(createEmptyOrder());
  };

  const handleSave = () => {
    if (!draft.cliente.trim()) {
      toast({
        title: "Falta el cliente",
        description: "Debes indicar al menos el nombre del cliente para guardar la orden.",
        variant: "destructive",
      });
      return;
    }

    const now = nowIso();
    const normalizedCode = draft.codigo.trim() || buildDefaultCode();
    const orderToSave: WorkOrder = {
      ...draft,
      codigo: normalizedCode,
      createdAt: isEditing ? draft.createdAt : now,
      updatedAt: now,
    };

    setOrders((prev) => {
      const index = prev.findIndex((item) => item.id === orderToSave.id);
      if (index >= 0) {
        const clone = [...prev];
        clone[index] = cloneOrder(orderToSave);
        return clone;
      }
      return [cloneOrder(orderToSave), ...prev];
    });

    setDraft(orderToSave);
    toast({
      title: isEditing ? "Orden actualizada" : "Orden creada",
      description: `La orden ${normalizedCode} se guardó correctamente.`,
    });
  };

  const handleDelete = (order: WorkOrder) => {
    if (typeof window !== "undefined") {
      const accepted = window.confirm(`¿Eliminar la orden ${order.codigo || order.id}?`);
      if (!accepted) return;
    }

    setOrders((prev) => prev.filter((item) => item.id !== order.id));
    if (draft.id === order.id) {
      setDraft(createEmptyOrder());
    }
    toast({
      title: "Orden eliminada",
      description: "La orden de trabajo fue eliminada.",
    });
  };

  const loadOrder = (order: WorkOrder) => {
    setDraft(cloneOrder(order));
  };

  const duplicateOrder = (order: WorkOrder) => {
    const now = nowIso();
    const baseCode = order.codigo.trim() || buildDefaultCode();
    const duplicated: WorkOrder = {
      ...cloneOrder(order),
      id: createId(),
      codigo: `${baseCode}-COPIA`,
      fecha: new Date().toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
      materiales: order.materiales.map((item) => ({
        ...item,
        id: createId(),
      })),
    };
    setDraft(duplicated);
    toast({
      title: "Orden duplicada",
      description: "Se creó una copia en el formulario para guardarla como nueva orden.",
    });
  };

  const addMaterialRow = () => {
    setDraft((prev) => ({
      ...prev,
      updatedAt: nowIso(),
      materiales: [...prev.materiales, createMaterialRow()],
    }));
  };

  const removeMaterialRow = (materialId: string) => {
    setDraft((prev) => {
      if (prev.materiales.length === 1) return prev;
      return {
        ...prev,
        updatedAt: nowIso(),
        materiales: prev.materiales.filter((item) => item.id !== materialId),
      };
    });
  };

  const printOrder = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 print:bg-white">
      <ModuleHeader
        title="Órdenes de Trabajo"
        subtitle="Nuevo módulo de operaciones para crear y gestionar órdenes de trabajo"
        badge={{ text: "Operaciones", className: "bg-orange-100 text-orange-800" }}
        backButton={{ href: "/instalaciones", label: "Volver a Operaciones" }}
        className="bg-white shadow-sm border-b border-orange-100 print:hidden"
        actions={
          <>
            <Button
              variant="outline"
              className="border-orange-300 text-orange-800 hover:bg-orange-50"
              onClick={startNewOrder}
              title="Nueva orden"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva</span>
            </Button>
            <Button
              variant="outline"
              className="border-blue-300 text-blue-800 hover:bg-blue-50"
              onClick={printOrder}
              title="Imprimir"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleSave}
              title="Guardar orden"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">{isEditing ? "Actualizar" : "Guardar"}</span>
            </Button>
          </>
        }
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8 print:max-w-none print:px-0 print:py-0">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 print:hidden">
          <Card className="border-0 shadow-md border-l-4 border-l-orange-600">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                Datos de la orden
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={draft.fecha}
                    onChange={(event) => updateDraft("fecha", event.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={draft.codigo}
                    onChange={(event) => updateDraft("codigo", event.target.value)}
                    placeholder="OT-20260306-1030"
                  />
                </div>
                <div>
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={draft.celular}
                    onChange={(event) => updateDraft("celular", event.target.value)}
                    placeholder="+53 5XXXXXXX"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  value={draft.cliente}
                  onChange={(event) => updateDraft("cliente", event.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>

              <div>
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={draft.direccion}
                  onChange={(event) => updateDraft("direccion", event.target.value)}
                  placeholder="Dirección completa"
                />
              </div>

              <div>
                <Label htmlFor="otorgado">Otorgado a</Label>
                <Input
                  id="otorgado"
                  value={draft.otorgadoA}
                  onChange={(event) => updateDraft("otorgadoA", event.target.value)}
                  placeholder="Brigada o técnico responsable"
                />
              </div>

              <div>
                <Label htmlFor="ejecutar">A ejecutar</Label>
                <Textarea
                  id="ejecutar"
                  value={draft.aEjecutar}
                  onChange={(event) => updateDraft("aEjecutar", event.target.value)}
                  placeholder="Describe el trabajo a ejecutar"
                  className="min-h-24"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="pgd">PGD</Label>
                  <Textarea
                    id="pgd"
                    value={draft.pgd}
                    onChange={(event) => updateDraft("pgd", event.target.value)}
                    className="min-h-24"
                  />
                </div>
                <div>
                  <Label htmlFor="esquema">Esquema General</Label>
                  <Textarea
                    id="esquema"
                    value={draft.esquemaGeneral}
                    onChange={(event) => updateDraft("esquemaGeneral", event.target.value)}
                    className="min-h-24"
                  />
                </div>
                <div>
                  <Label htmlFor="comunicacion">Comunicación</Label>
                  <Textarea
                    id="comunicacion"
                    value={draft.comunicacion}
                    onChange={(event) => updateDraft("comunicacion", event.target.value)}
                    className="min-h-24"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm sm:text-base">Equipos y Materiales</h3>
                  <Button variant="outline" size="sm" onClick={addMaterialRow}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar fila
                  </Button>
                </div>
                <div className="overflow-x-auto border rounded-md">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-600">
                        <th className="p-2">Nombre</th>
                        <th className="p-2">U/M</th>
                        <th className="p-2">Entregado</th>
                        <th className="p-2">Gastado</th>
                        <th className="p-2 w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      {draft.materiales.map((row) => (
                        <tr key={row.id} className="border-t align-top">
                          <td className="p-2">
                            <Input
                              value={row.nombre}
                              onChange={(event) => updateMaterial(row.id, "nombre", event.target.value)}
                              placeholder="Material o equipo"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={row.unidad}
                              onChange={(event) => updateMaterial(row.id, "unidad", event.target.value)}
                              placeholder="U/M"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={row.entregado}
                              onChange={(event) => updateMaterial(row.id, "entregado", event.target.value)}
                              placeholder="Cant."
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={row.gastado}
                              onChange={(event) => updateMaterial(row.id, "gastado", event.target.value)}
                              placeholder="Cant."
                            />
                          </td>
                          <td className="p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMaterialRow(row.id)}
                              disabled={draft.materiales.length === 1}
                              title="Eliminar fila"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Actualizar orden" : "Guardar orden"}
                </Button>
                <Button variant="outline" onClick={() => duplicateOrder(draft)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </Button>
                <Button variant="outline" onClick={startNewOrder}>
                  <Plus className="h-4 w-4 mr-2" />
                  Limpiar y nueva
                </Button>
                <Button variant="outline" onClick={printOrder}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md border-l-4 border-l-blue-600">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                Vista de la orden
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <WorkOrderTemplate order={draft} />
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-0 shadow-md border-l-4 border-l-purple-600 print:hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-purple-600" />
              Órdenes guardadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por código, cliente, dirección o responsable"
            />
            {!ready ? (
              <div className="text-sm text-gray-500">Cargando órdenes...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-sm text-gray-500">
                {orders.length === 0
                  ? "Todavía no hay órdenes guardadas."
                  : "No hay resultados para el filtro aplicado."}
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-600">
                      <th className="p-2">Código</th>
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Cliente</th>
                      <th className="p-2">Celular</th>
                      <th className="p-2">Otorgado a</th>
                      <th className="p-2 w-48">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const rowSelected = draft.id === order.id;
                      return (
                        <tr
                          key={order.id}
                          className={`border-t ${rowSelected ? "bg-orange-50" : "hover:bg-gray-50"}`}
                        >
                          <td className="p-2 font-semibold">{order.codigo || "-"}</td>
                          <td className="p-2">{order.fecha || "-"}</td>
                          <td className="p-2">{order.cliente || "-"}</td>
                          <td className="p-2">{order.celular || "-"}</td>
                          <td className="p-2">{order.otorgadoA || "-"}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadOrder(order)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => duplicateOrder(order)}
                                title="Duplicar"
                              >
                                <Copy className="h-4 w-4 mr-1" />
                                Duplicar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(order)}
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="hidden print:block print:p-6">
          <WorkOrderTemplate order={draft} />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
