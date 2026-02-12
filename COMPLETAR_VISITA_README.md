# 📋 Completar Visita v2.0 - Documentación Principal

## 🚀 Acceso Rápido

Esta funcionalidad permite completar visitas de leads y clientes en estado "Pendiente de visita", con verificación automática de oferta y 3 opciones de resultado.

---

## 📚 Índice de Documentación

### 🎯 Para Empezar:
1. **[📋 Resumen Ejecutivo](./docs/COMPLETAR_VISITA_SUMMARY.md)** - Vista general y características principales
2. **[✅ Guía de Entrega](./docs/COMPLETAR_VISITA_ENTREGA.md)** - Checklist completo de lo implementado

### 👨‍💻 Para Desarrolladores:
3. **[📖 Guía Técnica Completa](./docs/COMPLETAR_VISITA.md)** - Documentación técnica detallada
4. **[🔄 Diagramas de Flujo](./docs/COMPLETAR_VISITA_FLOWCHART.md)** - Flujos visuales y lógica de decisión
5. **[🔧 Especificación Backend](./docs/BACKEND_COMPLETAR_VISITA.md)** - Endpoints y estructura de API

### 🧪 Para Testing:
6. **[🧪 Guía de Pruebas](./docs/TESTING_COMPLETAR_VISITA.md)** - Escenarios de prueba y validaciones
7. **[📝 Ejemplos Prácticos](./docs/COMPLETAR_VISITA_EXAMPLES.md)** - Casos de uso paso a paso

---

## ⚡ Quick Start

### Navegación:
```
Dashboard → Gestionar Instalaciones → Pendientes de Visita → Click "Completada"
```

### Características Principales:
- ✅ **Verificación automática** de oferta asignada
- ✅ **3 opciones de resultado** según análisis de la visita
- ✅ **Lógica inteligente** con prioridades de negocio
- ✅ **Carga de archivos** (estudios energéticos y evidencias)
- ✅ **Selector de materiales** extra (cuando se necesita)

---

## 🔄 Flujo Simplificado

```
Usuario → Click "Completada" 
    ↓
Verificar si tiene oferta
    ↓
┌───────┴────────┐
NO              SÍ
│               │
│         3 Opciones
│         - Cubre (Verde)
│         - Material (Púrpura)
│         - Nueva (Azul)
│               │
└───────┬───────┘
        ↓
Estado actualizado
```

---

## 📊 Reglas de Negocio

| Tiene Oferta | Resultado Seleccionado | Estado Final |
|--------------|------------------------|--------------|
| ❌ NO | (automático) | Pendiente de presupuesto |
| ✅ SÍ | Opción 1: Cubre | Pendiente de instalación |
| ✅ SÍ | Opción 2: Material Extra | Pendiente de presupuesto |
| ✅ SÍ | Opción 3: Oferta Nueva | Pendiente de presupuesto |

---

## 🎨 Componentes Principales

### Archivos de Código:
- `components/feats/instalaciones/completar-visita-dialog.tsx` - Componente principal (~820 líneas)
- `components/feats/instalaciones/pendientes-visita-table.tsx` - Tabla con botón "Completada"

### Archivos de Documentación:
- `docs/COMPLETAR_VISITA.md` - Guía técnica completa (v2.0)
- `docs/COMPLETAR_VISITA_SUMMARY.md` - Resumen ejecutivo
- `docs/COMPLETAR_VISITA_FLOWCHART.md` - Diagramas de flujo
- `docs/COMPLETAR_VISITA_EXAMPLES.md` - Ejemplos prácticos
- `docs/TESTING_COMPLETAR_VISITA.md` - Guía de pruebas
- `docs/BACKEND_COMPLETAR_VISITA.md` - Especificación API
- `docs/COMPLETAR_VISITA_ENTREGA.md` - Checklist de entrega

---

## 🌐 Integración Backend

### Endpoints Requeridos:

#### Verificación de Oferta:
```
GET /api/ofertas/confeccion/lead/{lead_id}
GET /api/ofertas/confeccion/cliente/{numero_cliente}
```

#### Completar Visita:
```
POST /api/leads/{lead_id}/completar-visita
POST /api/clientes/{numero_cliente}/completar-visita
```

### Campos Nuevos (v2.0):
```javascript
{
  tiene_oferta: "true" | "false",  // NUEVO
  resultado: "oferta_cubre_necesidades" | 
             "necesita_material_extra" | 
             "necesita_oferta_nueva" |     // NUEVO
             "sin_oferta",
  nuevo_estado: string,
  materiales_extra: JSON (condicional)
}
```

**Ver especificación completa:** [BACKEND_COMPLETAR_VISITA.md](./docs/BACKEND_COMPLETAR_VISITA.md)

---

## ✅ Estado del Proyecto

### Frontend: ✅ COMPLETO
- [x] Verificación automática de oferta
- [x] 3 opciones de resultado con colores
- [x] Selector de materiales dinámico
- [x] Validaciones exhaustivas
- [x] UI/UX responsive
- [x] Integración con tabla de pendientes
- [x] Documentación completa

### Backend: ⏳ PENDIENTE
- [ ] Implementar endpoints de completar visita
- [ ] Agregar soporte para `tiene_oferta`
- [ ] Implementar lógica de cambio de estado
- [ ] Configurar almacenamiento de archivos
- [ ] Pruebas de integración

---

## 🧪 Casos de Prueba Rápidos

### Test 1: Sin Oferta
```
Lead sin oferta → Alerta naranja → Solo completar estudio+evidencia → Submit
Resultado: Estado = "Pendiente de presupuesto"
```

### Test 2: Opción 1 (Cubre)
```
Cliente con oferta → 3 opciones → Seleccionar verde → Submit
Resultado: Estado = "Pendiente de instalación"
```

### Test 3: Opción 2 (Material Extra)
```
Lead con oferta → Seleccionar púrpura → Agregar materiales → Submit
Resultado: Estado = "Pendiente de presupuesto" + materiales
```

### Test 4: Opción 3 (Oferta Nueva)
```
Cliente con oferta → Seleccionar azul → Submit
Resultado: Estado = "Pendiente de presupuesto"
```

**Ver todos los casos:** [COMPLETAR_VISITA_EXAMPLES.md](./docs/COMPLETAR_VISITA_EXAMPLES.md)

---

## 🎨 Guía Visual de Colores

- 🔵 **Azul** - Verificando oferta (spinner)
- 🟠 **Naranja** - Sin oferta (alerta)
- 🟢 **Verde** - Opción 1: Oferta cubre necesidades
- 🟣 **Púrpura** - Opción 2: Necesita material extra
- 🔵 **Azul** - Opción 3: Necesita oferta nueva

---

## 💻 Desarrollo

### Iniciar servidor:
```bash
cd SunCarWeb
npm run dev
```

### URL del módulo:
```
http://localhost:3000/instalaciones/pendientes-visita
```

### Verificar compilación:
```bash
npm run lint
```

---

## 📞 Soporte

### ¿Tienes dudas sobre...?

**Funcionalidad general:**
→ Leer [COMPLETAR_VISITA_SUMMARY.md](./docs/COMPLETAR_VISITA_SUMMARY.md)

**Detalles técnicos:**
→ Leer [COMPLETAR_VISITA.md](./docs/COMPLETAR_VISITA.md)

**Implementación backend:**
→ Leer [BACKEND_COMPLETAR_VISITA.md](./docs/BACKEND_COMPLETAR_VISITA.md)

**Cómo probar:**
→ Leer [TESTING_COMPLETAR_VISITA.md](./docs/TESTING_COMPLETAR_VISITA.md)

**Ejemplos prácticos:**
→ Leer [COMPLETAR_VISITA_EXAMPLES.md](./docs/COMPLETAR_VISITA_EXAMPLES.md)

---

## 🎉 Novedades v2.0

### ¿Qué cambió?

| Característica | v1.0 | v2.0 |
|----------------|------|------|
| Verificación de oferta | ❌ | ✅ Automática |
| Opciones de resultado | 2 | **3** |
| Alerta sin oferta | ❌ | ✅ Naranja |
| Lógica de estado | Simple | **Con prioridades** |
| Campo `tiene_oferta` | ❌ | ✅ Nuevo |
| Resultado "oferta_nueva" | ❌ | ✅ Nuevo |

### Beneficios:
- ✅ Mayor precisión en clasificación de visitas
- ✅ Flujo adaptado al contexto del lead/cliente
- ✅ Mejor trazabilidad para analytics
- ✅ UX más clara e intuitiva

---

## 📊 Métricas

- **Líneas de código:** ~820 (componente principal)
- **Documentos:** 7 archivos
- **Casos de uso:** 5+ cubiertos
- **Validaciones:** 6 implementadas
- **Formatos de archivo:** 9+ soportados

---

## ✨ Créditos

**Desarrollado por:** Equipo SunCar  
**Versión:** 2.0.0  
**Fecha:** 2024  
**Estado:** ✅ Listo para integración con backend

---

## 🚀 Próximos Pasos

1. ✅ **Backend:** Implementar endpoints
2. ✅ **Testing:** Pruebas de integración
3. ⏳ **Deploy:** Configurar producción
4. ⏳ **Training:** Capacitar usuarios

---

**¿Listo para empezar?** 👉 Lee el [Resumen Ejecutivo](./docs/COMPLETAR_VISITA_SUMMARY.md)