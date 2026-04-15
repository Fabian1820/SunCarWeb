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
import { TrabajosDiariosTodosView } from "./trabajos-diarios-todos-view";
import { TrabajosDiariosActualizacionesView } from "./trabajos-diarios-actualizaciones-view";

type TabKey = "confirmar" | "registrar" | "actualizaciones" | "entregas" | "todos";

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
          <TabsTrigger value="actualizaciones" className="whitespace-nowrap">
            Actualizaciones
          </TabsTrigger>
          <TabsTrigger value="entregas" className="whitespace-nowrap">
            Entregas sin instalar
          </TabsTrigger>
          <TabsTrigger value="todos" className="whitespace-nowrap">
            Todos los trabajos
          </TabsTrigger>
        </div>
      </TabsList>

      <TabsContent value="confirmar" className="space-y-4">
        <TrabajosDiariosView />
      </TabsContent>

      <TabsContent value="registrar" className="space-y-4">
        <TrabajosDiariosRegistroView />
      </TabsContent>

      <TabsContent value="actualizaciones" className="space-y-4">
        <TrabajosDiariosActualizacionesView />
      </TabsContent>

      <TabsContent value="entregas" className="space-y-4">
        <TrabajosDiariosView mode="entregas" />
      </TabsContent>

      <TabsContent value="todos" className="space-y-4">
        <TrabajosDiariosTodosView />
      </TabsContent>
    </Tabs>
  );
}
