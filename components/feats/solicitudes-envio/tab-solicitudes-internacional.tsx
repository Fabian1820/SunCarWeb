"use client";

import { BandejaSolicitudes } from "@/components/feats/solicitudes-envio/bandeja-solicitudes";

/** Cola de la compradora internacional. Las acciones las gobierna el sub-permiso. */
export function TabSolicitudesInternacional() {
  return <BandejaSolicitudes modo="internacional" />;
}
