import { apiRequest } from "../../../api-config";
import type {
  ResultadoPrueba,
  WalletAlertConfig,
  WalletAlertEstado,
} from "../../../types/feats/wallet-alertas/wallet-alertas-types";

type Wrapped<T> = { success?: boolean; message?: string; data?: T };

export class WalletAlertasService {
  static async getEstado(): Promise<WalletAlertEstado> {
    const res = await apiRequest<Wrapped<WalletAlertEstado>>(
      "/wallet/alertas/config",
    );
    if (!res.data) throw new Error(res.message || "No se pudo leer la configuración");
    return res.data;
  }

  static async guardar(config: WalletAlertConfig): Promise<WalletAlertEstado> {
    const res = await apiRequest<Wrapped<WalletAlertEstado>>(
      "/wallet/alertas/config",
      {
        method: "PUT",
        body: JSON.stringify({
          activo: config.activo,
          canal: config.canal,
          destinatarios: config.destinatarios,
          umbrales: config.umbrales,
        }),
      },
    );
    if (!res.data) throw new Error(res.message || "No se pudo guardar");
    return res.data;
  }

  /** Manda un mensaje real a los destinatarios guardados. No mueve dinero. */
  static async enviarPrueba(): Promise<{ success: boolean; message: string; data: ResultadoPrueba[] }> {
    const res = await apiRequest<Wrapped<ResultadoPrueba[]> & { success: boolean }>(
      "/wallet/alertas/prueba",
      { method: "POST" },
    );
    return {
      success: Boolean(res.success),
      message: res.message || "",
      data: res.data ?? [],
    };
  }
}
