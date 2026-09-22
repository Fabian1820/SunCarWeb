"use client";

import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  type LucideIcon,
  ChevronDown,
  ChevronRight,
  Home,
  LayoutGrid,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { UserMenu } from "@/components/auth/user-menu";
import { WorkerAvatar } from "@/components/feats/worker/worker-avatar";
import { EstadoOficinaSidebar } from "@/components/feats/equipos-felicity/estado-oficina-sidebar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/shared/molecule/sheet";
import {
  type AreaNav,
  type ModuloNav,
  metaArea,
  tituloArea,
  ubicarRuta,
  useModulosNavegacion,
} from "@/hooks/use-modulos-navegacion";

/**
 * Barra lateral del panel: Inicio, Favoritos y las áreas.
 *
 * Tres formas de usarla:
 *   - "flotante": al pasar el ratón por un área se abre a su lado la lista de
 *     sus módulos, y al pasar por un módulo con secciones, las secciones. Es la
 *     de escritorio, tanto fija en el inicio como recogida en los módulos.
 *   - "acordeon": tocar un área la despliega debajo con sus módulos (móvil
 *     dentro de un módulo, donde no hay hover).
 *   - "simple": tocar un área la abre en el inicio (móvil del inicio).
 */
export type InteraccionBarra = "flotante" | "acordeon" | "simple";

/** Ancho de la barra recogida. Debe coincidir con `lg:pl-16` y el CSS de .con-barra-lateral. */
export const ANCHO_BARRA_RECOGIDA = "4rem";

interface BarraLateralContenidoProps {
  areas: AreaNav[];
  abrirModulo: (modulo: ModuloNav) => void;
  interaccion: InteraccionBarra;
  /** Solo iconos. Los paneles flotantes no se abren mientras esté recogida. */
  recogida?: boolean;
  /** "home", "favorites" o el id del área marcada. */
  itemActivo?: string;
  moduloActivo?: string;
  seccionActiva?: string;
  onIr: (key: string) => void;
  favoritosCount?: number;
  mostrarEstadoOficina?: boolean;
}

export function BarraLateralContenido({
  areas,
  abrirModulo,
  interaccion,
  recogida = false,
  itemActivo,
  moduloActivo,
  seccionActiva,
  onIr,
  favoritosCount,
  mostrarEstadoOficina = false,
}: BarraLateralContenidoProps) {
  const { user } = useAuth();
  const raizRef = useRef<HTMLDivElement>(null);

  // ── Paneles flotantes ──
  const [areaHover, setAreaHover] = useState<{ id: string; top: number } | null>(null);
  const [moduloHover, setModuloHover] = useState<{ id: string; top: number } | null>(null);
  const temporizador = useRef<number | null>(null);

  const cancelarCierre = () => {
    if (temporizador.current !== null) {
      window.clearTimeout(temporizador.current);
      temporizador.current = null;
    }
  };
  const cerrarPaneles = () => {
    cancelarCierre();
    setAreaHover(null);
    setModuloHover(null);
  };
  // Un respiro al salir: cruzar en diagonal hacia el panel no debe cerrarlo.
  const programarCierre = () => {
    cancelarCierre();
    temporizador.current = window.setTimeout(cerrarPaneles, 180);
  };
  useEffect(() => cancelarCierre, []);
  useEffect(() => {
    if (recogida) cerrarPaneles();
  }, [recogida]);

  const topRelativo = (el: HTMLElement) =>
    el.getBoundingClientRect().top -
    (raizRef.current?.getBoundingClientRect().top ?? 0);

  // ── Acordeón ──
  const [desplegadas, setDesplegadas] = useState<Set<string>>(
    () => new Set(itemActivo ? [itemActivo] : []),
  );
  const alternarArea = (id: string) =>
    setDesplegadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const elegirModulo = (modulo: ModuloNav) => {
    cerrarPaneles();
    abrirModulo(modulo);
  };

  const flotante = interaccion === "flotante";

  const itemNav = (
    key: string,
    label: string,
    Icon: LucideIcon,
    opts: {
      count?: number;
      chip?: string;
      onClick: () => void;
      onHover?: (el: HTMLElement) => void;
      desplegable?: boolean;
      desplegado?: boolean;
    },
  ) => {
    const active = itemActivo === key;
    return (
      <button
        key={key}
        type="button"
        title={recogida ? label : undefined}
        aria-label={recogida ? label : undefined}
        aria-expanded={opts.desplegable ? opts.desplegado : undefined}
        onClick={opts.onClick}
        onMouseEnter={
          flotante
            ? (e) => {
                cancelarCierre();
                if (opts.onHover) opts.onHover(e.currentTarget);
                else cerrarPaneles();
              }
            : undefined
        }
        onFocus={flotante && opts.onHover ? (e) => opts.onHover?.(e.currentTarget) : undefined}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
          recogida && "justify-center px-0",
          active
            ? "bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-100"
            : areaHover?.id === key
              ? "bg-gray-50 text-gray-900"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
            opts.chip ??
              (active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-500 group-hover:text-gray-700"),
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        {!recogida && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {typeof opts.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500",
                )}
              >
                {opts.count}
              </span>
            )}
            {flotante && opts.onHover && (
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-gray-500" />
            )}
            {opts.desplegable && (
              <ChevronDown
                className={cn(
                  "h-4 w-4 flex-shrink-0 text-gray-400 transition-transform",
                  opts.desplegado && "rotate-180",
                )}
              />
            )}
          </>
        )}
      </button>
    );
  };

  const areaAbierta = areaHover ? areas.find((a) => a.id === areaHover.id) : undefined;
  const moduloAbierto =
    areaAbierta && moduloHover
      ? areaAbierta.modules.find((m) => m.id === moduloHover.id)
      : undefined;

  return (
    <div
      ref={raizRef}
      className="relative flex h-full flex-col"
      onMouseEnter={flotante ? cancelarCierre : undefined}
      onMouseLeave={flotante ? programarCierre : undefined}
      onKeyDown={(e) => {
        if (e.key === "Escape") cerrarPaneles();
      }}
    >
      {/* Columna visible: se recorta al animar el ancho, los paneles no. */}
      <div className="flex h-full min-w-0 flex-col overflow-hidden">
        {/* Marca */}
        <div
          className={cn(
            "flex h-20 flex-shrink-0 items-center gap-2",
            recogida ? "justify-center px-2" : "px-5",
          )}
        >
          <img
            src="/brand/suncar-v2-iso.png"
            alt="Logo Suncar"
            className="h-10 w-10 flex-shrink-0 object-contain"
          />
          {!recogida && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-gray-900">SUNCAR</p>
              <p className="truncate text-xs text-gray-500">Gestión empresarial</p>
            </div>
          )}
        </div>

        <div className={cn("h-px flex-shrink-0 bg-gray-100", recogida ? "mx-3" : "mx-5")} />

        {/* Navegación */}
        <nav
          className={cn(
            "flex-1 space-y-1 overflow-y-auto overflow-x-hidden py-4",
            recogida ? "px-2" : "px-3",
          )}
        >
          {mostrarEstadoOficina && !recogida && <EstadoOficinaSidebar />}
          {itemNav("home", "Inicio", Home, { onClick: () => onIr("home") })}
          {itemNav("favorites", "Favoritos", Star, {
            count: favoritosCount,
            chip:
              itemActivo === "favorites"
                ? "bg-amber-100 text-amber-600"
                : "bg-amber-50 text-amber-500",
            onClick: () => onIr("favorites"),
          })}

          {/* Misma altura recogida y abierta, para que los paneles no salten. */}
          <div className="flex h-10 items-end px-3 pb-1">
            {recogida ? (
              <div className="mx-auto mb-1.5 h-px w-6 bg-gray-200" />
            ) : (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Áreas
              </p>
            )}
          </div>

          {areas.map((area) => {
            const meta = metaArea(area.id);
            const label = tituloArea(area);
            const desplegado = desplegadas.has(area.id);
            return (
              <div key={area.id}>
                {itemNav(area.id, label, meta.icon, {
                  onClick:
                    interaccion === "acordeon"
                      ? () => alternarArea(area.id)
                      : () => {
                          cerrarPaneles();
                          onIr(area.id);
                        },
                  onHover: (el) => {
                    setAreaHover({ id: area.id, top: topRelativo(el) });
                    setModuloHover(null);
                  },
                  desplegable: interaccion === "acordeon",
                  desplegado,
                })}
                {interaccion === "acordeon" && desplegado && (
                  <ListaAcordeon
                    area={area}
                    onModulo={elegirModulo}
                    onVerArea={() => onIr(area.id)}
                    moduloActivo={moduloActivo}
                    seccionActiva={seccionActiva}
                  />
                )}
              </div>
            );
          })}
        </nav>

        {/* Usuario — fila única clicable que abre el menú de perfil */}
        <div
          className={cn(
            "mt-auto flex-shrink-0 border-t border-gray-100 py-3",
            recogida ? "px-2" : "px-3",
          )}
        >
          {user && (
            <UserMenu
              align="start"
              trigger={
                <button
                  type="button"
                  aria-label="Abrir perfil"
                  onMouseEnter={flotante ? cerrarPaneles : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl py-2 text-left transition-colors hover:bg-gray-50",
                    recogida ? "justify-center px-0" : "px-2",
                  )}
                >
                  <WorkerAvatar
                    src={user.foto_perfil}
                    nombre={user.nombre}
                    className="h-9 w-9 flex-shrink-0"
                  />
                  {!recogida && (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {user.nombre}
                        </p>
                        <p className="truncate text-xs text-gray-500">{user.rol}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    </>
                  )}
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* Panel del área: sus módulos */}
      {flotante && !recogida && areaAbierta && areaHover && (
        <PanelFlotante top={areaHover.top} left="100%" ancho="w-[18.5rem]">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-gray-900">
              {tituloArea(areaAbierta)}
            </p>
            <button
              type="button"
              onClick={() => {
                cerrarPaneles();
                onIr(areaAbierta.id);
              }}
              className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Ver área
            </button>
          </div>
          <div className="p-1.5">
            {areaAbierta.modules.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">Todavía no hay módulos aquí.</p>
            ) : (
              areaAbierta.modules.map((modulo) => (
                <FilaModulo
                  key={modulo.id}
                  modulo={modulo}
                  activo={moduloActivo === modulo.id}
                  resaltado={moduloHover?.id === modulo.id}
                  onClick={() => elegirModulo(modulo)}
                  onHover={(el) => {
                    cancelarCierre();
                    if (modulo.hijos?.length) {
                      setModuloHover({ id: modulo.id, top: topRelativo(el) });
                    } else {
                      setModuloHover(null);
                    }
                  }}
                />
              ))
            )}
          </div>
        </PanelFlotante>
      )}

      {/* Panel del módulo: sus secciones */}
      {flotante && !recogida && moduloAbierto?.hijos && moduloHover && (
        <PanelFlotante
          top={moduloHover.top}
          left="calc(100% + 18.5rem)"
          ancho="w-[16.5rem]"
        >
          <p className="truncate border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">
            {moduloAbierto.title}
          </p>
          <div className="p-1.5">
            {moduloAbierto.hijos.map((hijo) => (
              <FilaModulo
                key={hijo.id}
                modulo={hijo}
                activo={seccionActiva === hijo.id}
                onClick={() => elegirModulo(hijo)}
              />
            ))}
          </div>
        </PanelFlotante>
      )}
    </div>
  );
}

/**
 * Panel posicionado junto a la barra. Si no cabe por debajo de la fila que lo
 * abrió, sube lo justo para quedar dentro de la ventana.
 */
function PanelFlotante({
  top,
  left,
  ancho,
  children,
}: {
  top: number;
  left: string;
  ancho: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const padreTop = el.parentElement?.getBoundingClientRect().top ?? 0;
    const margen = 8;
    const alto = el.offsetHeight;
    const bajo = padreTop + top + alto;
    const limite = window.innerHeight - margen;
    const ajustado =
      bajo > limite ? Math.max(margen - padreTop, top - (bajo - limite)) : top;
    el.style.top = `${ajustado}px`;
  });

  return (
    // pl-2 = hueco visual; sigue siendo parte del panel, así el ratón no lo
    // «pierde» al cruzar de la barra al panel.
    <div ref={ref} className={cn("absolute z-50 pl-2", ancho)} style={{ top, left }}>
      <div
        role="menu"
        className="max-h-[calc(100vh-16px)] overflow-y-auto rounded-xl border border-gray-200/80 bg-white shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-left-1 duration-150"
      >
        {children}
      </div>
    </div>
  );
}

function FilaModulo({
  modulo,
  activo,
  resaltado,
  onClick,
  onHover,
}: {
  modulo: ModuloNav;
  activo?: boolean;
  resaltado?: boolean;
  onClick: () => void;
  onHover?: (el: HTMLElement) => void;
}) {
  const Icon = modulo.icon;
  const tieneHijos = (modulo.hijos?.length ?? 0) > 0;
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={onHover ? (e) => onHover(e.currentTarget) : undefined}
      onFocus={onHover ? (e) => onHover(e.currentTarget) : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
        activo
          ? "bg-emerald-50 font-medium text-emerald-900"
          : resaltado
            ? "bg-gray-50 text-gray-900"
            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", modulo.iconClass)} />
      <span className="flex-1 truncate">{modulo.title}</span>
      {tieneHijos && (
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-gray-500" />
      )}
    </button>
  );
}

function ListaAcordeon({
  area,
  onModulo,
  onVerArea,
  moduloActivo,
  seccionActiva,
}: {
  area: AreaNav;
  onModulo: (modulo: ModuloNav) => void;
  onVerArea: () => void;
  moduloActivo?: string;
  seccionActiva?: string;
}) {
  return (
    <div className="mb-2 ml-7 mt-1 space-y-0.5 border-l border-gray-100 pl-2">
      {area.modules.map((modulo) => (
        <div key={modulo.id}>
          <FilaModulo
            modulo={modulo}
            activo={moduloActivo === modulo.id && !seccionActiva}
            onClick={() => onModulo(modulo)}
          />
          {modulo.hijos && modulo.hijos.length > 0 && (
            <div className="ml-4 space-y-0.5 border-l border-gray-100 pl-2">
              {modulo.hijos.map((hijo) => (
                <FilaModulo
                  key={hijo.id}
                  modulo={hijo}
                  activo={seccionActiva === hijo.id}
                  onClick={() => onModulo(hijo)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onVerArea}
        className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50"
      >
        Ver área completa
      </button>
    </div>
  );
}

/** Rutas con su propia barra (el inicio la lleva fija y abierta). */
const RUTAS_SIN_BARRA = new Set(["/"]);

export function mostrarBarraLateral(pathname: string | null): boolean {
  return !!pathname && !RUTAS_SIN_BARRA.has(pathname);
}

/**
 * Barra que acompaña a todos los módulos: recogida en iconos y, al pasar el
 * ratón, se abre por encima del contenido sin moverlo. En móvil es un botón
 * flotante que abre la misma navegación en un panel.
 */
export function BarraLateralModulos() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { areas, abrirModulo } = useModulosNavegacion();
  const { areaId, moduloId, seccionId } = ubicarRuta(areas, pathname);

  const [abierta, setAbierta] = useState(false);
  const [movilAbierta, setMovilAbierta] = useState(false);
  const temporizador = useRef<number | null>(null);

  const programar = (valor: boolean, ms: number) => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      temporizador.current = null;
      setAbierta(valor);
    }, ms);
  };
  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    },
    [],
  );

  // Al entrar en un módulo la barra se recoge.
  useEffect(() => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    setAbierta(false);
    setMovilAbierta(false);
  }, [pathname]);

  const ir = (key: string) => {
    setAbierta(false);
    setMovilAbierta(false);
    router.push(key === "home" ? "/" : `/?area=${encodeURIComponent(key)}`);
  };

  const elegir = (modulo: ModuloNav) => {
    setAbierta(false);
    setMovilAbierta(false);
    abrirModulo(modulo);
  };

  return (
    <>
      <aside
        aria-label="Navegación"
        onMouseEnter={() => programar(true, 60)}
        onMouseLeave={() => programar(false, 220)}
        style={{ width: abierta ? "18rem" : ANCHO_BARRA_RECOGIDA }}
        className={cn(
          "fixed inset-y-0 left-0 hidden border-r border-gray-200/70 bg-white/95 backdrop-blur-xl transition-[width,box-shadow] duration-200 ease-out lg:block",
          abierta ? "z-[60] shadow-2xl" : "z-40",
        )}
      >
        <BarraLateralContenido
          areas={areas}
          abrirModulo={elegir}
          interaccion="flotante"
          recogida={!abierta}
          itemActivo={areaId}
          moduloActivo={moduloId}
          seccionActiva={seccionId}
          onIr={ir}
        />
      </aside>

      {/* Móvil: sin hover, la navegación va en un panel */}
      <button
        type="button"
        onClick={() => setMovilAbierta(true)}
        aria-label="Abrir navegación"
        className="fixed bottom-6 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-lg transition-colors hover:bg-emerald-50 lg:hidden"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
      <Sheet open={movilAbierta} onOpenChange={setMovilAbierta}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <BarraLateralContenido
            key={pathname}
            areas={areas}
            abrirModulo={elegir}
            interaccion="acordeon"
            itemActivo={areaId}
            moduloActivo={moduloId}
            seccionActiva={seccionId}
            onIr={ir}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
