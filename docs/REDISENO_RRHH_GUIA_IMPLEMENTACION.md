# Guía de Implementación - Rediseño Módulo de RRHH

## 📋 Resumen del Rediseño

Este documento describe la propuesta completa para el rediseño del módulo de Recursos Humanos, migrando de un sistema **mensual** a un sistema **quincenal** que respeta los flujos de pago específicos de la empresa.

---

## 🎯 Problemas del Sistema Actual

| Problema | Solución Propuesta |
|----------|-------------------|
| Todo mezclado en una tabla | Separación en 3 módulos: Salarios, Estímulos, Alimentación |
| Sistema mensual, no quincenal | Unidad fundamental: Quincena (1-15 y 16-fin) |
| No respeta pagos desfasados | Flujos claros: Salario/Estímulos a mes vencido, Alimentación por adelantado |
| Días no trabajados confusos | Descuento de salario en Q actual, descuento de alimentación en Q siguiente |
| Estímulos variables no claros | Vista dedicada para asignar % variables por quincena |
| UI poco intuitiva | Dashboard con tarjetas de resumen y navegación lateral clara |

---

## 📁 Estructura de Archivos Creada

```
app/
└── nomina-quincenal/
    └── page.tsx                    # Página principal con layout

components/feats/nomina-quincenal/
├── layout/
│   ├── NominaLayout.tsx            # Layout con header y sidebar
│   ├── NominaSidebar.tsx           # Navegación lateral
│   └── ResumenHeader.tsx           # Header de resumen (opcional)
├── dashboard/
│   └── NominaDashboard.tsx         # Dashboard principal
├── salarios/
│   └── SalariosCalculator.tsx      # Cálculo de salarios
├── estimulos/
│   └── EstimulosAsignador.tsx      # Asignación de estímulos
├── alimentacion/
│   └── AlimentacionManager.tsx     # Gestión de alimentación
├── periodos/
│   └── PeriodoSelector.tsx         # Selector de período
└── shared/                         # Componentes compartidos

lib/types/feats/nomina-quincenal/
└── index.ts                        # Tipos TypeScript completos

docs/
├── REDISENO_RRHH_ARQUITECTURA.md   # Documento de arquitectura detallada
└── REDISENO_RRHH_GUIA_IMPLEMENTACION.md  # Este archivo
```

---

## 🔄 Flujos de Trabajo

### 1. Crear Nueva Nómina Quincenal

```
Dashboard → Seleccionar/Crear Período → Calcular Salarios → Asignar Estímulos → Calcular Alimentación → Aprobar
```

### 2. Cálculo de Salarios (Quincena 1 de Febrero)

- **Período trabajado**: Días 1-15 de febrero
- **Fecha de pago**: 16 de febrero
- **Días hábiles**: 12 (por convenio: 15 días menos 3 fines de semana)
- **Descuentos**: Se aplican en esta misma quincena

### 3. Asignación de Estímulos (Quincena 1 de Febrero)

- **Ingreso de referencia**: Enero 2025 (mes vencido)
- **Monto para estímulos**: 75% fijo + 25% variable del ingreso
- **División**: 50% para Q1, 50% para Q2
- **Asignación**: La jefa asigna % variables a trabajadores destacados

### 4. Pago de Alimentación (Quincena 1 de Febrero)

- **Pago por adelantado**: Cubre días 16-28 de febrero
- **Ajustes**: Descuentos por días no trabajados de la quincena anterior (enero Q2)

---

## 🖥️ Vistas Principales

### Dashboard Principal
- Selector de período en el header
- Tarjetas de resumen: Salarios, Estímulos, Alimentación
- Indicadores de progreso
- Lista de trabajadores con totales

### Vista de Salarios
- Calendario para marcar días no trabajados
- Tabla con: Días trabajados, descuentos, salario calculado
- Validación de días según convenio
- Alertas de descuentos

### Vista de Estímulos
- Visualización del ingreso de referencia
- Barra de progreso para % asignados
- Sliders para asignar % variable
- Alertas si se excede el 100%
- Totales fijos y variables

### Vista de Alimentación
- Indicador del período cubierto (adelantado)
- Tabla con ajustes por quincena anterior
- Cálculo de base - ajustes = neto
- Explicación del flujo de alimentación

---

## 📊 Datos Clave

### Períodos
- **Quincena 1**: Días 1-15 del mes, pago el día 16
- **Quincena 2**: Días 16-fin del mes, pago el día 1 del mes siguiente

### Cálculos
```
Salario Diario = Salario Base Mensual / 24 días laborables
Salario Quincena = Salario Diario × Días Trabajados

Estímulo Fijo = (Ingreso Mensual × 0.75 / 2) × % Fijo del Trabajador
Estímulo Variable = (Ingreso Mensual × 0.25 / 2) × % Variable Asignado

Alimentación Base = 15 días × Monto Diario
Alimentación Neta = Base - Ajustes por días no trabajados Q anterior
```

---

## 🚀 Pasos para Implementar

### Fase 1: Backend (API)

1. **Crear endpoints para períodos**
   ```
   POST   /api/nomina-quincenal/periodos
   GET    /api/nomina-quincenal/periodos
   GET    /api/nomina-quincenal/periodos/:id
   PATCH  /api/nomina-quincenal/periodos/:id/estado
   ```

2. **Crear endpoints para nóminas**
   ```
   POST   /api/nomina-quincenal/nominas
   GET    /api/nomina-quincenal/nominas
   GET    /api/nomina-quincenal/nominas/:id
   PUT    /api/nomina-quincenal/nominas/:id/lineas
   PATCH  /api/nomina-quincenal/nominas/:id/estado
   ```

3. **Crear endpoints para cálculos**
   ```
   POST   /api/nomina-quincenal/nominas/:id/calcular-salarios
   POST   /api/nomina-quincenal/nominas/:id/asignar-estimulos
   POST   /api/nomina-quincenal/nominas/:id/calcular-alimentacion
   ```

### Fase 2: Frontend

1. **Instalar dependencias**
   ```bash
   # Verificar que existan los componentes necesarios
   # Slider, Calendar, Table, etc.
   ```

2. **Copiar archivos creados**
   - Tipos: `lib/types/feats/nomina-quincenal/index.ts`
   - Componentes: Todo el directorio `components/feats/nomina-quincenal/`
   - Página: `app/nomina-quincenal/page.tsx`

3. **Adaptar a tu API**
   - Reemplazar los datos de ejemplo con llamadas reales a la API
   - Implementar los hooks de React Query o SWR para fetching

### Fase 3: Integración con Sistema Existente

1. **Migrar datos existentes**
   - Convertir trabajadores del sistema antiguo al nuevo formato
   - Mantener compatibilidad hacia atrás si es necesario

2. **Enlaces de navegación**
   - Agregar enlace al nuevo módulo en el menú principal
   - Considerar deprecar el módulo antiguo gradualmente

---

## ⚙️ Configuración Requerida

### Variables de Entorno
```env
# Si se usa API externa
NEXT_PUBLIC_API_URL=/api

# Configuración de días laborables
DIAS_LABORABLES_POR_MES=24
DIAS_QUINCENA=12
PORCENTAJE_ESTIMULO_FIJO=75
PORCENTAJE_ESTIMULO_VARIABLE=25
```

### Configuración por Empresa
```typescript
// lib/config/nomina.ts
export const NOMINA_CONFIG = {
  diasLaborablesPorMes: 24,
  diasQuincena: 12,
  distribucionEstimulos: {
    fijo: 0.75,
    variable: 0.25,
  },
  quincenas: {
    1: { inicio: 1, fin: 15 },
    2: { inicio: 16, fin: null }, // Hasta fin de mes
  },
};
```

---

## 🧪 Testing

### Casos de Prueba Importantes

1. **Trabajador nuevo**
   - Ingresa el 25 de enero
   - Verificar cálculo proporcional de salario
   - Verificar alimentación ajustada

2. **Días no trabajados**
   - Marcar 2 días no trabajados en Q1
   - Verificar descuento de salario en Q1
   - Verificar descuento de alimentación en Q2

3. **Estímulos variables**
   - Asignar 100% de variables
   - Verificar que el sistema permite o normaliza
   - Verificar cálculo de montos

4. **Cambio de mes**
   - Q2 de diciembre → Q1 de enero
   - Verificar cambio de año en período de alimentación

---

## 📱 Accesibilidad y UX

### Mejoras Implementadas
- ✅ Navegación lateral clara con iconos
- ✅ Indicadores de estado visuales (colores)
- ✅ Tooltips explicativos en cada sección
- ✅ Alertas cuando hay problemas (% > 100)
- ✅ Progreso visual del cálculo de nómina
- ✅ Diseño responsive para móvil/tablet

### Recomendaciones Adicionales
- Agregar tour guiado para primera vez
- Tooltips contextuales con fórmulas
- Vista previa de recibo de pago por trabajador
- Exportación a Excel/PDF desde cada vista

---

## 📈 Futuras Mejoras

### Fase 2 (Posterior)
- [ ] Reportes comparativos entre quincenas
- [ ] Gráficos de evolución de salarios
- [ ] Integración con sistema de asistencia/biometría
- [ ] Notificaciones automáticas cuando se acerque fecha de pago
- [ ] Aprobaciones por múltiples niveles
- [ ] Historial de cambios (auditoría)

### Fase 3 (Avanzado)
- [ ] App móvil para consulta de recibos
- [ ] Integración con bancos para pagos automáticos
- [ ] Dashboard de análisis predictivo
- [ ] Gestión de vacaciones y permisos

---

## 🆘 Soporte y Preguntas Frecuentes

### ¿Qué pasa si un trabajador entra a mitad de quincena?
El sistema calcula automáticamente los días proporcionales y ajusta la alimentación según corresponda.

### ¿Puedo modificar una nómina ya aprobada?
Una vez aprobada, la nómina se bloquea. Para hacer cambios, se debe "revertir a borrador" (solo administradores).

### ¿Cómo se manejan los feriados?
Se configuran en un calendario especial y el sistema los excluye automáticamente de los días laborables.

### ¿Qué sucede si no hay ingreso mensual asignado?
Los estímulos se muestran en $0 y aparece una alerta indicando que se debe registrar el ingreso del mes.

---

## 📞 Contacto

Para dudas o soporte durante la implementación:
- Documentación: `/docs/REDISENO_RRHH_ARQUITECTURA.md`
- Tipos: `/lib/types/feats/nomina-quincenal/index.ts`
- Ejemplo funcional: `/app/nomina-quincenal/page.tsx`

---

**Fecha de creación:** 4 de febrero de 2026  
**Versión:** 1.0  
**Autor:** Asistente de Desarrollo
