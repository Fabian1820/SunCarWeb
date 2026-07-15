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
  MapPin,
  Clock,
  CalendarDays,
  CalendarCheck,
  AlertTriangle,
  CreditCard,
  HardHat,
  MessageCircle,
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
    title: "General",
    subtitle: "Centro de control y billetera.",
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
    subtitle: "Permisos del sistema.",
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
  /**
   * Si es true, el sub-permiso es ADITIVO (capacidad extra), no un subconjunto
   * del padre: tener el módulo padre NO lo concede. Hay que asignarlo
   * explícitamente. Útil para privilegios elevados dentro de un módulo —
   * p.ej. `almacenes-suncar/admin` (movimientos manuales de inventario): el
   * almacenero base ve el almacén pero NO los botones; solo el admin sí.
   *
   * Por defecto (false/undefined) el sub-permiso es un SUBCONJUNTO: tener el
   * padre lo concede automáticamente (p.ej. `facturas/*`, `instalaciones/*`).
   */
  aditivo?: boolean
  /**
   * Sub-permisos anidados un nivel más (ej: los `trabajos:*` bajo la tarjeta
   * "Trabajos Diarios", que a su vez está bajo `instalaciones`).
   *
   * IMPORTANTE: los anidados son SIEMPRE independientes en runtime — como sus
   * claves usan `:` (no `padre/hijo`), `hasPermission` NO los hereda del módulo
   * ni del sub-permiso contenedor, así que hay que asignarlos explícitamente
   * (se comportan como aditivos). El anidamiento aquí es solo agrupación visual
   * en el panel de permisos; NO cambia quién los tiene.
   */
  subPermisos?: SubPermiso[]
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
  // ───────── General ─────────
  {
    key: "centro-control",
    label: "Centro de Control",
    descripcion: "Panel operacional en tiempo real con mapa y métricas clave.",
    icon: Monitor,
    iconClass: "text-emerald-700",
    href: "/centro-control",
    grupo: "resultados-empresa",
  },
  {
    key: "wallet",
    label: "Billetera",
    descripcion: "Ingresos y gastos manuales con trazabilidad global.",
    icon: Wallet,
    iconClass: "text-emerald-800",
    href: "/wallet",
    grupo: "resultados-empresa",
    alwaysVisible: true,
  },
  {
    key: "suncar-whatsapp",
    label: "Suncar Whatsapp",
    descripcion: "Conversaciones de WhatsApp con clientes.",
    icon: MessageCircle,
    iconClass: "text-emerald-600",
    href: "/api/chatwoot/sso",
    grupo: "resultados-empresa",
    subPermisos: [
      {
        key: "suncar-whatsapp/admin",
        label: "Suncar Whatsapp (administrador)",
        descripcion:
          "Entra a Chatwoot con rol administrador en vez de agente. Sin este sub-permiso, el trabajador entra como agente.",
        aditivo: true,
      },
    ],
  },

  // ───────── Comercial Instaladora ─────────
  {
    key: "leads",
    label: "Leads",
    descripcion: "Administrar leads y oportunidades de venta.",
    icon: Phone,
    iconClass: "text-emerald-600",
    href: "/leads",
    grupo: "comercial-instaladora",
  },
  {
    key: "clientes",
    label: "Clientes",
    descripcion: "Administrar información y reportes de clientes.",
    icon: User,
    iconClass: "text-emerald-600",
    href: "/clientes",
    grupo: "comercial-instaladora",
    subPermisos: [
      {
        key: "costos-materiales-cliente",
        label: "Ver costos de materiales (entregados/pendientes)",
        descripcion:
          "Muestra el costo de los materiales y los totales entregado/pendiente en el diálogo de entregas de Clientes, Instalaciones en Proceso e Instalaciones Nuevas. ADITIVO: tener el módulo padre NO lo concede; hay que asignarlo explícitamente a quien pueda ver costos.",
        aditivo: true,
      },
    ],
  },
  {
    key: "ofertas-gestion",
    label: "Ofertas",
    descripcion: "Confección de ofertas y herramientas de ventas.",
    icon: Zap,
    iconClass: "text-emerald-600",
    href: "/ofertas-gestion",
    grupo: "comercial-instaladora",
  },
  {
    key: "reservas-instaladora",
    label: "Reservas Instaladora",
    descripcion: "Ver reservas de materiales de proyectos de instalación.",
    icon: BookmarkCheck,
    iconClass: "text-emerald-600",
    href: "/reservas-ventas?vista=instaladora",
    grupo: "comercial-instaladora",
  },
  {
    // El permission key se mantiene como `reportes-comercial` para preservar
    // asignaciones existentes; el label/href ahora apuntan directamente al
    // submódulo "Resultados por Comercial" (los otros submódulos quedan ocultos).
    key: "reportes-comercial",
    label: "Resultados por Comercial",
    descripcion: "Ofertas cerradas con pagos y márgenes por comercial.",
    icon: BarChart3,
    iconClass: "text-emerald-600",
    href: "/reportes-comercial/resultados-comercial",
    grupo: "comercial-instaladora",
  },
  {
    key: "distribucion-comerciales",
    label: "Distribución de Comerciales",
    descripcion: "Organizar en equipos a los comerciales de instaladora y a las de ventas que apoyan.",
    icon: Users,
    iconClass: "text-emerald-600",
    href: "/distribucion-comerciales",
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
    key: "solicitudes-materiales",
    label: "Solicitudes de Materiales",
    descripcion: "Crear y gestionar solicitudes de materiales.",
    icon: PackageSearch,
    iconClass: "text-teal-600",
    href: "/instalaciones/solicitudes-materiales",
    grupo: "operaciones",
  },
  // Submódulos de Instalaciones surfaced como módulos propios en Operaciones.
  // Cada uno tiene permiso independiente (formato padre/hijo `instalaciones/*`).
  {
    key: "instalaciones/visitas",
    label: "Visitas",
    descripcion: "Pendientes, realizadas y todas las visitas.",
    icon: MapPin,
    iconClass: "text-teal-600",
    href: "/instalaciones/pendientes-visita",
    grupo: "operaciones",
  },
  {
    key: "instalaciones/en-proceso",
    label: "Instalaciones en Proceso",
    descripcion: "Clientes con instalación en proceso.",
    icon: Clock,
    iconClass: "text-teal-600",
    href: "/instalaciones/en-proceso",
    grupo: "operaciones",
  },
  {
    key: "instalaciones/nuevas",
    label: "Instalaciones Nuevas",
    descripcion: "Nuevas instalaciones por realizar.",
    icon: Wrench,
    iconClass: "text-teal-600",
    href: "/instalaciones/nuevas",
    grupo: "operaciones",
  },
  {
    key: "instalaciones/trabajos-diarios",
    label: "Trabajos Diarios",
    descripcion: "Confirmar salida y entrega de materiales por vale.",
    icon: CalendarDays,
    iconClass: "text-teal-600",
    href: "/instalaciones/trabajos-diarios",
    grupo: "operaciones",
  },
  {
    key: "instalaciones/planificacion",
    label: "Planificación Diaria de Trabajos",
    descripcion: "Planifica trabajos del día siguiente por brigadas.",
    icon: CalendarCheck,
    iconClass: "text-teal-600",
    href: "/instalaciones/planificacion-diaria-trabajos",
    grupo: "operaciones",
  },
  {
    key: "instalaciones/averias",
    label: "Averías",
    descripcion: "Reportes de averías y mantenimiento.",
    icon: AlertTriangle,
    iconClass: "text-teal-600",
    href: "/instalaciones/averias",
    grupo: "operaciones",
  },
  // El hub Instalaciones y el acceso directo a Trabajos Diarios quedan ocultos
  // del dashboard (sus submódulos ya aparecen arriba como módulos propios).
  // Se conservan en el catálogo para preservar permisos/subpermisos existentes.
  {
    key: "instalaciones",
    label: "Instalaciones",
    descripcion: "Instalaciones en proceso, nuevas y averías.",
    icon: Wrench,
    iconClass: "text-teal-600",
    href: "/instalaciones",
    grupo: "operaciones",
    hideFromDashboard: true,
    // Una tarjeta = un sub-permiso (`instalaciones/<tarjeta>`). Tener el módulo
    // `instalaciones` completo concede todas (herencia padre→hijo por el `/`).
    // Asignar solo un sub-permiso da acceso únicamente a esa tarjeta.
    subPermisos: [
      { key: "instalaciones/pendientes-visita", label: "Visitas" },
      { key: "instalaciones/en-proceso", label: "Instalaciones en Proceso" },
      { key: "instalaciones/nuevas", label: "Instalaciones Nuevas" },
      {
        key: "instalaciones/trabajos-diarios",
        label: "Trabajos Diarios",
        // Los `trabajos:*` viven bajo esta tarjeta. Se mantienen con su clave
        // `trabajos:*` original (no se renombran) para no romper asignaciones
        // existentes; son independientes (ver nota en SubPermiso.subPermisos).
        subPermisos: [
          { key: "trabajos:confirmar", label: "Confirmar salidas" },
          { key: "trabajos:registrar", label: "Cierre diario instalaciones" },
          { key: "trabajos:averias", label: "Averías" },
          { key: "trabajos:actualizaciones", label: "Actualizaciones" },
          { key: "trabajos:entregas", label: "Entregas sin instalar" },
          { key: "trabajos:todos", label: "Todos los trabajos" },
        ],
      },
      { key: "instalaciones/averias", label: "Averías" },
      { key: "instalaciones/planificacion-diaria-trabajos", label: "Planificación Diaria de Trabajos" },
      { key: "instalaciones/ordenes-trabajo", label: "Órdenes de Trabajo" },
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
    hideFromDashboard: true,
  },

  // ───────── Economía ─────────
  // Submódulos de Facturación surfaced como módulos propios en Economía.
  // Mantienen sus keys `facturas/*` existentes, así que conservan los permisos
  // ya asignados (quien tenga el subpermiso exacto o el permiso `facturas`
  // completo los seguirá viendo).
  {
    key: "facturas/pagos-clientes",
    label: "Pagos Clientes",
    descripcion: "Pagos recibidos de clientes y cuentas por cobrar.",
    icon: CreditCard,
    iconClass: "text-amber-600",
    href: "/facturas/pagos-clientes",
    grupo: "economia",
  },
  {
    key: "facturas/facturas-solar-carros",
    label: "Facturas Solar Carros",
    descripcion: "Facturación Solar Carros para Instaladora y Ventas.",
    icon: Receipt,
    iconClass: "text-amber-600",
    href: "/facturas/facturas-solar-carros",
    grupo: "economia",
  },
  {
    key: "facturas/obras-terminadas",
    label: "Obras Terminadas",
    descripcion: "Resultados por oferta: pagos, trabajos diarios y comercial.",
    icon: HardHat,
    iconClass: "text-amber-600",
    href: "/facturas/obras-terminadas",
    grupo: "economia",
  },
  // Hub Facturación: oculto del dashboard (sus submódulos ya aparecen arriba).
  // Se conserva para preservar el permiso padre `facturas` y el subpermiso
  // `vales-facturas-instaladora` (módulo temporalmente desactivado).
  {
    key: "facturas",
    label: "Facturación",
    descripcion: "Gestión de facturas y vales de venta.",
    icon: Receipt,
    iconClass: "text-amber-600",
    href: "/facturas",
    grupo: "economia",
    hideFromDashboard: true,
    subPermisos: [
      {
        key: "facturas/vales-facturas-instaladora",
        label: "Vales y Facturas de Instaladora",
      },
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
    key: "existencias-contabilidad",
    label: "Existencias Contabilidad",
    descripcion: "Gestión de inventario contable y tickets de salida.",
    icon: PackageSearch,
    iconClass: "text-amber-600",
    href: "/existencias-contabilidad",
    grupo: "economia",
  },
  // Hub Compras, Envíos y Costos: oculto del dashboard. Sus submódulos ahora
  // aparecen como módulos propios en Economía (abajo). Se conserva para la ruta
  // /compras-envios-costos y para preservar los permisos ya asignados.
  {
    key: "compras-envios-costos",
    label: "Compras, Envíos y Costos",
    descripcion: "Compras, contenedores, historial de costos y recepciones de almacén.",
    icon: FileSpreadsheet,
    iconClass: "text-amber-600",
    href: "/compras-envios-costos",
    grupo: "economia",
    hideFromDashboard: true,
    childKeys: ["envio-contenedores", "fichas-costo", "kardex-costo", "solicitudes-entrada-almacen"],
  },
  // Submódulos de Compras, Envíos y Costos surfaced como módulos propios.
  // Mantienen sus keys existentes, así que conservan los permisos ya asignados.
  {
    key: "envio-contenedores",
    label: "Compras",
    descripcion: "Registrar y monitorear compras y contenedores.",
    icon: Ship,
    iconClass: "text-amber-600",
    href: "/compras",
    grupo: "economia",
  },
  {
    key: "solicitudes-entrada-almacen",
    label: "Solicitudes de Entrada",
    descripcion: "Recepción de materiales de compra al almacén con split por pool.",
    icon: PackagePlus,
    iconClass: "text-amber-600",
    href: "/solicitudes-entrada-almacen",
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
  },
  {
    key: "fichas-costo",
    label: "Fichas de Costo",
    descripcion: "Vista contable de materiales: costos, precios, márgenes, historial de costos y compras por material.",
    icon: FileSpreadsheet,
    iconClass: "text-amber-600",
    href: "/fichas-costo",
    grupo: "economia",
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
        aditivo: true,
      },
    ],
  },
  // ───────── Recursos Humanos ─────────
  {
    key: "asistencia",
    label: "Control de Asistencia",
    descripcion: "Seguimiento en tiempo real de la presencia del personal.",
    icon: Clock,
    iconClass: "text-violet-600",
    href: "/asistencia",
    grupo: "recursos-humanos",
  },
  {
    key: "recursos-humanos",
    label: "Empleados",
    descripcion: "Gestión de empleados, nómina y estímulos mensuales.",
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
  const pushSub = (subs?: SubPermiso[]) => {
    if (!subs) return
    for (const sp of subs) {
      out.push(sp.key)
      pushSub(sp.subPermisos) // recursivo: incluye anidados (ej. trabajos:*)
    }
  }
  for (const m of MODULOS_CATALOGO) {
    out.push(m.key)
    pushSub(m.subPermisos)
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
