import type { LucideIcon } from "lucide-react"
import {
  Shield,
  Phone,
  Smartphone,
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
  PackageCheck,
  History,
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
  Clock,
  CalendarDays,
  Camera,
  CalendarCheck,
  AlertTriangle,
  CreditCard,
  HardHat,
  MessageCircle,
  Inbox,
  Gauge,
  HelpCircle,
  ClipboardList,
  FlaskConical,
  Send,
  Megaphone,
  Network,
  Headphones,
  MapPin,
  Banknote,
  PlugZap,
  Warehouse,
  ScrollText,
  BellRing,
  Info,
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
  | "solineras"
  | "economia"
  | "gestion-almacenes"
  | "recursos-humanos"
  | "area-direccion"
  | "web"
  | "app-movil"

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
    key: "solineras",
    title: "Solineras",
    subtitle: "Estaciones de carga solar: elige una para operarla.",
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
    subtitle: "Personal, sedes, departamentos, organigramas y asignaciones de recursos.",
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
  {
    key: "app-movil",
    title: "App Móvil de Operaciones",
    subtitle:
      "Acceso a la app de los instaladores. Se entra con las mismas credenciales de la web; " +
      "sin ninguno de estos permisos, la app no deja iniciar sesión.",
  },
]

/**
 * Sub-permiso específico de un módulo: una funcionalidad concreta dentro
 * del módulo que se puede asignar de forma independiente.
 *
 * Ejemplo: dentro de `instalaciones` están `trabajos:registrar`,
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
   * Solo para aditivos. Por defecto, un aditivo es una capacidad DENTRO del
   * módulo y no abre la pantalla del padre por sí solo (hay que tener también el
   * módulo). Con `abrePadre: true` el aditivo es una sección propia que sí la
   * abre (p. ej. "Por facturar" dentro de Facturación). Los no aditivos siempre
   * abren el padre: son tarjetas o secciones del módulo.
   */
  abrePadre?: boolean
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
  /**
   * El módulo no es una pantalla suelta: por dentro agrupa varias secciones o
   * submódulos. El dashboard le pinta un detalle distinto (tarjeta apilada +
   * etiqueta "Varias secciones") para que se note antes de entrar.
   */
  tieneSubmodulos?: boolean
  /** Solo visible en dashboard para SuperAdmin. */
  superAdminOnly?: boolean
  /**
   * El módulo no tiene pantalla propia en la web: existe solo para conceder
   * un permiso (hoy, el acceso a la app móvil). `href` apunta a donde se
   * gestiona ese permiso, no a una página del módulo, así que esa ruta NO le
   * pertenece: si se la apropiara, el botón "Volver" de esa página subiría a
   * este módulo en vez de a donde vive de verdad.
   */
  soloPermiso?: boolean
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
  {
    key: "wallet",
    label: "Billetera",
    descripcion: "Ingresos y gastos manuales con trazabilidad global.",
    icon: Wallet,
    iconClass: "text-emerald-800",
    href: "/wallet",
    grupo: "resultados-empresa",
    // Hasta sep-2026 era `alwaysVisible`: cualquiera entraba. Ahora es un
    // permiso más. `wallet` completo concede las tres acciones; cada
    // sub-permiso suelto concede solo la suya (tener ingresos y gastos = poder
    // hacer ambas). Los aditivos de abajo son lo que antes vivía aparte, en
    // "Gestión de Wallet" (colección `wallet_permisos`), o era solo superAdmin.
    subPermisos: [
      {
        key: "wallet/ingresos",
        label: "Solo ingresos",
        descripcion: "Registrar ingresos en su billetera.",
      },
      {
        key: "wallet/gastos",
        label: "Solo gastos",
        descripcion: "Registrar gastos en su billetera.",
      },
      {
        key: "wallet/transferencias",
        label: "Solo transferencias",
        descripcion: "Enviar dinero de su billetera a otro trabajador o a un banco.",
      },
      {
        key: "wallet/ver-todos",
        label: "Ver todas las billeteras",
        descripcion:
          "Ver el historial y el saldo de las billeteras de todos los trabajadores, y todas las transferencias pendientes. Sin esto, cada uno ve solo la suya. ADITIVO: tener 'wallet' NO lo concede.",
        aditivo: true,
      },
      {
        key: "wallet/ver-total",
        label: "Ver total filtrado",
        descripcion:
          "Botón que suma los movimientos filtrados en el historial (el propio y el de otra billetera). ADITIVO. Antes solo superAdmin.",
        aditivo: true,
      },
      {
        key: "wallet/admin",
        label: "Administrar billetera",
        descripcion:
          "Bancos (crear, eliminar, ingresos, gastos, comisiones y transferencias del banco), aprobar o rechazar transferencias bancarias, ver las billeteras con saldo, aceptar o cancelar transferencias de otros y crear monedas. ADITIVO.",
        aditivo: true,
      },
      {
        // Clave histórica sin `wallet/`: el backend ya la comprueba con este
        // nombre en `_require_acceso_alertas`. No se hereda de nadie.
        key: "wallet-alertas",
        label: "Alertas de billetera",
        descripcion:
          "Configurar los avisos por WhatsApp o SMS de movimientos grandes. También entra quien tenga 'Administrar billetera'.",
        aditivo: true,
      },
    ],
  },
  {
    // Botones de la barra superior de Inicio que antes veía todo el mundo. No
    // tiene tarjeta: solo concede permisos. La Calculadora sigue libre.
    key: "inicio",
    label: "Barra de Inicio",
    descripcion: "Botones de la barra superior de Inicio: tasa de cambio del día e información de contacto.",
    icon: Info,
    iconClass: "text-blue-600",
    href: "/permisos",
    grupo: "resultados-empresa",
    hideFromDashboard: true,
    soloPermiso: true,
    subPermisos: [
      {
        key: "inicio/tasa-cambio",
        label: "Ver la tasa de cambio del día",
        descripcion: "Botón 'Tasa de cambio'. Quien tiene 'Tasa de Cambio diaria' también lo ve.",
      },
      {
        key: "inicio/informacion",
        label: "Ver la información de contacto de la empresa",
        descripcion: "Botón 'Información': teléfono, correo y dirección de la empresa.",
      },
      {
        key: "inicio/informacion-editar",
        label: "Editar la información de contacto",
        descripcion: "Cambiar el teléfono, correo y dirección de la empresa. ADITIVO: antes podía cualquiera.",
        aditivo: true,
      },
    ],
  },
  {
    key: "peticiones",
    label: "Peticiones",
    descripcion: "Revisa y responde las peticiones de los usuarios al equipo de desarrollo.",
    icon: Inbox,
    iconClass: "text-emerald-700",
    href: "/peticiones",
    grupo: "area-direccion",
    subPermisos: [
      {
        key: "peticiones/responder",
        label: "Responder peticiones",
        descripcion:
          "Ver las peticiones de todos (con quién las pidió), responderlas y marcarlas como hechas. Sin esto, cada uno ve solo las suyas. ADITIVO. Antes solo superAdmin.",
        aditivo: true,
        abrePadre: true,
      },
    ],
  },
  {
    key: "gestion-permisos",
    label: "Gestión de Permisos",
    descripcion:
      "Asignar módulos a los demás trabajadores. Nunca a uno mismo ni a un superAdmin; " +
      "dar o quitar el superAdmin sigue siendo solo del superAdmin.",
    icon: Shield,
    iconClass: "text-red-600",
    // Abre /permisos, que ya tiene su tarjeta propia en Área de Dirección
    // (use-modulos-navegacion): este módulo solo concede el acceso.
    href: "/permisos",
    grupo: "area-direccion",
    hideFromDashboard: true,
    soloPermiso: true,
  },
  {
    key: "actualizaciones-sistema",
    label: "Actualizaciones del Sistema",
    descripcion: "Historial completo de cambios y mejoras del sistema, día por día.",
    icon: Megaphone,
    iconClass: "text-emerald-600",
    href: "/actualizaciones-sistema",
    grupo: "area-direccion",
    // El resumen de hoy/ayer en Inicio es visible para cualquiera; este
    // historial completo es administrativo y se asigna desde /permisos.
    subPermisos: [
      {
        key: "actualizaciones-sistema/publicar",
        label: "Publicar y borrar actualizaciones",
        descripcion: "Escribir las novedades del sistema que ve todo el mundo en Inicio, y borrarlas. ADITIVO. Antes solo superAdmin.",
        aditivo: true,
      },
      {
        key: "actualizaciones-sistema/notificar",
        label: "Enviar notificaciones a trabajadores",
        descripcion: "Mandar una notificación manual a uno o varios trabajadores. ADITIVO. Antes solo superAdmin.",
        aditivo: true,
      },
    ],
  },
  {
    // Antes solo superAdmin y fuera del catálogo. Desde sep-2026 todo lo que
    // era solo superAdmin se asigna como cualquier otro módulo, salvo dar el
    // superAdmin y lo que Gestión de Permisos reserva al superAdmin.
    key: "auditoria",
    label: "Auditoría del Sistema",
    descripcion: "Quién hizo qué, cuándo y con qué datos.",
    icon: ScrollText,
    iconClass: "text-red-600",
    href: "/auditoria",
    grupo: "area-direccion",
  },
  {
    // Avisos automáticos que antes iban a una lista fija de CIs escrita en el
    // backend (notificacion_service.py). Ahora los recibe quien tenga el
    // sub-permiso; los superadmins los siguen recibiendo todos.
    key: "notificaciones",
    label: "Avisos automáticos",
    descripcion: "Quién recibe cada notificación automática del sistema.",
    icon: BellRing,
    iconClass: "text-red-600",
    href: "/permisos",
    grupo: "area-direccion",
    hideFromDashboard: true,
    soloPermiso: true,
    subPermisos: [
      {
        key: "notificaciones/instalacion-exitosa",
        label: "Instalación terminada",
        descripcion: "Aviso cuando se cierra con éxito la instalación de un cliente.",
        aditivo: true,
      },
      {
        key: "notificaciones/lead-convertido",
        label: "Lead convertido en cliente",
        aditivo: true,
      },
      {
        key: "notificaciones/demora-instalacion",
        label: "Instalación demorada",
        aditivo: true,
      },
      {
        key: "notificaciones/reserva-primer-pago",
        label: "Primer pago: reservar equipos",
        descripcion: "Aviso cuando entra el primer pago de un cliente, para reservarle los equipos.",
        aditivo: true,
      },
      {
        key: "notificaciones/factura-pendiente",
        label: "Obra por facturar",
        descripcion: "Aviso cuando un cliente instalado queda pendiente de facturar.",
        aditivo: true,
      },
    ],
  },

  // ───────── Comercial Instaladora ─────────
  {
    key: "atencion-cliente",
    label: "Atención al Cliente",
    descripcion:
      "Guardia de WhatsApp: turnos de atención, leads registrados y su reparto a comerciales.",
    icon: Headphones,
    iconClass: "text-emerald-600",
    href: "/atencion-cliente",
    grupo: "comercial-instaladora",
    subPermisos: [
      {
        // ADITIVO a propósito: el módulo base es para quien atiende (registrar
        // leads y repartirlos). Planificar la rotación y ver el trabajo de los
        // demás es otro rol, y tener uno no debe conceder el otro.
        key: "atencion-cliente/planificar",
        label: "Planificar y supervisar",
        descripcion:
          "Definir horarios y turnos, generar la rotación, registrar suplencias y ver el trabajo de cada persona de atención.",
        aditivo: true,
        abrePadre: true,
      },
    ],
  },
  {
    key: "leads",
    label: "Leads",
    descripcion: "Administrar leads y oportunidades de venta.",
    icon: Phone,
    iconClass: "text-emerald-700",
    href: "/leads",
    grupo: "comercial-instaladora",
    subPermisos: [
      // Scope: qué leads ve el usuario. Ambos son ADITIVOS: el permiso base
      // `leads` sólo permite ver los propios (comercial == usuario). Con
      // `leads/equipo` ve los de su equipo (BTB/BTC); con `leads/todos`
      // los ve todos (jefes generales, admin).
      {
        key: "leads/equipo",
        label: "Ver leads del equipo (BTB/BTC)",
        descripcion:
          "Además de los propios, ver leads asignados a comerciales del mismo equipo.",
        aditivo: true,
      },
      {
        key: "leads/todos",
        label: "Ver todos los leads",
        descripcion:
          "Ver los leads de toda la empresa, sin restricción por comercial ni equipo.",
        aditivo: true,
      },
      // Capacidades operativas. Son ADITIVAS: el módulo base `leads` solo da
      // acceso de VER (listado + detalle). Cada una se otorga aparte, para
      // poder darle a alguien solo consulta sin que también pueda
      // crear/editar/anular/convertir/subir archivos.
      {
        key: "leads/crear",
        label: "Crear leads",
        descripcion: "Registrar nuevos leads.",
        aditivo: true,
      },
      {
        key: "leads/editar",
        label: "Editar leads",
        descripcion: "Modificar datos de un lead existente.",
        aditivo: true,
      },
      {
        key: "leads/anular",
        label: "Anular / reactivar leads",
        descripcion: "Marcar leads como anulados o reactivarlos.",
        aditivo: true,
      },
      {
        key: "leads/convertir",
        label: "Convertir a cliente",
        descripcion: "Convertir un lead en cliente registrado.",
        aditivo: true,
      },
      // ADITIVO a propósito: la conversión normal (leads/convertir) espera
      // que el lead ya tenga un pago registrado; esto permite saltarse ese
      // requisito dejando una justificación. No lo concede ni `leads` ni
      // `leads/convertir` — hay que darlo aparte a quien deba poder hacerlo.
      {
        key: "leads/convertir-sin-pago",
        label: "Convertir a cliente sin pago",
        descripcion:
          "Convertir un lead en cliente aunque no tenga ningún pago registrado, indicando una justificación.",
        aditivo: true,
      },
      {
        key: "leads/fotos",
        label: "Subir fotos y comprobantes",
        descripcion: "Adjuntar fotos, videos y comprobantes de pago al lead.",
        aditivo: true,
      },
      // Exportar es ADITIVO: hace público un dataset sensible; no debería
      // heredarse por defecto.
      {
        key: "leads/exportar",
        label: "Exportar listado",
        descripcion:
          "Descargar el listado de leads filtrado (Excel/CSV). No se hereda del módulo padre.",
        aditivo: true,
      },
    ],
  },
  {
    key: "clientes",
    label: "Clientes",
    descripcion: "Administrar información y reportes de clientes.",
    icon: User,
    iconClass: "text-emerald-500",
    href: "/clientes",
    grupo: "comercial-instaladora",
    subPermisos: [
      {
        // Antes era `costos-materiales-cliente`, que abría costos también en
        // Instalaciones; ahora cada módulo tiene el suyo.
        key: "clientes/costos-materiales",
        label: "Ver costos de materiales (entregados/pendientes)",
        descripcion:
          "Muestra el costo de los materiales y los totales entregado/pendiente en el diálogo de entregas de Clientes. ADITIVO: hay que asignarlo explícitamente.",
        aditivo: true,
      },
      {
        // Antes `instalaciones/servicios-cliente`: el diálogo "Servicios" vive
        // en Clientes, así que su permiso también.
        key: "clientes/servicios",
        label: "Crear y editar servicios de cliente",
        descripcion:
          "En Clientes > Servicios: crear servicios post-venta (líneas de costo, precio), cambiar su estado y borrarlos. Verlos basta con Clientes. Registrar el pago pide Pagos Clientes y facturarlo, 'Facturar servicios de cliente'. ADITIVO.",
        aditivo: true,
      },
      {
        // Antes salía solo a quien tuviera "comercial" en el cargo.
        key: "clientes/saldo-pendiente",
        label: "Aviso de saldo pendiente",
        descripcion:
          "Muestra, bajo la tabla de clientes, cuánto le falta por cobrar entre sus clientes y el botón para filtrarlos. ADITIVO.",
        aditivo: true,
      },
    ],
  },
  {
    key: "ofertas-gestion",
    label: "Ofertas",
    descripcion: "Confección de ofertas y herramientas de ventas.",
    icon: Zap,
    iconClass: "text-emerald-800",
    href: "/ofertas-gestion",
    grupo: "comercial-instaladora",
    subPermisos: [
      {
        // Aditivo: el texto sale en TODAS las ofertas exportadas, así que
        // tener el módulo de ofertas no debe bastar para reescribirlo.
        // Sin asignar a nadie todavía: hoy solo entra superAdmin.
        key: "ofertas-gestion/terminos-condiciones",
        label: "Editar términos y condiciones",
        descripcion:
          "Permite ver y editar los términos y condiciones generales que se imprimen al final de cada oferta exportada.",
        aditivo: true,
      },
      {
        // Antes: superAdmin + un CI escrito en el código (Yanet Clara).
        key: "ofertas-gestion/reducir-reservas",
        label: "Reducir materiales ya reservados",
        descripcion:
          "Al editar una oferta, bajar la cantidad de un material por debajo de lo que ya tiene reservado (o quitarlo). Sin esto, lo reservado es el mínimo. ADITIVO.",
        aditivo: true,
      },
    ],
  },
  {
    key: "reservas-instaladora",
    label: "Reservas",
    descripcion: "Reservas de materiales de instalación, creadas desde la oferta.",
    icon: BookmarkCheck,
    iconClass: "text-emerald-600",
    href: "/reservas-ventas?vista=instaladora",
    grupo: "comercial-instaladora",
  },
  {
    key: "citas",
    label: "Citas",
    descripcion: "Agenda de visitas con las comerciales y quién vino realmente.",
    icon: CalendarCheck,
    iconClass: "text-emerald-700",
    href: "/citas",
    grupo: "comercial-instaladora",
    // El módulo base da acceso de VER: la agenda del día y el listado, con
    // filtros. Todo lo que escribe es ADITIVO y hay que asignarlo aparte.
    subPermisos: [
      {
        key: "citas/agendar",
        label: "Agendar citas",
        descripcion:
          "Reservar horarios y registrar a quien llega sin cita. No se hereda del módulo padre.",
        aditivo: true,
      },
      {
        key: "citas/gestionar",
        label: "Gestionar citas",
        descripcion:
          "Confirmar si vino, marcar que no vino, posponer, reasignar a otra comercial y cancelar.",
        aditivo: true,
      },
      {
        key: "citas/configurar",
        label: "Configurar la semana",
        descripcion:
          "Definir horarios por día y qué comerciales reciben visitas o atienden WhatsApp.",
        aditivo: true,
      },
    ],
  },
  {
    key: "reportes-comercial",
    label: "Reportes",
    descripcion: "Reportes y análisis del área comercial.",
    icon: BarChart3,
    iconClass: "text-emerald-500",
    href: "/reportes-comercial",
    grupo: "comercial-instaladora",
    // Una tarjeta = un sub-permiso; el módulo completo concede todas. Sustituyen
    // a dos reglas que iban por NOMBRE de persona en el código: ocultarle
    // "Resultados por Comercial" a una comercial y que otras tres vieran solo
    // su propio monto.
    subPermisos: [
      { key: "reportes-comercial/pendientes-instalacion", label: "Pendientes de Instalación" },
      { key: "reportes-comercial/resultados-comercial", label: "Resultados por Comercial" },
      {
        key: "reportes-comercial/montos-todos",
        label: "Resultados por Comercial: ver los montos de todas",
        descripcion:
          "Sin esto, en Resultados por Comercial solo se ve el monto propio. Lo concede el módulo completo, no la tarjeta suelta.",
      },
      { key: "reportes-comercial/estado-equipos", label: "Estado de Equipos" },
      { key: "reportes-comercial/materiales-ofertas", label: "Materiales en Ofertas" },
    ],
  },
  {
    key: "distribucion-comerciales",
    label: "Distribución de Comerciales",
    descripcion: "Equipos de comerciales, con las de ventas que apoyan.",
    icon: Users,
    iconClass: "text-emerald-800",
    href: "/distribucion-comerciales",
    grupo: "comercial-instaladora",
  },
  // Comentado en sep-2026: fuera del dashboard y no asignable
  // desde /permisos. Sus asignaciones se quitaron de la BD (24-sep-2026).
  // {
  //   key: "suncar-whatsapp",
  //   label: "Suncar Whatsapp",
  //   descripcion: "Conversaciones de WhatsApp con clientes.",
  //   icon: MessageCircle,
  //   iconClass: "text-emerald-600",
  //   href: "/api/chatwoot/sso",
  //   grupo: "comercial-instaladora",
  //   subPermisos: [
  //     {
  //       key: "suncar-whatsapp/admin",
  //       label: "Suncar Whatsapp (administrador)",
  //       descripcion:
  //         "Entra a Chatwoot con rol administrador en vez de agente. Sin este sub-permiso, el trabajador entra como agente.",
  //       aditivo: true,
  //     },
  //   ],
  // },
  // Comentado en sep-2026: fuera del dashboard y no asignable
  // desde /permisos. Sus asignaciones se quitaron de la BD (24-sep-2026).
  // {
  //   key: "preguntas-frecuentes",
  //   label: "Preguntas Frecuentes",
  //   descripcion: "Respuestas oficiales que usa el asistente de WhatsApp.",
  //   icon: HelpCircle,
  //   iconClass: "text-emerald-700",
  //   href: "/preguntas-frecuentes",
  //   grupo: "comercial-instaladora",
  // },
  // Comentado en sep-2026: fuera del dashboard y no asignable
  // desde /permisos. Sus asignaciones se quitaron de la BD (24-sep-2026).
  // {
  //   key: "datos-a-averiguar",
  //   label: "Datos a Averiguar",
  //   descripcion: "Datos que el asistente de WhatsApp debe averiguarle al cliente.",
  //   icon: ClipboardList,
  //   iconClass: "text-emerald-500",
  //   href: "/datos-a-averiguar",
  //   grupo: "comercial-instaladora",
  // },
  // Comentado en sep-2026: fuera del dashboard y no asignable
  // desde /permisos. Sus asignaciones se quitaron de la BD (24-sep-2026).
  // {
  //   key: "numeros-prueba",
  //   label: "Números de Prueba",
  //   descripcion: "Teléfonos con los que probar el asistente sin importar el historial.",
  //   icon: FlaskConical,
  //   iconClass: "text-emerald-800",
  //   href: "/numeros-prueba",
  //   grupo: "comercial-instaladora",
  //   superAdminOnly: true,
  // },
  // ───────── Comercial Ventas ─────────
  {
    key: "clientes-ventas",
    label: "Gestionar Clientes Ventas",
    descripcion: "Registrar y gestionar clientes de ventas.",
    icon: Users,
    iconClass: "text-indigo-600",
    href: "/clientes-ventas",
    grupo: "comercial-ventas",
    subPermisos: [
      {
        // Antes iba por el nombre de una persona (Loydis) en el código.
        key: "clientes-ventas/descuento-libre",
        label: "Descuento libre en ofertas",
        descripcion:
          "Botón 'Descuento Free' al agregar una oferta: descuento sin los límites por material. ADITIVO.",
        aditivo: true,
      },
    ],
  },
  {
    key: "solicitudes-ventas",
    label: "Solicitudes Ventas",
    descripcion: "Crear y administrar solicitudes de ventas web.",
    icon: ShoppingCart,
    iconClass: "text-indigo-700",
    href: "/solicitudes-ventas",
    grupo: "comercial-ventas",
  },
  {
    key: "reservas-ventas",
    label: "Reservas Ventas",
    descripcion: "Gestionar reservas de materiales para ventas.",
    icon: BookmarkCheck,
    iconClass: "text-indigo-500",
    href: "/reservas-ventas",
    grupo: "comercial-ventas",
  },
  {
    key: "consignaciones",
    label: "Consignaciones",
    descripcion:
      "Ventas con mercancía entregada y pago pendiente (pago parcial o devolución).",
    icon: PackageSearch,
    iconClass: "text-indigo-800",
    href: "/consignaciones",
    grupo: "comercial-ventas",
  },
  // Comentado en sep-2026: fuera del dashboard y no asignable
  // desde /permisos. Sus asignaciones se quitaron de la BD (24-sep-2026).
  // {
  //   key: "tiendas-suncarventas",
  //   label: "Tiendas Suncar",
  //   descripcion: "Gestión de tiendas y puntos de venta.",
  //   icon: ShoppingBag,
  //   iconClass: "text-indigo-600",
  //   href: "/tiendas-suncarventas",
  //   grupo: "comercial-ventas",
  //   tieneSubmodulos: true,
  // },
  {
    key: "reportes-ventas",
    label: "Reportes Comercial Ventas",
    descripcion: "Resultados por vendedor: ofertas, confirmadas y cobros.",
    icon: BarChart3,
    iconClass: "text-indigo-700",
    href: "/reportes-ventas",
    grupo: "comercial-ventas",
    // Sustituyen una lista de nombres escrita en el código: esas vendedoras
    // solo veían su propio monto.
    subPermisos: [
      {
        key: "reportes-ventas/solo-propios",
        label: "Ver el reporte con solo su propio monto",
        descripcion: "Da acceso al reporte, pero los montos de los demás vendedores salen ocultos.",
      },
      {
        key: "reportes-ventas/montos-todos",
        label: "Ver los montos de todos los vendedores",
        descripcion: "Lo concede el módulo completo 'reportes-ventas'.",
      },
    ],
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
    iconClass: "text-teal-700",
    href: "/trabajadores",
    grupo: "operaciones",
  },
  {
    key: "planificacion",
    label: "Planificación",
    descripcion: "Qué hace cada brigada cada día: visitas, instalaciones, averías y actualizaciones.",
    icon: CalendarDays,
    iconClass: "text-teal-500",
    href: "/planificacion",
    grupo: "operaciones",
    subPermisos: [
      {
        key: "planificacion/confirmar",
        label: "Confirmar planificaciones",
        descripcion:
          "Da el botón para confirmar el plan de un día como definitivo, quedando registrado quién y cuándo. ADITIVO: tener 'planificacion' NO lo concede; hay que asignarlo explícitamente.",
        aditivo: true,
      },
      {
        key: "planificacion/desconfirmar",
        label: "Desconfirmar planificaciones",
        descripcion:
          "Da el botón para quitarle la confirmación a un día ya confirmado; las brigadas dejan de verlo en la app hasta que se confirme de nuevo. ADITIVO: ni 'planificacion' ni 'planificacion/confirmar' lo conceden; hay que asignarlo explícitamente.",
        aditivo: true,
      },
    ],
  },
  {
    key: "categorias-evidencia",
    label: "Evidencias de trabajos",
    descripcion: "Qué fotos o vídeos hay que subir en cada tipo de trabajo diario.",
    icon: Camera,
    iconClass: "text-teal-800",
    href: "/categorias-evidencia",
    grupo: "operaciones",
  },
  {
    key: "entregas-devoluciones",
    label: "Entregas y devoluciones",
    descripcion: "Lo que sale del almacén cada día, a quién y qué se devolvió.",
    icon: PackageCheck,
    iconClass: "text-teal-600",
    href: "/entregas-devoluciones",
    grupo: "operaciones",
  },
  {
    key: "historial",
    label: "Clientes",
    descripcion: "Todo lo que ha pasado con cada cliente, en orden, y qué equipos lleva cada uno.",
    icon: History,
    iconClass: "text-teal-700",
    href: "/historial",
    grupo: "operaciones",
  },
  {
    key: "instalaciones",
    label: "Instalaciones",
    descripcion: "Instalaciones en proceso, nuevas y averías.",
    icon: Wrench,
    iconClass: "text-teal-500",
    href: "/instalaciones",
    grupo: "operaciones",
    tieneSubmodulos: true,
    // Sus tarjetas ahora tienen acceso directo desde Operaciones (ver más abajo);
    // esta tarjeta agrupadora se oculta del dashboard pero la página y los
    // permisos `instalaciones/*` se mantienen igual.
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
          { key: "trabajos:registrar", label: "Cierre diario instalaciones" },
          { key: "trabajos:averias", label: "Averías" },
          { key: "trabajos:actualizaciones", label: "Actualizaciones" },
          { key: "trabajos:todos", label: "Todos los trabajos" },
        ],
      },
      { key: "instalaciones/averias", label: "Averías" },
      { key: "instalaciones/planificacion-diaria-trabajos", label: "Planificación Diaria de Trabajos" },
      { key: "instalaciones/ordenes-trabajo", label: "Órdenes de Trabajo" },
      {
        key: "instalaciones/costos-materiales",
        label: "Ver costos de materiales (entregados/pendientes)",
        descripcion:
          "Muestra el costo de los materiales y los totales entregado/pendiente en el diálogo de entregas de Instalaciones en Proceso e Instalaciones Nuevas. ADITIVO.",
        aditivo: true,
      },
    ],
  },
  // Tarjetas de Instalaciones, ahora con acceso directo desde Operaciones en
  // vez de entrar primero a la tarjeta agrupadora (arriba, oculta del
  // dashboard). Mismas claves de permiso `instalaciones/<id>` de siempre.
  {
    key: "instalaciones/pendientes-visita",
    label: "Visitas",
    descripcion: "Pendientes, realizadas y todas las visitas.",
    icon: MapPin,
    iconClass: "text-teal-800",
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
    iconClass: "text-teal-700",
    href: "/instalaciones/nuevas",
    grupo: "operaciones",
  },
  {
    key: "instalaciones/trabajos-diarios",
    label: "Trabajos Diarios",
    descripcion: "Confirmar salida y entrega de materiales por vale.",
    icon: CalendarDays,
    iconClass: "text-teal-500",
    href: "/instalaciones/trabajos-diarios",
    grupo: "operaciones",
  },
  {
    key: "instalaciones/averias",
    label: "Averías",
    descripcion: "Reportes de averías y mantenimiento.",
    icon: AlertTriangle,
    iconClass: "text-teal-800",
    href: "/instalaciones/averias",
    grupo: "operaciones",
  },
  {
    key: "instalaciones/planificacion-diaria-trabajos",
    label: "Planificación Diaria de Trabajos",
    descripcion: "Planifica trabajos del día siguiente por brigadas.",
    icon: CalendarCheck,
    iconClass: "text-teal-600",
    href: "/instalaciones/planificacion-diaria-trabajos",
    grupo: "operaciones",
    hideFromDashboard: true,
  },
  {
    key: "instalaciones/ordenes-trabajo",
    label: "Órdenes de Trabajo",
    descripcion: "Crear y gestionar órdenes de trabajo operativas.",
    icon: ClipboardList,
    iconClass: "text-teal-700",
    href: "/instalaciones/ordenes-trabajo",
    grupo: "operaciones",
    hideFromDashboard: true,
  },
  {
    key: "trabajos:acceso-directo",
    label: "Trabajos Diarios (acceso directo)",
    descripcion: "Seguimiento diario de todos los trabajos e instalaciones.",
    icon: FileCheck,
    iconClass: "text-teal-500",
    href: "/operaciones/todos-trabajos",
    grupo: "operaciones",
    dashboardId: "todos-trabajos",
    hideFromDashboard: true,
  },
  {
    key: "solicitudes-materiales",
    label: "Solicitudes de Materiales",
    descripcion: "Crear y gestionar solicitudes de materiales.",
    icon: PackageSearch,
    iconClass: "text-teal-800",
    href: "/instalaciones/solicitudes-materiales",
    grupo: "operaciones",
  },
  {
    // Almacén fijo (rol "reservas_averias" en backend): stock, movimientos y
    // "Sacar materiales", que crea solicitud + vale y suma el material al
    // servicio de la avería del cliente. Un solo permiso para todo.
    key: "almacen-reservas-averias",
    label: "Almacén Reservas Averías",
    descripcion: "Stock de reserva para averías y salidas de material a clientes con avería pendiente.",
    icon: Warehouse,
    iconClass: "text-orange-600",
    href: "/operaciones/almacen-reservas-averias",
    grupo: "operaciones",
  },
  // Comentado en sep-2026: fuera del dashboard y no asignable
  // desde /permisos. Sus asignaciones se quitaron de la BD (24-sep-2026).
  // {
  //   key: "equipos-felicity",
  //   label: "Equipos Felicity",
  //   descripcion: "Monitoreo y administración en vivo de inversores y baterías FSolar.",
  //   icon: Gauge,
  //   iconClass: "text-teal-600",
  //   href: "/equipos-felicity",
  //   grupo: "operaciones",
  //   subPermisos: [
  //     {
  //       key: "equipos-felicity/equipo-oficina",
  //       label: "Configurar el equipo de oficina",
  //       descripcion: "Elegir qué equipo Felicity se muestra en la barra lateral de todo el sistema. ADITIVO. Antes solo superAdmin.",
  //       aditivo: true,
  //     },
  //   ],
  // },

  // ───────── Solineras ─────────
  {
    // Existe solo para conceder el permiso (y los aditivos de abajo): no tiene
    // tarjeta propia. Las tarjetas del área son las solineras mismas, que el
    // dashboard (app/page.tsx) pide al backend y pinta directamente, más
    // «Nueva solinera» para quien tenga `solineras/red`. `href` es la ruta que
    // usa el botón «Volver» para subir al área.
    // El backend comprueba estos mismos permisos (solineras_comun.py).
    key: "solineras",
    label: "Solineras",
    descripcion:
      "Estaciones de carga solar: puestos, cargas con ticket, reservas, turnos y cobros.",
    icon: PlugZap,
    iconClass: "text-lime-700",
    href: "/solineras",
    grupo: "solineras",
    hideFromDashboard: true,
    subPermisos: [
      {
        key: "solineras/red",
        label: "Solineras (red) — crear y editar solineras, puestos, tarifas y configuración",
        aditivo: true,
      },
      {
        key: "solineras/comprobantes",
        label: "Solineras — validar o rechazar comprobantes de pago",
        aditivo: true,
      },
      {
        key: "solineras/anular",
        label: "Solineras — anular cargas y cancelar pagos",
        aditivo: true,
      },
    ],
  },

  // ───────── Economía ─────────
  {
    key: "facturas",
    label: "Facturación",
    descripcion: "Gestión de facturas y vales de venta.",
    icon: Receipt,
    iconClass: "text-amber-700",
    href: "/facturas",
    grupo: "economia",
    tieneSubmodulos: true,
    subPermisos: [
      {
        key: "facturas/pagos-clientes",
        label: "Pagos Clientes",
        subPermisos: [
          {
            key: "facturas/pagos-clientes/editar-cobro",
            label: "Editar cobros",
            descripcion:
              "Habilita el botón 'Editar cobro' en 'Todos los cobros' y en 'Cobros por oferta'. Permite reescribir monto, moneda, tasa, fecha, tipo y método de pago, pagador, quién lo recibió, comprobante y notas; al cambiar el monto se recalcula el pendiente de la oferta. ADITIVO: tener 'facturas' o 'facturas/pagos-clientes' NO lo concede; hay que asignarlo explícitamente.",
            aditivo: true,
          },
          {
            key: "facturas/pagos-clientes/cancelar-cobro",
            label: "Cancelar cobros",
            descripcion:
              "Habilita el botón 'Cancelar pago' en la tabla 'Todos los cobros'. Cancelar revierte el monto pendiente de la oferta y el depósito en wallet si el cobro fue en efectivo. ADITIVO: tener 'facturas' o 'facturas/pagos-clientes' NO lo concede; hay que asignarlo explícitamente.",
            aditivo: true,
          },
        ],
      },
      {
        key: "facturas/vales-facturas-instaladora",
        label: "Vales y Facturas de Instaladora",
      },
      {
        key: "facturas/facturas-solar-carros",
        label: "Facturas Solar Carros",
      },
      {
        key: "facturas/obras-terminadas",
        label: "Obras Terminadas",
        subPermisos: [
          {
            key: "facturas/obras-terminadas/servicios",
            label: "Facturar servicios de cliente",
            descripcion:
              "Habilita el botón 'Facturar' sobre un Servicio de Cliente terminado (Clientes > Servicios); el servicio facturado se ve luego en Obras Terminadas. ADITIVO: tener 'facturas' o 'facturas/obras-terminadas' NO lo concede. Es independiente de poder crear el servicio ('clientes/servicios').",
            aditivo: true,
          },
        ],
      },
      {
        key: "facturas/por-facturar",
        label: "Por facturar",
        descripcion:
          "Lista de clientes instalados con ofertas confirmadas sin facturar: la factura ya no se genera sola al instalar y se acepta aquí. ADITIVO: tener 'facturas' NO lo concede; hay que asignarlo explícitamente.",
        aditivo: true,
        abrePadre: true,
        subPermisos: [
          {
            key: "facturas/por-facturar/facturar",
            label: "Facturar ofertas",
            descripcion:
              "Habilita 'Facturar' y 'No facturar' sobre las ofertas de Por facturar, y el botón 'Facturar' de 'Generar factura a cliente' en Obras Terminadas. Crea la factura de la oferta y la de vales. ADITIVO: hay que asignarlo explícitamente.",
            aditivo: true,
            abrePadre: true,
          },
          {
            key: "facturas/por-facturar/comparativa",
            label: "Oferta vs almacén",
            descripcion:
              "Habilita la pestaña 'Oferta vs almacén' de Por facturar: lo ofertado a cada cliente contra lo que salió del almacén en vales. ADITIVO: hay que asignarlo explícitamente.",
            aditivo: true,
            abrePadre: true,
          },
        ],
      },
    ],
  },
  {
    key: "logistica/presupuesto",
    label: "Presupuesto de Logística",
    descripcion:
      "Planificación mensual de Logística, Transporte y Seguridad Interna: bloques por sede, ítems y aprobación.",
    icon: ClipboardList,
    iconClass: "text-amber-600",
    href: "/presupuesto-logistica",
    grupo: "economia",
    subPermisos: [
      {
        key: "logistica/presupuesto/aprobar",
        label: "Aprobar y rechazar presupuestos",
        descripcion:
          "Incluye crear y enviar. Habilita revisar ítem por ítem, aprobar el presupuesto o devolverlo para ajuste. ADITIVO: tener 'logistica/presupuesto' NO lo concede; hay que asignarlo explícitamente. No asignes el padre pelado a quien ya tiene este, o podría aprobarse a sí mismo.",
        aditivo: true,
        abrePadre: true,
      },
    ],
  },
  {
    key: "tasa-cambio-diaria",
    label: "Tasa de Cambio diaria",
    descripcion: "Registro diario de 1 USD en EUR y CUP para contabilidad.",
    icon: Coins,
    iconClass: "text-amber-500",
    href: "/tasa-cambio-diaria",
    grupo: "economia",
  },
  {
    key: "kardex-costo",
    label: "Historial de Costos",
    descripcion: "Costo promedio de cada material por almacén, con el histórico de compras que lo formaron.",
    icon: Calculator,
    iconClass: "text-amber-800",
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
    descripcion: "Compras, contenedores, historial de costos y recepciones de almacén.",
    icon: FileSpreadsheet,
    iconClass: "text-amber-700",
    href: "/compras-envios-costos",
    grupo: "economia",
    tieneSubmodulos: true,
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
    iconClass: "text-amber-500",
    href: "/compras",
    grupo: "economia",
    hideFromDashboard: true,
    subPermisos: [
      {
        key: "envio-contenedores/ficha-precios",
        label: "Ficha de costo: precios y márgenes",
        descripcion:
          "Sin este permiso, la ficha de costo de una compra queda en modo solo-costos: CIF, % recargo, costo y el botón 'Actualizar costos'. Con él se habilitan los márgenes de ventas/instaladora, las columnas de precios (catálogo, sugeridos y finales) y el botón 'Aplicar precios', que propaga al catálogo de materiales.",
        aditivo: true,
      },
    ],
  },
  {
    key: "fichas-costo",
    label: "Fichas de Costo",
    descripcion: "Vista contable de materiales: costos, precios, márgenes, historial de costos y compras por material.",
    icon: FileSpreadsheet,
    iconClass: "text-amber-800",
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
    subPermisos: [
      {
        key: "materiales/verificar-fotos",
        label: "Verificar fotos de materiales",
        descripcion: "Revisiones de fotos del catálogo que hace el backend. ADITIVO. Antes solo superAdmin.",
        aditivo: true,
      },
    ],
  },
  {
    key: "solicitudes-envio",
    label: "Solicitudes de Envío",
    descripcion: "Pedidos a la compradora internacional y alertas de stock.",
    icon: Send,
    iconClass: "text-sky-600",
    href: "/solicitudes-envio",
    grupo: "gestion-almacenes",
    // Una pestaña por sub-permiso. No son aditivos: quien tenga el módulo
    // completo ve las tres, y quien solo deba ver su bandeja recibe el
    // sub-permiso suelto (comprador local vs. compradora internacional).
    subPermisos: [
      {
        key: "solicitudes-envio/materiales",
        label: "Materiales & Alertas — armar pedidos y silenciar alertas",
      },
      {
        key: "solicitudes-envio/solicitudes-local",
        label: "Solicitudes — bandeja del comprador local",
      },
      {
        key: "solicitudes-envio/solicitudes-internacional",
        label: "Solicitudes — cola de la compradora internacional",
      },
      {
        key: "solicitudes-envio/editar-ajenas",
        label: "Editar solicitudes de otros",
        descripcion: "Sin esto, cada uno solo edita las solicitudes que creó. ADITIVO. Antes solo superAdmin.",
        aditivo: true,
      },
    ],
  },
  {
    key: "inventario",
    label: "Inventarios",
    descripcion: "Controlar almacenes, stock y movimientos.",
    icon: Package,
    iconClass: "text-sky-800",
    href: "/inventario",
    grupo: "gestion-almacenes",
  },
  {
    key: "almacenes-suncar",
    label: "Almacenes Suncar",
    descripcion: "Gestión de almacenes y control de inventario.",
    icon: Package,
    iconClass: "text-sky-500",
    href: "/almacenes-suncar",
    grupo: "gestion-almacenes",
    tieneSubmodulos: true,
    subPermisos: [
      {
        key: "almacenes-suncar/admin",
        label: "Almacenes (admin) — ajustes manuales de inventario",
        aditivo: true,
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
    subPermisos: [
      {
        key: "solicitudes-entrada-almacen/editar-ajenas",
        label: "Editar solicitudes de entrada de otros",
        descripcion: "Sin esto, cada uno solo edita las solicitudes que creó. ADITIVO. Antes solo superAdmin.",
        aditivo: true,
      },
    ],
  },

  // ───────── Recursos Humanos ─────────
  // Comentado en sep-2026: fuera del dashboard y no asignable
  // desde /permisos. Sus asignaciones se quitaron de la BD (24-sep-2026).
  // {
  //   key: "asistencia",
  //   label: "Control de Asistencia",
  //   descripcion: "Seguimiento en tiempo real de la presencia del personal.",
  //   icon: Clock,
  //   iconClass: "text-violet-600",
  //   href: "/asistencia",
  //   grupo: "recursos-humanos",
  // },
  {
    key: "recursos-humanos",
    label: "Empleados",
    descripcion: "Gestión de empleados, nómina y estímulos mensuales.",
    icon: Briefcase,
    iconClass: "text-violet-700",
    href: "/recursos-humanos",
    grupo: "recursos-humanos",
  },
  {
    key: "sedes",
    label: "Gestionar Sedes",
    descripcion: "Administrar sedes nacionales y provinciales.",
    icon: Building2,
    iconClass: "text-violet-500",
    href: "/sedes",
    grupo: "recursos-humanos",
  },
  {
    key: "departamentos",
    label: "Gestionar Departamentos",
    descripcion: "Administrar departamentos organizacionales.",
    icon: Building,
    iconClass: "text-violet-800",
    href: "/departamentos",
    grupo: "recursos-humanos",
  },
  {
    key: "organigramas",
    label: "Organigramas",
    descripcion: "Organigramas por área con sus cargos y plazas, exportables a PDF.",
    icon: Network,
    iconClass: "text-violet-600",
    href: "/organigramas",
    grupo: "recursos-humanos",
  },
  {
    key: "asignaciones",
    label: "Asignaciones de Recursos",
    descripcion: "Gestionar recursos asignados a trabajadores e instalaciones.",
    icon: Clipboard,
    iconClass: "text-violet-700",
    href: "/asignaciones",
    grupo: "recursos-humanos",
  },
  {
    key: "nomina-mensual",
    label: "Nómina Mensual",
    descripcion:
      "Pago mensual por horas: parte oficial y complementaria por departamento, con lo cobrado por tarjeta o efectivo.",
    icon: Banknote,
    iconClass: "text-violet-500",
    href: "/nomina",
    grupo: "recursos-humanos",
  },

  // ───────── Área de Dirección ─────────
  {
    key: "informe-direccion",
    label: "Informe de Dirección",
    descripcion:
      "Comparativo de desempeño entre dos periodos y cobros pendientes de los clientes.",
    icon: BarChart3,
    iconClass: "text-emerald-800",
    href: "/informe-direccion",
    grupo: "area-direccion",
    subPermisos: [
      {
        key: "informe-direccion/instaladora-general",
        label: "Instaladora General",
        descripcion: "Permite incluir la sección Instaladora General en el informe exportado.",
      },
      {
        key: "informe-direccion/comercial-instaladora",
        label: "Comercial de Instaladora (individual)",
        descripcion: "Permite incluir la sección Comercial de Instaladora en el informe exportado.",
      },
      {
        key: "informe-direccion/ventas",
        label: "Ventas (solicitudes de venta)",
        descripcion: "Permite incluir la sección Ventas en el informe exportado.",
      },
      {
        key: "informe-direccion/comercial-ventas",
        label: "Comercial de Ventas (individual)",
        descripcion: "Permite incluir la sección Comercial de Ventas en el informe exportado.",
      },
      {
        key: "informe-direccion/cobros-pendientes",
        label: "Cobros pendientes",
        descripcion:
          "Ver los clientes con saldo por cobrar (filtrables por comercial y estado) y exportarlos a PDF. Asignado solo, da acceso a este informe y a ningún otro del módulo.",
      },
      {
        key: "informe-direccion/contabilidad",
        label: "Contabilidad",
        descripcion:
          "Ver ingresos, gastos y saldo de la empresa por rango de fechas, en general y divididos por categoría de negocio.",
      },
      {
        key: "informe-direccion/contabilidad-config",
        label: "Configurar personas y categorías (Contabilidad)",
        descripcion:
          "Editar qué persona pertenece a cada categoría de negocio para la división de Contabilidad. Incluye el acceso de solo lectura.",
      },
    ],
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
    iconClass: "text-rose-700",
    href: "/galeriaweb",
    grupo: "web",
  },

  // ───────── App Móvil de Operaciones ─────────
  {
    key: "app",
    label: "App Móvil de Operaciones",
    descripcion:
      "Acceso a la app de los instaladores. Se inicia sesión con las mismas credenciales " +
      "de la web; quien no tenga ninguno de estos permisos no puede entrar a la app.",
    icon: Smartphone,
    iconClass: "text-emerald-600",
    // No es una pantalla de la web: es un permiso puro que gobierna la app.
    // `href` solo indica dónde se asigna; la ruta sigue siendo de Gestión de
    // Permisos (ver soloPermiso).
    href: "/permisos",
    grupo: "app-movil",
    hideFromDashboard: true,
    soloPermiso: true,
    tieneSubmodulos: true,
    // Cada sub-permiso es una sección del menú de la app. Tener `app` completo
    // las concede todas (herencia padre→hijo por el `/`).
    subPermisos: [
      { key: "app/averias", label: "Averías" },
      {
        key: "app/trabajos-diarios",
        label: "Trabajos diarios",
        // Pestañas dentro de Trabajos diarios en la app. Usan la convención
        // `padre/hijo`, así que sí heredan de `app/trabajos-diarios`.
        subPermisos: [
          { key: "app/trabajos-diarios/cierre", label: "Cierre diario de instalaciones" },
          { key: "app/trabajos-diarios/averias", label: "Averías" },
          { key: "app/trabajos-diarios/actualizaciones", label: "Actualizaciones" },
        ],
      },
      { key: "app/visitas", label: "Visitas" },
      {
        key: "app/planificacion",
        label: "Planificación",
        subPermisos: [
          {
            key: "app/planificacion/confirmar",
            label: "Confirmar el día",
            descripcion:
              "Botón para confirmar el plan de un día desde la app; hasta entonces las brigadas no lo ven. ADITIVO: 'app' ni 'app/planificacion' lo conceden.",
            aditivo: true,
          },
          {
            key: "app/planificacion/desconfirmar",
            label: "Desconfirmar el día",
            descripcion:
              "Botón para quitarle la confirmación a un día desde la app; las brigadas dejan de verlo hasta que se confirme otra vez. ADITIVO.",
            aditivo: true,
          },
        ],
      },
      { key: "app/solicitudes-materiales", label: "Solicitudes de materiales al almacén" },
      { key: "app/entregas", label: "Entregas y devoluciones de materiales" },
      {
        key: "app/historial",
        label: "Historial de clientes y equipos",
        subPermisos: [
          {
            key: "app/historial/equipos",
            label: "Editar equipos del cliente",
            descripcion: "Agregar, sustituir, retirar y corregir los equipos de un cliente desde Clientes. Verlos no lo necesita.",
            aditivo: true,
          },
          {
            key: "app/historial/servicios",
            label: "Agregar servicios al cliente",
            descripcion: "Crear servicios de cliente (trabajos cobrables) desde Clientes en la app.",
            aditivo: true,
          },
        ],
      },
      {
        key: "app/almacen-reservas-averias",
        label: "Almacén Reservas Averías",
        descripcion: "Stock, movimientos, transferencias por aceptar y sacar materiales para averías.",
      },
    ],
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
 * Claves de sub-permisos aditivos que NO abren la pantalla de su módulo padre
 * (todos los aditivos salvo los marcados `abrePadre`). `hasPermission` las
 * ignora al aplicar la regla "tener un hijo abre el padre".
 */
export function getAditivosQueNoAbrenPadre(): Set<string> {
  const out = new Set<string>()
  const walk = (subs?: SubPermiso[]) => {
    for (const sp of subs ?? []) {
      if (sp.aditivo && !sp.abrePadre) out.add(sp.key)
      walk(sp.subPermisos)
    }
  }
  for (const m of MODULOS_CATALOGO) walk(m.subPermisos)
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
