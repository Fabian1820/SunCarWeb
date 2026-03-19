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
      <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto md:h-10">
        <TabsTrigger value="confirmar">Confirmar salidas</TabsTrigger>
        <TabsTrigger value="registrar">Registrar datos</TabsTrigger>
        <TabsTrigger value="crear">Crear trabajo diario</TabsTrigger>
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
