# Estado de Equipos - Funcionalidad Expandible

## Descripción de la Interfaz

El módulo de Estado de Equipos presenta una interfaz jerárquica expandible con tres niveles:

### Nivel 1: Resumen General
Tarjetas con totales globales:
- Total Vendidos (con variación mensual)
- Total Entregados (con porcentaje)
- Total Sin Entregar (con porcentaje)

### Nivel 2: Categorías (Expandible)
Cada categoría muestra:
- Nombre de la categoría (ej: Inversores, Paneles Solares, Baterías)
- Descripción
- Totales de la categoría: Vendidos, Entregados, Pendientes
- Porcentaje de entrega
- Icono de flecha para expandir/colapsar

**Interacción**: Click en la categoría para expandir y ver los equipos

### Nivel 3: Equipos (Expandible)
Cada equipo dentro de una categoría muestra:
- Nombre del equipo (ej: Huawei SUN2000 5KW)
- Tipo/especificaciones
- Unidades vendidas
- Unidades entregadas
- Unidades en servicio
- Porcentaje de entrega
- Icono de flecha para expandir/colapsar

**Interacción**: Click en el equipo para expandir y ver los clientes

### Nivel 4: Clientes
Lista de clientes que tienen ese equipo específico:
- Código del cliente
- Nombre completo
- Teléfono
- Dirección y provincia
- Estado de la instalación (con color)
- Fecha de instalación (si aplica)
- Cantidad de unidades

## Flujo de Navegación

```
1. Usuario ve resumen general
   ↓
2. Click en "Inversores" → Se expande mostrando lista de inversores
   ↓
3. Click en "Huawei SUN2000 5KW" → Se expande mostrando clientes
   ↓
4. Ve lista de clientes con ese inversor instalado
```

## Características de UX

### Estados Visuales
- **Colapsado**: Flecha derecha (→)
- **Expandido**: Flecha abajo (↓)
- **Hover**: Fondo cambia a gris claro
- **Estados de instalación**: 
  - Verde: Instalación completada
  - Azul: Instalación en proceso
  - Naranja: Pendiente de instalación

### Colores por Métrica
- **Azul**: Vendidos, totales
- **Verde**: Entregados, completados
- **Naranja**: Pendientes, sin entregar

### Responsive
- Desktop: Vista completa con todas las columnas
- Tablet: Columnas ajustadas
- Mobile: Stack vertical de información

## Ejemplo de Uso

### Caso 1: Ver todos los inversores vendidos
1. Acceder a "Reportes Comercial" → "Estado de Equipos"
2. Click en la categoría "Inversores"
3. Ver lista completa de modelos de inversores con sus estadísticas

### Caso 2: Ver clientes con un equipo específico
1. Expandir categoría "Inversores"
2. Click en "Huawei SUN2000 5KW"
3. Ver lista de clientes que tienen ese inversor
4. Revisar estado de cada instalación

### Caso 3: Identificar equipos pendientes de entrega
1. Ver tarjeta "Sin Entregar" en el resumen
2. Expandir categorías para ver cuáles tienen más pendientes
3. Expandir equipos específicos para ver qué clientes están esperando

## Datos Mock Incluidos

El módulo incluye datos de ejemplo con:
- 3 categorías: Inversores, Paneles Solares, Baterías
- 3 modelos de inversores con clientes
- 6 clientes de ejemplo con diferentes estados
- Estadísticas realistas

## Integración con Backend

Cuando el endpoint `/reportes/estado-equipos` esté implementado, debe retornar:

```typescript
{
  success: boolean
  message: string
  data: {
    resumen: { ... }
    categorias: [
      {
        categoria: string
        descripcion: string
        unidades_vendidas: number
        unidades_entregadas: number
        unidades_sin_entregar: number
        unidades_en_servicio: number
        porcentaje_entregado: number
        equipos: [
          {
            id: string
            codigo: string
            nombre: string
            categoria: string
            tipo: string
            unidades_vendidas: number
            unidades_entregadas: number
            unidades_sin_entregar: number
            unidades_en_servicio: number
            porcentaje_entregado: number
            porcentaje_en_servicio: number
            clientes: [
              {
                id: string
                codigo: string
                nombre: string
                telefono: string
                direccion: string
                provincia: string
                estado: string
                fecha_instalacion?: string
                cantidad_equipos: number
              }
            ]
          }
        ]
      }
    ]
    fecha_actualizacion: string
  }
}
```

## Consultas SQL Necesarias

### 1. Obtener equipos vendidos con clientes
```sql
SELECT 
  m.codigo,
  m.descripcion as nombre,
  m.categoria,
  c.codigo as cliente_codigo,
  c.nombre as cliente_nombre,
  c.telefono,
  c.direccion,
  c.provincia,
  c.estado,
  c.fecha_instalacion,
  COUNT(oce.id) as cantidad_equipos
FROM materiales m
JOIN ofertas_confeccionadas_elementos oce ON m.codigo = oce.material_codigo
JOIN ofertas_confeccionadas oc ON oce.oferta_id = oc.id
JOIN clientes c ON oc.codigo_cliente = c.codigo
WHERE oc.id IN (
  SELECT DISTINCT oferta_id 
  FROM pagos 
  WHERE pago_cliente = true
)
GROUP BY m.codigo, c.codigo
ORDER BY m.categoria, m.descripcion, c.nombre
```

### 2. Calcular totales por categoría
```sql
SELECT 
  m.categoria,
  COUNT(*) as unidades_vendidas,
  SUM(CASE WHEN c.estado = 'Instalación completada' THEN 1 ELSE 0 END) as unidades_entregadas,
  SUM(CASE WHEN c.estado != 'Instalación completada' THEN 1 ELSE 0 END) as unidades_sin_entregar
FROM materiales m
JOIN ofertas_confeccionadas_elementos oce ON m.codigo = oce.material_codigo
JOIN ofertas_confeccionadas oc ON oce.oferta_id = oc.id
JOIN clientes c ON oc.codigo_cliente = c.codigo
WHERE oc.id IN (SELECT DISTINCT oferta_id FROM pagos WHERE pago_cliente = true)
GROUP BY m.categoria
```

## Mejoras Futuras

1. **Búsqueda**: Filtrar por nombre de equipo o cliente
2. **Exportación**: Descargar lista de clientes por equipo
3. **Ordenamiento**: Ordenar por cantidad vendida, entregada, etc.
4. **Filtros**: Por provincia, estado, rango de fechas
5. **Gráficos**: Visualización de distribución por categoría
6. **Notificaciones**: Alertar sobre equipos con retraso en entrega
