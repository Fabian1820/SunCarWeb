"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { RouteGuard } from "@/components/auth/route-guard";
import { TabMaterialesAlertas } from "@/components/feats/solicitudes-envio/tab-materiales-alertas";
import { TabSolicitudesInternacional } from "@/components/feats/solicitudes-envio/tab-solicitudes-internacional";
import { TabSolicitudesLocal } from "@/components/feats/solicitudes-envio/tab-solicitudes-local";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/molecule/tabs";
import { Toaster } from "@/components/shared/molecule/toaster";
import { useAuth } from "@/contexts/auth-context";

const MODULE = "solicitudes-envio";

type TabId = "materiales" | "solicitudes-local" | "solicitudes-internacional";

function PageContent() {
  const { hasSubPermission } = useAuth();

  const canMateriales = hasSubPermission(MODULE, "materiales");
  const canLocal = hasSubPermission(MODULE, "solicitudes-local");
  const canInternacional = hasSubPermission(MODULE, "solicitudes-internacional");

  const initialTab: TabId = canMateriales
    ? "materiales"
    : canLocal
      ? "solicitudes-local"
      : "solicitudes-internacional";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const activeTabs: TabId[] = [];
  if (canMateriales) activeTabs.push("materiales");
  if (canLocal) activeTabs.push("solicitudes-local");
  if (canInternacional) activeTabs.push("solicitudes-internacional");

  const gridCols =
    activeTabs.length === 3
      ? "grid-cols-3"
      : activeTabs.length === 2
        ? "grid-cols-2"
        : "grid-cols-1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f9f6] via-white to-[#e8f4ee]">
      <ModuleHeader
        title="Solicitudes de Envío"
        subtitle="Pedidos del comprador local a la compradora internacional"
        badge={{
          text: "Gestión de Almacenes",
          className: "bg-amber-100 text-amber-800 border-amber-200",
        }}
      />
      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTabs.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Send className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p>No tienes acceso a ninguna pestaña de este módulo.</p>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabId)}
            className="space-y-6"
          >
            <TabsList className={`grid w-full ${gridCols}`}>
              {canMateriales && (
                <TabsTrigger value="materiales">
                  Materiales &amp; Alertas
                </TabsTrigger>
              )}
              {canLocal && (
                <TabsTrigger value="solicitudes-local">
                  Solicitudes — Comprador local
                </TabsTrigger>
              )}
              {canInternacional && (
                <TabsTrigger value="solicitudes-internacional">
                  Solicitudes — Compradora internacional
                </TabsTrigger>
              )}
            </TabsList>

            {canMateriales && (
              <TabsContent value="materiales" className="space-y-6">
                <TabMaterialesAlertas />
              </TabsContent>
            )}
            {canLocal && (
              <TabsContent value="solicitudes-local" className="space-y-6">
                <TabSolicitudesLocal />
              </TabsContent>
            )}
            {canInternacional && (
              <TabsContent
                value="solicitudes-internacional"
                className="space-y-6"
              >
                <TabSolicitudesInternacional />
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>
      <Toaster />
    </div>
  );
}

export default function SolicitudesEnvioPage() {
  return (
    <RouteGuard requiredModule="solicitudes-envio">
      <PageContent />
    </RouteGuard>
  );
}
