# ✅ Resumen: Indicadores Visuales para Lead Sin Agregar

## 🎯 Objetivo

Identificar visualmente las ofertas confeccionadas que tienen un contacto "lead sin agregar" (pendiente de registrar en el sistema).

## 📍 Indicadores Agregados

### 1️⃣ Badge en la Imagen (Más Visible)

**Ubicación:** Esquina superior izquierda de la tarjeta

**Apariencia:**
- Color: Ámbar/Naranja brillante
- Icono: ⚠️
- Texto: "Lead pendiente"

```tsx
[En Revisión] [⚠️ Lead pendiente]
```

---

### 2️⃣ Badge Debajo del Nombre

**Ubicación:** Debajo del nombre del contacto

**Apariencia:**
- Color: Ámbar claro
- Icono: ⚠️
- Texto: "Lead pendiente de agregar"

```tsx
👤 Pedro López
   [⚠️ Lead pendiente de agregar]
```

---

### 3️⃣ Alerta en el Detalle

**Ubicación:** Sección "Información del contacto" en el diálogo

**Apariencia:**
- Caja con fondo ámbar claro
- Icono grande: ⚠️
- Título: "Lead pendiente de agregar"
- Descripción explicativa

```
┌─────────────────────────────────────┐
│ ⚠️ Lead pendiente de agregar        │
│                                     │
│ Este contacto aún no está           │
│ registrado en el sistema. Considera │
│ agregarlo como lead o cliente para  │
│ un mejor seguimiento.               │
└─────────────────────────────────────┘
```

---

## 🎨 Vista Previa

### Tarjeta Completa

```
┌─────────────────────────────────────┐
│ [En Revisión] [⚠️ Lead pendiente]   │ ← Badge 1
│                                     │
│        [Imagen de Oferta]           │
│                                     │
│─────────────────────────────────────│
│ Oferta Solar Residencial            │
│                                     │
│ 👤 Pedro López                      │
│    [⚠️ Lead pendiente de agregar]   │ ← Badge 2
│                                     │
│ [Exportar] [✏️] [Ver detalle]       │
└─────────────────────────────────────┘
```

---

## ✅ Cuándo se Muestran

**Se muestran SOLO cuando:**
```typescript
oferta.nombre_lead_sin_agregar !== null
oferta.nombre_lead_sin_agregar !== undefined
oferta.nombre_lead_sin_agregar !== ""
```

**NO se muestran cuando:**
- La oferta tiene un cliente registrado (`cliente_numero`)
- La oferta tiene un lead registrado (`lead_id`)
- La oferta es genérica

---

## 🎯 Beneficios

✅ Identificación inmediata de leads pendientes  
✅ Múltiples indicadores para mayor visibilidad  
✅ Colores consistentes (ámbar = advertencia)  
✅ Descripción clara de la acción requerida  
✅ Mejor seguimiento de contactos no registrados

---

## 📝 Archivo Modificado

`components/feats/ofertas/ofertas-confeccionadas-view.tsx`

**Cambios:**
- Línea ~970: Badge en imagen
- Línea ~985: Badge debajo del nombre
- Línea ~1115: Alerta en detalle

---

**Estado:** ✅ Implementado  
**Documentación completa:** `docs/INDICADOR_VISUAL_LEAD_SIN_AGREGAR.md`
