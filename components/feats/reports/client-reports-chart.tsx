import { ChartContainer } from "@/components/shared/molecule/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SERVICE_TYPES } from "@/lib/types";
import { Sun, Wrench, Zap } from "lucide-react";

interface ClientReportsChartProps {
  reports: Array<{ tipo_reporte: string }>
}

const COLORS = {
  inversion: "#3b82f6", // azul
  mantenimiento: "#f59e42", // amarillo
  averia: "#ef4444", // rojo
};

const ICONS = {
  inversion: Sun,
  mantenimiento: Wrench,
  averia: Zap,
};

export function ClientReportsChart({ reports }: ClientReportsChartProps) {
  // Agrupar por tipo
  const data = SERVICE_TYPES.map(type => ({
    tipo: type.value,
    label: type.label,
    cantidad: reports.filter(r => r.tipo_reporte === type.value).length,
  }));

  // Si no hay reportes, no mostrar la gráfica
  if (!reports || reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Este cliente aún no tiene reportes registrados.
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-2xl font-extrabold text-gray-900 mb-4 text-center">Resumen de reportes por tipo</h3>
      {/* Leyenda */}
      <div className="flex justify-center gap-8 mb-4">
        {SERVICE_TYPES.map(type => {
          const Icon = ICONS[type.value as keyof typeof ICONS];
          return (
            <div key={type.value} className="flex items-center gap-2">
              <Icon className="h-6 w-6" style={{ color: COLORS[type.value as keyof typeof COLORS] }} />
              <span className="text-lg font-bold text-gray-800">{type.label}</span>
            </div>
          );
        })}
      </div>
      <ChartContainer config={{
        inversion: { label: "Inversión", color: COLORS.inversion },
        mantenimiento: { label: "Mantenimiento", color: COLORS.mantenimiento },
        averia: { label: "Avería", color: COLORS.averia },
      }}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ left: 32, right: 32, top: 16, bottom: 16 }}>
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis 
              type="category" 
              dataKey="label" 
              width={140} 
              tick={{ fill: '#1f2937', fontWeight: 700, fontSize: 20 }} 
            />
            <Tooltip 
              contentStyle={{ fontSize: 18, fontWeight: 700, color: '#1f2937', borderRadius: 8 }} 
              labelStyle={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}
              formatter={(value: any) => [value, 'Cantidad']} 
            />
            <Bar 
              dataKey="cantidad" 
              radius={[10, 10, 10, 10]} 
              barSize={200} // más fino que el valor por defecto
            >
              {data.map((entry, idx) => (
                <Cell key={entry.tipo} fill={COLORS[entry.tipo as keyof typeof COLORS]} />
              ))}
              {/* Etiquetas de cantidad al final de cada barra */}
              {/* Usar labelList si se quiere mostrar el número sobre la barra */}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
} 