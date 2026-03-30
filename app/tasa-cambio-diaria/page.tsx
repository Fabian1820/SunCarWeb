"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Save } from "lucide-react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { Button } from "@/components/shared/atom/button";
import { Input } from "@/components/shared/atom/input";
import { Label } from "@/components/shared/atom/label";
import { Badge } from "@/components/shared/atom/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/molecule/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shared/molecule/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shared/molecule/table";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { TasaCambioService } from "@/lib/api-services";
import type { TasaCambio } from "@/lib/types/feats/tasa-cambio/tasa-cambio-types";

type PendingUpdate = {
  fecha: string;
  actual: TasaCambio;
  nuevoUsdEur: number;
  nuevoUsdCup: number;
};

const toLocalDateKey = (date: Date): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const formatDate = (dateKey: string): string => {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString("es-CU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatDateTime = (value?: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export default function TasaCambioDiariaPage() {
  return (
    <RouteGuard requiredModule="tasa-cambio-diaria">
      <TasaCambioDiariaPageContent />
    </RouteGuard>
  );
}

function TasaCambioDiariaPageContent() {
  const { toast } = useToast();
  const [rates, setRates] = useState<TasaCambio[]>([]);
  const [dateInput, setDateInput] = useState(() => toLocalDateKey(new Date()));
  const [eurInput, setEurInput] = useState("");
  const [cupInput, setCupInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const history = await TasaCambioService.getTasasCambio();
      setRates(history);
    } catch (error: unknown) {
      toast({
        title: "Error al cargar tasas de cambio",
        description: getErrorMessage(error, "No se pudieron cargar las tasas."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const existingForSelectedDate = useMemo(
    () => rates.find((item) => item.fecha === dateInput) ?? null,
    [rates, dateInput],
  );

  const validateInputs = (): { usdToEur: number; usdToCup: number } | null => {
    if (!dateInput) {
      toast({
        title: "Fecha requerida",
        description: "Selecciona una fecha para registrar la tasa.",
        variant: "destructive",
      });
      return null;
    }

    const usdToEur = Number(eurInput);
    const usdToCup = Number(cupInput);

    if (!Number.isFinite(usdToEur) || usdToEur <= 0) {
      toast({
        title: "Tasa inválida USD -> EUR",
        description: "Introduce un número mayor que 0.",
        variant: "destructive",
      });
      return null;
    }

    if (!Number.isFinite(usdToCup) || usdToCup <= 0) {
      toast({
        title: "Tasa inválida USD -> CUP",
        description: "Introduce un número mayor que 0.",
        variant: "destructive",
      });
      return null;
    }

    return { usdToEur, usdToCup };
  };

  const handleSave = async () => {
    const values = validateInputs();
    if (!values) return;

    const existing = rates.find((item) => item.fecha === dateInput);
    if (existing) {
      setPendingUpdate({
        fecha: dateInput,
        actual: existing,
        nuevoUsdEur: values.usdToEur,
        nuevoUsdCup: values.usdToCup,
      });
      setIsConfirmOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      await TasaCambioService.createTasaCambio({
        fecha: dateInput,
        usd_a_eur: values.usdToEur,
        usd_a_cup: values.usdToCup,
      });

      toast({
        title: "Tasa registrada",
        description: `${formatDate(dateInput)} | 1 USD = ${values.usdToEur.toFixed(4)} EUR | ${values.usdToCup.toFixed(4)} CUP`,
      });

      await loadData();
    } catch (error: unknown) {
      toast({
        title: "No se pudo registrar la tasa",
        description: getErrorMessage(error, "Ocurrió un error al guardar."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmUpdate = async () => {
    if (!pendingUpdate) return;

    setSubmitting(true);
    try {
      await TasaCambioService.updateTasaCambioByFecha(pendingUpdate.fecha, {
        usd_a_eur: pendingUpdate.nuevoUsdEur,
        usd_a_cup: pendingUpdate.nuevoUsdCup,
      });

      toast({
        title: "Tasa actualizada",
        description: `${formatDate(pendingUpdate.fecha)} | 1 USD = ${pendingUpdate.nuevoUsdEur.toFixed(4)} EUR | ${pendingUpdate.nuevoUsdCup.toFixed(4)} CUP`,
      });

      setIsConfirmOpen(false);
      setPendingUpdate(null);
      await loadData();
    } catch (error: unknown) {
      toast({
        title: "No se pudo actualizar la tasa",
        description: getErrorMessage(
          error,
          "Verifica que el backend tenga habilitado PUT /tasas-cambio/{fecha}.",
        ),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader moduleName="Tasa de Cambio diaria" text="Cargando..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <ModuleHeader
        title="Tasa de Cambio diaria"
        subtitle="Registro por fecha para contabilidad (USD contra EUR y CUP)"
        badge={{ text: "Contabilidad", className: "bg-amber-100 text-amber-800" }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Card className="mb-6 border-l-4 border-l-amber-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-700" />
              Registrar tasa por fecha
              {existingForSelectedDate ? (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  Fecha ya registrada
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  Nueva fecha
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fecha-tasa">Fecha</Label>
                <Input
                  id="fecha-tasa"
                  type="date"
                  value={dateInput}
                  onChange={(event) => setDateInput(event.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="usd-eur">1 USD equivale a (EUR)</Label>
                <Input
                  id="usd-eur"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={eurInput}
                  onChange={(event) => setEurInput(event.target.value)}
                  placeholder="0.9200"
                  disabled={submitting}
                />
              </div>

              <div>
                <Label htmlFor="usd-cup">1 USD equivale a (CUP)</Label>
                <Input
                  id="usd-cup"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={cupInput}
                  onChange={(event) => setCupInput(event.target.value)}
                  placeholder="300.0000"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleSave}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={submitting}
              >
                <Save className="h-4 w-4 mr-2" />
                {submitting ? "Guardando..." : existingForSelectedDate ? "Actualizar tasa" : "Guardar tasa"}
              </Button>

              {existingForSelectedDate && (
                <span className="text-sm text-gray-600">
                  Ya existe una tasa para {formatDate(existingForSelectedDate.fecha)}.
                  Al guardar te pediremos confirmación.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle>Histórico de tasas ({rates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {rates.length === 0 ? (
              <p className="text-sm text-gray-600">
                No hay tasas registradas aún.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>1 USD en EUR</TableHead>
                    <TableHead>1 USD en CUP</TableHead>
                    <TableHead>Registrada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((entry) => (
                    <TableRow key={entry.id || entry.fecha}>
                      <TableCell className="font-medium">{formatDate(entry.fecha)}</TableCell>
                      <TableCell>{entry.usd_a_eur.toFixed(4)}</TableCell>
                      <TableCell>{entry.usd_a_cup.toFixed(4)}</TableCell>
                      <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open);
          if (!open) setPendingUpdate(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar actualización de tasa</DialogTitle>
            <DialogDescription>
              Ya existe una tasa para {pendingUpdate ? formatDate(pendingUpdate.fecha) : "-"}.
              ¿Seguro que deseas reemplazarla?
            </DialogDescription>
          </DialogHeader>

          {pendingUpdate && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3 bg-slate-50">
                <p className="font-semibold text-slate-700 mb-1">Tasa actual</p>
                <p>EUR: {pendingUpdate.actual.usd_a_eur.toFixed(4)}</p>
                <p>CUP: {pendingUpdate.actual.usd_a_cup.toFixed(4)}</p>
              </div>
              <div className="rounded-md border p-3 bg-amber-50">
                <p className="font-semibold text-amber-700 mb-1">Nueva tasa</p>
                <p>EUR: {pendingUpdate.nuevoUsdEur.toFixed(4)}</p>
                <p>CUP: {pendingUpdate.nuevoUsdCup.toFixed(4)}</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setPendingUpdate(null);
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmUpdate} disabled={submitting}>
              {submitting ? "Actualizando..." : "Sí, actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
