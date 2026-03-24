"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shared/molecule/tabs";
import { TrabajosDiariosView } from "./trabajos-diarios-view";
import { TrabajosDiariosRegistroView } from "./trabajos-diarios-registro-view";
import { TrabajosDiariosCrearView } from "./trabajos-diarios-crear-view";

type TabKey = "confirmar" | "registrar" | "crear";

export function TrabajosDiariosModule() {
  const [tab, setTab] = useState<TabKey>("confirmar");

  return (
    <Tabs value={tab} onValueChange={(val) => setTab(val as TabKey)} className="space-y-4">
      <TabsList className="w-full h-auto p-1 overflow-x-auto">
        <div className="flex min-w-max gap-1">
          <TabsTrigger value="confirmar" className="whitespace-nowrap">
            Confirmar salidas
          </TabsTrigger>
          <TabsTrigger value="registrar" className="whitespace-nowrap">
            Cierre diario instalaciones
          </TabsTrigger>
          <TabsTrigger value="crear" className="whitespace-nowrap">
            Crear trabajo diario
          </TabsTrigger>
        </div>
      </TabsList>

      <TabsContent value="confirmar" className="space-y-4">
        <TrabajosDiariosView />
      </TabsContent>

      <TabsContent value="registrar" className="space-y-4">
        <TrabajosDiariosRegistroView onCreateRequested={() => setTab("crear")} />
      </TabsContent>

      <TabsContent value="crear" className="space-y-4">
        <TrabajosDiariosCrearView
          onCreated={() => {
            setTab("registrar");
          }}
        />
      </TabsContent>
    </Tabs>
  );
}
