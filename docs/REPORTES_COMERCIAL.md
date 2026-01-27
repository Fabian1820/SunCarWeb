# Módulo de Reportes de Comercial

## Descripción General

El módulo de Reportes de Comercial proporciona análisis y reportes del área comercial. Actualmente incluye el reporte de Pendientes de Instalación que muestra leads y clientes con instalaciones no iniciadas o en proceso.

## Estructura del Módulo

```
app/reportes-comercial/
├── page.tsx                           # Página principal con submódulos
└── pendientes-instalacion/
    └── page.tsx                       # Reporte de pendientes de instalación

components/feats/reportes-comercial/
└── pendientes-instalacion-table.tsx   # Tabla de instalaciones pendientes

lib/types/feats/reportes-comercial/
└── reportes-comercial-types.ts        # Tipos del módulo
```

## Submódulos

### 1. Pendientes de Instalación

**Ruta:** `/reportes-comercial/pendientes-instalacion`

**Descripción:** Muestra una tabla unificada de leads y clientes que tienen instalaciones pendientes o en proceso.

#### Características

- **Datos Unificados:** Combina leads y clientes en una sola vista
- **Ordenamiento Inteligente:**
  - Primero: Instalaciones en proceso
  - Segundo: Instalaciones pendientes completas
  - Dentro de cada grupo: La Habana primero, luego otras provincias alfabéticamente
- **Separador Visual:** Línea distintiva entre instalaciones en proceso y pendientes completas
- **Diferenciación de Tipo:** Badge visual para distinguir entre Lead y Cliente

#### Columnas de la Tabla

| Columna | Descripción |
|---------|-------------|
| Tipo | Badge que indica si es Lead o Cliente |
| Nombre | Nombre del lead/cliente (con número si es cliente) |
| Teléfono | Número de teléfono de contacto |
| Dirección | Dirección completa |
| Provincia | Provincia de montaje |
| Oferta | Resumen de productos de la oferta |
| Qué Falta | Solo para instalaciones en proceso |
| Comentario | Comentarios adicionales |
| Fuente | Fuente de origen del lead/cliente |

#### Filtros Disponibles

1. **Búsqueda:** Busca en nombre, teléfono, dirección, comentario y fuente
2. **Tipo:** Filtra por Todos, Leads o Clientes
3. **Provincia:** Filtra por provincia específica
4. **Estado:** Filtra por Todos, En Proceso o Pendientes

#### Exportación

- **Excel:** Botón para exportar la tabla filtrada a Excel
- **Formato:** Incluye todas las columnas con anchos optimizados
- **Nombre de archivo:** `pendientes_instalacion_YYYY-MM-DD.xlsx`

## Tipos de Datos

### InstalacionPendiente

```typescript
interface InstalacionPendiente {
  id: string                    // ID único
  tipo: 'lead' | 'cliente'      // Tipo de registro
  nombre: string                // Nombre completo
  telefono: string              // Teléfono principal
  direccion: string             // Dirección completa
  provincia: string             // Provincia de montaje
  estado: string                // Estado actual
  oferta: string                // Resumen de la oferta
  falta: string                 // Qué falta (solo en proceso)
  comentario: string            // Comentarios adicionales
  fuente: string                // Fuente de origen
  numero?: string               // Número de cliente (si aplica)
  fecha_contacto?: string       // Fecha de contacto inicial
}
```

### PendientesInstalacionFilters

```typescript
interface PendientesInstalacionFilters {
  searchTerm?: string                           // Término de búsqueda
  tipo?: 'todos' | 'leads' | 'clientes'        // Filtro de tipo
  provincia?: string                            // Filtro de provincia
  estado?: 'todos' | 'en-proceso' | 'pendientes' // Filtro de estado
}
```

## Lógica de Ordenamiento

El ordenamiento se realiza en tres niveles:

1. **Por Estado:**
   - "Instalación en Proceso" primero
   - "Pendiente de Instalación" después

2. **Por Provincia (dentro de cada estado):**
   - La Habana primero
   - Otras provincias alfabéticamente

3. **Separador Visual:**
   - Línea verde con texto "Instalaciones Pendientes Completas"
   - Aparece entre los dos grupos de estados

## Formato de Ofertas

Las ofertas se formatean mostrando:
- Cantidad y nombre de inversores
- Cantidad y nombre de baterías
- Cantidad y nombre de paneles
- Elementos personalizados (si existen)

**Ejemplo:** `2x Inversor Deye 5kW • 4x Batería LiFePO4 • 8x Panel 550W`

## Estados Relevantes

El reporte incluye registros con los siguientes estados:
- `"Pendiente de Instalación"` - Instalaciones no iniciadas
- `"Instalación en Proceso"` - Instalaciones en curso

## Responsive Design

- **Vista Móvil:** Cards individuales con información organizada
- **Vista Desktop:** Tabla completa con todas las columnas
- **Breakpoint:** `md` (768px)

## Integración con Backend

### Endpoint Utilizado

El módulo utiliza el endpoint específico de pendientes de instalación:

**Endpoint:** `GET /api/clientes/pendientes-instalacion`

**Respuesta:**
```json
{
  "success": true,
  "message": "Clientes y leads pendientes de instalación obtenidos exitosamente",
  "data": {
    "clientes": [...],
    "leads": [...],
    "total_clientes": 5,
    "total_leads": 8,
    "total_general": 13
  }
}
```

### Ventajas del Endpoint

1. **Optimizado**: Filtra en el backend usando índices de MongoDB
2. **Eficiente**: Solo retorna los registros necesarios
3. **Completo**: Incluye todos los campos de clientes y leads
4. **Contadores**: Proporciona totales pre-calculados
5. **Separado**: Clientes y leads en arrays independientes

### Estados Filtrados

El endpoint filtra automáticamente por estos estados:
- `"Pendiente de Instalación"` - Instalaciones no iniciadas
- `"Instalación en Proceso"` - Instalaciones en curso

No es necesario filtrar en el frontend.

## Dependencias

- `xlsx` - Para exportación a Excel
- `lucide-react` - Iconos
- Componentes compartidos de UI (Card, Input, Badge, etc.)

## Documentación Relacionada

Para más información sobre el endpoint backend utilizado, consulta:

- **API Completa**: `docs/PENDIENTES_INSTALACION_CLIENTES_LEADS_API.md`
- **Ejemplos Frontend**: `docs/EJEMPLO_FRONTEND_PENDIENTES_INSTALACION.md`
- **Resumen Técnico**: `docs/RESUMEN_ENDPOINT_PENDIENTES_INSTALACION.md`
- **Documentación Completa**: `docs/ENDPOINT_PENDIENTES_INSTALACION_COMPLETO.md`
- **Índice General**: `docs/INDEX_PENDIENTES_INSTALACION.md`

## Futuras Expansiones

El módulo está diseñado para agregar más submódulos de reportes comerciales:
- Conversión de leads
- Análisis de fuentes
- Reportes de ventas
- Métricas de comerciales
- etc.

## Notas de Implementación

1. **Performance:** Los datos se cargan una vez y el filtrado es en memoria
2. **Actualización:** El componente incluye callback `onRefresh` para recargar datos
3. **Manejo de Errores:** Toast notifications para errores de carga
4. **Loading States:** Indicadores de carga durante fetch de datos
5. **Datos Faltantes:** Manejo graceful de campos opcionales con "N/A" o "Sin especificar"
