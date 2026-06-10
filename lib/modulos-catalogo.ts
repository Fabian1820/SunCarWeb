import type { LucideIcon } from "lucide-react"
import {
  Phone,
  User,
  Users,
  ShoppingCart,
  BookmarkCheck,
  Zap,
  BarChart3,
  Monitor,
  FileCheck,
  Wrench,
  PackageSearch,
  PackagePlus,
  Calculator,
  UserPlus,
  Clipboard,
  Package,
  Ship,
  FileSpreadsheet,
  Receipt,
  Wallet,
  Coins,
  ShoppingBag,
  Briefcase,
  Building2,
  Building,
  BookOpen,
  Image,
} from "lucide-react"

/**
 * Catálogo único de módulos del sistema.
 *
 * Single-source-of-truth para:
 *   - Dashboard (app/page.tsx)
 *   - Panel de permisos (/permisos)
 *   - Auto-sync con BD (POST /modulos/)
 *
 * Convención de nombres (ver docs/PERMISSIONS_STANDARD.md):
 *   - kebab-case para módulos raíz: `recursos-humanos`
 *   - `padre/hijo` para submódulos lógicos: `facturas/pagos-clientes`
 *   - `prefijo:identificador` SOLO para permisos dinámicos por instancia:
 *       `tienda:{id}`, `almacen:{id}`
 *
 * Excepción histórica: los permisos `trabajos:*` usan `:` aunque son
 * submódulos lógicos, no dinámicos. Migrarlos sería un refactor grande;
 * por ahora se mantienen y para módulos nuevos se usa `padre/hijo`.
 *
 * Cuando agregues un módulo aquí, el panel /permisos lo creará en BD
 * automáticamente la próxima vez que el SuperAdmin abra el panel.
 */

export type ModuloGrupoKey =
  | "resultados-empresa"
  | "comercial-instaladora"
  | "comercial-ventas"
  | "operaciones"
  | "economia"
  | "gestion-almacenes"
  | "recursos-humanos"
  | "area-direccion"
  | "web"

export type ModuloGrupo = {
  key: ModuloGrupoKey
  title: string
  subtitle: string
}

export const MODULO_GRUPOS: ModuloGrupo[] = [
  {
    key: "resultados-empresa",
    title: "",
    subtitle: "",
  },
  {
    key: "comercial-instaladora",
    title: "Comercial Instaladora",
    subtitle: "Leads, clientes, ofertas y reportes de la instaladora.",
  },
  {
    key: "comercial-ventas",
    title: "Comercial Ventas",
    subtitle: "Clientes, solicitudes, reservas y tiendas del área de ventas.",
  },
  {
    key: "operaciones",
    title: "Operaciones",
    subtitle: "Brigadas, instaladores, instalaciones y solicitudes.",
  },
  {
    key: "economia",
    title: "Economía",
    subtitle: "Facturación, tasa de cambio, existencias y compras.",
  },
  {
    key: "gestion-almacenes",
    title: "Gestión de Almacenes",
    subtitle: "Materiales, almacenes e inventario.",
  },
  {
    key: "recursos-humanos",
    title: "Recursos Humanos",
    subtitle: "Personal, sedes, departamentos y asignaciones de recursos.",
  },
  {
    key: "area-direccion",
    title: "Área de Dirección",
    subtitle: "Billetera y permisos.",
  },
  {
    key: "web",
    title: "Marketing",
    subtitle: "Blog y galería.",
  },
]

/**
 * Sub-permiso específico de un módulo: una funcionalidad concreta dentro
 * del módulo que se puede asignar de forma independiente.
 *
 * Ejemplo: dentro de `instalaciones` están `trabajos:confirmar`,
 * `trabajos:averias`, etc.
 *
 * El nombre se guarda tal cual en BD. Para nuevos submódulos preferir
 * el formato `<modulo>/<sub>` (ej. `facturas/pagos-clientes`).
 */
export type SubPermiso = {
  key: string
  label: string
  descripcion?: string
}

export type ModuloCatalogo = {
  /** Nombre exacto que se guarda en BD (colección `modulos.nombre`). */
  key: string
  /** Texto visible en UI. */
  label: string
  /** Descripción corta para el dashboard. */
  descripcion: string
  /** Icono de lucide-react. */
  icon: LucideIcon
  /** Clase Tailwind del color del icono. */
  iconClass: string
  /** Ruta en frontend. */
  href: string
  /** Sección del dashboard a la que pertenece. */
  grupo: ModuloGrupoKey
  /** Sub-permisos asignables independientemente. */
  subPermisos?: SubPermiso[]
  /** ID interno del card del dashboard (default = key). */
  dashboardId?: string
  /** Permiso que se chequea en hasPermission. Default = key. */
  permission?: string
  /** Card siempre visible para usuarios autenticados, sin verificar permiso. */
  alwaysVisible?: boolean
  /** Solo visible en dashboard para SuperAdmin. */
  superAdminOnly?: boolean
  /**
   * Si es true, el módulo NO se renderiza como card en el dashboard principal
   * (aunque sigue existiendo como permiso asignable y se sincroniza con BD).
   * Pensado para sub-módulos que viven dentro de otro módulo padre — por
   * ejemplo envio-contenedores y fichas-costo viven dentro de
   * compras-envios-costos.
   */
  hideFromDashboard?: boolean
  /**
   * Keys de otros módulos del catálogo que son "hijos lógicos" de éste —
   * es decir, que viven como sub-cards dentro de su página. Tener permiso
   * a cualquiera de ellos hace que el card del padre sea visible en el
   * dashboard, igual que sucede automáticamente con los permisos en formato
   * `padre/hijo`. Útil cuando el sub-módulo no sigue esa convención de
   * naming (por compatibilidad con permisos ya asignados).
   */
  childKeys?: string[]
}

export const MODULOS_CATALOGO: ModuloCatalogo[] = [
  // ───────── Resultados empresa ─────────
  {
    key: "centro-control",
    label: "Centro de Control",
    descripcion: "Panel operacional en tiempo real con mapa y métricas clave.",
    icon: Monitor,
    iconClass: "text-emerald-700",
    href: "/centro-control",
    grupo: "resultados-empresa",
  },

  // ───────── Comercial Instaladora ─────────
  {
    key: "leads",
    label: "Gestionar Leads Instaladora",
    descripcion: "Administrar leads y oportunidades de venta.",
    icon: Phone,
    iconClass: "text-emerald-600",
    href: "/leads",
    grupo: "comercial-instaladora",
  },
  {
    key: "clientes",
    label: "Gestionar Clientes Instaladora",
    descripcion: "Administrar información y reportes de clientes.",
    icon: User,
    iconClass: "text-emerald-600",
    href: "/clientes",
    grupo: "comercial-instaladora",
  },
  {
    key: "ofertas-gestion",
    label: "Gestionar Ofertas Instaladora",
    descripcion: "Confección de ofertas y herramientas de ventas.",
    icon: Zap,
    iconClass: "text-emerald-600",
    href: "/ofertas-gestion",
    grupo: "comercial-instaladora",
  },
  {
    key: "reportes-comercial",
    label: "Reportes Comercial Instaladora",
    descripcion: "Reportes y análisis del área comercial.",
    icon: BarChart3,
    iconClass: "text-emerald-600",
    href: "/reportes-comercial",
    grupo: "comercial-instaladora",
  },

  // ───────── Comercial Ventas ─────────
  {
    key: "clientes-ventas",
    label: "Gestionar Clientes Ventas",
    descripcion: "Registrar y gestionar clientes de ventas.",
    icon: Users,
    iconClass: "text-indigo-600",
    href: "/clientes-ventas",
    grupo: "comercial-ventas",
  },
  {
    key: "solicitudes-ventas",
    label: "Solicitudes Ventas",
    descripcion: "Crear y administrar solicitudes de ventas web.",
    icon: ShoppingCart,
    iconClass: "text-indigo-600",
    href: "/solicitudes-ventas",
    grupo: "comercial-ventas",
  },
  {
    key: "reservas-ventas",
    label: "Reservas Ventas",
    descripcion: "Gestionar reservas de materiales para ventas.",
    icon: BookmarkCheck,
    iconClass: "text-indigo-600",
    href: "/reservas-ventas",
    grupo: "comercial-ventas",
  },
  {
    key: "consignaciones",
    label: "Consignaciones",
    descripcion:
      "Ventas con mercancía entregada y pago pendiente (pago parcial o devolución).",
    icon: PackageSearch,
    iconClass: "text-indigo-600",
    href: "/consignaciones",
    grupo: "comercial-ventas",
  },
  {
    key: "tiendas-suncarventas",
    label: "Tiendas Suncar",
    descripcion: "Gestión de tiendas y puntos de venta.",
    icon: ShoppingBag,
    iconClass: "text-indigo-600",
    href: "/tiendas-suncarventas",
    grupo: "comercial-ventas",
  },
  {
    key: "reportes-ventas",
    label: "Reportes Comercial Ventas",
    descripcion: "Resultados por vendedor: ofertas, confirmadas y cobros.",
    icon: BarChart3,
    iconClass: "text-indigo-600",
    href: "/reportes-ventas",
    grupo: "comercial-ventas",
  },

  // ───────── Operaciones ─────────
  {
    key: "brigadas",
    label: "Gestionar Brigadas",
    descripcion: "Administrar equipos de trabajo y asignaciones.",
    icon: Users,
    iconClass: "text-teal-600",
    href: "/brigadas",
    grupo: "operaciones",
  },
  {
    key: "trabajadores",
    label: "Gestionar Instaladores",
    descripcion: "Administrar personal y asignaciones.",
    icon: UserPlus,
    iconClass: "text-teal-600",
    href: "/trabajadores",
    grupo: "operaciones",
  },
  {
    key: "instalaciones",
    label: "Instalaciones",
    descripcion: "Instalaciones en proceso, nuevas y averías.",
    icon: Wrench,
    iconClass: "text-teal-600",
    href: "/instalaciones",
    grupo: "operaciones",
    subPermisos: [
      { key: "trabajos:confirmar", label: "Confirmar salidas" },
      { key: "trabajos:registrar", label: "Cierre diario instalaciones" },
      { key: "trabajos:averias", label: "Averías" },
      { key: "trabajos:actualizaciones", label: "Actualizaciones" },
      { key: "trabajos:entregas", label: "Entregas sin instalar" },
      { key: "trabajos:todos", label: "Todos los trabajos" },
    ],
  },
  {
    key: "trabajos:acceso-directo",
    label: "Trabajos Diarios (acceso directo)",
    descripcion: "Seguimiento diario de todos los trabajos e instalaciones.",
    icon: FileCheck,
    iconClass: "text-teal-600",
    href: "/operaciones/todos-trabajos",
    grupo: "operaciones",
    dashboardId: "todos-trabajos",
  },
  {
    key: "solicitudes-materiales",
    label: "Solicitudes de Materiales",
    descripcion: "Crear y gestionar solicitudes de materiales.",
    icon: PackageSearch,
    iconClass: "text-teal-600",
    href: "/instalaciones/solicitudes-materiales",
    grupo: "operaciones",
  },

  // ───────── Economía ─────────
  {
    key: "facturas",
    label: "Facturación",
    descripcion: "Gestión de facturas y vales de venta.",
    icon: Receipt,
    iconClass: "text-amber-600",
    href: "/facturas",
    grupo: "economia",
    subPermisos: [
      { key: "facturas/pagos-clientes", label: "Pagos Clientes" },
      {
        key: "facturas/vales-facturas-instaladora",
        label: "Vales y Facturas de Instaladora",
      },
      {
        key: "facturas/facturas-solar-carros",
        label: "Facturas Solar Carros",
      },
      { key: "facturas/obras-terminadas", label: "Obras Terminadas" },
    ],
  },
  {
    key: "tasa-cambio-diaria",
    label: "Tasa de Cambio diaria",
    descripcion: "Registro diario de 1 USD en EUR y CUP para contabilidad.",
    icon: Coins,
    iconClass: "text-amber-600",
    href: "/tasa-cambio-diaria",
    grupo: "economia",
  },
  {
    key: "kardex-costo",
    label: "Kardex de Costos",
    descripcion: "Costo promedio ponderado por material y almacén con histórico de entradas.",
    icon: Calculator,
    iconClass: "text-amber-600",
    href: "/kardex-costo",
    grupo: "economia",
    hideFromDashboard: true,
  },
  {
    key: "existencias-contabilidad",
    label: "Existencias Contabilidad",
    descripcion: "Gestión de inventario contable y tickets de salida.",
    icon: PackageSearch,
    iconClass: "text-amber-600",
    href: "/existencias-contabilidad",
    grupo: "economia",
  },
  {
    key: "compras-envios-costos",
    label: "Compras, Envíos y Costos",
    descripcion: "Compras, contenedores, kardex de costos y recepciones de almacén.",
    icon: FileSpreadsheet,
    iconClass: "text-amber-600",
    href: "/compras-envios-costos",
    grupo: "economia",
    // Estos hijos no usan formato padre/hijo en BD (por compatibilidad con
    // asignaciones existentes), así que se declaran explícitos para que el
    // card padre sea visible cuando el trabajador tiene cualquiera de ellos.
    childKeys: ["envio-contenedores", "fichas-costo", "kardex-costo", "solicitudes-entrada-almacen"],
  },

  // Estos viven bajo "Compras, Envíos y Costos" como sub-cards. Se mantienen
  // en el catálogo para que sus permisos sean asignables y sincronizables con
  // BD, pero NO aparecen como cards independientes en el dashboard principal
  // (hideFromDashboard).
  // El permission key se mantiene como `envio-contenedores` para preservar
  // asignaciones existentes; el label/href ya reflejan el módulo renombrado.
  {
    key: "envio-contenedores",
    label: "Compras",
    descripcion: "Registrar y monitorear compras y contenedores.",
    icon: Ship,
    iconClass: "text-amber-600",
    href: "/compras",
    grupo: "economia",
    hideFromDashboard: true,
  },
  {
    key: "fichas-costo",
    label: "Fichas de Costo",
    descripcion: "Vista contable de materiales: costos, precios, márgenes, kardex y compras por material.",
    icon: FileSpreadsheet,
    iconClass: "text-amber-600",
    href: "/fichas-costo",
    grupo: "economia",
    hideFromDashboard: true,
    subPermisos: [
      {
        key: "fichas-costo/solo-precios",
        label: "Solo ver precios (precio venta, p. instaladora, % rebajable)",
        descripcion:
          "Si el usuario tiene SOLO este sub-permiso (sin el padre 'fichas-costo'), verá la tabla limitada a precio venta, p. instaladora y % rebajable, sin costo, margen, acciones ni filtros sensibles.",
      },
    ],
  },

  // ───────── Gestión de Almacenes ─────────
  {
    key: "materiales",
    label: "Gestionar Materiales",
    descripcion: "Administrar catálogo de materiales.",
    icon: Package,
    iconClass: "text-sky-700",
    href: "/materiales",
    grupo: "gestion-almacenes",
  },
  {
    key: "inventario",
    label: "Inventarios",
    descripcion: "Controlar almacenes, stock y movimientos.",
    icon: Package,
    iconClass: "text-sky-700",
    href: "/inventario",
    grupo: "gestion-almacenes",
  },
  {
    key: "almacenes-suncar",
    label: "Almacenes Suncar",
    descripcion: "Gestión de almacenes y control de inventario.",
    icon: Package,
    iconClass: "text-sky-700",
    href: "/almacenes-suncar",
    grupo: "gestion-almacenes",
    subPermisos: [
      {
        key: "almacenes-suncar/admin",
        label: "Almacenes (admin) — ajustes manuales de inventario",
      },
    ],
  },
  {
    // Vive como sub-card dentro de /compras-envios-costos. Pertenece al flujo
    // de Compras (recepciones), no al dashboard de almacenes, así que va
    // hideFromDashboard.
    key: "solicitudes-entrada-almacen",
    label: "Solicitudes de Entrada",
    descripcion: "Recepción de materiales de compra al almacén con split por pool.",
    icon: PackagePlus,
    iconClass: "text-amber-600",
    href: "/solicitudes-entrada-almacen",
    grupo: "economia",
    hideFromDashboard: true,
  },

  // ───────── Recursos Humanos ─────────
  {
    key: "recursos-humanos",
    label: "Recursos Humanos",
    descripcion: "Gestión de nómina y estímulos mensuales.",
    icon: Briefcase,
    iconClass: "text-violet-600",
    href: "/recursos-humanos",
    grupo: "recursos-humanos",
  },
  {
    key: "sedes",
    label: "Gestionar Sedes",
    descripcion: "Administrar sedes nacionales y provinciales.",
    icon: Building2,
    iconClass: "text-violet-600",
    href: "/sedes",
    grupo: "recursos-humanos",
  },
  {
    key: "departamentos",
    label: "Gestionar Departamentos",
    descripcion: "Administrar departamentos organizacionales.",
    icon: Building,
    iconClass: "text-violet-600",
    href: "/departamentos",
    grupo: "recursos-humanos",
  },
  {
    key: "asignaciones",
    label: "Asignaciones de Recursos",
    descripcion: "Gestionar recursos asignados a trabajadores e instalaciones.",
    icon: Clipboard,
    iconClass: "text-violet-600",
    href: "/asignaciones",
    grupo: "recursos-humanos",
  },

  // ───────── Área de Dirección ─────────
  {
    key: "wallet",
    label: "Billetera",
    descripcion: "Ingresos y gastos manuales con trazabilidad global.",
    icon: Wallet,
    iconClass: "text-emerald-800",
    href: "/wallet",
    grupo: "area-direccion",
    alwaysVisible: true,
  },

  // ───────── Marketing ─────────
  {
    key: "blog",
    label: "Blog",
    descripcion: "Gestión de artículos y noticias.",
    icon: BookOpen,
    iconClass: "text-rose-500",
    href: "/blog",
    grupo: "web",
  },
  {
    key: "galeriaweb",
    label: "Galería Web",
    descripcion: "Gestión de imágenes para el sitio web.",
    icon: Image,
    iconClass: "text-rose-500",
    href: "/galeriaweb",
    grupo: "web",
  },
]

/**
 * Devuelve la lista plana de todos los nombres de permiso que el catálogo
 * espera que existan en BD: módulos raíz + sub-permisos declarados.
 *
 * Útil para la sincronización con la colección `modulos`.
 */
export function getNombresCatalogo(): string[] {
  const out: string[] = []
  for (const m of MODULOS_CATALOGO) {
    out.push(m.key)
    if (m.subPermisos) {
      for (const sp of m.subPermisos) out.push(sp.key)
    }
  }
  return out
}

/**
 * Indica si un nombre de módulo guardado en BD es "dinámico por instancia"
 * y por tanto NO debería figurar en el catálogo (se crea/elimina con cada
 * tienda o almacén). El panel de permisos los ignora al detectar huérfanos.
 */
export function esModuloDinamico(nombre: string): boolean {
  return nombre.startsWith("tienda:") || nombre.startsWith("almacen:")
}
