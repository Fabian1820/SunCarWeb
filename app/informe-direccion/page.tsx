"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RouteGuard } from "@/components/auth/route-guard";
import { useAuth } from "@/contexts/auth-context";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Label } from "@/components/shared/atom/label";
import { MonthPicker } from "@/components/shared/molecule/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared/atom/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { CalendarRange, FileDown, Loader2, RefreshCw, Wallet } from "lucide-react";
import {
  ESTADOS_CLIENTE,
  ESTADO_EQUIPO_INSTALADO,
  normalizarEstadoCliente,
} from "@/lib/constants/estados-cliente";
import { InformeDireccionService } from "@/lib/services/feats/informe-direccion/informe-direccion-service";
import {
  generarInformeDireccionPdf,
  SECCIONES_INFORME_DIRECCION_DEFAULT,
  SECCIONES_INFORME_DIRECCION_LABELS,
  type SeccionInformeDireccionKey,
  type SeccionesInformeDireccion,
} from "@/lib/services/feats/informe-direccion/export-informe-direccion-service";
import {
  generarCobrosPendientesPdf,
  resumirCobrosPendientes,
} from "@/lib/services/feats/informe-direccion/export-cobros-pendientes-service";
import {
  ObrasTerminadasService,
  type ObraTerminada,
} from "@/lib/services/feats/obras-terminadas/obras-terminadas-service";

const MODULE = "informe-direccion";

const ORDEN_SECCIONES: SeccionInformeDireccionKey[] = [
  "instaladoraGeneral",
  "comercialInstaladora",
  "ventas",
  "comercialVentas",
];

// Slug del sub-permiso (informe-direccion/<slug>) para cada sección.
const SUBPERMISO_SECCION: Record<SeccionInformeDireccionKey, string> = {
  instaladoraGeneral: "instaladora-general",
  comercialInstaladora: "comercial-instaladora",
  ventas: "ventas",
  comercialVentas: "comercial-ventas",
};

function primerYUltimoDiaDeMes(mesInput: string): { desde: string; hasta: string } | null {
  if (!mesInput) return null;
  const [anioStr, mesStr] = mesInput.split("-");
  const anio = Number(anioStr);
  const mes = Number(mesStr);
  if (!anio || !mes) return null;
  const desde = `${anioStr}-${mesStr}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const hasta = `${anioStr}-${mesStr}-${String(ultimoDia).padStart(2, "0")}`;
  return { desde, hasta };
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ── Reporte 1: comparativo de desempeño entre dos meses ──────────────── */

function ReporteComparativoDesempeno() {
  const { toast } = useToast();
  const { hasSubPermission } = useAuth();
  const [mesA, setMesA] = useState("");
  const [mesB, setMesB] = useState("");
  const [generando, setGenerando] = useState(false);

  const seccionesAccesibles = useMemo(
    () => ORDEN_SECCIONES.filter((k) => hasSubPermission(MODULE, SUBPERMISO_SECCION[k])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [secciones, setSecciones] = useState<SeccionesInformeDireccion>(() => ({
    ...SECCIONES_INFORME_DIRECCION_DEFAULT,
    ...Object.fromEntries(ORDEN_SECCIONES.map((k) => [k, seccionesAccesibles.includes(k)])),
  }));

  const ningunaSeccionSeleccionada = ORDEN_SECCIONES.every((k) => !secciones[k]);

  const toggleSeccion = (key: SeccionInformeDireccionKey, checked: boolean) => {
    setSecciones((prev) => ({ ...prev, [key]: checked }));
  };

  const handleGenerar = async () => {
    const rangoA = primerYUltimoDiaDeMes(mesA);
    const rangoB = primerYUltimoDiaDeMes(mesB);
    if (!rangoA || !rangoB) {
      toast({
        title: "Faltan meses",
        description: "Selecciona los dos meses que quieres comparar.",
        variant: "destructive",
      });
      return;
    }
    if (ningunaSeccionSeleccionada) {
      toast({
        title: "Faltan secciones",
        description: "Selecciona al menos una sección para incluir en el informe.",
        variant: "destructive",
      });
      return;
    }

    setGenerando(true);
    try {
      const informe = await InformeDireccionService.obtenerComparativo({
        periodoADesde: rangoA.desde,
        periodoAHasta: rangoA.hasta,
        periodoBDesde: rangoB.desde,
        periodoBHasta: rangoB.hasta,
      });
      generarInformeDireccionPdf(informe, secciones);
      toast({ title: "Informe generado", description: "El PDF se descargó correctamente." });
    } catch (error) {
      console.error("[InformeDireccion] Error al generar informe:", error);
      toast({
        title: "Error al generar el informe",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-emerald-800" />
          Comparativo de desempeño
        </CardTitle>
        <CardDescription>
          Compara el desempeño de la empresa entre dos meses cualesquiera.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="mes-a">Periodo A</Label>
            <MonthPicker id="mes-a" value={mesA} onChange={setMesA} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mes-b">Periodo B</Label>
            <MonthPicker id="mes-b" value={mesB} onChange={setMesB} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Secciones a incluir</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {seccionesAccesibles.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`seccion-${key}`}
                  checked={secciones[key]}
                  onCheckedChange={(checked) => toggleSeccion(key, checked === true)}
                />
                <Label htmlFor={`seccion-${key}`} className="font-normal cursor-pointer">
                  {SECCIONES_INFORME_DIRECCION_LABELS[key]}
                </Label>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Cada sección seleccionada se calcula para ambos periodos, en el momento, a partir
            de la base de datos.
          </p>
        </div>

        <Button
          onClick={handleGenerar}
          disabled={generando || !mesA || !mesB || ningunaSeccionSeleccionada}
        >
          {generando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando informe...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Generar PDF
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ── Reporte 2: cobros pendientes ─────────────────────────────────────── */

const PAGINA_COBROS = 500;

/** Valor del selector de estado que no acota a un estado concreto. */
const ESTADO_TODOS = "__todos__";
/** Valor por defecto: solo obras ya terminadas (equipo instalado con éxito). */
const ESTADO_TERMINADAS = "__terminadas__";

const ETIQUETA_ESTADO: Record<string, string> = {
  [ESTADO_TERMINADAS]: "Obras terminadas",
  [ESTADO_TODOS]: "Todos los estados",
};

const etiquetaEstado = (valor: string): string => ETIQUETA_ESTADO[valor] ?? valor;

/**
 * El alcance del estado decide QUÉ pide el backend, y son solo dos consultas
 * posibles: las obras ya terminadas (`requiere_instalado`, el informe clásico)
 * o todas las ofertas confirmadas con saldo. Filtrar por un estado concreto se
 * hace después en el cliente y no por `estado_cliente` del backend, que compara
 * por subcadena: "Pendiente de visita" arrastraría también "Pendiente de
 * visitarnos".
 */
type AlcanceCobros = "terminadas" | "todos";

const alcanceDeEstado = (estado: string): AlcanceCobros =>
  estado === ESTADO_TERMINADAS ? "terminadas" : "todos";

function ReporteCobrosPendientes() {
  const { toast } = useToast();
  const [estado, setEstado] = useState<string>(ESTADO_TERMINADAS);
  const [comercial, setComercial] = useState<string>(ESTADO_TODOS);
  const [filas, setFilas] = useState<ObraTerminada[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  // Las dos consultas posibles se cachean: alternar entre "obras terminadas" y
  // un estado suelto no debe volver a bajar miles de filas.
  const cache = useRef<Partial<Record<AlcanceCobros, ObraTerminada[]>>>({});
  // Descarga vigente. Si el usuario cambia de alcance mientras baja la anterior,
  // la respuesta que llegue tarde se descarta en vez de pisar a la nueva.
  const peticion = useRef(0);
  const alcance = alcanceDeEstado(estado);

  /** Trae todas las páginas de ofertas con saldo pendiente del alcance dado. */
  const descargar = useCallback(async (destino: AlcanceCobros): Promise<ObraTerminada[]> => {
    const acumuladas: ObraTerminada[] = [];
    let skip = 0;

    // La primera página nos dice el total; luego seguimos hasta cubrirlo.
    for (;;) {
      const resp = await ObrasTerminadasService.getDatos({
        skip,
        limit: PAGINA_COBROS,
        requiere_instalado: destino === "terminadas",
        estado_pago: "pendiente",
      });
      acumuladas.push(...(resp.data || []));
      skip += PAGINA_COBROS;
      if (!resp.data?.length || skip >= (resp.total ?? 0)) break;
    }

    return acumuladas;
  }, []);

  const cargar = useCallback(
    async (destino: AlcanceCobros, forzar = false) => {
      const enCache = cache.current[destino];
      if (enCache && !forzar) {
        setFilas(enCache);
        setError(null);
        return;
      }
      const id = ++peticion.current;
      setCargando(true);
      setError(null);
      try {
        const datos = await descargar(destino);
        cache.current[destino] = datos;
        if (id !== peticion.current) return;
        setFilas(datos);
      } catch (e) {
        console.error("[InformeDireccion] Error al cargar cobros pendientes:", e);
        if (id !== peticion.current) return;
        setFilas(null);
        setError(e instanceof Error ? e.message : "No se pudieron cargar los cobros pendientes.");
      } finally {
        if (id === peticion.current) setCargando(false);
      }
    },
    [descargar],
  );

  useEffect(() => {
    cargar(alcance);
  }, [alcance, cargar]);

  const comerciales = useMemo(() => {
    const set = new Set<string>();
    for (const f of filas ?? []) {
      const c = (f.comercial || "").trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [filas]);

  // Estados realmente presentes en los datos, en el orden canónico del sistema
  // y con los que no estén en el catálogo al final (los hay escritos a mano).
  const estadosPresentes = useMemo(() => {
    const set = new Set<string>();
    for (const f of filas ?? []) {
      const e = (f.estado_cliente || "").trim();
      if (e) set.add(e);
    }
    const canonicos = ESTADOS_CLIENTE.filter((e) =>
      Array.from(set).some((x) => normalizarEstadoCliente(x) === normalizarEstadoCliente(e)),
    );
    const sueltos = Array.from(set)
      .filter(
        (x) => !ESTADOS_CLIENTE.some((e) => normalizarEstadoCliente(e) === normalizarEstadoCliente(x)),
      )
      .sort((a, b) => a.localeCompare(b, "es"));
    return [...canonicos, ...sueltos];
  }, [filas]);

  // Con el alcance "todos" cargado, el selector ofrece los estados que existen;
  // mientras solo están las obras terminadas, ofrece el catálogo completo para
  // que se pueda ampliar el alcance sin haberlo cargado antes.
  const opcionesEstado = useMemo(
    () => (alcance === "todos" && estadosPresentes.length ? estadosPresentes : [...ESTADOS_CLIENTE]),
    [alcance, estadosPresentes],
  );

  const filtradas = useMemo(() => {
    let out = filas ?? [];
    if (estado !== ESTADO_TERMINADAS && estado !== ESTADO_TODOS) {
      const buscado = normalizarEstadoCliente(estado);
      out = out.filter((f) => normalizarEstadoCliente(f.estado_cliente) === buscado);
    }
    if (comercial !== ESTADO_TODOS) {
      out = out.filter((f) => (f.comercial || "").trim() === comercial);
    }
    return out;
  }, [filas, estado, comercial]);

  const resumen = useMemo(() => resumirCobrosPendientes(filtradas), [filtradas]);

  // El comercial elegido puede no existir en el nuevo alcance: se limpia para
  // no dejar el informe filtrado por alguien que no aparece en la lista.
  useEffect(() => {
    if (comercial !== ESTADO_TODOS && filas && !comerciales.includes(comercial)) {
      setComercial(ESTADO_TODOS);
    }
  }, [comerciales, comercial, filas]);

  const handleGenerar = () => {
    if (!filtradas.length) {
      toast({
        title: "Sin cobros pendientes",
        description: "Ninguna obra cumple los filtros seleccionados.",
      });
      return;
    }
    setGenerando(true);
    try {
      generarCobrosPendientesPdf(filtradas, {
        estado: etiquetaEstado(estado),
        comercial: comercial === ESTADO_TODOS ? null : comercial,
        mostrarEstadoCliente: estado === ESTADO_TODOS,
      });
      toast({ title: "Informe generado", description: "El PDF se descargó correctamente." });
    } catch (e) {
      console.error("[InformeDireccion] Error al generar cobros pendientes:", e);
      toast({
        title: "Error al generar el informe",
        description: e instanceof Error ? e.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setGenerando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-800" />
          Cobros pendientes
        </CardTitle>
        <CardDescription>
          Clientes con saldo por cobrar. Por defecto, solo los que ya tienen la instalación
          terminada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cobros-estado">Estado del cliente</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger id="cobros-estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ESTADO_TERMINADAS}>
                  {ETIQUETA_ESTADO[ESTADO_TERMINADAS]} ({ESTADO_EQUIPO_INSTALADO})
                </SelectItem>
                <SelectItem value={ESTADO_TODOS}>{ETIQUETA_ESTADO[ESTADO_TODOS]}</SelectItem>
                {opcionesEstado.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cobros-comercial">Comercial</Label>
            <Select value={comercial} onValueChange={setComercial}>
              <SelectTrigger id="cobros-comercial">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ESTADO_TODOS}>Todos los comerciales</SelectItem>
                {comerciales.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {cargando ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculando cobros pendientes…
          </div>
        ) : error ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={() => cargar(alcance, true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border bg-muted/40 p-3">
            <div>
              <p className="text-xs text-muted-foreground">Clientes que deben</p>
              <p className="text-lg font-semibold text-gray-900">{resumen.clientes}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Obras con saldo</p>
              <p className="text-lg font-semibold text-gray-900">{resumen.obras}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total ya cobrado</p>
              <p className="text-lg font-semibold text-gray-900">
                {fmtMoney(resumen.totalCobrado)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total pendiente</p>
              <p className="text-lg font-semibold text-red-700">
                {fmtMoney(resumen.totalPendiente)}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={handleGenerar} disabled={cargando || generando || !filtradas.length}>
            {generando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Generar PDF
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => cargar(alcance, true)}
            disabled={cargando}
            aria-label="Recalcular"
          >
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Página ───────────────────────────────────────────────────────────── */

function InformeDireccionContent() {
  const { hasSubPermission } = useAuth();

  // Los dos informes son independientes en permisos: el acceso completo al
  // módulo (`informe-direccion`) los concede ambos, pero cada uno se puede dar
  // suelto — el comparativo por secciones y los cobros pendientes por su
  // propio sub-permiso. Quien solo tiene uno no debe ver la tarjeta del otro.
  const puedeComparativo = ORDEN_SECCIONES.some((k) =>
    hasSubPermission(MODULE, SUBPERMISO_SECCION[k]),
  );
  const puedeCobrosPendientes = hasSubPermission(MODULE, "cobros-pendientes");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Informe de Dirección"
        subtitle="Informes de dirección generados en el momento a partir de la base de datos."
      />

      <main className="content-with-fixed-header max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {!puedeComparativo && !puedeCobrosPendientes ? (
          <div className="rounded-lg border bg-white/70 p-8 text-center">
            <p className="text-gray-700">No tienes ningún informe asignado en este módulo.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pide al área de dirección que te asigne el acceso completo o alguno de sus
              sub-permisos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {puedeComparativo && <ReporteComparativoDesempeno />}
            {puedeCobrosPendientes && <ReporteCobrosPendientes />}
          </div>
        )}
      </main>

      <Toaster />
    </div>
  );
}

export default function InformeDireccionPage() {
  return (
    <RouteGuard requiredModule="informe-direccion">
      <InformeDireccionContent />
    </RouteGuard>
  );
}
