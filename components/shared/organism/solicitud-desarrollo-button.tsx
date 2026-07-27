"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useSolicitudesDesarrollo } from "@/hooks/use-solicitudes-desarrollo";
import { Button } from "@/components/shared/atom/button";
import { Textarea } from "@/components/shared/molecule/textarea";
import type {
  CategoriaSolicitud,
  SolicitudDesarrollo,
} from "@/lib/types/feats/solicitudes-desarrollo/solicitud-desarrollo-types";

const CATEGORIAS: { key: CategoriaSolicitud; label: string }[] = [
  { key: "bug", label: "Error" },
  { key: "mejora", label: "Mejora" },
  { key: "idea", label: "Idea" },
  { key: "otro", label: "Otro" },
];

function fechaCorta(fechaStr: string): string {
  try {
    return new Date(fechaStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function EstadoBadge({ solicitud }: { solicitud: SolicitudDesarrollo }) {
  if (solicitud.estado === "respondida") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-medium px-2 py-0.5">
        Respondida
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium px-2 py-0.5">
      Pendiente
    </span>
  );
}

export function SolicitudDesarrolloButton() {
  const { user } = useAuth();
  const pathname = usePathname();
  const habilitado = Boolean(user);
  const {
    solicitudes,
    conteo,
    loading,
    enviando,
    cargarSolicitudes,
    crearSolicitud,
    responder,
    marcarVistas,
  } = useSolicitudesDesarrollo(habilitado);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"nueva" | "historial">("nueva");
  const [categoria, setCategoria] = useState<CategoriaSolicitud>("mejora");
  const [mensaje, setMensaje] = useState("");
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const esSuperAdmin = Boolean(user?.is_superAdmin);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    if (!open || !habilitado) return;
    cargarSolicitudes();
    if (!esSuperAdmin) marcarVistas();
    setTab(esSuperAdmin ? "historial" : "nueva");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, habilitado]);

  if (!habilitado) return null;

  const handleEnviar = async () => {
    if (!mensaje.trim()) return;
    const ok = await crearSolicitud(categoria, mensaje.trim(), pathname || undefined);
    if (ok) {
      setMensaje("");
      setTab("historial");
    }
  };

  const handleResponder = async (id: string) => {
    const respuesta = respuestas[id]?.trim();
    if (!respuesta) return;
    const ok = await responder(id, respuesta);
    if (ok) setRespuestas((prev) => ({ ...prev, [id]: "" }));
  };

  return (
    <div className="fixed bottom-24 right-6 z-[59]">
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setOpen((v) => !v)}
          aria-label="Solicitudes a desarrollo"
          className={cn(
            "relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2",
            "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400",
          )}
        >
          <MessageSquare className="h-5 w-5 text-white" />
          {conteo > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm">
              {conteo > 99 ? "99+" : conteo}
            </span>
          )}
        </button>

        {open && (
          <div
            ref={panelRef}
            className="absolute bottom-full right-0 mb-3 z-50 w-96 max-h-[calc(100vh-8rem)] flex flex-col rounded-xl shadow-2xl border border-gray-200 bg-white overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <span className="font-semibold text-sm text-gray-800">
                Solicitudes a Desarrollo
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Pestañas */}
            <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
              <button
                onClick={() => setTab("nueva")}
                className={cn(
                  "flex-1 px-3 py-2.5 text-xs font-medium transition-colors",
                  tab === "nueva"
                    ? "text-indigo-600 border-b-2 border-indigo-500 -mb-px"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                Nueva solicitud
              </button>
              <button
                onClick={() => setTab("historial")}
                className={cn(
                  "flex-1 px-3 py-2.5 text-xs font-medium transition-colors",
                  tab === "historial"
                    ? "text-indigo-600 border-b-2 border-indigo-500 -mb-px"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                {esSuperAdmin ? "Todas" : "Mis solicitudes"}
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {tab === "nueva" ? (
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1.5">
                      ¿Qué quieres reportar?
                    </p>
                    <p className="text-[11px] text-gray-400 mb-2">
                      Pantalla actual: {pathname}
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {CATEGORIAS.map((c) => (
                        <button
                          key={c.key}
                          onClick={() => setCategoria(c.key)}
                          className={cn(
                            "text-xs font-medium rounded-md border px-2 py-2 transition-colors",
                            categoria === c.key
                              ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50",
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1.5">
                      Descríbelo con detalle
                    </p>
                    <Textarea
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      placeholder="Ej: Sería útil poder filtrar las transacciones por rango de fechas..."
                      className="min-h-[100px] text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleEnviar}
                    disabled={!mensaje.trim() || enviando}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Send className="h-3.5 w-3.5 mr-2" />
                    Enviar solicitud
                  </Button>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : solicitudes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                  <MessageSquare className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Sin solicitudes</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {solicitudes.map((s) => (
                    <li key={s.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700 capitalize">
                          {s.categoria}
                        </span>
                        <EstadoBadge solicitud={s} />
                      </div>
                      {esSuperAdmin && (
                        <p className="text-[11px] text-gray-500 mb-1">
                          {s.usuario_nombre}
                        </p>
                      )}
                      <p className="text-sm text-gray-800 mb-1">{s.mensaje}</p>
                      <p className="text-[10px] text-gray-400 mb-2">
                        {fechaCorta(s.fecha_creacion)}
                        {s.pantalla ? ` · ${s.pantalla}` : ""}
                      </p>

                      {s.estado === "respondida" && s.respuesta && (
                        <div className="rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2 mb-2">
                          <p className="text-[11px] font-medium text-emerald-700 mb-0.5">
                            Respuesta de desarrollo
                          </p>
                          <p className="text-sm text-emerald-900">
                            {s.respuesta}
                          </p>
                        </div>
                      )}

                      {esSuperAdmin && s.estado === "pendiente" && (
                        <div className="flex items-center gap-2">
                          <Textarea
                            value={respuestas[s.id] || ""}
                            onChange={(e) =>
                              setRespuestas((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            placeholder="Escribe una respuesta..."
                            className="min-h-[36px] text-sm flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleResponder(s.id)}
                            disabled={!respuestas[s.id]?.trim()}
                          >
                            Enviar
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
