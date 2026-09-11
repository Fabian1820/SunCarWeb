"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/atom/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shared/molecule/card";
import { Switch } from "@/components/shared/molecule/switch";
import { PageLoader } from "@/components/shared/atom/page-loader";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useToast } from "@/hooks/use-toast";
import { RouteGuard } from "@/components/auth/route-guard";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Save,
  Send,
  XCircle,
} from "lucide-react";
import { useWalletAlertas } from "@/hooks/use-wallet-alertas";
import { DestinatariosEditor } from "@/components/feats/wallet-alertas/destinatarios-editor";
import { UmbralesEditor } from "@/components/feats/wallet-alertas/umbrales-editor";
import { CANALES } from "@/lib/types/feats/wallet-alertas/wallet-alertas-types";
import type { AlertaCanal } from "@/lib/types/feats/wallet-alertas/wallet-alertas-types";
import { WalletService } from "@/lib/services/feats/wallet/wallet-service";

export default function WalletAlertasPage() {
  return (
    <RouteGuard requiredModule="wallet-alertas">
      <WalletAlertasContent />
    </RouteGuard>
  );
}

function WalletAlertasContent() {
  const {
    estado,
    config,
    loading,
    guardando,
    probando,
    error,
    sucio,
    editar,
    guardar,
    enviarPrueba,
    limpiarError,
  } = useWalletAlertas();
  const { toast } = useToast();
  const [monedas, setMonedas] = useState<string[]>([]);

  // Las monedas salen del propio sistema para no escribir códigos a mano.
  useEffect(() => {
    WalletService.getCurrencies()
      .then((lista) =>
        setMonedas(
          Array.from(new Set(lista.map((c) => c.codigo).filter(Boolean))).sort(),
        ),
      )
      .catch(() => setMonedas([]));
  }, []);

  const onGuardar = async () => {
    const ok = await guardar();
    toast({
      title: ok ? "Configuración guardada" : "No se pudo guardar",
      description: ok ? "Los cambios ya están activos." : undefined,
      variant: ok ? undefined : "destructive",
    });
  };

  const onProbar = async () => {
    const { ok, mensaje, resultados } = await enviarPrueba();
    const detalle = resultados
      .map((r) =>
        r.sid ? `${r.destinatario}: enviado por ${r.canal}` : `${r.destinatario}: ${r.error}`,
      )
      .join(" · ");
    toast({
      title: ok ? "Mensaje de prueba enviado" : "No se pudo enviar la prueba",
      description: detalle || mensaje,
      variant: ok ? undefined : "destructive",
    });
  };

  if (loading) {
    return <PageLoader moduleName="Alertas de Billetera" text="Cargando configuración..." />;
  }

  const twilio = estado?.twilio;
  const operativo = Boolean(estado?.operativo);

  // Qué le falta al servidor para que esto funcione de verdad.
  const pendientes: string[] = [];
  if (!twilio?.auth_token_presente || !twilio?.account_sid) {
    pendientes.push("Credenciales de Twilio en el servidor");
  }
  if (!twilio?.whatsapp_from && !twilio?.sms_from && !twilio?.messaging_service_sid) {
    pendientes.push("Un número remitente de WhatsApp o de SMS");
  }
  if (twilio?.whatsapp_from && !twilio?.whatsapp_plantilla) {
    pendientes.push("La plantilla de WhatsApp aprobada, si no, solo funciona el sandbox");
  }
  if (config.destinatarios.length === 0) pendientes.push("Al menos un número destinatario");
  if (config.umbrales.length === 0) pendientes.push("Al menos una regla de monto");
  if (!config.activo) pendientes.push("Activar el interruptor de arriba");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      <header className="fixed-header">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al Dashboard
                </Button>
              </Link>
              <div className="p-0 rounded-full bg-white shadow border border-orange-200 h-12 w-12 flex items-center justify-center">
                <BellRing className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Alertas de Billetera</h1>
                <p className="text-sm text-gray-600">
                  Avisos por WhatsApp o SMS cuando un movimiento supera un monto
                </p>
              </div>
            </div>
            <Button onClick={onGuardar} disabled={guardando || !sucio}>
              <Save className="h-4 w-4 mr-1" />
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center justify-between">
              <p className="text-red-800">{error}</p>
              <Button variant="ghost" size="sm" onClick={limpiarError}>
                ✕
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className={`border-l-4 ${operativo ? "border-l-green-600" : "border-l-amber-500"}`}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {operativo ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    {operativo
                      ? "Las alertas están funcionando"
                      : "Las alertas todavía no se envían"}
                  </p>
                  {pendientes.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                      {pendientes.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-gray-600">Activas</span>
                <Switch
                  checked={config.activo}
                  onCheckedChange={(v) => editar({ activo: v })}
                  aria-label="Activar alertas"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle>Destinatarios</CardTitle>
            <CardDescription>
              Quién recibe el aviso. En formato internacional, empezando por el código
              del país.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DestinatariosEditor
              destinatarios={config.destinatarios}
              onChange={(destinatarios) => editar({ destinatarios })}
              disabled={guardando}
            />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle>Montos que disparan el aviso</CardTitle>
            <CardDescription>
              Se avisa cuando el movimiento llega o supera el monto indicado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UmbralesEditor
              umbrales={config.umbrales}
              monedas={monedas}
              onChange={(umbrales) => editar({ umbrales })}
              disabled={guardando}
            />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle>Vía de envío</CardTitle>
            <CardDescription>
              WhatsApp suele costar bastante menos que SMS hacia Cuba.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {CANALES.map((c) => (
              <label
                key={c.value}
                className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="canal"
                  className="mt-1"
                  checked={config.canal === c.value}
                  disabled={guardando}
                  onChange={() => editar({ canal: c.value as AlertaCanal })}
                />
                <span>
                  <span className="block font-medium text-gray-900">{c.label}</span>
                  <span className="block text-sm text-gray-600">{c.hint}</span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-400">
          <CardHeader>
            <CardTitle>Estado del servidor</CardTitle>
            <CardDescription>
              Las credenciales de Twilio se configuran en las variables de entorno del
              servidor, no desde aquí, para no exponerlas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
              <Dato etiqueta="Cuenta de Twilio" valor={twilio?.account_sid ?? null} />
              <Dato
                etiqueta="Clave de Twilio"
                ok={twilio?.auth_token_presente}
                valor={twilio?.auth_token_presente ? "Configurada" : null}
              />
              <Dato etiqueta="Remitente WhatsApp" valor={twilio?.whatsapp_from ?? null} />
              <Dato
                etiqueta="Plantilla WhatsApp"
                ok={twilio?.whatsapp_plantilla}
                valor={twilio?.whatsapp_plantilla ? "Aprobada y configurada" : null}
              />
              <Dato etiqueta="Remitente SMS" valor={twilio?.sms_from ?? null} />
            </dl>

            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-gray-600">
                Manda un mensaje real a los destinatarios guardados. No mueve dinero.
              </p>
              <Button variant="outline" onClick={onProbar} disabled={probando || sucio}>
                <Send className="h-4 w-4 mr-1" />
                {probando ? "Enviando..." : "Enviar prueba"}
              </Button>
            </div>
            {sucio && (
              <p className="text-xs text-amber-600">
                Guarda los cambios antes de enviar la prueba.
              </p>
            )}
          </CardContent>
        </Card>

        {estado?.config.updated_at && (
          <p className="text-xs text-gray-500 text-center">
            Última modificación el{" "}
            {new Date(estado.config.updated_at).toLocaleString("es-ES")}
            {estado.config.updated_by_nombre ? ` por ${estado.config.updated_by_nombre}` : ""}
          </p>
        )}
      </main>

      <Toaster />
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  ok,
}: {
  etiqueta: string;
  valor: string | null;
  ok?: boolean;
}) {
  const presente = ok ?? Boolean(valor);
  return (
    <div className="flex items-center gap-2">
      {presente ? (
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-gray-400 shrink-0" />
      )}
      <dt className="text-gray-600">{etiqueta}:</dt>
      <dd className="font-mono text-gray-900">{valor ?? "sin configurar"}</dd>
    </div>
  );
}
