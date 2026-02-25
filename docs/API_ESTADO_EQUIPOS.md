# API Estado de Equipos - Documentación

## ⚠️ Estado de Implementación

**PENDIENTE**: Este endpoint aún no está implementado en el backend.

El frontend está listo y funcionando con datos mock. Una vez implementado este endpoint, los datos reales se mostrarán automáticamente.

## Descripción General
Endpoint para obtener estadísticas sobre el estado de los equipos vendidos, entregados y en servicio.

## Endpoint

### GET `/reportes/estado-equipos`

Retorna estadísticas agregadas sobre equipos vendidos, entregados y en servicio.

## Respuesta Exitosa

```json
{
  "success": true,
  "message": "Estado de equipos obtenido exitosamente",
  "data": {
    "resumen": {
      "total_vendidos": 348,
      "total_entregados": 261,
      "total_sin_entregar": 87,
      "total_en_servicio": 245,
      "porcentaje_entregados": 75,
      "porcentaje_en_servicio": 70,
      "variacion_mensual": 12
    },
    "categorias": [
      {
        "categoria": "Inversores",
        "descripcion": "Monofásicos y trifásicos",
        "unidades_vendidas": 96,
        "unidades_entregadas": 72,
        "unidades_sin_entregar": 24,
        "unidades_en_servicio": 68,
        "porcentaje_entregado": 75,
        "equipos": [
          {
            "id": "mat_001",
            "codigo": "INV-HW-5K",
            "nombre": "Huawei SUN2000 5KW",
            "categoria": "Inversores",
            "tipo": "Monofásico · Híbrido",
            "unidades_vendidas": 32,
            "unidades_entregadas": 32,
            "unidades_sin_entregar": 0,
            "unidades_en_servicio": 30,
            "porcentaje_entregado": 100,
            "porcentaje_en_servicio": 94,
            "clientes": [
              {
                "id": "cli_001",
                "codigo": "C-2024-001",
                "nombre": "Juan Pérez García",
                "telefono": "+53 5234-5678",
                "direccion": "Calle 23 #456",
                "provincia": "La Habana",
                "estado": "Instalación completada",
                "fecha_instalacion": "2024-01-15",
                "cantidad_equipos": 1
              }
            ]
          }
        ]
      }
    ],
    "fecha_actualizacion": "2026-02-24T10:30:00Z"
  }
}
```

## Lógica de Cálculo

### Fuentes de Datos

1. **Equipos Vendidos**: Se obtienen de las ofertas cerradas (con pagos registrados)
   - Fuente: Tabla `ofertas_confeccionadas` + `ofertas_personalizadas`
   - Filtro: Ofertas con al menos un pago registrado
   - Se cuentan los elementos/materiales de cada oferta

2. **Equipos Entregados**: Equipos de instalaciones completadas
   - Fuente: Clientes con `estado = "Instalación completada"`
   - Se relacionan con las ofertas asociadas

3. **Equipos en Servicio**: Equipos operativos
   - Fuente: Clientes con `estado = "Instalación completada"` y fecha de instalación > 7 días
   - O clientes con fotos de tipo "instalacion" recientes

### Cálculo de Porcentajes

```javascript
porcentaje_entregados = (total_entregados / total_vendidos) * 100
porcentaje_en_servicio = (total_en_servicio / total_vendidos) * 100
```

### Variación Mensual

Compara el total de equipos vendidos del mes actual vs mes anterior:

```javascript
variacion_mensual = ((vendidos_mes_actual - vendidos_mes_anterior) / vendidos_mes_anterior) * 100
```

## Agrupación por Categorías

Los equipos se agrupan por:
1. **Categoría principal**: Inversores, Paneles Solares, Baterías, etc.
2. **Descripción**: Descripción de la categoría

Cada categoría incluye:
- Totales agregados de la categoría
- Lista detallada de equipos individuales
- Para cada equipo, lista de clientes que lo tienen

### Estructura de Clientes

Cada equipo incluye un array de clientes que tienen ese equipo instalado:

```typescript
interface ClienteConEquipo {
  id: string              // ID del cliente
  codigo: string          // Código del cliente (ej: C-2024-001)
  nombre: string          // Nombre completo
  telefono: string        // Teléfono de contacto
  direccion: string       // Dirección
  provincia: string       // Provincia
  estado: string          // Estado de la instalación
  fecha_instalacion?: string  // Fecha de instalación (si aplica)
  cantidad_equipos: number    // Cantidad de unidades de este equipo
}
```

Estados posibles:
- "Instalación completada"
- "Instalación en proceso"
- "Pendiente de instalación"

## Consideraciones de Implementación

### Consultas SQL Sugeridas

```sql
-- Equipos vendidos (de ofertas con pagos)
SELECT 
  m.codigo,
  m.descripcion,
  m.categoria,
  COUNT(*) as unidades_vendidas
FROM ofertas_confeccionadas oc
JOIN ofertas_confeccionadas_elementos oce ON oc.id = oce.oferta_id
JOIN materiales m ON oce.material_codigo = m.codigo
WHERE oc.id IN (
  SELECT DISTINCT oferta_id FROM pagos WHERE pago_cliente = true
)
GROUP BY m.codigo, m.descripcion, m.categoria

-- Equipos entregados (instalaciones completadas)
SELECT 
  m.codigo,
  COUNT(*) as unidades_entregadas
FROM clientes c
JOIN ofertas_confeccionadas oc ON c.codigo = oc.codigo_cliente
JOIN ofertas_confeccionadas_elementos oce ON oc.id = oce.oferta_id
JOIN materiales m ON oce.material_codigo = m.codigo
WHERE c.estado = 'Instalación completada'
GROUP BY m.codigo
```

### Optimizaciones

1. **Caché**: Los datos pueden cachearse por 1 hora
2. **Índices**: Asegurar índices en:
   - `ofertas_confeccionadas.codigo_cliente`
   - `pagos.oferta_id`
   - `clientes.estado`
3. **Agregación**: Calcular totales en la base de datos, no en aplicación

## Casos de Uso

1. **Dashboard Ejecutivo**: Vista rápida del estado de equipos
2. **Seguimiento de Entregas**: Identificar equipos pendientes de entrega
3. **Análisis de Inventario**: Planificar compras basado en equipos vendidos vs entregados
4. **Reportes Comerciales**: Métricas de desempeño de ventas

## Notas Adicionales

- Los datos se actualizan en tiempo real
- Se excluyen ofertas canceladas o rechazadas
- Los equipos "en servicio" requieren validación de instalación completada
- La variación mensual puede ser positiva (crecimiento) o negativa (decrecimiento)
