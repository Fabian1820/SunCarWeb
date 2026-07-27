import { useCallback, useEffect, useRef, useState } from "react";
import { SolicitudDesarrolloService } from "@/lib/services/feats/solicitudes-desarrollo/solicitud-desarrollo-service";
import type {
  CategoriaSolicitud,
  SolicitudDesarrollo,
} from "@/lib/types/feats/solicitudes-desarrollo/solicitud-desarrollo-types";

const POLLING_INTERVAL = 30_000;

export function useSolicitudesDesarrollo(habilitado: boolean) {
  const [solicitudes, setSolicitudes] = useState<SolicitudDesarrollo[]>([]);
  const [conteo, setConteo] = useState(0);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const cargadasRef = useRef(false);

  const cargarConteo = useCallback(async () => {
    if (!habilitado) return;
    const c = await SolicitudDesarrolloService.getConteo();
    setConteo(c);
  }, [habilitado]);

  const cargarSolicitudes = useCallback(async () => {
    if (!habilitado) return;
    setLoading(true);
    try {
      const lista = await SolicitudDesarrolloService.listar();
      setSolicitudes(lista);
      cargadasRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [habilitado]);

  useEffect(() => {
    if (!habilitado) return;
    cargarConteo();
    const id = setInterval(cargarConteo, POLLING_INTERVAL);
    return () => clearInterval(id);
  }, [habilitado, cargarConteo]);

  const crearSolicitud = useCallback(
    async (categoria: CategoriaSolicitud, mensaje: string, pantalla?: string) => {
      setEnviando(true);
      try {
        const ok = await SolicitudDesarrolloService.crear(categoria, mensaje, pantalla);
        if (ok) {
          await cargarSolicitudes();
          await cargarConteo();
        }
        return ok;
      } finally {
        setEnviando(false);
      }
    },
    [cargarSolicitudes, cargarConteo],
  );

  const responder = useCallback(
    async (id: string, respuesta: string) => {
      const ok = await SolicitudDesarrolloService.responder(id, respuesta);
      if (ok) {
        await cargarSolicitudes();
        await cargarConteo();
      }
      return ok;
    },
    [cargarSolicitudes, cargarConteo],
  );

  const marcarVistas = useCallback(async () => {
    await SolicitudDesarrolloService.marcarVistas();
    setConteo(0);
  }, []);

  return {
    solicitudes,
    conteo,
    loading,
    enviando,
    cargadasAlMenosUnaVez: cargadasRef.current,
    cargarSolicitudes,
    crearSolicitud,
    responder,
    marcarVistas,
  };
}
