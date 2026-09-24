/**
 * Quién está usando el panel, para dejar constancia en las acciones que no pasan
 * por el backend de SunCar (ahí ya lo toma del token). Hoy: los links de pago de
 * Stripe, que se crean desde las rutas de Next y no se guardan en ningún otro sitio.
 *
 * Lee la sesión de `localStorage` sin lanzar nunca: si no hay sesión o no se puede
 * leer, devuelve null y la acción sigue igual, solo que sin autor.
 */
export function usuarioActivo(): { ci: string; nombre: string } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = JSON.parse(window.localStorage.getItem("user_data") || "null")
    const ci = String(raw?.ci ?? raw?.CI ?? "").trim()
    if (!ci) return null
    return { ci, nombre: String(raw?.nombre ?? "").trim() }
  } catch {
    return null
  }
}
