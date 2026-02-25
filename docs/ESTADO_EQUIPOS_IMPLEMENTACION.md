# Módulo Estado de Equipos - Documentación de Implementación

## ✅ Estado Actual

**El módulo está COMPLETO y funcionando con datos reales del backend.**

Endpoint: `GET /reportes/estado-equipos`  
URL: `http://localhost:8000/api/reportes/estado-equipos`

## Descripción

Módulo de reportes comerciales que muestra el estado de los equipos vendidos, entregados y en servicio. Proporciona una vista visual y detallada del seguimiento de equipos desde la venta hasta la puesta en servicio.

## Características Principales

### 1. Resumen Ejecutivo
- **Total Vendidos**: Cantidad total de equipos vendidos
- **Entregados**: Equipos entregados a clientes (con porcentaje)
- **Sin Entregar**: Equipos pendientes de entrega
- **Variación Mensual**: Indicador de crecimiento/decrecimiento

### 2. Desglose por Categorías
- Agrupación por tipo de equipo (Inversores, Paneles, Baterías, etc.)
- Barra de progreso visual para cada categoría
- Porcentaje de entrega por categoría

### 3. Detalle de Equipos
- Lista detallada de cada modelo de equipo
- Estadísticas individuales por equipo
- Porcentajes de entrega y servicio

## Estructura de Archivos

### Frontend

```
app/reportes-comercial/estado-equipos/
└── page.tsx                                    # Página principal del módulo

components/feats/reportes-comercial/
└── estado-equipos-stats.tsx                    # Componente de estadísticas visuales

lib/types/feats/reportes-comercial/
└── reportes-comercial-types.ts                 # Tipos TypeScript (actualizado)

docs/
├── API_ESTADO_EQUIPOS.md                       # Documentación del endpoint
└── ESTADO_EQUIPOS_IMPLEMENTACION.md            # Este archivo
```

### Tipos Agregados

```typescript
// EstadoEquiposData
interface EstadoEquiposData {
  resumen: {
    total_vendidos: number
    total_entregados: number
    total_sin_entregar: number
    total_en_servicio: number
    porcentaje_entregados: number
    porcentaje_en_servicio: number
    variacion_mensual: number
  }
  categorias: CategoriaEquipos[]
  fecha_actualizacion: string
}

// CategoriaEquipos
interface CategoriaEquipos {
  categoria: string
  tipo: string
  unidades_vendidas: number
  unidades_entregadas: number
  unidades_sin_entregar: number
  unidades_en_servicio: number
  porcentaje_entregado: number
  equipos: EquipoDetalle[]
}

// EquipoDetalle
interface EquipoDetalle {
  id: string
  nombre: string
  categoria: string
  tipo: string
  unidades_vendidas: number
  unidades_entregadas: number
  unidades_sin_entregar: number
  unidades_en_servicio: number
  porcentaje_entregado: number
  porcentaje_en_servicio: number
}
```

## Integración con el Sistema

### 1. Navegación

El módulo se agregó al menú principal de Reportes Comerciales:

```typescript
// app/reportes-comercial/page.tsx
{
  id: 'estado-equipos',
  title: 'Estado de Equipos',
  description: 'Equipos vendidos, entregados y en servicio',
  icon: BarChart3,
  color: 'orange',
  href: '/reportes-comercial/estado-equipos'
}
```

### 2. Endpoint Backend

**URL**: `GET /reportes/estado-equipos`

Ver documentación completa en `docs/API_ESTADO_EQUIPOS.md`

### 3. Flujo de Datos

```
1. Usuario accede a /reportes-comercial/estado-equipos
2. Componente page.tsx hace fetch a /reportes/estado-equipos
3. Backend calcula estadísticas desde:
   - Ofertas cerradas (con pagos)
   - Clientes con instalaciones completadas
   - Materiales/equipos de las ofertas
4. Frontend renderiza EstadoEquiposStats con los datos
```

## Diseño Visual

### Paleta de Colores

- **Azul**: Equipos vendidos y totales
  - `bg-blue-50`, `border-blue-200`, `text-blue-600`
- **Verde**: Equipos entregados
  - `bg-green-50`, `border-green-200`, `text-green-600`
- **Naranja**: Equipos sin entregar
  - `bg-orange-50`, `border-orange-200`, `text-orange-600`

### Componentes Visuales

1. **Tarjetas de Resumen**: 3 tarjetas principales con iconos y números grandes
2. **Barras de Progreso**: Visualización del porcentaje de entrega por categoría
3. **Lista de Equipos**: Tabla detallada con hover effects
4. **Indicadores**: Badges con porcentajes y variaciones

## Lógica de Negocio

### Cálculo de Equipos Vendidos
- Se obtienen de ofertas con al menos un pago registrado
- Se suman todos los elementos/materiales de las ofertas

### Cálculo de Equipos Entregados
- Clientes con estado "Instalación completada"
- Se relacionan con las ofertas asociadas al cliente

### Cálculo de Equipos en Servicio
- Instalaciones completadas con más de 7 días
- O con fotos de tipo "instalacion" recientes

### Variación Mensual
- Compara ventas del mes actual vs mes anterior
- Muestra indicador verde (↑) o rojo (↓)

## Casos de Uso

### 1. Gerencia Comercial
- Vista rápida del estado de equipos
- Identificar cuellos de botella en entregas
- Tomar decisiones sobre inventario

### 2. Logística
- Planificar entregas pendientes
- Priorizar instalaciones
- Coordinar con brigadas

### 3. Ventas
- Seguimiento de equipos vendidos
- Métricas de desempeño
- Análisis de productos más vendidos

## Próximas Mejoras

### Funcionalidades Sugeridas

1. **Filtros Avanzados**
   - Por rango de fechas
   - Por comercial
   - Por provincia/región

2. **Exportación**
   - Exportar a Excel/PDF
   - Gráficos descargables

3. **Alertas**
   - Notificar equipos con retraso en entrega
   - Alertas de stock bajo

4. **Drill-Down**
   - Click en categoría para ver detalles
   - Ver clientes específicos por equipo

5. **Gráficos Adicionales**
   - Gráfico de línea de tendencia
   - Gráfico de torta por categoría
   - Comparativa mensual

## Mantenimiento

### Actualización de Datos
- Los datos se actualizan en tiempo real
- Botón de "Actualizar" para refrescar manualmente
- Timestamp de última actualización visible

### Performance
- Considerar caché de 1 hora en backend
- Paginación si hay muchas categorías
- Lazy loading de equipos detallados

## Testing

### Casos de Prueba

1. **Carga Inicial**
   - Verificar que se muestren los datos correctamente
   - Validar cálculos de porcentajes

2. **Estados Vacíos**
   - Sin datos disponibles
   - Error en la carga

3. **Actualización**
   - Botón de refresh funciona
   - Loading state correcto

4. **Responsive**
   - Vista móvil correcta
   - Tarjetas se adaptan a pantalla

## Notas Técnicas

- Usa `apiRequest` para llamadas al backend
- Manejo de errores con `useToast`
- Loading states con spinner
- Componentes reutilizables de shadcn/ui
- TypeScript estricto para type safety

## Soporte

Para dudas o problemas con el módulo:
1. Revisar logs del navegador (Console)
2. Verificar respuesta del endpoint en Network tab
3. Consultar documentación del API en `docs/API_ESTADO_EQUIPOS.md`
