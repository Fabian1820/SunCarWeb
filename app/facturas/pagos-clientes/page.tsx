"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/atom/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Input } from "@/components/shared/molecule/input";
import { Label } from "@/components/shared/atom/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  ArrowLeft,
  Search,
  Plus,
  List,
  RefreshCw,
  AlertCircle,
  CreditCard,
  MailOpen,
  PhoneCall,
  UserCheck,
  MessageSquareText,
  ChevronRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePagos } from "@/hooks/use-pagos";
import { AnticiposPendientesTable } from "@/components/feats/pagos/anticipos-pendientes-table";
import { TodosPagosTable } from "@/components/feats/pagos/todos-pagos-table";
import { TodosPagosPlanosTable } from "@/components/feats/pagos/todos-pagos-planos-table";
import { RegistrarPagoDialog } from "@/components/feats/pagos/registrar-pago-dialog";
import { StripePagosModal } from "@/components/feats/pagos/stripe-pagos-modal";
import type { OfertaConfirmadaSinPago } from "@/lib/services/feats/pagos/pagos-service";
import { useToast } from "@/hooks/use-toast";

type ViewMode =
  | "anticipos-pendientes"
  | "finales-pendientes"
  | "pagos-por-ofertas"
  | "todos-pagos";

const AUTO_REFRESH_MS = 20000;

export default function PagosClientesPage() {
  const {
    ofertasSinPago,
    ofertasConSaldoPendiente,
    ofertasConPagos,
    loadingSinPago,
    loadingConSaldo,
    error,
    refetch,
    refetchOfertasSinPago,
    refetchOfertasConSaldoPendiente,
    refetchOfertasConPagos,
  } = usePagos();

  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("anticipos-pendientes");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagoDialogOpen, setPagoDialogOpen] = useState(false);
  const [selectedOferta, setSelectedOferta] =
    useState<OfertaConfirmadaSinPago | null>(null);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [showPresentesDialog, setShowPresentesDialog] = useState(false);
  const [highlightNotification, setHighlightNotification] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousPresentesCount = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);

  const isClientePresenteParaPagar = (oferta: OfertaConfirmadaSinPago) =>
    Boolean(
      oferta.cliente_listo_para_pagar ??
      oferta.clienteListoParaPagar ??
      oferta.listo_para_pagar,
    );

  const getClienteNombre = (oferta: OfertaConfirmadaSinPago) =>
    oferta.contacto?.nombre ||
    oferta.cliente?.nombre ||
    oferta.lead?.nombre ||
    oferta.nombre_lead_sin_agregar ||
    "Sin nombre";

  const getClienteTelefono = (oferta: OfertaConfirmadaSinPago) =>
    oferta.contacto?.telefono ||
    oferta.cliente?.telefono ||
    oferta.lead?.telefono ||
    "-";

  const getClienteIdentificador = (oferta: OfertaConfirmadaSinPago) =>
    oferta.contacto?.codigo ||
    oferta.cliente_numero ||
    oferta.contacto?.carnet ||
    oferta.cliente?.carnet_identidad ||
    oferta.lead_id ||
    "-";

  const getComentarioContabilidad = (oferta: OfertaConfirmadaSinPago) =>
    oferta.comentario_contabilidad?.trim() ||
    oferta.comentarioContabilidad?.trim() ||
    "Sin comentario para contabilidad";

  const clientesPresentes = useMemo(() => {
    const uniqueOfertas = new Map<string, OfertaConfirmadaSinPago>();
    [...ofertasSinPago, ...ofertasConSaldoPendiente].forEach((oferta) => {
      const key = oferta.id || oferta.numero_oferta;
      if (!uniqueOfertas.has(key)) {
        uniqueOfertas.set(key, oferta);
      }
    });

    return Array.from(uniqueOfertas.values())
      .filter(isClientePresenteParaPagar)
      .sort((a, b) => getClienteNombre(a).localeCompare(getClienteNombre(b)));
  }, [ofertasSinPago, ofertasConSaldoPendiente]);

  const filteredOfertas = useMemo(() => {
    let ofertas: OfertaConfirmadaSinPago[] = [];

    if (viewMode === "anticipos-pendientes") {
      ofertas = ofertasSinPago;
    } else if (viewMode === "finales-pendientes") {
      ofertas = ofertasConSaldoPendiente;
    }

    if (!searchTerm) return ofertas;

    const term = searchTerm.toLowerCase();
    return ofertas.filter((oferta) => {
      const clienteNombre =
        oferta.contacto?.nombre ||
        oferta.cliente?.nombre ||
        oferta.lead?.nombre ||
        oferta.nombre_lead_sin_agregar ||
        "";
      const clienteTelefono =
        oferta.contacto?.telefono ||
        oferta.cliente?.telefono ||
        oferta.lead?.telefono ||
        "";
      const clienteCarnet =
        oferta.contacto?.carnet ||
        oferta.cliente?.carnet_identidad ||
        oferta.cliente?.numero ||
        "";

      return (
        oferta.numero_oferta.toLowerCase().includes(term) ||
        clienteNombre.toLowerCase().includes(term) ||
        clienteTelefono.includes(term) ||
        clienteCarnet.includes(term) ||
        (oferta.almacen_nombre || "").toLowerCase().includes(term) ||
        (oferta.nombre_completo || oferta.nombre_oferta || "")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [ofertasSinPago, ofertasConSaldoPendiente, searchTerm, viewMode]);

  const filteredOfertasConPagos = useMemo(() => {
    if (!searchTerm) return ofertasConPagos;

    const term = searchTerm.toLowerCase();
    return ofertasConPagos.filter((oferta) => {
      const clienteNombre = oferta.contacto?.nombre || "";
      const clienteTelefono = oferta.contacto?.telefono || "";
      const clienteCarnet = oferta.contacto?.carnet || "";

      return (
        oferta.numero_oferta.toLowerCase().includes(term) ||
        (oferta.nombre_completo || "").toLowerCase().includes(term) ||
        clienteNombre.toLowerCase().includes(term) ||
        clienteTelefono.includes(term) ||
        clienteCarnet.includes(term) ||
        (oferta.almacen_nombre || "").toLowerCase().includes(term)
      );
    });
  }, [ofertasConPagos, searchTerm]);

  const handleRegistrarPago = (oferta: OfertaConfirmadaSinPago) => {
    setSelectedOferta(oferta);
    setPagoDialogOpen(true);
  };

  const handlePagoSuccess = () => {
    toast({
      title: "Éxito",
      description: "Pago registrado correctamente",
    });

    if (viewMode === "anticipos-pendientes") {
      refetchOfertasSinPago();
    } else if (viewMode === "finales-pendientes") {
      refetchOfertasConSaldoPendiente();
    } else if (viewMode === "pagos-por-ofertas" || viewMode === "todos-pagos") {
      refetchOfertasConPagos();
    }
  };

  const handleViewModeChange = async (mode: ViewMode) => {
    setViewMode(mode);

    if (mode === "anticipos-pendientes" && ofertasSinPago.length === 0) {
      await refetchOfertasSinPago();
    } else if (
      mode === "finales-pendientes" &&
      ofertasConSaldoPendiente.length === 0
    ) {
      await refetchOfertasConSaldoPendiente();
    } else if (
      (mode === "pagos-por-ofertas" || mode === "todos-pagos") &&
      ofertasConPagos.length === 0
    ) {
      setLoadingPagos(true);
      await refetchOfertasConPagos();
      setLoadingPagos(false);
    }
  };

  const refreshContabilidadSilencioso = useCallback(async () => {
    await Promise.all([
      refetchOfertasSinPago({ silent: true }),
      refetchOfertasConSaldoPendiente({ silent: true }),
    ]);

    if (viewMode === "pagos-por-ofertas" || viewMode === "todos-pagos") {
      await refetchOfertasConPagos();
    }
  }, [
    refetchOfertasConPagos,
    refetchOfertasConSaldoPendiente,
    refetchOfertasSinPago,
    viewMode,
  ]);

  const playIncomingAlertSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (!audioUnlockedRef.current || !audioContextRef.current) return;

      const ctx = audioContextRef.current;
      const playTones = () => {
        const notes: Array<{ freq: number; duration: number }> = [
          { freq: 880, duration: 0.08 },
          { freq: 1175, duration: 0.1 },
          { freq: 1047, duration: 0.12 },
        ];

        let offset = 0;
        notes.forEach((note) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = note.freq;
          gain.gain.value = 0.0001;
          osc.connect(gain);
          gain.connect(ctx.destination);

          const start = ctx.currentTime + offset;
          osc.start(start);
          gain.gain.exponentialRampToValueAtTime(0.12, start + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);
          osc.stop(start + note.duration);
          offset += note.duration + 0.035;
        });
      };

      if (ctx.state === "suspended") {
        void ctx
          .resume()
          .then(playTones)
          .catch(() => null);
        return;
      }
      playTones();
    } catch (error) {
      console.warn("No se pudo reproducir sonido de notificación:", error);
    }
  }, []);

  useEffect(() => {
    refetchOfertasSinPago();
    refetchOfertasConSaldoPendiente({ silent: true });
  }, [refetchOfertasConSaldoPendiente, refetchOfertasSinPago]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const AudioCtx =
      window.AudioContext ||
      (
        window as Window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioCtx) return;

    const unlockAudio = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === "suspended") {
          void ctx.resume().then(() => {
            audioUnlockedRef.current = true;
          });
          return;
        }
        audioUnlockedRef.current = true;
      } catch (error) {
        console.warn("No se pudo inicializar audio:", error);
      }
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("touchstart", unlockAudio, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible") return;
      refreshContabilidadSilencioso().catch((error) => {
        console.error("Error en auto-actualización de cobros:", error);
      });
    };

    const intervalId = window.setInterval(refreshIfVisible, AUTO_REFRESH_MS);
    const handleFocus = () => refreshIfVisible();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshIfVisible();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshContabilidadSilencioso]);

  useEffect(() => {
    const currentCount = clientesPresentes.length;
    const previousCount = previousPresentesCount.current;
    let timeoutId: number | null = null;

    if (currentCount > previousCount && currentCount > 0) {
      setHighlightNotification(true);
      timeoutId = window.setTimeout(() => {
        setHighlightNotification(false);
      }, 6000);
    }

    if (currentCount === 0) {
      setHighlightNotification(false);
    }

    previousPresentesCount.current = currentCount;

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [clientesPresentes.length]);

  const hasPresentes = clientesPresentes.length > 0;

  // Alarma continua: mientras haya clientes presentes, reproducir sonido en bucle.
  useEffect(() => {
    if (!hasPresentes || !soundEnabled) return;
    if (typeof window === "undefined") return;

    const playLoop = () => {
      playIncomingAlertSound();
    };

    playLoop();
    const intervalId = window.setInterval(playLoop, 2800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasPresentes, playIncomingAlertSound, soundEnabled]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <header className="fixed-header bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:py-5 gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/facturas">
                <Button
                  variant="ghost"
                  size="icon"
                  className="touch-manipulation h-9 w-9 sm:h-10 sm:w-auto sm:px-4 sm:rounded-md gap-2"
                  aria-label="Volver a Facturación"
                  title="Volver a Facturación"
                >
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Volver a Facturación</span>
                  <span className="sr-only">Volver a Facturación</span>
                </Button>
              </Link>
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 flex items-center justify-center h-8 w-8 sm:h-12 sm:w-12">
                <img
                  src="/logo.png"
                  alt="Logo SunCar"
                  className="h-6 w-6 sm:h-10 sm:w-10 object-contain rounded-full"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  Cobros Clientes
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Finanzas
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Gestión de cobros recibidos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setStripeModalOpen(true)}
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <CreditCard className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Cobros Stripe</span>
                <span className="sr-only">Cobros Stripe</span>
              </Button>
              <Button
                size="icon"
                className="h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 touch-manipulation"
                aria-label="Registrar cobro"
                title="Registrar cobro"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Registrar Cobro</span>
                <span className="sr-only">Registrar cobro</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="fixed top-[92px] right-3 sm:right-6 z-40">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowPresentesDialog(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setShowPresentesDialog(true);
            }
          }}
          className={`group relative overflow-hidden rounded-2xl border px-4 py-3 text-left shadow-2xl transition-all duration-300 backdrop-blur-sm min-w-[300px] max-w-[92vw] animate-in slide-in-from-top-4 ${
            hasPresentes
              ? "bg-gradient-to-br from-blue-600 via-sky-600 to-indigo-700 border-blue-300 text-white notif-float"
              : "bg-white/95 border-slate-200 text-slate-800"
          } ${highlightNotification ? "notif-nudge" : ""}`}
          title="Abrir clientes presentes para pagar"
        >
          {hasPresentes && (
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_45%)]" />
          )}

          <span className="relative flex items-center gap-3">
            <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/15 border border-white/20">
              <MailOpen
                className={`h-5 w-5 ${hasPresentes ? "notif-mail" : "text-slate-600"}`}
              />
              {hasPresentes && (
                <PhoneCall className="notif-phone absolute -bottom-1 -right-1 h-3.5 w-3.5 text-amber-200" />
              )}
              {hasPresentes && (
                <>
                  <span className="notif-beacon absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-200 animate-ping" />
                </>
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={`block text-[11px] uppercase tracking-wide font-semibold ${hasPresentes ? "text-white/85" : "text-slate-500"}`}
              >
                Bandeja De Alertas
              </span>
              <span className="block text-sm font-bold leading-tight">
                {hasPresentes
                  ? `${clientesPresentes.length} cliente(s) presentes para pagar`
                  : "Sin clientes presentes ahora"}
              </span>
              <span
                className={`mt-0.5 inline-flex items-center text-xs font-medium ${hasPresentes ? "text-white/90" : "text-slate-500"}`}
              >
                {hasPresentes
                  ? "Mensaje entrante: abrir detalle ahora"
                  : "Se actualiza automáticamente"}
              </span>
            </span>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSoundEnabled((prev) => !prev);
              }}
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                hasPresentes
                  ? "border-white/30 bg-white/10 hover:bg-white/20"
                  : "border-slate-200 bg-white hover:bg-slate-100"
              }`}
              title={soundEnabled ? "Silenciar alerta" : "Activar sonido"}
              aria-label={soundEnabled ? "Silenciar alerta" : "Activar sonido"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>

            <ChevronRight
              className={`h-5 w-5 transition-transform duration-200 ${hasPresentes ? "group-hover:translate-x-1" : "text-slate-500 group-hover:translate-x-1"}`}
            />
          </span>
        </div>
      </div>

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Error al cargar datos
                </h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refetch}
                className="text-red-600 hover:text-red-700"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <Card className="border-0 shadow-md border-l-4 border-l-green-600">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                  <Button
                    variant={
                      viewMode === "anticipos-pendientes"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => {
                      handleViewModeChange("anticipos-pendientes").catch(
                        () => null,
                      );
                    }}
                    className={
                      viewMode === "anticipos-pendientes"
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    }
                  >
                    <List className="h-4 w-4 mr-2" />
                    Anticipos Pendientes
                  </Button>
                  <Button
                    variant={
                      viewMode === "finales-pendientes" ? "default" : "outline"
                    }
                    onClick={() => {
                      handleViewModeChange("finales-pendientes").catch(
                        () => null,
                      );
                    }}
                    className={
                      viewMode === "finales-pendientes"
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    }
                  >
                    <List className="h-4 w-4 mr-2" />
                    Cobros Finales Pendientes
                  </Button>
                  <Button
                    variant={
                      viewMode === "pagos-por-ofertas" ? "default" : "outline"
                    }
                    onClick={() => {
                      handleViewModeChange("pagos-por-ofertas").catch(
                        () => null,
                      );
                    }}
                    disabled={loadingPagos}
                    className={
                      viewMode === "pagos-por-ofertas"
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    }
                  >
                    <List className="h-4 w-4 mr-2" />
                    Cobros por Ofertas
                  </Button>
                  <Button
                    variant={viewMode === "todos-pagos" ? "default" : "outline"}
                    onClick={() => {
                      handleViewModeChange("todos-pagos").catch(() => null);
                    }}
                    disabled={loadingPagos}
                    className={
                      viewMode === "todos-pagos"
                        ? "bg-green-600 hover:bg-green-700"
                        : ""
                    }
                  >
                    <List className="h-4 w-4 mr-2" />
                    Todos los Cobros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md mb-6 border-l-4 border-l-green-600">
            <CardContent className="pt-6">
              <div className="flex-1">
                <Label
                  htmlFor="search"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Buscar Cobro
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Buscar por cliente, N° oferta, CI, teléfono, almacén..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md border-l-4 border-l-green-600">
            <CardHeader>
              <CardTitle>Cobros Clientes</CardTitle>
              <CardDescription>
                {viewMode === "anticipos-pendientes" &&
                  `Mostrando ${filteredOfertas.length} de ${ofertasSinPago.length} ofertas confirmadas sin pago`}
                {viewMode === "finales-pendientes" &&
                  `Mostrando ${filteredOfertas.length} de ${ofertasConSaldoPendiente.length} ofertas con saldo pendiente`}
                {viewMode === "pagos-por-ofertas" &&
                  `Mostrando ${filteredOfertasConPagos.length} de ${ofertasConPagos.length} ofertas con cobros`}
                {viewMode === "todos-pagos" &&
                  `Mostrando ${filteredOfertasConPagos.reduce((acc, o) => acc + o.cantidad_pagos, 0)} de ${ofertasConPagos.reduce((acc, o) => acc + o.cantidad_pagos, 0)} cobros registrados`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {viewMode === "pagos-por-ofertas" ? (
                <TodosPagosTable
                  ofertasConPagos={filteredOfertasConPagos}
                  loading={loadingPagos}
                  showSearch={false}
                />
              ) : viewMode === "todos-pagos" ? (
                <TodosPagosPlanosTable
                  ofertasConPagos={filteredOfertasConPagos}
                  loading={loadingPagos}
                  onPagoUpdated={refetchOfertasConPagos}
                  showSearch={false}
                />
              ) : (
                <AnticiposPendientesTable
                  ofertas={filteredOfertas}
                  loading={
                    viewMode === "anticipos-pendientes"
                      ? loadingSinPago
                      : loadingConSaldo
                  }
                  onRegistrarPago={handleRegistrarPago}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showPresentesDialog} onOpenChange={setShowPresentesDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Clientes Presentes Para Pagar</DialogTitle>
            <DialogDescription>
              Listado de clientes que ya llegaron, con datos y comentario para
              contabilidad.
            </DialogDescription>
          </DialogHeader>

          {clientesPresentes.length === 0 ? (
            <p className="text-sm text-slate-600">
              No hay clientes marcados como presentes en este momento.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {clientesPresentes.map((oferta) => (
                <div
                  key={`${oferta.id}-presente-modal`}
                  className="rounded-xl border border-sky-200 bg-sky-50/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {getClienteNombre(oferta)}
                      </p>
                      <p className="text-xs text-slate-600 break-words">
                        {getClienteIdentificador(oferta)} ·{" "}
                        {getClienteTelefono(oferta)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Oferta {oferta.numero_oferta}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-1 text-[11px] font-semibold text-sky-700 whitespace-nowrap">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Presente
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-semibold text-sky-700">
                    Pendiente: {formatCurrency(oferta.monto_pendiente)}
                  </p>

                  <div className="mt-2 rounded-md border border-sky-200 bg-white px-2.5 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 flex items-center gap-1">
                      <MessageSquareText className="h-3.5 w-3.5" />
                      Comentario Contabilidad
                    </p>
                    <p className="mt-1 text-xs text-slate-700 break-words">
                      {getComentarioContabilidad(oferta)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RegistrarPagoDialog
        open={pagoDialogOpen}
        onOpenChange={setPagoDialogOpen}
        oferta={selectedOferta}
        onSuccess={handlePagoSuccess}
      />

      <StripePagosModal
        open={stripeModalOpen}
        onOpenChange={setStripeModalOpen}
        onPagoSuccess={handlePagoSuccess}
      />

      <style jsx global>{`
        @keyframes notificationNudge {
          0%,
          100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(3px);
          }
          40% {
            transform: translateX(-3px);
          }
          60% {
            transform: translateX(2px);
          }
          80% {
            transform: translateX(-1px);
          }
        }

        @keyframes notificationFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes beaconGlow {
          0%,
          100% {
            opacity: 0.9;
            box-shadow: 0 0 0 0 rgba(252, 211, 77, 0.65);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 0 10px rgba(252, 211, 77, 0);
          }
        }

        .notif-nudge {
          animation: notificationNudge 900ms ease-in-out infinite;
        }

        .notif-float {
          animation: notificationFloat 2.8s ease-in-out infinite;
        }

        .notif-beacon {
          animation: beaconGlow 1.8s ease-in-out infinite;
        }

        @keyframes mailPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }

        @keyframes phoneRing {
          0%,
          100% {
            transform: rotate(0deg);
          }
          20% {
            transform: rotate(16deg);
          }
          40% {
            transform: rotate(-14deg);
          }
          60% {
            transform: rotate(12deg);
          }
          80% {
            transform: rotate(-8deg);
          }
        }

        .notif-mail {
          animation: mailPulse 1.2s ease-in-out infinite;
        }

        .notif-phone {
          transform-origin: 80% 90%;
          animation: phoneRing 0.9s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
