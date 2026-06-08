export async function register() {
  // Solo en runtime Node.js (no Edge), y solo en el proceso del servidor
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const cron = await import("node-cron");
  const { actualizarPreciosOfertasGenericasServer } = await import(
    "@/lib/services/feats/ofertas/actualizar-precios-server"
  );

  // Lunes a sábado a las 8:00 AM
  cron.schedule("0 8 * * 1-6", async () => {
    console.log("[cron] Iniciando actualización de precios de ofertas genéricas...");
    try {
      const resultado = await actualizarPreciosOfertasGenericasServer();
      console.log(
        `[cron] Actualización completada — actualizadas: ${resultado.actualizadas}, sin cambios: ${resultado.sin_cambios}`,
      );
      if (resultado.errores.length > 0) {
        console.warn("[cron] Errores:", resultado.errores);
      }
    } catch (e) {
      console.error("[cron] Error inesperado en actualización de precios:", e);
    }
  });

  console.log("[cron] Tarea programada: actualización de precios lun-sáb 8:00 AM");
}
