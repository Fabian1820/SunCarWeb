/**
 * Cabecera Authorization con el token de la sesión, para las llamadas del
 * navegador a las rutas propias del panel (/api/...). Las del backend van por
 * apiRequest, que ya la pone.
 */
export function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = (
    localStorage.getItem("auth_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  )
    .trim()
    .replace(/^['"]+/, "")
    .replace(/['"]+$/, "")
  return token ? { Authorization: `Bearer ${token}` } : {}
}
