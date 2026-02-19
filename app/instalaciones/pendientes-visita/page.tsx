"use client";

import { useState, useEffect, useCallback } from "react";
import { ModuleHeader } from "@/components/shared/organism/module-header";
import { PendientesVisitaTable } from "@/components/feats/instalaciones/pendientes-visita-table";
import { apiRequest } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import type { PendienteVisita } from "@/lib/types/feats/instalaciones/instalaciones-types";

interface PendientesVisitaResponse {
  clientes: any[];
  leads: any[];
  total_clientes: number;
  total_leads: number;
  total_general: number;
}

export default function PendientesVisitaPage() {
  const { toast } = useToast();
  const [pendientes, setPendientes] = useState<PendienteVisita[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      console.log("🔍 Intentando cargar pendientes de visita...");
      console.log("📍 Endpoint:", "/pendientes-visita/");

      const response = await apiRequest<PendientesVisitaResponse>(
        "/pendientes-visita/",
      );

      console.log("✅ Respuesta recibida:", response);

      if (!response) {
        throw new Error("Error al cargar datos");
      }

      const { clientes, leads } = response;

      console.log("📊 Datos recibidos:", {
        totalLeads: leads?.length || 0,
        totalClientes: clientes?.length || 0,
      });

      // Transformar a formato unificado
      const pendientesData: PendienteVisita[] = [
        ...clientes.map((c: any) => ({
          id: c.numero,
          tipo: "cliente" as const,
          nombre: c.nombre,
          telefono: c.telefono || "",
          direccion: c.direccion || "",
          provincia: c.provincia_montaje || "Sin especificar",
          municipio: c.municipio || "",
          estado: c.estado || "Pendiente de visita",
          comentario: c.comentario || "",
          fuente: c.fuente || "",
          referencia: c.referencia || "",
          comercial: c.comercial || "",
          prioridad: c.prioridad || "Baja",
          fotos: Array.isArray(c.fotos) ? c.fotos : [],
          numero: c.numero,
          fecha_contacto: c.fecha_contacto || "",
          carnet_identidad: c.carnet_identidad || "",
          latitud: c.latitud || "",
          longitud: c.longitud || "",
        })),
        ...leads.map((l: any) => ({
          id: l.id || l._id || "",
          tipo: "lead" as const,
          nombre: l.nombre,
          telefono: l.telefono || "",
          direccion: l.direccion || "",
          provincia: l.provincia_montaje || "Sin especificar",
          municipio: l.municipio || "",
          estado: l.estado || "Pendiente de visita",
          comentario: l.comentario || "",
          fuente: l.fuente || "",
          referencia: l.referencia || "",
          comercial: l.comercial || "",
          prioridad: l.prioridad || "Baja",
          fecha_contacto: l.fecha_contacto,
        })),
      ];

      // Ordenar: La Habana primero, luego otras provincias
      // Dentro de cada grupo: Clientes primero, luego Leads
      const sorted = pendientesData.sort((a, b) => {
        // 1. Por provincia (La Habana primero)
        const aEsHabana = a.provincia.toLowerCase().includes("habana");
        const bEsHabana = b.provincia.toLowerCase().includes("habana");

        if (aEsHabana && !bEsHabana) return -1;
        if (!aEsHabana && bEsHabana) return 1;

        if (a.provincia !== b.provincia)
          return a.provincia.localeCompare(b.provincia);

        // 2. Por tipo (Clientes primero, luego Leads)
        if (a.tipo === "cliente" && b.tipo === "lead") return -1;
        if (a.tipo === "lead" && b.tipo === "cliente") return 1;

        return 0;
      });

      setPendientes(sorted);
    } catch (error: any) {
      console.error("Error al cargar pendientes de visita:", error);

      // Mensaje específico para error 404
      const errorMessage = error.message?.includes("404")
        ? "El endpoint de pendientes de visita aún no está disponible en el backend. Contacta al equipo de desarrollo."
        : error.message || "No se pudieron cargar los pendientes de visita";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <ModuleHeader
        title="Visitas"
        subtitle="Gestiona visitas pendientes, realizadas y el histórico completo"
        backHref="/instalaciones"
        backLabel="Volver a Instalaciones"
        badge={{
          text: "Instalaciones",
          className: "bg-orange-100 text-orange-800",
        }}
      />

      <main className="content-with-fixed-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-8">
        <PendientesVisitaTable
          pendientes={pendientes}
          loading={loading}
          onRefresh={handleRefresh}
        />
      </main>
    </div>
  );
}
