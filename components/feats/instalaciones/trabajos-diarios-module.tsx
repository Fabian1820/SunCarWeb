"use client";

import { useEffect, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/molecule/tabs";
import { useAuth } from "@/contexts/auth-context";
import { TrabajosDiariosView } from "./trabajos-diarios-view";
import { TrabajosDiariosRegistroView } from "./trabajos-diarios-registro-view";
import { TrabajosDiariosTodosView } from "./trabajos-diarios-todos-view";
import { TrabajosDiariosActualizacionesView } from "./trabajos-diarios-actualizaciones-view";

const TABS = [
  {
    key: "confirmar",
    label: "Confirmar salidas",
    permission: "trabajos:confirmar",
  },
  {
    key: "registrar",
    label: "Cierre diario instalaciones",
    permission: "trabajos:registrar",
  },
  {
    key: "actualizaciones",
    label: "Actualizaciones",
    permission: "trabajos:actualizaciones",
  },
  {
    key: "entregas",
    label: "Entregas sin instalar",
    permission: "trabajos:entregas",
  },
  {
    key: "todos",
    label: "Todos los trabajos",
    permission: "trabajos:todos",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function TrabajosDiariosModule() {
  const { hasPermission, user } = useAuth();

  const visibleTabs = TABS.filter((t) => {
    if (!user?.is_superAdmin && !hasPermission(t.permission)) return false;
    if (t.key === "todos" && hasPermission("trabajos:acceso-directo")) return false;
    return true;
  });

  const [tab, setTab] = useState<TabKey | "">("");

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find((t) => t.key === tab)) {
      setTab(visibleTabs[0].key);
    }
  }, [visibleTabs, tab]);

  if (visibleTabs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No tienes permisos para acceder a ninguna sección de Trabajos Diarios.
        Contacta con el equipo de informáticos.
      </p>
    );
  }

  return (
    <Tabs
      value={tab || visibleTabs[0].key}
      onValueChange={(val) => setTab(val as TabKey)}
      className="space-y-4"
    >
      <TabsList className="w-full h-auto p-1 overflow-x-auto">
        <div className="flex min-w-max gap-1">
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="whitespace-nowrap">
              {t.label}
            </TabsTrigger>
          ))}
        </div>
      </TabsList>

      {visibleTabs.find((t) => t.key === "confirmar") && (
        <TabsContent value="confirmar" className="space-y-4">
          <TrabajosDiariosView />
        </TabsContent>
      )}

      {visibleTabs.find((t) => t.key === "registrar") && (
        <TabsContent value="registrar" className="space-y-4">
          <TrabajosDiariosRegistroView />
        </TabsContent>
      )}

      {visibleTabs.find((t) => t.key === "actualizaciones") && (
        <TabsContent value="actualizaciones" className="space-y-4">
          <TrabajosDiariosActualizacionesView />
        </TabsContent>
      )}

      {visibleTabs.find((t) => t.key === "entregas") && (
        <TabsContent value="entregas" className="space-y-4">
          <TrabajosDiariosView mode="entregas" />
        </TabsContent>
      )}

      {visibleTabs.find((t) => t.key === "todos") && (
        <TabsContent value="todos" className="space-y-4">
          <TrabajosDiariosTodosView />
        </TabsContent>
      )}
    </Tabs>
  );
}
