import {
  MODULOS_CATALOGO,
  MODULO_GRUPOS,
  type ModuloCatalogo,
  type ModuloGrupoKey,
} from "./modulos-catalogo"

/**
 * Resolución del botón "Volver" de cada página.
 *
 * La jerarquía visible de la app tiene tres niveles:
 *
 *   Dashboard (`/`)  →  Área de la barra lateral (`/?area=<grupo>`)  →  Módulo
 *
 * y para los módulos que agrupan submódulos, un nivel más:
 *
 *   Área  →  Hub (ej. `/reportes-comercial`)  →  Submódulo
 *
 * Volver sube UN nivel en esa jerarquía, nunca salta al inicio. Antes cada
 * página decidía su propio destino (o no lo decidía y caía al dashboard), y por
 * eso desde media app el botón atrás te sacaba a la pantalla de inicio.
 *
 * La jerarquía NO se declara aquí: se deduce de MODULOS_CATALOGO, que es lo
 * mismo que dibuja el dashboard. Eso importa porque main y dev tienen catálogos
 * distintos — en main "Compras, Envíos y Costos" es una tarjeta con sus cuatro
 * hijos dentro, y en dev los hijos son tarjetas sueltas de Economía. Con esta
 * deducción, el mismo código da el destino correcto en cada rama sin tocarlo.
 */

export type DestinoVolver = {
  href: string
  label: string
}

export const DESTINO_DASHBOARD: DestinoVolver = {
  href: "/",
  label: "Volver al Inicio",
}

/**
 * Hubs que no figuran como módulo del catálogo y por tanto no se deducen solos.
 * `grupo` es el área de la que cuelgan.
 */
const RUTAS_HUB: Record<string, { titulo: string; grupo: ModuloGrupoKey }> = {
  // Sigue vivo en producción, donde el módulo del catálogo apunta aquí. En dev
  // esa key ya apunta a Evaluaciones de Comercial (migración a medias), así que
  // se declara a mano para que el hub se comporte igual en las dos ramas.
  "/reportes-comercial": { titulo: "Reportes de Comercial", grupo: "comercial-instaladora" },
}

/**
 * Segmentos que no son una página, solo agrupan detalles (`/tiendas/<id>`).
 * Al subir desde ellos hay que saltar a la ruta que sí existe.
 */
const PADRE_SIN_PAGINA: Record<string, DestinoVolver> = {
  "/tiendas": { href: "/tiendas-suncarventas", label: "Volver a Tiendas Suncar" },
  "/almacenes": { href: "/almacenes-suncar", label: "Volver a Almacenes" },
}

/**
 * Rutas que son módulos del dashboard pero no viven en el catálogo: el
 * dashboard las añade a mano según el perfil del usuario.
 */
const AREA_FUERA_DEL_CATALOGO: Record<string, ModuloGrupoKey> = {
  "/permisos": "area-direccion",
  "/wallet-manager": "area-direccion",
}

const TITULO_GRUPO = new Map<string, string>(
  MODULO_GRUPOS.map((grupo) => [grupo.key, grupo.title]),
)

/** Quita query, hash y la barra final para poder comparar rutas. */
function normalizarRuta(ruta: string): string {
  const limpia = ruta.split("?")[0].split("#")[0]
  if (limpia.length > 1 && limpia.endsWith("/")) return limpia.slice(0, -1)
  return limpia || "/"
}

// Ruta → módulo. Los módulos cuyo href lleva query (ej. Reservas Instaladora,
// que es `/reservas-ventas?vista=instaladora`) se quedan fuera: comparten ruta
// con otro módulo y solo se distinguen por el query, así que se resuelven
// aparte con el href completo.
const MODULO_POR_RUTA = new Map<string, ModuloCatalogo>()
const MODULO_POR_HREF = new Map<string, ModuloCatalogo>()
for (const modulo of MODULOS_CATALOGO) {
  MODULO_POR_HREF.set(modulo.href, modulo)
  if (modulo.href.includes("?")) continue
  MODULO_POR_RUTA.set(normalizarRuta(modulo.href), modulo)
}

// key del hijo → módulo padre. Sale de `childKeys` y del formato `padre/hijo`
// de las keys. Solo se usa para módulos ocultos del dashboard: si el hijo no
// tiene tarjeta propia, se entró por la del padre y ahí hay que volver.
const PADRE_LOGICO = new Map<string, ModuloCatalogo>()
for (const modulo of MODULOS_CATALOGO) {
  for (const hijo of modulo.childKeys ?? []) PADRE_LOGICO.set(hijo, modulo)
}
for (const modulo of MODULOS_CATALOGO) {
  if (PADRE_LOGICO.has(modulo.key)) continue
  const corte = modulo.key.lastIndexOf("/")
  if (corte <= 0) continue
  const padre = MODULOS_CATALOGO.find((m) => m.key === modulo.key.slice(0, corte))
  if (padre) PADRE_LOGICO.set(modulo.key, padre)
}

/** Destino de un área de la barra lateral del dashboard. */
export function destinoArea(grupo: ModuloGrupoKey | string): DestinoVolver {
  const titulo = TITULO_GRUPO.get(grupo)
  if (!titulo) return DESTINO_DASHBOARD
  return {
    href: `/?area=${encodeURIComponent(grupo)}`,
    label: `Volver a ${titulo}`,
  }
}

function destinoModulo(modulo: ModuloCatalogo): DestinoVolver {
  return { href: modulo.href, label: `Volver a ${modulo.label}` }
}

/** Nivel de arriba de un módulo del catálogo. */
function destinoDeModulo(modulo: ModuloCatalogo): DestinoVolver {
  // Con tarjeta propia en el dashboard, se entró desde su área.
  if (!modulo.hideFromDashboard) return destinoArea(modulo.grupo)

  // Sin tarjeta propia, se entró desde el padre que sí la tiene.
  const padre = PADRE_LOGICO.get(modulo.key)
  if (padre && !padre.hideFromDashboard) return destinoModulo(padre)

  return destinoArea(modulo.grupo)
}

/**
 * Devuelve a dónde debe llevar el botón "Volver" desde `pathname`.
 *
 * `search` es opcional y solo hace falta para los módulos que se distinguen
 * por query string (Reservas Instaladora vs Reservas Ventas).
 */
export function resolverDestinoVolver(pathname: string, search?: string): DestinoVolver {
  const ruta = normalizarRuta(pathname)
  if (ruta === "/") return DESTINO_DASHBOARD

  // 1. La ruta actual es un módulo → subir según su sitio en el dashboard.
  if (search) {
    const query = search.startsWith("?") ? search : `?${search}`
    const conQuery = MODULO_POR_HREF.get(`${ruta}${query}`)
    if (conQuery) return destinoDeModulo(conQuery)
  }
  const modulo = MODULO_POR_RUTA.get(ruta)
  if (modulo) return destinoDeModulo(modulo)

  const areaSuelta = AREA_FUERA_DEL_CATALOGO[ruta]
  if (areaSuelta) return destinoArea(areaSuelta)

  // 1b. Es un hub declarado a mano → subir a su área.
  const hub = RUTAS_HUB[ruta]
  if (hub) return destinoArea(hub.grupo)

  // 2. Es subruta de algo → subir a la página más cercana hacia arriba.
  const segmentos = ruta.split("/").filter(Boolean)
  for (let corte = segmentos.length - 1; corte > 0; corte--) {
    const padre = `/${segmentos.slice(0, corte).join("/")}`

    const moduloPadre = MODULO_POR_RUTA.get(padre)
    if (moduloPadre) {
      // Si el padre tampoco tiene tarjeta en el dashboard, nadie llega a él
      // desde el menú: se sigue subiendo hasta el primer nivel que sí se ve.
      return moduloPadre.hideFromDashboard
        ? destinoDeModulo(moduloPadre)
        : destinoModulo(moduloPadre)
    }

    const hubPadre = RUTAS_HUB[padre]
    if (hubPadre) return { href: padre, label: `Volver a ${hubPadre.titulo}` }

    const salto = PADRE_SIN_PAGINA[padre]
    if (salto) return salto
  }

  return DESTINO_DASHBOARD
}
