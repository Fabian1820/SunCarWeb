import type { Solinera } from "@/lib/types/feats/solineras/solinera-types"

/** Lo que recibe cada pestaña de la pantalla de una solinera. */
export interface TabSolineraProps {
  /** Detalle de la solinera: datos, configuración y puestos. */
  solinera: Solinera
  /**
   * Vuelve a pedir el detalle. Hay que llamarlo cuando una pestaña cambia algo
   * que se refleja en otras (puestos, configuración, estado de la solinera).
   */
  recargarSolinera: () => Promise<void>
}
