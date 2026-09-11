import { useCallback, useEffect, useState } from "react";
import { WalletAlertasService } from "@/lib/services/feats/wallet-alertas/wallet-alertas-service";
import type {
  ResultadoPrueba,
  WalletAlertConfig,
  WalletAlertEstado,
} from "@/lib/types/feats/wallet-alertas/wallet-alertas-types";
import { configVacia } from "@/lib/types/feats/wallet-alertas/wallet-alertas-types";

const mensajeDeError = (error: unknown, porDefecto: string): string =>
  error instanceof Error && error.message ? error.message : porDefecto;

export function useWalletAlertas() {
  const [estado, setEstado] = useState<WalletAlertEstado | null>(null);
  const [config, setConfig] = useState<WalletAlertConfig>(configVacia());
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Se marca al editar y se limpia al guardar, para avisar de cambios sin
  // guardar antes de que el usuario se vaya de la página.
  const [sucio, setSucio] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await WalletAlertasService.getEstado();
      setEstado(data);
      setConfig(data.config);
      setSucio(false);
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo cargar la configuración"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const editar = useCallback((cambios: Partial<WalletAlertConfig>) => {
    setConfig((previo) => ({ ...previo, ...cambios }));
    setSucio(true);
  }, []);

  const guardar = useCallback(async (): Promise<boolean> => {
    setGuardando(true);
    setError(null);
    try {
      const data = await WalletAlertasService.guardar(config);
      setEstado(data);
      setConfig(data.config);
      setSucio(false);
      return true;
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo guardar la configuración"));
      return false;
    } finally {
      setGuardando(false);
    }
  }, [config]);

  const enviarPrueba = useCallback(async (): Promise<{
    ok: boolean;
    mensaje: string;
    resultados: ResultadoPrueba[];
  }> => {
    setProbando(true);
    setError(null);
    try {
      const res = await WalletAlertasService.enviarPrueba();
      return { ok: res.success, mensaje: res.message, resultados: res.data };
    } catch (e) {
      const mensaje = mensajeDeError(e, "No se pudo enviar la prueba");
      setError(mensaje);
      return { ok: false, mensaje, resultados: [] };
    } finally {
      setProbando(false);
    }
  }, []);

  return {
    estado,
    config,
    loading,
    guardando,
    probando,
    error,
    sucio,
    editar,
    guardar,
    enviarPrueba,
    recargar: cargar,
    limpiarError: () => setError(null),
  };
}
