"use client";

import { useState } from "react";
import { RouteGuard } from "@/components/auth/route-guard";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/molecule/tabs";
import { JornadaView } from "@/components/feats/atencion-cliente/jornada-view";
import { PlanificacionView } from "@/components/feats/atencion-cliente/planificacion-view";
import { SupervisionView } from "@/components/feats/atencion-cliente/supervision-view";
import { useAuth } from "@/contexts/auth-context";

/**
 * Atención al Cliente: la guardia de WhatsApp.
 *
 * Dos roles, tal como se reparten los permisos: quien atiende entra a "Mi
 * jornada" y ahí registra los leads de sus conversaciones y los reparte entre
 * los comerciales que no están de guardia. Quien además tiene
 * `atencion-cliente/planificar` ve las otras dos pestañas: arma la rotación y
 * supervisa lo que se registró.
 */
function AtencionClienteContent() {
  const { hasExactPermission } = useAuth();
  const puedePlanificar = hasExactPermission("atencion-cliente/planificar");
  const [tab, setTab] = useState("jornada");

  return (
    <>
      <ModuleHeader
        title="Atención al Cliente"
        subtitle="Guardia de WhatsApp, registro de leads y reparto a comerciales"
      />
      <main className="content-with-fixed-header max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {puedePlanificar ? (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="jornada">Mi jornada</TabsTrigger>
              <TabsTrigger value="planificacion">Planificación</TabsTrigger>
              <TabsTrigger value="supervision">Supervisión</TabsTrigger>
            </TabsList>
            <TabsContent value="jornada">
              <JornadaView />
            </TabsContent>
            <TabsContent value="planificacion">
              <PlanificacionView />
            </TabsContent>
            <TabsContent value="supervision">
              <SupervisionView />
            </TabsContent>
          </Tabs>
        ) : (
          <JornadaView />
        )}
      </main>
    </>
  );
}

export default function AtencionClientePage() {
  return (
    <RouteGuard requiredModule="atencion-cliente">
      <AtencionClienteContent />
    </RouteGuard>
  );
}
