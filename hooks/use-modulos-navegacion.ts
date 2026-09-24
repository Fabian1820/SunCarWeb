"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  type LucideIcon,
  BellRing,
  Briefcase,
  CreditCard,
  FileCheck2,
  HardHat,
  LayoutDashboard,
  Megaphone,
  Package,
  PlugZap,
  Plus,
  Receipt,
  Shield,
  ShoppingBag,
  Users,
  Wrench,
} from "lucide-react";
import {
  MODULOS_CATALOGO,
  MODULO_GRUPOS,
  type ModuloCatalogo,
} from "@/lib/modulos-catalogo";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useSolineras } from "@/hooks/use-solineras";
import { PERMISOS_POR_FACTURAR } from "@/lib/constants/por-facturar-permisos";
import { etiquetaEstadoSolinera } from "@/lib/utils/solineras";
import type { Solinera } from "@/lib/types/feats/solineras/solinera-types";

/**
 * Árbol de navegación del panel: áreas → módulos → secciones internas.
 *
 * Lo comparten la pantalla de inicio (tarjetas por área) y la barra lateral
 * que acompaña a todos los módulos. Antes la lógica de permisos vivía solo en
 * app/page.tsx; si cada sitio la calculara por su cuenta acabarían enseñando
 * módulos distintos al mismo usuario.
 */

export type ModuloNav = {
  id: string;
  permission?: string;
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  iconClass: string;
  alwaysVisible?: boolean;
  superAdminOnly?: boolean;
  childKeys?: string[];
  tieneSubmodulos?: boolean;
  /** Si existe, se ejecuta esto en vez de navegar a `href`. */
  onSelect?: () => void;
  /** Secciones que viven dentro del módulo, con página propia. */
  hijos?: ModuloNav[];
};

export type AreaNav = {
  id: string;
  title: string;
  subtitle: string;
  modules: ModuloNav[];
};

export type AreaMeta = {
  label: string;
  icon: LucideIcon;
  chip: string;
  bar: string;
};

// Metadatos visuales por área (icono + acentos de color). El label sirve de
// fallback cuando el grupo no define título en MODULO_GRUPOS.
const AREA_META: Record<string, AreaMeta> = {
  "resultados-empresa": {
    label: "Centro de Control",
    icon: LayoutDashboard,
    chip: "bg-emerald-50 text-emerald-700",
    bar: "from-emerald-400 to-emerald-600",
  },
  "comercial-instaladora": {
    label: "Comercial Instaladora",
    icon: Briefcase,
    chip: "bg-emerald-50 text-emerald-700",
    bar: "from-emerald-400 to-emerald-600",
  },
  "comercial-ventas": {
    label: "Comercial Ventas",
    icon: ShoppingBag,
    chip: "bg-indigo-50 text-indigo-700",
    bar: "from-indigo-400 to-indigo-600",
  },
  operaciones: {
    label: "Operaciones",
    icon: Wrench,
    chip: "bg-teal-50 text-teal-700",
    bar: "from-teal-400 to-teal-600",
  },
  solineras: {
    label: "Solineras",
    icon: PlugZap,
    chip: "bg-lime-50 text-lime-800",
    bar: "from-lime-400 to-lime-600",
  },
  economia: {
    label: "Economía",
    icon: Receipt,
    chip: "bg-amber-50 text-amber-700",
    bar: "from-amber-400 to-amber-600",
  },
  "gestion-almacenes": {
    label: "Gestión de Almacenes",
    icon: Package,
    chip: "bg-sky-50 text-sky-700",
    bar: "from-sky-400 to-sky-600",
  },
  "recursos-humanos": {
    label: "Recursos Humanos",
    icon: Users,
    chip: "bg-violet-50 text-violet-700",
    bar: "from-violet-400 to-violet-600",
  },
  "area-direccion": {
    label: "Área de Dirección",
    icon: Shield,
    chip: "bg-emerald-50 text-emerald-800",
    bar: "from-emerald-500 to-teal-700",
  },
  web: {
    label: "Marketing",
    icon: Megaphone,
    chip: "bg-rose-50 text-rose-600",
    bar: "from-rose-400 to-rose-600",
  },
};

export const metaArea = (id: string): AreaMeta =>
  AREA_META[id] ?? {
    label: id,
    icon: LayoutDashboard,
    chip: "bg-gray-100 text-gray-700",
    bar: "from-gray-400 to-gray-600",
  };

export const tituloArea = (area: AreaNav): string =>
  area.title || metaArea(area.id).label;

/**
 * Secciones con página propia que un módulo pinta como tarjetas por dentro y
 * que el catálogo no declara como módulos (son sub-permisos `padre/hijo`).
 * Deben coincidir con las tarjetas de la página del módulo.
 */
const SECCIONES_INTERNAS: Record<
  string,
  Array<
    Omit<ModuloNav, "id"> & {
      id: string;
      /** Sección aditiva: se ve con cualquiera de estos permisos exactos, no con el padre. */
      permisosExactos?: string[];
    }
  >
> = {
  // Ver app/facturas/page.tsx
  facturas: [
    {
      id: "pagos-clientes",
      href: "/facturas/pagos-clientes",
      icon: CreditCard,
      title: "Pagos Clientes",
      description: "Pagos recibidos de clientes y cuentas por cobrar.",
      iconClass: "text-amber-600",
    },
    {
      id: "facturas-solar-carros",
      href: "/facturas/facturas-solar-carros",
      icon: Receipt,
      title: "Facturas Solar Carros",
      description: "Facturación Solar Carros para Instaladora y Ventas.",
      iconClass: "text-sky-600",
    },
    {
      id: "obras-terminadas",
      href: "/facturas/obras-terminadas",
      icon: HardHat,
      title: "Obras Terminadas",
      description: "Resultados por oferta para el pago por resultados.",
      iconClass: "text-emerald-600",
    },
    {
      id: "por-facturar",
      href: "/facturas/por-facturar",
      icon: FileCheck2,
      title: "Por facturar",
      description: "Clientes instalados con ofertas sin facturar.",
      iconClass: "text-emerald-700",
      permisosExactos: PERMISOS_POR_FACTURAR,
    },
  ],
};

const catalogoANav = (m: ModuloCatalogo): ModuloNav => ({
  id: m.dashboardId ?? m.key,
  permission: m.permission ?? m.key,
  href: m.href,
  icon: m.icon,
  title: m.label,
  description: m.descripcion,
  iconClass: m.iconClass,
  alwaysVisible: m.alwaysVisible,
  superAdminOnly: m.superAdminOnly,
  childKeys: m.childKeys,
  tieneSubmodulos: m.tieneSubmodulos,
});

const CATALOGO_POR_KEY = new Map(MODULOS_CATALOGO.map((m) => [m.key, m]));

/** Quita query y hash para comparar rutas. */
const rutaDe = (href: string) => href.split("?")[0].split("#")[0];

/**
 * Área y módulo a los que pertenece una ruta. Gana el href más largo que la
 * contenga, para que `/facturas/pagos-clientes` caiga en su sección y no solo
 * en Facturación.
 */
export function ubicarRuta(
  areas: AreaNav[],
  pathname: string,
): { areaId?: string; moduloId?: string; seccionId?: string } {
  let mejor: { largo: number; areaId: string; moduloId: string; seccionId?: string } | null =
    null;
  const probar = (href: string, areaId: string, moduloId: string, seccionId?: string) => {
    if (href.startsWith("/api/")) return;
    const ruta = rutaDe(href);
    if (ruta === "/") return;
    if (pathname !== ruta && !pathname.startsWith(`${ruta}/`)) return;
    if (!mejor || ruta.length > mejor.largo) {
      mejor = { largo: ruta.length, areaId, moduloId, seccionId };
    }
  };
  for (const area of areas) {
    for (const modulo of area.modules) {
      probar(modulo.href, area.id, modulo.id);
      for (const hijo of modulo.hijos ?? []) {
        probar(hijo.href, area.id, modulo.id, hijo.id);
      }
    }
  }
  if (!mejor) return {};
  const { areaId, moduloId, seccionId } = mejor;
  return { areaId, moduloId, seccionId };
}

interface Opciones {
  /** Qué hacer al elegir «Nueva solinera». Sin esto, se va a /solineras. */
  onNuevaSolinera?: () => void;
}

export function useModulosNavegacion({ onNuevaSolinera }: Opciones = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    hasPermission,
    hasExactPermission,
    hasSubPermission,
    user,
    getAuthHeader,
  } = useAuth();

  // Solineras: cada una es un módulo del área. Solo se piden si la persona
  // tiene el permiso: sin él la API respondería 403.
  const solinerasHabilitado = hasPermission("solineras");
  const {
    data: solineras,
    loading: cargandoSolineras,
    error: errorSolineras,
    recargar: recargarSolineras,
  } = useSolineras(solinerasHabilitado);
  const puedeCrearSolinera = hasExactPermission("solineras/red");

  const hijosDe = (m: ModuloCatalogo): ModuloNav[] => {
    const delCatalogo = (m.childKeys ?? [])
      .map((k) => CATALOGO_POR_KEY.get(k))
      .filter((c): c is ModuloCatalogo => Boolean(c))
      .filter((c) => hasPermission(c.permission ?? c.key))
      .map(catalogoANav);
    const internas = (SECCIONES_INTERNAS[m.key] ?? [])
      .filter((s) =>
        s.permisosExactos
          ? s.permisosExactos.some((p) => hasExactPermission(p))
          : hasSubPermission(m.key, s.id),
      )
      .map(({ permisosExactos: _exactos, ...s }) => ({ ...s, id: `${m.key}/${s.id}` }));
    return [...delCatalogo, ...internas];
  };

  // Dedupe por id: si el catálogo trae dos entradas con la misma key (ha
  // pasado al fusionar ramas), el módulo salía dos veces en su área y, peor,
  // React reconciliaba mal la rejilla —dos hijos con la misma `key`— y la
  // tarjeta repetida se quedaba pegada al cambiar de área.
  const allModules: ModuloNav[] = Array.from(
    new globalThis.Map(
      MODULOS_CATALOGO.filter((m) => !m.hideFromDashboard)
        .map((m) => {
          const nav = catalogoANav(m);
          const hijos = hijosDe(m);
          return hijos.length > 0 ? { ...nav, hijos } : nav;
        })
        .map((m) => [m.id, m] as const),
    ).values(),
  );

  const solineraANav = (s: Solinera): ModuloNav => {
    const lugar = [s.municipio, s.provincia_nombre].filter(Boolean).join(", ");
    const ocupados = `${s.vehiculos_en_puesto ?? 0} de ${s.puestos_total ?? 0} puestos ocupados`;
    return {
      id: `solinera:${s.id}`,
      href: `/solineras/${s.id}`,
      icon: PlugZap,
      title: s.nombre,
      description: [
        s.estado !== "operativa" ? etiquetaEstadoSolinera(s.estado) : null,
        lugar || s.codigo,
        ocupados,
      ]
        .filter(Boolean)
        .join(" · "),
      iconClass: "text-lime-700",
    };
  };

  const solinerasModules: ModuloNav[] = solinerasHabilitado
    ? [
        ...(solineras ?? []).map(solineraANav),
        ...(puedeCrearSolinera
          ? [
              {
                id: "solineras-nueva",
                href: "/solineras",
                icon: Plus,
                title: "Nueva solinera",
                description: "Crea una solinera con sus puestos de carga.",
                iconClass: "text-lime-700",
                onSelect: onNuevaSolinera,
              },
            ]
          : []),
      ]
    : [];

  const permisosModule: ModuloNav = {
    id: "permisos",
    href: "/permisos",
    icon: Shield,
    title: "Gestión de Permisos",
    description: "Administrar módulos y permisos de trabajadores.",
    iconClass: "text-red-600",
  };

  const superAdminModules: ModuloNav[] = user?.is_superAdmin
    ? [
        permisosModule,
      ]
    : [];

  // "Gestión de Wallet" ya no tiene tarjeta: ver todas y administrar son
  // sub-permisos de `wallet` y se asignan en /permisos. Las alertas no son un
  // módulo del catálogo (su clave `wallet-alertas` es sub-permiso de wallet),
  // así que su tarjeta se añade aquí.
  const puedeAlertasWallet =
    hasExactPermission("wallet-alertas") || hasExactPermission("wallet/admin");
  const walletAdminModules: ModuloNav[] = puedeAlertasWallet
    ? [
        {
          id: "wallet-alertas",
          href: "/wallet-alertas",
          icon: BellRing,
          title: "Alertas de Billetera",
          description: "Avisar por WhatsApp o SMS los movimientos grandes.",
          iconClass: "text-amber-600",
        },
      ]
    : [];

  const availableModules = [
    ...allModules.filter((module) => {
      // Los módulos marcados como superAdminOnly no se muestran a nadie más,
      // aunque tengan permiso asignado.
      if (module.superAdminOnly) return !!user?.is_superAdmin;
      if (module.alwaysVisible) return true;
      if (hasPermission(module.permission ?? module.id)) return true;
      if (module.childKeys?.some((k) => hasPermission(k))) return true;
      return false;
    }),
    ...superAdminModules,
    // Quien tiene el módulo gestion-permisos entra a /permisos sin ser superAdmin.
    ...(!user?.is_superAdmin && hasPermission("gestion-permisos") ? [permisosModule] : []),
    ...walletAdminModules,
    ...solinerasModules,
  ];

  const modulosPorId = new globalThis.Map(
    availableModules.map((module) => [module.id, module]),
  );

  const areas: AreaNav[] = MODULO_GRUPOS.map((grupo) => {
    const delCatalogo = MODULOS_CATALOGO.filter(
      (m) => m.grupo === grupo.key && !m.hideFromDashboard,
    ).map((m) => m.dashboardId ?? m.key);
    const ids =
      grupo.key === "area-direccion"
        ? [...delCatalogo, "wallet-alertas", "permisos"]
        : grupo.key === "solineras"
          ? solinerasModules.map((m) => m.id)
          : delCatalogo;
    return {
      id: grupo.key,
      title: grupo.title,
      subtitle: grupo.subtitle,
      modules: Array.from(new Set(ids))
        .map((id) => modulosPorId.get(id))
        .filter((m): m is ModuloNav => Boolean(m)),
    };
  })
    // El área Solineras se ve siempre que se tenga el permiso, aunque todavía no
    // haya ninguna solinera (o estén cargando): si no, no habría cómo crear la primera.
    .filter(
      (area) =>
        area.modules.length > 0 ||
        (area.id === "solineras" && solinerasHabilitado),
    );

  // Módulos cuyo href es una API route (no una página interna) abren un
  // destino externo (ej. Suncar Whatsapp/Chatwoot) en pestaña nueva, vía un
  // link de SSO pedido al momento. La pestaña se abre YA, dentro del gesto de
  // click, para que el navegador no la bloquee como popup cuando la URL real
  // llegue después de forma asíncrona.
  const abrirExterno = useCallback(
    async (module: ModuloNav) => {
      const win = window.open("about:blank", "_blank");
      try {
        const res = await fetch(module.href, {
          method: "POST",
          headers: { ...getAuthHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({
            ci: user?.ci,
            nombre: user?.nombre,
            foto_perfil: user?.foto_perfil,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data.message || "No se pudo abrir el módulo");
        }
        // Si el navegador bloqueó la pestaña, window.open devuelve null: se
        // navega en la propia pestaña, que es mejor que no entrar.
        if (win) {
          win.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } catch (error) {
        win?.close();
        toast({
          title: "No se pudo abrir el módulo",
          description:
            error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive",
        });
      }
    },
    [getAuthHeader, toast, user?.ci, user?.nombre, user?.foto_perfil],
  );

  const abrirModulo = useCallback(
    (module: ModuloNav) => {
      if (module.onSelect) {
        module.onSelect();
      } else if (module.href.startsWith("/api/")) {
        void abrirExterno(module);
      } else {
        router.push(module.href);
      }
    },
    [abrirExterno, router],
  );

  return {
    areas,
    modulosPorId,
    abrirModulo,
    solineras,
    cargandoSolineras,
    errorSolineras,
    recargarSolineras,
    solinerasHabilitado,
    puedeCrearSolinera,
  };
}
