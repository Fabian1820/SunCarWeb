"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/molecule/card"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  BarChart,
} from "recharts"
import type { EstadisticaLineaTiempoItemFrontend } from "@/lib/types/feats/estadisticas/estadisticas-types"
import { Users, TrendingUp, Zap, BarChart3 } from "lucide-react"

interface EstadisticasChartsProps {
  estadisticas: EstadisticaLineaTiempoItemFrontend[]
}

const MESES_NOMBRES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
]

export function EstadisticasCharts({ estadisticas }: EstadisticasChartsProps) {
  const data = estadisticas.map((stat, index) => {
    let porcentajeCambio = 0
    if (index > 0) {
      const prev = estadisticas[index - 1]
      if (prev.numeroClientes > 0) {
        porcentajeCambio = ((stat.numeroClientes - prev.numeroClientes) / prev.numeroClientes) * 100
      }
    }

    return {
      periodo: `${MESES_NOMBRES[stat.mes - 1]} ${stat.año}`,
      clientes: stat.numeroClientes,
      leads: stat.numeroLeads,
      conversion: stat.conversionRate,
      inversores: stat.potenciaInversores,
      paneles: stat.potenciaPaneles,
      porcentajeCambio: parseFloat(porcentajeCambio.toFixed(2)),
      mes: stat.mes,
      año: stat.año,
    }
  })

  // Calcular total de clientes en el período
  const totalClientes = data.reduce((sum, item) => sum + item.clientes, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ==================== CHART 0: Total Clientes por Mes (Full Width) ==================== */}
      <Card className="lg:col-span-2 border-0 shadow-md border-l-4 border-l-orange-600">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-base">Clientes por Mes</CardTitle>
                <CardDescription>Cantidad de clientes obtenidos en cada mes</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Total en el período:</span>
              <span className="text-lg font-bold text-orange-600">{totalClientes} clientes</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="periodo"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#e5e7eb"
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#e5e7eb"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  fontSize: "12px"
                }}
                formatter={(value: number) => [`${value} clientes`, 'Total']}
              />
              <Bar
                dataKey="clientes"
                name="Clientes"
                fill="#f97316"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ==================== CHART 1: Conversión de Leads (Full Width) ==================== */}
      <Card className="lg:col-span-2 border-0 shadow-md border-l-4 border-l-blue-600">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Embudo de Conversión</CardTitle>
                <CardDescription>Comparación de leads generados vs ventas cerradas</CardDescription>
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg max-w-sm hidden md:block">
              💡 La línea naranja indica el porcentaje de leads que se convierten en clientes.
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="periodo"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#e5e7eb"
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                stroke="#e5e7eb"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#f59e0b' }}
                stroke="#e5e7eb"
                unit="%"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  fontSize: "12px"
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
              />
              <Bar
                yAxisId="left"
                dataKey="leads"
                name="Leads (Oportunidades)"
                fill="#93c5fd"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              <Bar
                yAxisId="left"
                dataKey="clientes"
                name="Ventas Cerradas"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conversion"
                name="Tasa Conversión %"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ fill: "#fff", stroke: "#f59e0b", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#f59e0b" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ==================== CHART 2: Tendencia de Ventas ==================== */}
      <Card className="border-0 shadow-md border-l-4 border-l-green-600">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base">Tendencia de Ventas</CardTitle>
              <CardDescription>Evolución mensual del volumen</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
            La línea verde muestra ventas totales, la línea punteada indica el cambio % respecto al mes anterior.
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="periodo"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                stroke="transparent"
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                stroke="transparent"
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                stroke="transparent"
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "11px"
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clientes"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: "#10b981", r: 3 }}
                name="Ventas"
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="porcentajeCambio"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="4 4"
                name="Variación %"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ==================== CHART 3: Capacidad Instalada ==================== */}
      <Card className="border-0 shadow-md border-l-4 border-l-orange-600">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Zap className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-base">Capacidad Instalada</CardTitle>
              <CardDescription>Potencia acumulada en kW</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
            Muestra la potencia instalada mensualmente, separando inversores y paneles solares.
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -15 }}>
              <defs>
                <linearGradient id="colorInversores" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPaneles" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="periodo"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                stroke="transparent"
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                stroke="transparent"
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "11px"
                }}
                formatter={(value: number) => `${value} kW`}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Area
                type="monotone"
                dataKey="inversores"
                stroke="#f97316"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorInversores)"
                name="Inversores (kW)"
              />
              <Area
                type="monotone"
                dataKey="paneles"
                stroke="#eab308"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPaneles)"
                name="Paneles (kW)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
