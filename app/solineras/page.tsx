import { redirect } from "next/navigation"

/**
 * Las solineras se abren directamente desde el área Solineras del menú
 * (`/?area=solineras`); ya no hay una pantalla intermedia con su lista. Esta ruta
 * sigue existiendo para los enlaces guardados.
 */
export default function SolinerasPage() {
  redirect("/?area=solineras")
}
