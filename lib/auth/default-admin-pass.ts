import { PermisosService } from "@/lib/api-services"

export const DEFAULT_ADMIN_PASS = "123456"

/**
 * Asigna la contraseña por defecto del dashboard (adminPass) al trabajador recién creado.
 * Si falla, no lanza error — solo registra en consola. La asignación puede repetirse
 * manualmente desde el panel de permisos.
 */
export async function asignarAdminPassDefault(ci: string): Promise<boolean> {
  try {
    const result = await PermisosService.registerAdminPassword(ci, DEFAULT_ADMIN_PASS)
    return Boolean(result?.success)
  } catch (error) {
    console.warn(
      `No se pudo asignar adminPass por defecto al trabajador ${ci}. ` +
        `Puede asignarse manualmente desde /permisos.`,
      error,
    )
    return false
  }
}
