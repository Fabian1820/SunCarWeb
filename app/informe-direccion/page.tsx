"use client";

import { useMemo, useState } from "react";
import { RouteGuard } from "@/components/auth/route-guard";
import { useAuth } from "@/contexts/auth-context";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Checkbox } from "@/components/shared/molecule/checkbox";
import { Label } from "@/components/shared/atom/label";
import { MonthPicker } from "@/components/shared/molecule/month-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { CalendarRange, FileDown, Loader2, Wallet } from "lucide-react";
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
  type ResumenCobrosPendientes,
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

/* ── Reporte 2: cobros pendientes de obras terminadas ─────────────────── */

const PAGINA_COBROS = 500;

function ReporteCobrosPendientes() {
  const { toast } = useToast();
  const [generando, setGenerando] = useState(false);
  const [resumen, setResumen] = useState<ResumenCobrosPendientes | null>(null);

  /** Trae todas las páginas de obras terminadas con saldo pendiente. */
  const obtenerTodas = async (): Promise<ObraTerminada[]> => {
    const filas: ObraTerminada[] = [];
    let skip = 0;

    // La primera página nos dice el total; luego seguimos hasta cubrirlo.
    for (;;) {
      const resp = await ObrasTerminadasService.getDatos({
        skip,
        limit: PAGINA_COBROS,
        requiere_instalado: true,
        estado_pago: "pendiente",
      });
      filas.push(...(resp.data || []));
      skip += PAGINA_COBROS;
      if (!resp.data?.length || skip >= (resp.total ?? 0)) break;
    }

    return filas;
  };

  const handleGenerar = async () => {
    setGenerando(true);
    try {
      const filas = await obtenerTodas();
      if (!filas.length) {
        setResumen(null);
        toast({
          title: "Sin cobros pendientes",
          description: "No hay obras terminadas con saldo por cobrar.",
        });
        return;
      }
      setResumen(resumirCobrosPendientes(filas));
      generarCobrosPendientesPdf(filas);
      toast({ title: "Informe generado", description: "El PDF se descargó correctamente." });
    } catch (error) {
      console.error("[InformeDireccion] Error al generar cobros pendientes:", error);
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
          <Wallet className="h-4 w-4 text-emerald-800" />
          Cobros pendientes
        </CardTitle>
        <CardDescription>
          Clientes con la instalación ya terminada que todavía tienen saldo por cobrar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Se calcula en el momento: toma los clientes en estado &quot;Equipo instalado con
          éxito&quot; y lista sus obras con saldo mayor que cero, de mayor a menor deuda.
        </p>

        {resumen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border bg-muted/40 p-3">
            <div>
              <p className="text-xs text-muted-foreground">Clientes que deben</p>
              <p className="text-lg font-semibold text-gray-900">{resumen.clientes}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Obras con saldo</p>
              <p className="text-lg font-semibold text-gray-900">{resumen.obras}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total pendiente</p>
              <p className="text-lg font-semibold text-red-700">
                {fmtMoney(resumen.totalPendiente)}
              </p>
            </div>
          </div>
        )}

        <Button onClick={handleGenerar} disabled={generando}>
          {generando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calculando...
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

/* ── Página ───────────────────────────────────────────────────────────── */

function InformeDireccionContent() {
  const { hasSubPermission } = useAuth();
  const puedeCobrosPendientes = hasSubPermission(MODULE, "cobros-pendientes");

  return (
    <div className="p-6 space-y-6">
      <ModuleHeader
        title="Informe de Dirección"
        subtitle="Informes de dirección generados en el momento a partir de la base de datos."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-6xl">
        <ReporteComparativoDesempeno />
        {puedeCobrosPendientes && <ReporteCobrosPendientes />}
      </div>

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
