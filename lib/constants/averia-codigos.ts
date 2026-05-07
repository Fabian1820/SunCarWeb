export interface AveriaCodigoOption {
  codigo: string;
  causa: string;
  subcausa: string;
  label: string; // "11 – Equipos / Inversor"
}

const CAUSAS: Record<number, string> = {
  1: "Equipos",
  2: "Conductor",
  3: "Herrajes",
  4: "Falso contacto",
  5: "Aterramientos y neutros",
  6: "Operación defectuosa o errónea",
  7: "Falla de nivel inferior",
  8: "Agentes medioambientales",
  9: "Agentes externos",
};

// [columna, fila, subcausa]
const ENTRADAS: [number, number, string][] = [
  // Columna 1 – Equipos
  [1, 1, "Inversor"],
  [1, 2, "Batería"],
  [1, 3, "Paneles"],
  [1, 4, "Desconectivo automático"],
  [1, 5, "Transformador de potencia"],
  [1, 6, "Transformador de corriente"],
  [1, 7, "Capacitores"],
  [1, 8, "Fusibles"],
  [1, 9, "Transferenciales"],
  [1, 10, "Sobrecargas"],
  // Columna 2 – Conductor
  [2, 1, "Mal estado"],
  [2, 2, "Calibre inadecuado"],
  [2, 3, "Conexión sin terminal"],
  // Columna 3 – Herrajes
  [3, 1, "Falta de apriete"],
  [3, 2, "Corrosión"],
  // Columna 4 – Falso contacto
  [4, 1, "Conectores"],
  [4, 2, "Terminales"],
  [4, 3, "Desconectivo automático"],
  [4, 4, "Transferenciales"],
  // Columna 5 – Aterramientos y neutros
  [5, 1, "Bajante de tierra partido"],
  [5, 2, "Neutro partido"],
  // Columna 6 – Operación defectuosa o errónea
  [6, 1, "Mala coordinación"],
  [6, 2, "Mala programación"],
  // Columna 7 – Falla de nivel inferior
  [7, 1, "Fallas causadas por el cliente"],
  // Columna 8 – Agentes medioambientales
  [8, 1, "Inundaciones"],
  [8, 2, "Contaminación salina"],
  [8, 3, "Contaminación químico industrial"],
  [8, 4, "Otros tipos de contaminación"],
  // Columna 9 – Agentes externos
  [9, 1, "Derrumbes"],
  [9, 2, "Incendios"],
];

export const AVERIA_CODIGOS: AveriaCodigoOption[] = ENTRADAS.map(([col, fila, subcausa]) => {
  const codigo = `${col}${fila}`;
  const causa = CAUSAS[col];
  return {
    codigo,
    causa,
    subcausa,
    label: `${codigo} – ${causa} / ${subcausa}`,
  };
});

export function getAveriaCodigoLabel(codigo: string | null | undefined): string {
  if (!codigo) return "";
  const found = AVERIA_CODIGOS.find((o) => o.codigo === codigo);
  return found ? found.label : codigo;
}
