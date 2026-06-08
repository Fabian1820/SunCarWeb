import { NextRequest, NextResponse } from "next/server";
import { actualizarPreciosOfertasGenericasServer } from "@/lib/services/feats/ofertas/actualizar-precios-server";

// Ruta para disparar la actualización manualmente desde servicios externos.
// Protegida con CRON_SECRET (header x-cron-secret).
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const incoming = req.headers.get("x-cron-secret");
    if (incoming !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const resultado = await actualizarPreciosOfertasGenericasServer();
    return NextResponse.json(resultado);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
