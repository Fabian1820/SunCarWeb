"use client"

import { usePermisosSolineras } from "@/hooks/use-solineras"
import { ConfigDatosSeccion } from "./config-datos-seccion"
import { ConfigOperacionForm } from "./config-operacion-form"
import { ConfigPuestosSeccion } from "./config-puestos-seccion"
import type { TabSolineraProps } from "./tab-props"

/**
 * Configuración de una solinera: datos, horario, reglas, cobro y puestos.
 * Todo se ve con el permiso base; editar exige `solineras/red`.
 */
export function ConfiguracionTab({ solinera, recargarSolinera }: TabSolineraProps) {
  const { puedeAdministrarRed } = usePermisosSolineras()

  return (
    <div className="max-w-5xl divide-y rounded-lg border bg-card text-card-foreground">
      <ConfigDatosSeccion
        solinera={solinera}
        editable={puedeAdministrarRed}
        recargarSolinera={recargarSolinera}
      />
      <ConfigOperacionForm
        solinera={solinera}
        editable={puedeAdministrarRed}
        recargarSolinera={recargarSolinera}
      />
      <ConfigPuestosSeccion
        solinera={solinera}
        editable={puedeAdministrarRed}
        recargarSolinera={recargarSolinera}
      />
    </div>
  )
}
