# Resultados por Comercial - README

## 🎯 Inicio Rápido

**URL del Módulo**: `/reportes-comercial/resultados-comercial`

**Estado**: ✅ Completamente implementado y funcional

**Endpoint**: `GET /api/ofertas/confeccion/personalizadas-con-pagos`

---

## 📖 ¿Qué es este módulo?

El módulo "Resultados por Comercial" muestra todas las ofertas personalizadas que tienen al menos un pago registrado, organizadas por el comercial asignado al cliente o lead.

### Características Principales

- 📊 Tarjetas de estadísticas por cada comercial
- 🔍 Filtros avanzados (búsqueda, comercial, mes, año)
- 📋 Tabla detallada con 9 columnas de información
- 💰 Resumen de totales (margen y pagos)
- 📱 Diseño responsive
- ♻️ Actualización de datos en tiempo real

---

## 🚀 Empezar Aquí

### Para Usuarios
👉 Lee: [`RESULTADOS_COMERCIAL_GUIA_RAPIDA.md`](./RESULTADOS_COMERCIAL_GUIA_RAPIDA.md)

### Para Desarrolladores
👉 Lee: [`RESULTADOS_COMERCIAL_RESUMEN.md`](./RESULTADOS_COMERCIAL_RESUMEN.md)

### Para Ver Cómo Se Ve
👉 Lee: [`RESULTADOS_COMERCIAL_VISUAL.md`](./RESULTADOS_COMERCIAL_VISUAL.md)

---

## 📚 Documentación Completa

| Documento | Descripción | Para Quién |
|-----------|-------------|------------|
| [Guía Rápida](./RESULTADOS_COMERCIAL_GUIA_RAPIDA.md) | Referencia rápida de uso | Usuarios, Devs |
| [Resumen Técnico](./RESULTADOS_COMERCIAL_RESUMEN.md) | Arquitectura y estado | Desarrolladores |
| [Visualización](./RESULTADOS_COMERCIAL_VISUAL.md) | Diagramas y flujos | Todos |
| [Implementación](./RESULTADOS_COMERCIAL_IMPLEMENTACION.md) | Detalles técnicos | Desarrolladores |
| [Ejemplos de Uso](./RESULTADOS_COMERCIAL_EJEMPLO_USO.md) | Casos de uso detallados | Usuarios |
| [Campo Comercial](./CAMPO_COMERCIAL_IMPLEMENTACION.md) | Uso del campo comercial | Desarrolladores |
| [Confirmación](./CONFIRMACION_IMPLEMENTACION.md) | Checklist completo | Líderes |
| [Permisos](./RESULTADOS_COMERCIAL_PERMISOS.md) | Sistema de permisos | Todos |
| [API Endpoint](./API_OFERTAS_PERSONALIZADAS_CON_PAGOS.md) | Especificación del API | Backend/Frontend |
| [Índice](./RESULTADOS_COMERCIAL_INDEX.md) | Navegación completa | Todos |

---

## 🎨 Vista Previa

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Resultados por Comercial                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ María G.     │  │ Carlos R.    │  │ Ana M.       │         │
│  │ Ofertas: 8   │  │ Ofertas: 5   │  │ Ofertas: 3   │         │
│  │ $10,200      │  │ $7,500       │  │ $4,800       │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  [🔍 Buscar...] [Comercial ▼] [Mes ▼] [Año ▼]                 │
│                                                                 │
│  Comercial | Oferta | Materiales | Margen | Precio | ...      │
│  ──────────┼────────┼────────────┼────────┼────────┼───       │
│  María G.  │ OF-001 │ $5,000     │ 25.5%  │ $6,275 │ ...      │
│  Carlos R. │ OF-003 │ $8,500     │ 22.0%  │ $10,37 │ ...      │
│                                                                 │
│  Total Margen: $25,700    Total Pagado: $87,450               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Campo Principal: `contacto.comercial`

El módulo utiliza el campo `contacto.comercial` del endpoint para:

1. ✅ Mostrar el nombre del comercial en la tabla
2. ✅ Crear tarjetas de estadísticas por comercial
3. ✅ Filtrar ofertas por comercial específico
4. ✅ Buscar por nombre de comercial
5. ✅ Agrupar ofertas en estadísticas
6. ✅ Manejar ofertas sin comercial ("Sin asignar")

**Más detalles**: [`CAMPO_COMERCIAL_IMPLEMENTACION.md`](./CAMPO_COMERCIAL_IMPLEMENTACION.md)

---

## 📊 Datos Mostrados

### Tarjetas de Estadísticas
- Nombre del comercial
- Número de ofertas cerradas
- Margen total generado

### Tabla de Ofertas
- Comercial asignado
- Número y nombre de oferta
- Total de materiales
- Margen (% y $)
- Precio final
- Cliente/Lead
- Total pagado
- Fecha del primer pago
- Monto pendiente

### Resumen
- Total de ofertas mostradas
- Total de margen generado
- Total pagado por clientes

---

## 🔍 Filtros Disponibles

1. **Búsqueda**: Por oferta, cliente o comercial
2. **Comercial**: Ver solo ofertas de un comercial específico
3. **Mes**: Filtrar por mes del primer pago
4. **Año**: Filtrar por año del primer pago

---

## 💻 Tecnologías

- **Frontend**: Next.js 13+ (App Router), React 18+, TypeScript
- **UI**: shadcn/ui components
- **Estado**: React hooks (useState, useMemo, useCallback)
- **API**: REST con autenticación Bearer
- **Backend**: MongoDB con agregación

---

## 📁 Archivos del Proyecto

```
app/
└── reportes-comercial/
    ├── page.tsx                           # Menú principal
    └── resultados-comercial/
        └── page.tsx                       # Página del módulo

components/
└── feats/
    └── reportes-comercial/
        └── resultados-comercial-table.tsx # Componente principal

lib/
└── types/
    └── feats/
        └── reportes-comercial/
            └── reportes-comercial-types.ts # Tipos TypeScript
```

---

## ✅ Estado de Implementación

| Componente | Estado |
|------------|--------|
| Página principal | ✅ Completo |
| Componente de tabla | ✅ Completo |
| Tipos TypeScript | ✅ Completo |
| Integración con endpoint | ✅ Completo |
| Filtros | ✅ Completo |
| Búsqueda | ✅ Completo |
| Estadísticas | ✅ Completo |
| Manejo de null | ✅ Completo |
| Documentación | ✅ Completo |
| Testing | ✅ Documentado |

---

## 🎓 Casos de Uso Comunes

### 1. Ver Desempeño de un Comercial
1. Abrir el módulo
2. Seleccionar comercial en el filtro
3. Ver su tarjeta de estadísticas
4. Revisar sus ofertas en la tabla

### 2. Buscar una Oferta Específica
1. Escribir el número de oferta en el buscador
2. Ver el resultado filtrado

### 3. Analizar un Período
1. Seleccionar mes y año
2. Ver ofertas con pagos en ese período
3. Revisar totales en el resumen

**Más ejemplos**: [`RESULTADOS_COMERCIAL_EJEMPLO_USO.md`](./RESULTADOS_COMERCIAL_EJEMPLO_USO.md)

---

## 🔧 Requisitos

### Backend
- ✅ Endpoint `/api/ofertas/confeccion/personalizadas-con-pagos` implementado
- ✅ Autenticación Bearer token funcional
- ✅ Campo `contacto.comercial` incluido en la respuesta

### Frontend
- ✅ Next.js 13+ con App Router
- ✅ React 18+
- ✅ TypeScript
- ✅ Componentes UI (shadcn/ui)

### Datos
- ✅ Ofertas personalizadas con pagos registrados
- ⚪ Clientes/Leads con comercial asignado (opcional)

---

## 🐛 Solución de Problemas

### No se cargan datos
- Verificar que el endpoint esté disponible
- Verificar token de autenticación
- Revisar consola del navegador

### No aparece un comercial
- Verificar que el cliente/lead tenga comercial asignado
- Verificar que la oferta tenga pagos
- Verificar que sea oferta personalizada

### Filtros no funcionan
- Verificar que haya datos cargados
- Limpiar filtros y volver a aplicar
- Actualizar datos con el botón refresh

**Más preguntas**: [`RESULTADOS_COMERCIAL_EJEMPLO_USO.md`](./RESULTADOS_COMERCIAL_EJEMPLO_USO.md#preguntas-frecuentes)

---

## 🚀 Próximas Mejoras (Opcional)

1. Exportación a Excel/PDF
2. Gráficos de desempeño
3. Comparación de períodos
4. Metas por comercial
5. Modal de detalles de oferta
6. Filtro por estado de pago
7. Ordenamiento de columnas

---

## 📞 Soporte

Para más información, consultar:

1. **Documentación completa**: Ver [`RESULTADOS_COMERCIAL_INDEX.md`](./RESULTADOS_COMERCIAL_INDEX.md)
2. **Guía rápida**: Ver [`RESULTADOS_COMERCIAL_GUIA_RAPIDA.md`](./RESULTADOS_COMERCIAL_GUIA_RAPIDA.md)
3. **Ejemplos de uso**: Ver [`RESULTADOS_COMERCIAL_EJEMPLO_USO.md`](./RESULTADOS_COMERCIAL_EJEMPLO_USO.md)

---

## 📝 Notas Importantes

1. **Solo Ofertas Personalizadas**: El módulo solo muestra ofertas de tipo "personalizada"
2. **Requiere Pagos**: Solo muestra ofertas que tienen al menos un pago registrado
3. **Comercial del Contacto**: El comercial mostrado es el asignado al cliente/lead
4. **Fecha del Primer Pago**: Los filtros de mes/año se basan en la fecha del primer pago
5. **Actualización Manual**: Usar el botón "Actualizar" para recargar datos

---

## ✅ Confirmación

**Estado**: ✅ COMPLETAMENTE IMPLEMENTADO Y FUNCIONAL

**Versión**: 2.0.0

**Fecha**: 18 de febrero de 2024

**Listo para**: Producción

---

## 📖 Navegación Rápida

- [← Volver al Índice](./RESULTADOS_COMERCIAL_INDEX.md)
- [Guía Rápida →](./RESULTADOS_COMERCIAL_GUIA_RAPIDA.md)
- [Visualización →](./RESULTADOS_COMERCIAL_VISUAL.md)
- [Resumen Técnico →](./RESULTADOS_COMERCIAL_RESUMEN.md)

---

**¡El módulo está listo para usar!** 🎉
