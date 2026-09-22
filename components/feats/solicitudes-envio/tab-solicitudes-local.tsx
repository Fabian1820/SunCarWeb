"use client";

import { BandejaSolicitudes } from "@/components/feats/solicitudes-envio/bandeja-solicitudes";

/** Bandeja del comprador local. Las acciones las gobierna el sub-permiso. */
export function TabSolicitudesLocal() {
  return <BandejaSolicitudes modo="local" />;
}
