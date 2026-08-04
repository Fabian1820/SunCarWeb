import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-config";

const CACHE_KEY = "comerciales_list_cache_v1";
const TTL_MS = 5 * 60 * 1000;

type Cache = { ts: number; data: string[] };

let inMemory: Cache | null = null;
let inFlight: Promise<string[]> | null = null;

async function fetchComerciales(): Promise<string[]> {
  const now = Date.now();
  if (inMemory && now - inMemory.ts < TTL_MS) return inMemory.data;
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Cache;
        if (parsed && now - parsed.ts < TTL_MS && Array.isArray(parsed.data)) {
          inMemory = parsed;
          return parsed.data;
        }
      }
    } catch {}
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const [instaladoraRes, leadsRes] = await Promise.all([
      apiRequest<{ success: boolean; data: string[] }>(
        "/trabajadores/comerciales",
        { method: "GET" },
      ).catch(() => null),
      apiRequest<{ success: boolean; data: string[] }>(
        "/leads/comerciales",
        { method: "GET" },
      ).catch(() => null),
    ]);
    const set = new Set<string>();
    for (const nombre of [
      ...(Array.isArray(instaladoraRes?.data) ? instaladoraRes.data : []),
      ...(Array.isArray(leadsRes?.data) ? leadsRes.data : []),
    ]) {
      if (typeof nombre === "string" && nombre.trim()) set.add(nombre.trim());
    }
    const list = Array.from(set).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
    inMemory = { ts: Date.now(), data: list };
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(inMemory));
      } catch {}
    }
    return list;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function useComercialesList(): {
  comerciales: string[];
  loading: boolean;
} {
  const [comerciales, setComerciales] = useState<string[]>(
    inMemory?.data ?? [],
  );
  const [loading, setLoading] = useState(!inMemory);
  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchComerciales();
        if (!cancelado) setComerciales(data);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);
  return { comerciales, loading };
}
